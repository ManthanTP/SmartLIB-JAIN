import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, Shield, ChevronLeft, Info, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { useLanguage } from '../context/LanguageContext';

type LibraryRule = {
    id: string;
    title: string;
    content: string;
    icon: string;
};

export const LibraryRules: React.FC = () => {
    const { t } = useLanguage();
    const [rules, setRules] = useState<LibraryRule[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRules = async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'general_config')
                .single();

            if (data?.setting_value?.library_rules) {
                setRules(data.setting_value.library_rules);
            }
            setLoading(false);
        };

        fetchRules();
    }, []);

    if (loading) return <LoadingScreen />;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mb-4 hover:gap-3 transition-all"
                    >
                        <ChevronLeft size={16} /> {t.backToDashboard}
                    </button>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
                        {t.libraryRules} <span className="text-indigo-600 dark:text-indigo-400">&</span> {t.policies}
                    </h1>
                </div>
            </header>

            <div className="grid gap-6">
                {rules.length > 0 ? (
                    rules.map((rule, index) => (
                        <div
                            key={rule.id}
                            className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden group"
                        >
                            {/* Decorative background icon */}
                            <div className="absolute -right-8 -bottom-8 text-slate-50 dark:text-slate-700/30 group-hover:text-indigo-50 dark:group-hover:text-indigo-900/20 transition-colors">
                                <BookOpen size={160} />
                            </div>

                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        {index === 0 ? <HelpCircle size={24} /> : (index === 1 ? <Shield size={24} /> : <Info size={24} />)}
                                    </div>
                                    <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                        {rule.title}
                                    </h2>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {rule.content}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpen size={40} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t.noPolicies}</h3>
                        <p className="text-slate-500 dark:text-slate-400">{t.noPoliciesSubtitle}</p>
                    </div>
                )}
            </div>

            {/* Support section */}
            <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left">
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{t.needClarification}</h3>
                        <p className="text-indigo-100/80 font-medium">{t.librarianSupport}</p>
                    </div>
                    <button className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-lg">
                        {t.visitLibraryDesk}
                    </button>
                </div>
            </div>
        </div>
    );
};
