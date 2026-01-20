import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DEPARTMENTS } from '../lib/constants';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { LanguageSelector } from '../components/LanguageSelector';
import { DarkModeToggle } from '../components/DarkModeToggle';

export const Register: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [departments, setDepartments] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        studentId: '',
        branch: '',
        year: ''
    });

    useEffect(() => {
        const fetchDepts = async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'general_config')
                .single();
            if (data?.setting_value?.departments) {
                setDepartments(data.setting_value.departments);
                // Set default branch if not set
                if (!formData.branch && data.setting_value.departments.length > 0) {
                    setFormData(prev => ({ ...prev, branch: data.setting_value.departments[0] }));
                }
            } else {
                setDepartments([...DEPARTMENTS]);
            }
        };
        fetchDepts();

        const theme = localStorage.getItem('theme');
        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'branch') {
            // Reset year if it's no longer valid for new branch
            if (value === 'PHD-ME') {
                setFormData(prev => ({ ...prev, branch: value, year: 'N/A' }));
                return;
            } else if (value === 'MBA' && (formData.year === 'Third Year' || formData.year === 'Final Year')) {
                setFormData(prev => ({ ...prev, branch: value, year: '' }));
                return;
            }
        }
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        student_id: formData.studentId,
                        department: formData.branch,
                        academic_year: formData.year
                    },
                },
            });

            if (signUpError) throw signUpError;
            if (!data.user) throw new Error('User data not returned after sign up.');

            // Fetch auto-approval setting
            const { data: config, error: configError } = await supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'general_config')
                .single();

            if (configError) console.error('Error fetching system settings:', configError);

            const autoApprove = config?.setting_value?.auto_approve_registrations ?? false;

            if (autoApprove) {
                const { error: userUpdateError } = await supabase.from('users').update({ status: 'active' }).eq('id', data.user.id);
                if (userUpdateError) console.error('Error updating user status:', userUpdateError);
            }

            alert(autoApprove ? 'Account created and activated!' : 'Account created! Waiting for librarian approval.');
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Failed to register');
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

            {/* Main Content */}
            <div className="flex items-center justify-center px-6 py-12">
                <div className="max-w-2xl w-full">
                    {/* Back Link */}
                    <Link to="/" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-8">
                        <ArrowLeft size={16} />
                        <span className="text-sm font-bold uppercase tracking-widest">{t['backToHome']}</span>
                    </Link>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-200 dark:border-slate-700">
                        <div className="text-center mb-10">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
                                <UserPlus className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">{t['joinSmartLIB']}</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">{t['studentRegistration']}</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 border border-red-100 dark:border-red-900/50">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t['fullName'] || 'Full Name'}</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        required
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t['studentId']}</label>
                                    <input
                                        type="text"
                                        name="studentId"
                                        required
                                        value={formData.studentId}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t['branch']}</label>
                                    <select
                                        name="branch"
                                        required
                                        value={formData.branch}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 dark:text-white"
                                    >
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Semester</label>
                                    <select
                                        name="year"
                                        required={formData.branch !== 'PHD-ME'}
                                        value={formData.year}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 dark:text-white disabled:opacity-50"
                                        disabled={formData.branch === 'PHD-ME'}
                                    >
                                        <option value="">{formData.branch === 'PHD-ME' ? 'Not Applicable' : 'Select Semester'}</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                                            if (formData.branch === 'MBA' && num > 4) return null;
                                            if (formData.branch === 'PHD-ME') return null;
                                            return (
                                                <option key={num} value={`${num}${num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Semester`}>
                                                    {num}{num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Semester
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t['email']}</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 dark:text-white"
                                        placeholder="student@college.edu"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t['password']}</label>
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        minLength={8}
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 dark:text-white"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 transition-all font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {loading ? t['submitting'] : t['register']}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                            {t['alreadyHaveAccount']}{' '}
                            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold hover:underline decoration-2 underline-offset-4 transition-all">
                                {t['signInHere']}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
