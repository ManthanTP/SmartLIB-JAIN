import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { LanguageSelector } from '../components/LanguageSelector';
import { DarkModeToggle } from '../components/DarkModeToggle';

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    useEffect(() => {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;
            setMessage(t['emailSent']);
        } catch (err: any) {
            setError(err.message || 'Error sending reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Navbar */}
            <nav className="px-4 py-4 md:px-8 md:py-6 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0">
                        <img src="/logo.png" alt="JAIN Logo" className="w-12 h-12 rounded-xl" />
                        <div>
                            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight block leading-none">SmartLIB</span>
                            <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hidden sm:block">JAIN (Deemed-to-be University)</span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/30 backdrop-blur-sm shadow-sm transition-all">
                        <LanguageSelector />
                        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                        <DarkModeToggle />
                    </div>
                </div>
            </nav>

            <div className="flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full">
                    <Link to="/login" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-8">
                        <ArrowLeft size={16} />
                        <span className="text-sm font-bold uppercase tracking-widest">{t['backToLogin']}</span>
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-xl border border-slate-200 dark:border-slate-700"
                    >
                        <div className="text-center mb-8">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
                                <KeyRound className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">{t['forgotPassword']}</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">{t['enterEmailToReset']}</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 dark:border-red-900/50 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {error}
                            </div>
                        )}

                        {message ? (
                            <div className="text-center">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl mb-6 text-sm font-medium border border-emerald-100 dark:border-emerald-900/50">
                                    {message}
                                </div>
                                <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline decoration-2 underline-offset-4 tracking-wide uppercase text-sm">
                                    {t['backToLogin']}
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleReset} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t['email']}</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 dark:text-white"
                                        placeholder="name@example.com"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 transition-all font-black uppercase tracking-wider disabled:opacity-50 text-sm"
                                >
                                    {loading ? t['submitting'] : t['sendResetLink']}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
