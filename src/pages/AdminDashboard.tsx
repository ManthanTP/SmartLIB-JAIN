import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, BookOpen, TrendingUp, Activity, IndianRupee, Database, ShoppingBag, Armchair } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';
import { EmailAutomator } from '../lib/EmailAutomator';
import { FineManager } from '../lib/FineManager';
import { SeatManager } from '../lib/SeatManager';

export const AdminDashboard: React.FC = () => {
    const { t } = useLanguage();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeLoans: 0,
        pendingRequests: 0,
        pendingUsers: 0,
        pendingAcquisitions: 0,
        overdueBooks: 0,
        totalBooks: 0,
        totalFines: 0
    });
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const runHeartbeat = async () => {
            // 1. Fetch settings for managers
            const { data: settings } = await supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'general_config')
                .single();

            const checkInWindow = settings?.setting_value?.check_in_window_minutes || 15;

            // 2. Heartbeat triggers - Serialized to ensure data consistency
            // Update overdue fines first so EmailAutomator sees fresh data
            await FineManager.updateOverdueFines();
            await Promise.all([
                EmailAutomator.heartbeat(),
                SeatManager.checkAndReleaseExpiredSeats(checkInWindow)
            ]);

            // 3. Now fetch stats
            await fetchStats();
        };

        runHeartbeat();
    }, []);

    const fetchStats = async () => {
        const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
        const { count: pendingUsersCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'pending');
        const { count: loansCount } = await supabase.from('active_loans').select('*', { count: 'exact', head: true });
        const { count: requestsCount } = await supabase.from('loan_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: acquisitionsCount } = await supabase.from('acquisition_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: booksCount } = await supabase.from('books').select('*', { count: 'exact', head: true });

        const { data: activeLoansData } = await supabase.from('active_loans').select('due_date, fine_amount');
        const overdueCount = activeLoansData?.filter(l => new Date(l.due_date) < new Date()).length || 0;
        const totalFines = activeLoansData?.reduce((sum, l) => sum + (l.fine_amount || 0), 0) || 0;

        // Fetch recent activity
        const { data: auditLogs } = await supabase
            .from('audit_logs')
            .select('*, admin:users(full_name)')
            .order('created_at', { ascending: false })
            .limit(10);

        setStats({
            totalUsers: usersCount || 0,
            activeLoans: loansCount || 0,
            pendingRequests: requestsCount || 0,
            pendingUsers: pendingUsersCount || 0,
            pendingAcquisitions: acquisitionsCount || 0,
            overdueBooks: overdueCount,
            totalBooks: booksCount || 0,
            totalFines
        });
        setActivities(auditLogs || []);
        setLoading(false);
    };

    useEffect(() => {
        const channel = supabase
            .channel('admin_dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'active_loans' }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_requests' }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'acquisition_requests' }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, fetchStats)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, fetchStats)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const totalApprovals = stats.pendingRequests + stats.pendingUsers + stats.pendingAcquisitions;

    const statCards = [
        { title: t.totalStudents, value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', link: '/admin/users' },
        { title: t.activeLoans, value: stats.activeLoans, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100', link: '/admin/loans' },
        { title: t.actionRequired, value: totalApprovals, icon: Activity, color: 'text-red-600', bg: 'bg-red-100', link: '#approvals-hub' },
        { title: t.inventory, value: stats.totalBooks, icon: Database, color: 'text-purple-600', bg: 'bg-purple-100', link: '/admin/inventory' },
    ];

    if (loading) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg"></div>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-primary mb-2">{t.adminDashboard}</h1>
            <p className="text-text-secondary mb-6">{t.adminSubtitle}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={index}
                        whileHover={{
                            scale: 1.05,
                            rotateY: 10,
                            rotateX: -5,
                            z: 50
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ perspective: 1000 }}
                    >
                        <Link to={stat.link} className="block h-full glass p-6 rounded-[2rem] border border-white/20 dark:border-slate-700/30 hover:shadow-2xl transition-shadow overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">{stat.title}</p>
                                    <h3 className="text-3xl font-bold text-text-primary dark:text-white">{stat.value}</h3>
                                </div>
                                <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Approvals Hub */}
            <div id="approvals-hub" className="mb-8 scroll-mt-24">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                        <Activity size={20} />
                    </div>
                    <h3 className="font-black uppercase tracking-tight text-lg text-primary dark:text-white">{t.approvalsHub}</h3>
                    {totalApprovals > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                            {totalApprovals} {t.new}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="h-full">
                        <Link to="/admin/loans" className="block h-full bg-white dark:bg-slate-800 p-6 rounded-3xl border border-border dark:border-slate-700 hover:border-indigo-500 transition-all group shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    <BookOpen size={24} />
                                </div>
                                <span className={`text-2xl font-black ${stats.pendingRequests > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                                    {stats.pendingRequests}
                                </span>
                            </div>
                            <h4 className="font-bold text-text-primary dark:text-white">{t.loanRequests}</h4>
                            <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">{t.pendingIssues}</p>
                        </Link>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="h-full">
                        <Link to="/admin/users" className="block h-full bg-white dark:bg-slate-800 p-6 rounded-3xl border border-border dark:border-slate-700 hover:border-indigo-500 transition-all group shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Users size={24} />
                                </div>
                                <span className={`text-2xl font-black ${stats.pendingUsers > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                                    {stats.pendingUsers}
                                </span>
                            </div>
                            <h4 className="font-bold text-text-primary dark:text-white">{t.userVerification}</h4>
                            <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">{t.pendingApprovals}</p>
                        </Link>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="h-full">
                        <Link to="/admin/acquisitions" className="block h-full bg-white dark:bg-slate-800 p-6 rounded-3xl border border-border dark:border-slate-700 hover:border-indigo-500 transition-all group shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    <ShoppingBag size={24} />
                                </div>
                                <span className={`text-2xl font-black ${stats.pendingAcquisitions > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                                    {stats.pendingAcquisitions}
                                </span>
                            </div>
                            <h4 className="font-bold text-text-primary dark:text-white">{t.acquisitions}</h4>
                            <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">{t.pendingAcquisitions}</p>
                        </Link>
                    </motion.div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-border dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-lg text-primary dark:text-white">{t.quickActions}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Link to="/admin/inventory" className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 rounded-2xl group transition-all">
                            <Database className="text-slate-400 group-hover:text-indigo-600 mb-2" size={20} />
                            <p className="text-sm font-bold text-text-primary dark:text-white">{t.catalog}</p>
                            <p className="text-[10px] text-text-secondary dark:text-slate-500 uppercase tracking-widest">{t.manageBooks}</p>
                        </Link>
                        <Link to="/admin/loans" className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 rounded-2xl group transition-all">
                            <BookOpen className="text-slate-400 group-hover:text-indigo-600 mb-2" size={20} />
                            <p className="text-sm font-bold text-text-primary dark:text-white">{t.circulation}</p>
                            <p className="text-[10px] text-text-secondary dark:text-slate-500 uppercase tracking-widest">{t.issuesReturns}</p>
                        </Link>
                        <Link to="/seats" className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 rounded-2xl group transition-all">
                            <Armchair className="text-slate-400 group-hover:text-indigo-600 mb-2" size={20} />
                            <p className="text-sm font-bold text-text-primary dark:text-white">{t.seats}</p>
                            <p className="text-[10px] text-text-secondary dark:text-slate-500 uppercase tracking-widest">{t.monitorFloor}</p>
                        </Link>
                        <Link to="/admin/users" className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 rounded-2xl group transition-all">
                            <Users className="text-slate-400 group-hover:text-indigo-600 mb-2" size={20} />
                            <p className="text-sm font-bold text-text-primary dark:text-white">{t.registry}</p>
                            <p className="text-[10px] text-text-secondary dark:text-slate-500 uppercase tracking-widest">{t.verifyStudents}</p>
                        </Link>
                        <Link to="/admin/fines" className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 rounded-2xl group transition-all">
                            <IndianRupee className="text-slate-400 group-hover:text-indigo-600 mb-2" size={20} />
                            <p className="text-sm font-bold text-text-primary dark:text-white">{t.fines}</p>
                            <p className="text-[10px] text-text-secondary dark:text-slate-500 uppercase tracking-widest">{t.settleDues}</p>
                        </Link>
                        <Link to="/admin/acquisitions" className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 rounded-2xl group transition-all">
                            <Activity className="text-slate-400 group-hover:text-indigo-600 mb-2" size={20} />
                            <p className="text-sm font-bold text-text-primary dark:text-white">{t.acquisitions}</p>
                            <p className="text-[10px] text-text-secondary dark:text-slate-500 uppercase tracking-widest">{t.newBooks}</p>
                        </Link>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-border dark:border-slate-700">
                    <div className="items-center gap-3 mb-6 hidden md:flex">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Activity size={20} />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-lg text-primary dark:text-white">{t.recentActivity}</h3>
                    </div>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {activities.length === 0 ? (
                            <p className="text-center text-text-secondary py-10">{t.noRecentActivity}</p>
                        ) : (
                            activities.map((log) => (
                                <div key={log.id} className="flex gap-4 items-start pb-4 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0">
                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${log.action_type.includes('reset') ? 'bg-red-500' :
                                        log.action_type.includes('approve') ? 'bg-emerald-500' : 'bg-indigo-500'
                                        }`}></div>
                                    <div className="flex-1">
                                        <p className="text-sm text-text-primary dark:text-white leading-tight font-medium">
                                            <span className="font-bold">{(log.admin as any)?.full_name || 'Admin'}</span> {log.action_type.replace('_', ' ')}: <span className="text-text-secondary dark:text-slate-400">{log.details?.book || log.details?.student || log.entity_type}</span>
                                        </p>
                                        <p className="text-[10px] text-text-secondary dark:text-slate-500 uppercase tracking-widest mt-1">
                                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};
