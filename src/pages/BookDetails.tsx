import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Book } from '../components/BookCard';
import { ArrowLeft, BookOpen, Calendar, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { BookCover } from '../components/BookCover';

export const BookDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [reserveDate, setReserveDate] = useState<string | null>(null);
    const [reserving, setReserving] = useState(false);

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date()); // For calendar navigation

    const [settings, setSettings] = useState<any>({});
    const [returnDates, setReturnDates] = useState<string[]>([]); // Green dates (when books will be returned)
    const [reservedRanges, setReservedRanges] = useState<{ from: string, to: string }[]>([]); // Red dates (already reserved)

    useEffect(() => {
        if (id) {
            fetchBook();

            // Real-time subscription for this specific book
            const subscription = supabase
                .channel(`book:${id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'books',
                    filter: `id=eq.${id}`
                }, (payload) => {
                    console.log('Current book updated:', payload);
                    fetchBook();
                })
                .subscribe();

            // Real-time settings for instant 'Auto-Approve' toggle
            const settingsSubscription = supabase
                .channel('settings_channel')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'system_settings',
                    filter: `setting_key=eq.general_config`
                }, (payload) => {
                    if (payload.new?.setting_value) {
                        setSettings(payload.new.setting_value);
                    }
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
                settingsSubscription.unsubscribe();
            };
        }
        fetchSettings();
    }, [id]);

    const fetchSettings = async () => {
        const { data } = await supabase.from('system_settings').select('*').eq('setting_key', 'general_config').single();
        if (data && data.setting_value) setSettings(data.setting_value);
    };

    const fetchBook = async () => {
        const { data } = await supabase.from('books').select('*').eq('id', id).single();
        setBook(data);
        setLoading(false);

        // If out of stock, fetch availability dates for calendar
        if (data && data.available_copies === 0) {
            fetchAvailabilityDates();
        }
    };

    const fetchAvailabilityDates = async () => {
        if (!id) return;

        // Fetch return dates (when current loans are due back) - GREEN DATES
        const { data: loans } = await supabase
            .from('active_loans')
            .select('due_date')
            .eq('book_id', id);

        const returns = loans?.map(loan => loan.due_date.split('T')[0]) || [];
        setReturnDates(returns);

        // Fetch already reserved dates - RED DATES
        const { data: reservations } = await supabase
            .from('reservations')
            .select('reserved_from, reserved_to')
            .eq('book_id', id);

        const ranges = reservations?.map(res => ({
            from: res.reserved_from,
            to: res.reserved_to
        })) || [];
        setReservedRanges(ranges);
    };

    const handleRequestLoan = async () => {
        if (!book || !profile) return;
        if (book.available_copies <= 0) {
            alert('No copies available');
            return;
        }

        setRequesting(true);
        try {
            // Check Auto-Approve
            const autoApprove = settings.auto_approve_loan_requests;

            // 1. Create Request
            const requestStatus = autoApprove ? 'approved' : 'pending';
            const requestData: any = {
                student_id: profile.id,
                book_id: book.id,
                status: requestStatus
            };
            if (autoApprove) requestData.approved_date = new Date().toISOString();

            const { data: request, error: reqError } = await supabase
                .from('loan_requests')
                .insert(requestData)
                .select()
                .single();

            if (reqError) throw reqError;

            // 2. If Auto-Approve, Create Active Loan
            if (autoApprove) {
                const duration = settings.max_loan_duration_days || 30;
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + duration);

                const { error: loanError } = await supabase
                    .from('active_loans')
                    .insert({
                        request_id: request.id,
                        student_id: profile.id,
                        book_id: book.id,
                        due_date: dueDate.toISOString(),
                        issue_date: new Date().toISOString()
                    });

                if (loanError) throw loanError;

                // Update Book Availability (Decrement)
                const { error: updateError } = await supabase.rpc('decrement_available_copies', { book_id_input: book.id });
                if (updateError) {
                    // Fallback
                    await supabase.from('books').update({ available_copies: Math.max(0, book.available_copies - 1) }).eq('id', book.id);
                }

                // Send Notification
                // Ideally imported from email lib, but keeping it simple/client-side for now or import if preferred.
                // Assuming we can import here.
                alert('Book requested and automatically approved! You can pick it up.');
            } else {
                alert('Book requested successfully! Please wait for admin approval.');
            }

            navigate('/my-loans');
        } catch (error: any) {
            alert('Error requesting book: ' + error.message);
        } finally {
            setRequesting(false);
        }
    };

    const handleReserve = async () => {
        if (!book || !profile || !reserveDate) return;

        if (book.available_copies > 0) {
            alert('This book is currently available. Please borrow it directly.');
            return;
        }

        const selectedDate = new Date(reserveDate);
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 30);

        if (selectedDate < today) {
            alert('Cannot reserve for a past date');
            return;
        }
        if (selectedDate > maxDate) {
            alert('Cannot reserve more than 30 days in advance');
            return;
        }

        const nextDate = new Date(selectedDate);
        nextDate.setDate(nextDate.getDate() + 14); // 14 day loop
        const nextDateStr = [
            nextDate.getFullYear(),
            String(nextDate.getMonth() + 1).padStart(2, '0'),
            String(nextDate.getDate()).padStart(2, '0')
        ].join('-');

        setReserving(true);
        try {
            const { error } = await supabase
                .from('reservations')
                .insert({
                    student_id: profile.id,
                    book_id: book.id,
                    reserved_from: reserveDate,
                    reserved_to: nextDateStr,
                    status: 'confirmed'
                });

            if (error) throw error;
            alert(`Book reserved for 14 days starting from ${reserveDate}!`);
            navigate('/my-loans');
        } catch (error: any) {
            alert('Error reserving book: ' + error.message);
        } finally {
            setReserving(false);
        }
    };

    if (loading) return <LoadingScreen />;
    if (!book) return <div className="p-8 text-center">Book not found</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-text-secondary hover:text-primary mb-6"
            >
                <ArrowLeft size={20} /> Back to Catalog
            </button>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-border dark:border-slate-700 overflow-hidden flex flex-col md:flex-row">
                {/* Book Cover */}
                <div className="md:w-1/3 bg-gray-100 dark:bg-slate-700 flex items-center justify-center p-8">
                    <div className="w-64 h-96 relative rounded shadow-lg overflow-hidden">
                        <BookCover
                            url={book.cover_image_url}
                            title={book.title}
                            className="w-full h-full object-cover"
                            fallbackIconSize={64}
                        />
                    </div>
                </div>

                {/* Book Details */}
                <div className="md:w-2/3 p-8">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary dark:text-white mb-2">{book.title}</h1>
                            <p className="text-lg text-text-secondary dark:text-slate-400">{book.authors?.join(', ')}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${book.available_copies > 0
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                            }`}>
                            {book.available_copies > 0 ? 'Available' : 'Out of Stock'}
                        </span>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-2 text-text-secondary dark:text-slate-400">
                            <BookOpen size={18} />
                            <span className="font-medium">Category:</span> {book.category}
                        </div>
                        <div className="flex items-center gap-2 text-text-secondary dark:text-slate-400">
                            <Calendar size={18} />
                            <span className="font-medium">Copies:</span> {book.available_copies} / {book.total_copies} available
                        </div>
                        {book.publisher && (
                            <div className="text-text-secondary dark:text-slate-400">
                                <span className="font-medium">Publisher:</span> {book.publisher}
                            </div>
                        )}
                        {book.publication_date && (
                            <div className="text-text-secondary dark:text-slate-400">
                                <span className="font-medium">Published:</span> {new Date(book.publication_date).getFullYear()}
                            </div>
                        )}
                        {book.isbn && (
                            <div className="text-text-secondary dark:text-slate-400">
                                <span className="font-medium">ISBN:</span> {book.isbn}
                            </div>
                        )}
                    </div>

                    {book.description && (
                        <div className="mb-6">
                            <h3 className="font-bold text-lg mb-2 text-text-primary dark:text-white">Description</h3>
                            <p className="text-text-secondary dark:text-slate-400 leading-relaxed">{book.description}</p>
                        </div>
                    )}

                    {book.available_copies > 0 ? (
                        <button
                            onClick={handleRequestLoan}
                            disabled={requesting}
                            className="w-full bg-indigo-600 text-white rounded-xl px-6 py-4 font-black uppercase text-xs tracking-widest hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-900/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                        >
                            {requesting ? 'Processing...' : 'Borrow Now'}
                            {!requesting && <ShieldCheck size={18} />}
                        </button>
                    ) : (
                        <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4">Reserve for Later</h3>

                            {/* Calendar */}
                            <div className="mb-4 border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                                {/* Month Navigation */}
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => {
                                            const newMonth = new Date(currentMonth);
                                            newMonth.setMonth(newMonth.getMonth() - 1);
                                            setCurrentMonth(newMonth);
                                        }}
                                        className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300"
                                    >
                                        ← Prev
                                    </button>
                                    <h4 className="font-bold text-slate-800 dark:text-white">
                                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </h4>
                                    <button
                                        onClick={() => {
                                            const newMonth = new Date(currentMonth);
                                            newMonth.setMonth(newMonth.getMonth() + 1);
                                            setCurrentMonth(newMonth);
                                        }}
                                        className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300"
                                    >
                                        Next →
                                    </button>
                                </div>

                                {/* Day Names */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 py-1">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-2">
                                    {(() => {
                                        const year = currentMonth.getFullYear();
                                        const month = currentMonth.getMonth();
                                        const firstDay = new Date(year, month, 1).getDay();
                                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);

                                        const cells = [];

                                        // Empty cells before month starts
                                        for (let i = 0; i < firstDay; i++) {
                                            cells.push(<div key={`empty-${i}`} />);
                                        }

                                        // Days of the month
                                        for (let day = 1; day <= daysInMonth; day++) {
                                            const date = new Date(year, month, day);
                                            // Fix timezone issue: Use local date components instead of ISO string (which is UTC)
                                            // const dateStr = date.toISOString().split('T')[0]; 
                                            const dateStr = [
                                                date.getFullYear(),
                                                String(date.getMonth() + 1).padStart(2, '0'),
                                                String(date.getDate()).padStart(2, '0')
                                            ].join('-');

                                            // Date Logic Helpers
                                            const isPast = date < today;

                                            // 1. Is it currently reserved (Red)?
                                            // A date is reserved if it falls BETWEEN range.from (inclusive) and range.to (exclusive)
                                            const activeRange = reservedRanges.find(range => dateStr >= range.from && dateStr < range.to);
                                            const isReserved = !!activeRange;

                                            // 2. Is it a return/start date (Green)?
                                            // It's green if it's a loan due date OR a reservation end date
                                            const isLoopStart = reservedRanges.some(range => dateStr === range.to);
                                            const isLoanReturn = returnDates.some(rd => dateStr >= rd);

                                            // Availability check: Green if (loan return or reservation end) AND not currently inside another red block
                                            const isReturning = (isLoanReturn || isLoopStart) && !isReserved;

                                            const isSelected = reserveDate === dateStr;

                                            let buttonClass = 'aspect-square rounded-lg text-xs font-bold transition-all ';
                                            let isClickable = false;

                                            if (isSelected) {
                                                buttonClass += 'bg-indigo-600 text-white ring-2 ring-indigo-400';
                                            } else if (isReturning && !isReserved && !isPast) {
                                                // GREEN: Available
                                                buttonClass += 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 cursor-pointer';
                                                isClickable = true;
                                            } else if (isReserved) {
                                                // RED: Already reserved
                                                buttonClass += 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 cursor-not-allowed';
                                            } else {
                                                // GRAY: No info or Past
                                                buttonClass += 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed';
                                            }

                                            cells.push(
                                                <button
                                                    key={day}
                                                    onClick={() => isClickable && setReserveDate(dateStr)}
                                                    disabled={!isClickable}
                                                    className={buttonClass}
                                                    title={
                                                        isPast ? 'Past date' :
                                                            isReturning && !isReserved
                                                                ? 'Available - Book will be returned'
                                                                : isReserved
                                                                    ? 'Already reserved'
                                                                    : 'Not available'
                                                    }
                                                >
                                                    {day}
                                                </button>
                                            );
                                        }

                                        return cells;
                                    })()}
                                </div>

                                {/* Legend */}
                                <div className="flex gap-4 mt-4 text-xs">
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded bg-green-500"></div>
                                        <span className="text-slate-600 dark:text-slate-400">Available</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded bg-red-500"></div>
                                        <span className="text-slate-600 dark:text-slate-400">Reserved</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-700"></div>
                                        <span className="text-slate-600 dark:text-slate-400">Unknown</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleReserve}
                                disabled={reserving || !reserveDate}
                                className="w-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-100 dark:border-slate-700 rounded-xl px-6 py-4 font-black uppercase text-xs tracking-widest hover:border-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {reserving ? 'Reserving...' : reserveDate ? `Reserve for ${new Date(reserveDate).toLocaleDateString()}` : 'Select a Date'}
                                <Calendar size={18} />
                            </button>
                            <p className="text-[10px] text-slate-400 text-center italic mt-2">Pick-up window is 24 hours from selected date.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
