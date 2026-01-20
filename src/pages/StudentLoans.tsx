import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Clock, BookOpen, Calendar, AlertCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { LoadingScreen } from '../components/LoadingScreen';
import { BookCover } from '../components/BookCover';

export const StudentLoans: React.FC = () => {
    const { profile } = useAuth();
    const { t } = useLanguage();


    const [activeTab, setActiveTab] = useState<'loans' | 'requests' | 'reservations'>('loans');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile) return;
        fetchData();

        const table = activeTab === 'loans' ? 'active_loans' :
            activeTab === 'requests' ? 'loan_requests' : 'reservations';

        const channel = supabase
            .channel(`student_activity_${activeTab}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: table,
                filter: `student_id=eq.${profile.id}`
            }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        let result;

        if (activeTab === 'loans') {
            result = await supabase
                .from('active_loans')
                .select('*, book:books(*)')
                .eq('student_id', profile!.id)
                .order('due_date');
        } else if (activeTab === 'requests') {
            result = await supabase
                .from('loan_requests')
                .select('*, book:books(*)')
                .eq('student_id', profile!.id)
                .order('request_date', { ascending: false });
        } else {
            result = await supabase
                .from('reservations')
                .select('*, book:books(*)')
                .eq('student_id', profile!.id)
                .order('reserved_from');
        }

        if (result.error) {
            console.error('Error fetching data:', result.error);
        } else {
            setData(result.data || []);
        }
        setLoading(false);
    };

    const cancelRequest = async (id: string) => {
        if (!confirm(t.confirmCancelRequest || 'Are you sure you want to cancel this request?')) return;
        const { error } = await supabase.from('loan_requests').delete().eq('id', id);
        if (error) alert(t.cancelError || 'Error cancelling request');
        else fetchData();
    };

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-primary mb-6">{t['myActivity']}</h1>

            <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
                <button
                    onClick={() => setActiveTab('loans')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'loans' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-secondary hover:text-primary'
                        }`}
                >
                    <BookOpen size={18} /> {t['activeLoans']}
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'requests' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-secondary hover:text-primary'
                        }`}
                >
                    <Clock size={18} /> {t['requests']}
                </button>
                <button
                    onClick={() => setActiveTab('reservations')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reservations' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-secondary hover:text-primary'
                        }`}
                >
                    <Calendar size={18} /> {t['reservations']}
                </button>
            </div>

            {loading ? (
                <LoadingScreen />
            ) : data.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg border border-dashed border-gray-300 dark:border-slate-600">
                    <p className="text-text-secondary dark:text-slate-400">{t['noItemsFound']}.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {data.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-border dark:border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden shadow-sm">
                                    <BookCover
                                        url={item.book?.cover_image_url}
                                        title={item.book?.title}
                                        className="w-full h-full object-cover"
                                        fallbackIconSize={18}
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-text-primary dark:text-white">{item.book?.title}</h3>
                                    <p className="text-sm text-text-secondary dark:text-slate-400">{item.book?.authors?.join(', ')}</p>

                                    <div className="mt-2 text-sm">
                                        {activeTab === 'loans' && item.due_date && (
                                            <span className={`flex items-center gap-1 ${new Date(item.due_date) < new Date() ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400'}`}>
                                                {t['dueDate']}: {format(new Date(item.due_date), 'PPP')}
                                                {new Date(item.due_date) < new Date() && <AlertCircle size={14} />}
                                            </span>
                                        )}
                                        {activeTab === 'requests' && (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize 
                        ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                                    item.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                                {t['status']}: {item.status === 'pending' ? t['statusPending'] : item.status === 'rejected' ? t['statusRejected'] : t['statusApproved']}
                                            </span>
                                        )}
                                        {activeTab === 'reservations' && item.reserved_from && (
                                            <span className="text-blue-600 dark:text-blue-400">
                                                {t['reservedFrom']}: {format(new Date(item.reserved_from), 'PP')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                                {activeTab === 'requests' && item.status === 'pending' && (
                                    <button
                                        onClick={() => cancelRequest(item.id)}
                                        className="flex items-center gap-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-md transition-colors"
                                    >
                                        <X size={16} /> {t['cancelRequest']}
                                    </button>
                                )}
                                {/* Additional actions for other tabs could go here */}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
