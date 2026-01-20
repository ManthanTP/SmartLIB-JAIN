import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Search, CheckCircle, Scissors, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

type FineRecord = {
    id: string;
    student_id: string;
    book_id: string;
    fine_amount: number;
    due_date: string;
    issue_date: string;
    book_title: string;
    student_name: string;
    type: 'active' | 'history';
};

import { FineManager } from '../lib/FineManager';

export const AdminFines: React.FC = () => {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const [fines, setFines] = useState<FineRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'overdue'>('all');
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        const updateThenFetch = async () => {
            await FineManager.updateOverdueFines();
            fetchFines();
        };
        updateThenFetch();

        const channel = supabase
            .channel('admin_fines')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'active_loans' }, () => {
                fetchFines();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [searchQuery, filter]);

    const fetchFines = async () => {
        setLoading(true);

        // Fetch fines from active_loans
        const { data: activeLoans } = await supabase
            .from('active_loans')
            .select(`
                id,
                fine_amount,
                due_date,
                issue_date,
                book:books(title),
                student:users(full_name, id)
            `)
            .gt('fine_amount', 0);

        // Fetch fines from reading_history that are not yet paid (in this simplified model, we'll assume anything with fine_amount > 0 in history is paid, 
        // but PRD says we need to track payments. For now, let's focus on active fines.)

        const formattedActive: FineRecord[] = (activeLoans || []).map(loan => ({
            id: loan.id,
            student_id: (loan.student as any)?.id,
            book_id: '', // Not needed for display
            fine_amount: loan.fine_amount,
            due_date: loan.due_date,
            issue_date: loan.issue_date,
            book_title: (loan.book as any)?.title || 'Unknown Book',
            student_name: (loan.student as any)?.full_name || 'Unknown Student',
            type: 'active'
        }));

        let filtered = formattedActive;
        if (searchQuery) {
            filtered = filtered.filter(f =>
                f.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.book_title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFines(filtered);
        setLoading(false);
    };

    const handlePayFine = async (fine: FineRecord) => {
        if (!confirm(`${t.confirmPayFine} (₹${fine.fine_amount} - ${fine.student_name})`)) return;
        setProcessingId(fine.id);

        try {
            // In a real system, we'd add to total_fines_paid in profile and set fine_amount to 0 or move to history
            // For now, we'll zero it out in active_loans
            const { error } = await supabase
                .from('active_loans')
                .update({ fine_amount: 0 })
                .eq('id', fine.id);

            if (error) throw error;

            // Log action
            await supabase.from('audit_logs').insert([{
                admin_id: profile?.id,
                action_type: 'pay_fine',
                entity_type: 'loan',
                entity_id: fine.id,
                details: { amount: fine.fine_amount, student: fine.student_name }
            }]);

            await fetchFines();
        } catch (err: any) {
            alert('Error processing payment: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleWaiveFine = async (fine: FineRecord) => {
        const reason = prompt(`${t.confirmWaiveFine} (₹${fine.fine_amount} - ${fine.student_name})`);
        if (!reason) return;
        setProcessingId(fine.id);

        try {
            const { error } = await supabase
                .from('active_loans')
                .update({ fine_amount: 0, notes: `Fine waived: ${reason}` })
                .eq('id', fine.id);

            if (error) throw error;

            // Log action
            await supabase.from('audit_logs').insert([{
                admin_id: profile?.id,
                action_type: 'waive_fine',
                entity_type: 'loan',
                entity_id: fine.id,
                details: { amount: fine.fine_amount, student: fine.student_name, reason }
            }]);

            await fetchFines();
        } catch (err: any) {
            alert('Error waiving fine: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleRecalculate = async () => {
        setLoading(true);
        await FineManager.updateOverdueFines();
        await fetchFines();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-primary dark:text-indigo-400">{t.fineManagement}</h1>
                    <p className="text-text-secondary dark:text-slate-400">{t.fineManagementSubtitle}</p>
                </div>
                <button
                    onClick={handleRecalculate}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    {t.recalculateFines || 'Recalculate Fines'}
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={t.searchFinePlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-border dark:border-slate-700 rounded-lg w-full focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-800 text-text-primary dark:text-white"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-400 border border-border dark:border-slate-700'}`}
                    >
                        {t.allFines}
                    </button>
                    <button
                        onClick={() => setFilter('overdue')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'overdue' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-400 border border-border dark:border-slate-700'}`}
                    >
                        {t.highlyOverdue}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-border dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-slate-900/50 text-xs uppercase text-text-secondary dark:text-slate-400 font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">{t.student}</th>
                                <th className="px-6 py-4">{t.bookDetails}</th>
                                <th className="px-6 py-4">{t.overdueInfo}</th>
                                <th className="px-6 py-4">{t.fineAmount}</th>
                                <th className="px-6 py-4 text-right">{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-slate-700">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4 h-16 bg-gray-50/50 dark:bg-slate-800/50"></td>
                                    </tr>
                                ))
                            ) : fines.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-text-secondary dark:text-slate-400">
                                        {t.noFinesFound}
                                    </td>
                                </tr>
                            ) : (
                                fines.map((fine) => (
                                    <tr key={fine.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-text-primary dark:text-white">{fine.student_name}</div>
                                            <div className="text-xs text-text-secondary dark:text-slate-500">ID: {fine.student_id.split('-')[0]}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-text-primary dark:text-white">{fine.book_title}</div>
                                            <div className="text-xs text-text-secondary dark:text-slate-500">{t.issued}: {format(new Date(fine.issue_date), 'PP')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-red-500 uppercase tracking-tight">{t.dueLabel}: {format(new Date(fine.due_date), 'PP')}</div>
                                            <div className="text-[10px] text-text-secondary dark:text-slate-500">{t.dailyRateNote}</div>
                                        </td>
                                        <td className="px-6 py-4 text-lg font-black text-indigo-600 dark:text-indigo-400">
                                            ₹{fine.fine_amount}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleWaiveFine(fine)}
                                                    disabled={processingId === fine.id}
                                                    className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                    title={t.waiveFine}
                                                >
                                                    <Scissors size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handlePayFine(fine)}
                                                    disabled={processingId === fine.id}
                                                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                    title={t.markAsPaid}
                                                >
                                                    <CheckCircle size={18} />
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
        </div>
    );
};
