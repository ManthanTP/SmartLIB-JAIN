import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, GraduationCap, QrCode, ArrowRight, Shield, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { DarkModeToggle } from '../components/DarkModeToggle';

export const Landing: React.FC = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    }, []);

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
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-white/20 dark:border-slate-700/30 backdrop-blur-sm shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800">
                        <LanguageSelector />
                        <div className="w-px h-6 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                        <DarkModeToggle />
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full mb-8 shadow-sm">
                        <Zap size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-slate-900 dark:text-white font-bold text-sm">{t['smartLibrarySystem'] || 'Smart Library Management'}</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-none">
                        {t['welcomeTo'] || 'Welcome to'}<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                            SmartLIB JAIN
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-4 max-w-3xl mx-auto font-medium">
                        Jain College of Engineering and Technology
                    </p>

                    <p className="text-base md:text-lg text-slate-500 dark:text-slate-500 mb-12 max-w-3xl mx-auto">
                        {t['landingSubtitle'] || 'Your gateway to seamless library services, academic resources, and smart seat management'}
                    </p>

                    <Link
                        to="/login"
                        className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-lg uppercase tracking-wide shadow-2xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
                    >
                        {t['getStarted'] || 'GET STARTED'}
                        <ArrowRight size={24} />
                    </Link>

                    <p className="mt-6 text-slate-500 dark:text-slate-400 text-sm font-medium">
                        {t['newUser'] || 'New user?'} <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">{t['registerForAccess'] || 'Register for Access'}</Link>
                    </p>
                </div>

                {/* Features Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Feature 1: Seat Booking */}
                    <div className="group bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:shadow-indigo-500/10 transition-all">
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <MapPin size={32} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight">{t['seatBooking'] || 'Smart Seat Booking'}</h3>
                        <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            {t['seatBookingDesc'] || 'Reserve your study space with real-time seat availability and easy check-in.'}
                        </p>
                    </div>

                    {/* Feature 2: VTU Hub */}
                    <div className="group bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:shadow-purple-500/10 transition-all">
                        <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <GraduationCap size={32} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight">{t['vtuHub'] || 'VTU Hub'}</h3>
                        <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            {t['vtuHubDesc'] || 'Access question papers, notes, lab manuals, and official VTU portals.'}
                        </p>
                    </div>

                    {/* Feature 3: Digital ID */}
                    <div className="group bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:shadow-emerald-500/10 transition-all">
                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <QrCode size={32} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight">{t['digitalId'] || 'Digital Identity'}</h3>
                        <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            {t['digitalIdDesc'] || 'Get instant verification with your digital ID QR code for quick library access.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="px-6 py-8 border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        © {new Date().getFullYear()} SmartLIB • Jain College of Engineering and Technology
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Shield size={16} />
                            <span className="text-sm font-medium">{t['secureReliable'] || 'Secure & Reliable'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Zap size={16} />
                            <span className="text-sm font-medium">{t['fastModern'] || 'Fast & Modern'}</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
