import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, Clock, Calendar, Bell } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';
import { sendBookAvailableNotification, sendFineAlert, sendDueDateReminder } from '../lib/email';
import { LoadingScreen } from '../components/LoadingScreen';

export const AdminLoans: React.FC = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'requests' | 'active' | 'reservations'>('requests');
    const [requests, setRequests] = useState<any[]>([]);
    const [activeLoans, setActiveLoans] = useState<any[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();

        // Real-time subscriptions for all circulation tables
        const subscription = supabase
            .channel('admin_circulation')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_requests' }, (payload) => {
                console.log('Change received (requests):', payload);
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'active_loans' }, (payload) => {
                console.log('Change received (loans):', payload);
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
                console.log('Change received (reservations):', payload);
                fetchData();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        console.log('Fetching Admin Circulation Data for:', activeTab);
        try {
            if (activeTab === 'requests') {
                const { data, error } = await supabase
                    .from('loan_requests')
                    .select('*, book:books(title, is_book_bank), student:users!loan_requests_student_id_fkey(full_name, email)')
                    .eq('status', 'pending')
                    .order('request_date');

                if (error) {
                    console.error('Error fetching requests:', error);
                    alert('Database error fetching requests: ' + error.message);
                }
                console.log('Requests data:', data);
                setRequests(data || []);
            } else if (activeTab === 'active') {
                const { data, error } = await supabase
                    .from('active_loans')
                    .select('*, book:books(title), student:users!active_loans_student_id_fkey(full_name, email)')
                    .order('due_date');

                if (error) {
                    console.error('Error fetching active loans:', error);
                }
                console.log('Active Loans data:', data);
                setActiveLoans(data || []);
            } else if (activeTab === 'reservations') {
                const { data, error } = await supabase
                    .from('reservations')
                    .select('*, book:books(title), student:users!reservations_student_id_fkey(full_name, email)')
                    .order('reserved_from');

                if (error) {
                    console.error('Error fetching reservations:', error);
                }
                console.log('Reservations data:', data);
                setReservations(data || []);
            }
        } catch (err) {
            console.error('Unexpected error in fetchData:', err);
        }
        setLoading(false);
    };



    const handleApprove = async (requestId: string, bookId: string, studentId: string, bookTitle: string, studentEmail: string, studentName: string) => {
        try {
            // 0. Fetch system settings for loan duration
            const { data: settings } = await supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'general_config')
                .single();

            const loanDurationDays = settings?.setting_value?.max_loan_duration_days || 14;
            const bookBankDurationDays = settings?.setting_value?.book_bank_duration_days || 180;

            // 0.1 Check if this is a Book Bank book
            const { data: bookData } = await supabase
                .from('books')
                .select('is_book_bank')
                .eq('id', bookId)
                .single();

            const isBookBank = bookData?.is_book_bank || false;

            // 1. Update request status
            const { error: reqError } = await supabase
                .from('loan_requests')
                .update({ status: 'approved', approved_date: new Date().toISOString() })
                .eq('id', requestId);

            if (reqError) throw reqError;

            // 2. Create active loan
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (isBookBank ? bookBankDurationDays : loanDurationDays));

            const { error: loanError } = await supabase
                .from('active_loans')
                .insert({
                    request_id: requestId,
                    student_id: studentId,
                    book_id: bookId,
                    due_date: dueDate.toISOString(),
                    issue_date: new Date().toISOString()
                });

            if (loanError) throw loanError;

            // 3. Update Book Availability (Decrement)
            const { error: updateError } = await supabase.rpc('decrement_available_copies', { book_id_input: bookId });

            // Fallback if RPC doesn't exist (though RPC is recommended for concurrency)
            if (updateError) {
                console.warn('RPC failed, falling back to manual update', updateError);
                const { data: book } = await supabase.from('books').select('available_copies').eq('id', bookId).single();
                if (book) {
                    await supabase.from('books').update({ available_copies: Math.max(0, book.available_copies - 1) }).eq('id', bookId);
                }
            }

            // 4. Send Email Notification
            if (studentEmail) {
                await sendBookAvailableNotification(studentEmail, studentName, bookTitle);
            }

            // 5. Update UI
            alert(`Loan approved and notification sent to ${studentName}`);
            fetchData();
        } catch (err: any) {
            alert('Error approving loan: ' + err.message);
        }
    };

    const handleReject = async (requestId: string) => {
        if (!confirm('Are you sure you want to reject this request?')) return;

        try {
            const { error } = await supabase
                .from('loan_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);

            if (error) throw error;
            fetchData();
        } catch (err: any) {
            alert('Error rejecting request: ' + err.message);
        }
    };

    const handleReturn = async (loan: any) => {
        if (!confirm('Mark this book as returned?')) return;

        try {
            const { error } = await supabase
                .from('active_loans')
                .delete()
                .eq('id', loan.id);

            if (error) throw error;

            // Update Book Availability (Increment)
            const { error: updateError } = await supabase.rpc('increment_available_copies', { book_id_input: loan.book_id });
            if (updateError) {
                const { data: book } = await supabase.from('books').select('available_copies').eq('id', loan.book_id).single();
                if (book) {
                    await supabase.from('books').update({ available_copies: book.available_copies + 1 }).eq('id', loan.book_id);
                }
            }

            // Send Fine Alert if applicable
            if (loan.fine_amount > 0 && loan.student?.email) {
                await sendFineAlert(loan.student.email, loan.student.full_name, loan.book?.title || 'Book', loan.fine_amount, format(new Date(loan.due_date), 'PP'));
                alert(`Book returned. Fine alert sent for ₹${loan.fine_amount}`);
            } else {
                alert('Book returned successfully.');
            }

            fetchData();
        } catch (err: any) {
            alert('Error processing return: ' + err.message);
        }
    };

    const handleUpdateDueDate = async (loanId: string, currentDueDate: string) => {
        const newDate = prompt('Enter new due date (YYYY-MM-DD):', currentDueDate.split('T')[0]);
        if (!newDate) return;

        try {
            const { error } = await supabase
                .from('active_loans')
                .update({ due_date: new Date(newDate).toISOString() })
                .eq('id', loanId);

            if (error) throw error;
            alert('Due date updated successfully.');
            fetchData();
        } catch (err: any) {
            alert('Error updating due date: ' + err.message);
        }
    };

    const handleSendReminder = async (loan: any) => {
        if (!confirm(`Send a manual return reminder to ${loan.student?.full_name}?`)) return;

        try {
            const isOverdue = new Date(loan.due_date) < new Date();
            let success;

            if (isOverdue) {
                // Determine fine: use DB value if available, otherwise calculate fallback
                let fineToReport = loan.fine_amount || 0;

                if (fineToReport === 0) {
                    const { data: settings } = await supabase
                        .from('system_settings')
                        .select('setting_value')
                        .eq('setting_key', 'general_config')
                        .single();
                    const finePerDay = settings?.setting_value?.fine_per_day || 5;
                    const days = differenceInCalendarDays(new Date(), new Date(loan.due_date));
                    fineToReport = Math.max(1, days) * finePerDay;
                    console.log(`[AdminLoans] Calculated fallback fine for reminder: ${fineToReport} (${days} days)`);
                }

                success = await sendFineAlert(
                    loan.student?.email,
                    loan.student?.full_name,
                    loan.book?.title || 'Book',
                    fineToReport,
                    format(new Date(loan.due_date), 'PP')
                );
            } else {
                success = await sendDueDateReminder(
                    loan.student?.email,
                    loan.student?.full_name,
                    loan.book?.title || 'Book',
                    format(new Date(loan.due_date), 'PP')
                );
            }

            if (success) {
                alert('Reminder email sent successfully!');
            } else {
                alert('Failed to send email. Check browser console for errors related to EmailJS.');
            }
        } catch (err: any) {
            alert('Error sending reminder: ' + err.message);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-primary mb-6">{t.circulationManagement}</h1>

            <div className="flex gap-4 border-b border-border mb-6">
                <button
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'requests' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-primary'}`}
                    onClick={() => setActiveTab('requests')}
                >
                    {t.loanRequests}
                </button>
                <button
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'active' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-primary'}`}
                    onClick={() => setActiveTab('active')}
                >
                    {t.activeLoans}
                </button>
                <button
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'reservations' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-primary'}`}
                    onClick={() => setActiveTab('reservations')}
                >
                    {t.reservations}
                </button>
            </div>

            {loading ? <LoadingScreen /> : (
                <>
                    {activeTab === 'requests' && (
                        <div className="space-y-4">
                            {requests.length === 0 ? (
                                <div className="text-text-secondary dark:text-slate-400">{t.noPendingRequests}</div>
                            ) : (
                                requests.map(req => (
                                    <div key={req.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-border dark:border-slate-700 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-text-primary dark:text-white flex items-center gap-2">
                                                {req.book?.title}
                                                {req.book?.is_book_bank && (
                                                    <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[8px] font-black uppercase tracking-widest rounded">Book Bank</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-text-secondary dark:text-slate-400">{t.requestedBy} {req.student?.full_name} ({req.student?.email})</div>
                                            <div className="text-xs text-gray-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                                                <Clock size={12} /> {format(new Date(req.request_date), 'PPP p')}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleReject(req.id)}
                                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                                title={t.reject}
                                            >
                                                <X size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleApprove(
                                                    req.id,
                                                    req.book_id,
                                                    req.student_id,
                                                    req.book?.title,
                                                    req.student?.email,
                                                    req.student?.full_name
                                                )}
                                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full"
                                                title={t.approve}
                                            >
                                                <Check size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'active' && (
                        <div>
                            <h2 className="text-xl font-bold mb-4 text-primary dark:text-indigo-400">{t.activeLoans}</h2>
                            <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-slate-900 text-xs uppercase text-text-secondary dark:text-slate-400">
                                        <tr>
                                            <th className="px-6 py-3">{t.book}</th>
                                            <th className="px-6 py-3">{t.student}</th>
                                            <th className="px-6 py-3">{t.issued}</th>
                                            <th className="px-6 py-3">{t.dueDate}</th>
                                            <th className="px-6 py-3 text-right">{t.actions}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border dark:divide-slate-700">
                                        {activeLoans.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-text-secondary dark:text-slate-400">{t.noActiveLoans}</td></tr>
                                        ) : (
                                            activeLoans.map(loan => (
                                                <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-6 py-4 font-medium text-text-primary dark:text-white">{loan.book?.title}</td>
                                                    <td className="px-6 py-4 text-text-secondary dark:text-slate-400">{loan.student?.full_name}</td>
                                                    <td className="px-6 py-4 text-text-secondary dark:text-slate-400">{format(new Date(loan.issue_date), 'PP')}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`${new Date(loan.due_date) < new Date() ? 'text-red-600 dark:text-red-400 font-bold' : 'text-text-secondary dark:text-slate-400'}`}>
                                                            {format(new Date(loan.due_date), 'PP')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-3">
                                                            <button
                                                                onClick={() => handleSendReminder(loan)}
                                                                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium text-xs flex items-center gap-1"
                                                                title={t.remind}
                                                            >
                                                                <Bell size={14} /> {t.remind}
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateDueDate(loan.id, loan.due_date)}
                                                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-xs flex items-center gap-1"
                                                            >
                                                                <Calendar size={14} /> {t.editDate}
                                                            </button>
                                                            <button
                                                                onClick={() => handleReturn(loan)}
                                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-xs"
                                                            >
                                                                {t.markReturned}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reservations' && (
                        <div>
                            <h2 className="text-xl font-bold mb-4 text-primary dark:text-indigo-400">{t.reservations}</h2>
                            <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-slate-900 text-xs uppercase text-text-secondary dark:text-slate-400">
                                        <tr>
                                            <th className="px-6 py-3">{t.book}</th>
                                            <th className="px-6 py-3">{t.student}</th>
                                            <th className="px-6 py-3">{t.reservedFrom}</th>
                                            <th className="px-6 py-3 text-right">{t.status}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border dark:divide-slate-700">
                                        {reservations.length === 0 ? (
                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-text-secondary dark:text-slate-400">{t.noReservations}</td></tr>
                                        ) : (
                                            reservations.map(res => (
                                                <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-6 py-4 font-medium text-text-primary dark:text-white">{res.book?.title}</td>
                                                    <td className="px-6 py-4 text-text-secondary dark:text-slate-400">{res.student?.full_name}</td>
                                                    <td className="px-6 py-4 text-text-secondary dark:text-slate-400">{format(new Date(res.reserved_from), 'PP')}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${res.status === 'confirmed' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                                                            }`}>
                                                            {res.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
