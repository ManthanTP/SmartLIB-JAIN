
import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Library,
    BookOpen,
    LogOut,
    User,
    Settings,
    Menu,
    X,
    Armchair,
    IndianRupee,
    ShoppingBag,
    FileStack,
    GraduationCap
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DarkModeToggle } from './DarkModeToggle';
import { LanguageSelector } from './LanguageSelector';
import { motion, AnimatePresence } from 'framer-motion';

export const Layout: React.FC = () => {
    const { signOut, profile, isAdmin } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [pendingCounts, setPendingCounts] = React.useState({
        loans: 0,
        users: 0,
        acquisitions: 0
    });

    useEffect(() => {
        document.title = t['title'];
    }, [t]);

    React.useEffect(() => {
        if (isAdmin) {
            fetchPendingCounts();
        }
    }, [isAdmin, location.pathname]);

    const fetchPendingCounts = async () => {
        try {
            const { count: loans } = await supabase.from('loan_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'pending');
            const { count: acquisitions } = await supabase.from('acquisition_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            setPendingCounts({
                loans: loans || 0,
                users: users || 0,
                acquisitions: acquisitions || 0
            });
        } catch (error) {
            console.error('Error fetching pending counts:', error);
        }
    };

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { path: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
        { path: '/books', label: t.catalog, icon: Library },
        { path: '/seats', label: t.seats, icon: Armchair },
        { path: '/my-loans', label: t.myActivity, icon: BookOpen },
        { path: '/request-book', label: t.requestBook || 'Request a Book', icon: ShoppingBag },
        { path: '/resources', label: t.vtuHub || 'VTU Hub', icon: GraduationCap },
        { path: '/profile', label: t.profile, icon: User },
    ];

    const adminNavItems = [
        { path: '/admin/inventory', label: t.inventory, icon: Library },
        { path: '/admin/loans', label: t.circulation, icon: BookOpen, count: pendingCounts.loans },
        { path: '/seats', label: t.seats || 'Seat Map', icon: Armchair },
        { path: '/admin/fines', label: t.fines || 'Fines', icon: IndianRupee },
        { path: '/admin/acquisitions', label: t.acquisitions || 'Acquisitions', icon: ShoppingBag, count: pendingCounts.acquisitions },
        { path: '/admin/resources', label: t.resources || 'Resources', icon: FileStack },
        { path: '/admin/users', label: t.registry, icon: User, count: pendingCounts.users },
        { path: '/admin/settings', label: t.settings || 'Settings', icon: Settings },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-screen relative overflow-hidden transition-colors duration-300">
            {/* Animated Background Elements - Optimized for performance */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full blur-[100px] bg-indigo-500/5" />
                <div className="absolute top-[30%] left-[-5%] w-[30%] h-[30%] rounded-full blur-[100px] bg-purple-500/5" />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 w-72 glass border-r border-white/20 dark:border-slate-700/30 transform transition-transform duration-300 ease-in-out z-30 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div className="flex items-center justify-between h-20 px-8 border-b border-white/20 dark:border-slate-700/30 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30">
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 shadow-lg shadow-indigo-500/10 group-hover:scale-105 transition-transform overflow-hidden flex items-center justify-center">
                            <img src="/logo.png" alt="SmartLIB Logo" className="h-full w-full object-cover" />
                        </div>
                        <span className="text-xl font-black uppercase tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{t['title']}</span>
                    </Link>
                    <button onClick={toggleSidebar} className="lg:hidden text-text-secondary hover:text-primary transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <nav className="p-6 space-y-2 overflow-y-auto h-[calc(100vh-5rem)]">
                    {!isAdmin && navItems.map((item) => (
                        <motion.div
                            key={item.path}
                            whileHover={{ x: 5 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Link
                                to={item.path}
                                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden ${isActive(item.path)
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 font-bold'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium'
                                    }`}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <item.icon size={20} className={`relative z-10 transition-transform duration-200 ${isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className="relative z-10">{item.label}</span>
                                {!isActive(item.path) && <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </Link>
                        </motion.div>
                    ))}

                    {isAdmin && (
                        <>
                            <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-6 mb-2">
                                {t.administration}
                            </div>
                            {adminNavItems.map((item) => (
                                <motion.div
                                    key={item.path}
                                    whileHover={{ x: 5 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Link
                                        to={item.path}
                                        className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden ${isActive(item.path)
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 font-bold'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium'
                                            }`}
                                        onClick={() => setIsSidebarOpen(false)}
                                    >
                                        <item.icon size={20} className={`relative z-10 transition-transform duration-200 ${isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'}`} />
                                        <span className="relative z-10">{item.label}</span>
                                        {(item as any).count > 0 && (
                                            <span className="relative z-10 ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                                                {(item as any).count}
                                            </span>
                                        )}
                                        {!isActive(item.path) && <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </Link>
                                </motion.div>
                            ))}
                        </>
                    )}

                    <div className="mt-auto pt-6 border-t border-white/20 dark:border-slate-700/30">
                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-3 px-4 py-3.5 w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors font-medium text-sm group"
                        >
                            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                            {t.signOut}
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
                {/* Header */}
                <header className="glass border-b border-white/20 dark:border-slate-700/30 h-20 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-20">
                    <button onClick={toggleSidebar} className="lg:hidden text-text-secondary p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Menu size={24} />
                    </button>

                    <div className="flex-1 flex justify-end items-center gap-4 lg:gap-6">
                        <div className="hidden sm:flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-white/20 dark:border-slate-700/30 backdrop-blur-sm">
                            <LanguageSelector />
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <DarkModeToggle />
                        </div>

                        {/* Mobile controls fallback */}
                        <div className="flex sm:hidden items-center gap-2 bg-white/50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-white/20 dark:border-slate-700/30 backdrop-blur-sm">
                            <LanguageSelector />
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <DarkModeToggle />
                        </div>

                        <div className="flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold text-slate-800 dark:text-white">
                                    {profile?.full_name || 'User'}
                                </div>
                                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                                    {profile?.role || 'Guest'}
                                </div>
                            </div>
                            {profile?.profile_photo_url ? (
                                <img
                                    src={profile.profile_photo_url}
                                    alt="Profile"
                                    className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-700 shadow-md object-cover ring-2 ring-indigo-500/20"
                                />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
                                    {profile?.full_name?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto p-4 lg:p-8 scroll-smooth">
                    <div className="container mx-auto max-w-7xl">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
};
