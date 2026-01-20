import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft } from 'lucide-react';
import { LanguageSelector } from '../components/LanguageSelector';
import { DarkModeToggle } from '../components/DarkModeToggle';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Navbar */}
            <nav className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
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

            {/* Main Content */}
            <div className="flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full">
                    {/* Back to Home Link */}
                    <Link to="/" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-8">
                        <ArrowLeft size={16} />
                        <span className="text-sm font-bold uppercase tracking-widest">{t['backToHome'] || 'Back to Home'}</span>
                    </Link>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-xl border border-slate-200 dark:border-slate-700">
                        <div className="text-center mb-8">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">{t['login']}</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">{t['loginSubtitle'] || 'Sign in to access your library account'}</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 border border-red-100 dark:border-red-900/50">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t['email']}</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 dark:text-white placeholder-slate-400"
                                    placeholder="student@college.edu"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t['password']}</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 dark:text-white placeholder-slate-400"
                                    placeholder="••••••••"
                                />
                                <div className="flex justify-end">
                                    <Link to="/forgot-password" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                                        {t['forgotPassword']}
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 transition-all font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {loading ? t['submitting'] : t['login']}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                            {t['dontHaveAccount'] || "Don't have an account?"}{' '}
                            <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold hover:underline decoration-2 underline-offset-4 transition-all">
                                {t['registerForAccess'] || 'Register for access'}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
