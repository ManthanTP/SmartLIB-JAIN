import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Send, BookOpen, X } from 'lucide-react';

export const RequestBook: React.FC = () => {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [justification, setJustification] = useState('');
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);

    useEffect(() => {
        if (!profile) return;
        fetchMyRequests();

        const channel = supabase
            .channel('my_acquisition_requests')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'acquisition_requests',
                filter: `student_id=eq.${profile.id}`
            }, () => {
                fetchMyRequests();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile]);

    const fetchMyRequests = async () => {
        const { data } = await supabase
            .from('acquisition_requests')
            .select('*')
            .eq('student_id', profile?.id)
            .order('created_at', { ascending: false });
        if (data) setRequests(data);
    };

    const cancelRequest = async (id: string) => {
        if (!confirm(t.confirmCancelRequest || 'Are you sure you want to cancel this request?')) return;

        try {
            const { error } = await supabase
                .from('acquisition_requests')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchMyRequests();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setLoading(true);

        try {
            const { error } = await supabase.from('acquisition_requests').insert([{
                student_id: profile.id,
                title,
                author,
                justification,
                status: 'pending'
            }]);

            if (error) throw error;
            setTitle('');
            setAuthor('');
            setJustification('');
            alert(t.requestSuccess);
            fetchMyRequests();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return t.statusPending;
            case 'approved': return t.statusApproved;
            case 'acquired': return t.statusAcquired;
            case 'rejected': return t.statusRejected;
            default: return status;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-border dark:border-slate-700">
                <header className="mb-8">
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-2">
                        {t.requestBook}
                    </h1>
                    <p className="text-secondary font-medium">{t.requestBookSubtitle}</p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t.bookTitle}</label>
                            <input
                                required
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-text-primary dark:text-white transition-all"
                                placeholder={t.enterBookTitle}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t.authorLabel}</label>
                            <input
                                required
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-text-primary dark:text-white transition-all"
                                placeholder={t.enterAuthorName}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t.whyAdd}</label>
                        <textarea
                            required
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            rows={3}
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-text-primary dark:text-white transition-all resize-none"
                            placeholder={t.requestDetailsPlaceholder}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? t.submitting : <><Send size={18} /> {t.submitRequest}</>}
                    </button>
                </form>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white px-2">{t.pastRequests}</h2>
                <div className="grid gap-4">
                    {requests.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-12 rounded-[2rem] text-center border border-dashed border-slate-200 dark:border-slate-700">
                            <BookOpen size={40} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t.noRequests}</p>
                        </div>
                    ) : (
                        requests.map(req => (
                            <div key={req.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${req.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                        req.status === 'approved' ? 'bg-blue-50 text-blue-600' :
                                            req.status === 'acquired' ? 'bg-emerald-50 text-emerald-600' :
                                                'bg-red-50 text-red-600'
                                        }`}>
                                        <BookOpen size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{req.title}</h4>
                                        <p className="text-xs font-bold text-slate-400">{req.author}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {req.status === 'pending' && (
                                        <button
                                            onClick={() => cancelRequest(req.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                            title={t.cancelRequest}
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                        req.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                            req.status === 'acquired' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-red-100 text-red-700'
                                        }`}>
                                        {getStatusLabel(req.status)}
                                    </span>
                                    {req.admin_notes && (
                                        <p className="text-[10px] text-slate-400 font-medium italic">"{req.admin_notes}"</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
