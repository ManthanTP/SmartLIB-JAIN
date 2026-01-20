import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

type AcquisitionRequest = {
    id: string;
    student_id: string;
    title: string;
    author: string;
    justification: string;
    status: 'pending' | 'approved' | 'rejected' | 'acquired';
    admin_notes: string;
    created_at: string;
    student_name?: string;
};

export const AdminAcquisitions: React.FC = () => {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const [requests, setRequests] = useState<AcquisitionRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();

        const channel = supabase
            .channel('admin_acquisitions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'acquisition_requests' }, () => {
                fetchRequests();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('acquisition_requests')
            .select('*, student:users(full_name)')
            .order('created_at', { ascending: false });

        if (data) {
            setRequests(data.map(r => ({
                ...r,
                student_name: (r.student as any)?.full_name || 'Unknown'
            })));
        }
        setLoading(false);
    };

    const updateStatus = async (id: string, status: string, notes?: string) => {
        const { error } = await supabase
            .from('acquisition_requests')
            .update({ status, admin_notes: notes || '', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (!error) {
            // Log action
            await supabase.from('audit_logs').insert([{
                admin_id: profile?.id,
                action_type: 'update_acquisition_status',
                entity_type: 'acquisition_request',
                entity_id: id,
                details: { status, notes }
            }]);
            fetchRequests();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-primary dark:text-indigo-400 font-black">{t.bookAcquisitions}</h1>
                <p className="text-text-secondary dark:text-slate-400">{t.bookAcquisitionsSubtitle}</p>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-10">{t.loadingRequests}</div>
                ) : requests.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl text-center border border-dashed border-border dark:border-slate-700">
                        <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-text-secondary dark:text-slate-400">{t.noAcquisitionsFound}</p>
                    </div>
                ) : (
                    requests.map(request => (
                        <div key={request.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-border dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary dark:text-white">{request.title}</h3>
                                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold">{request.author}</p>
                                    <p className="text-xs text-text-secondary dark:text-slate-500 mt-1">{t.requestedBy}: {request.student_name}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                                    ${request.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                                    ${request.status === 'approved' ? 'bg-blue-100 text-blue-700' : ''}
                                    ${request.status === 'acquired' ? 'bg-emerald-100 text-emerald-700' : ''}
                                    ${request.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                                `}>
                                    {request.status}
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl mb-4">
                                <p className="text-xs text-text-secondary dark:text-slate-400 italic">"{request.justification}"</p>
                            </div>

                            {request.status === 'pending' && (
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => updateStatus(request.id, 'rejected', prompt(t.rejectionReason) || '')}
                                        className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        {t.reject}
                                    </button>
                                    <button
                                        onClick={() => updateStatus(request.id, 'approved')}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                                    >
                                        {t.approve}
                                    </button>
                                </div>
                            )}

                            {request.status === 'approved' && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => updateStatus(request.id, 'acquired')}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                                    >
                                        {t.markAsAcquired}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
