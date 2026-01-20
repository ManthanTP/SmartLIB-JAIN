import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import {
    BookOpen,
    Calendar,
    IndianRupee,
    X,
    GraduationCap,
    ShieldCheck,
    Info as InfoIcon,
    QrCode,
    ChevronRight,
    MapPin,
    Search,
    Book,
    FileText,
    Zap,
    Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAfter } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { BookCover } from '../components/BookCover';
import { LoadingScreen } from '../components/LoadingScreen';
import { FineManager } from '../lib/FineManager';

export const Dashboard: React.FC = () => {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(true);
    const [activeLoanDetails, setActiveLoanDetails] = React.useState<any[]>([]);
    const [showIdCard, setShowIdCard] = React.useState(false);
    const [showQrExplanation, setShowQrExplanation] = React.useState(false);
    const [stats, setStats] = React.useState({
        activeLoans: 0,
        fines: 0,
        reservations: 0,
        recommendations: [] as any[],
        seat: null as any
    });
    const [timeLeft, setTimeLeft] = React.useState<string>('');

    const handleCheckIn = async () => {
        if (!stats.seat) return;
        const { error } = await supabase
            .from('seats')
            .update({
                is_checked_in: true,
                checked_in_at: new Date().toISOString()
            })
            .eq('id', stats.seat.id);

        if (error) {
            alert('Check-in failed: ' + error.message);
        } else {
            alert('Checked in successfully!');
            fetchDashboardData();
        }
    };

    React.useEffect(() => {
        if (profile?.role === 'admin') {
            navigate('/admin');
        }
    }, [profile]);

    React.useEffect(() => {
        if (profile && profile.role !== 'admin') {
            fetchDashboardData();
        }
    }, [profile]);

    React.useEffect(() => {
        const timer = setInterval(() => {
            if (stats.seat?.booking_end) {
                const end = new Date(stats.seat.booking_end);
                const now = new Date();
                if (isAfter(end, now)) {
                    const diff = end.getTime() - now.getTime();
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${h}h ${m}m ${s}s`);
                } else {
                    setTimeLeft('Expired');
                    fetchDashboardData();
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [stats.seat]);

    const fetchDashboardData = async () => {
        if (!profile) return;
        try {
            await FineManager.updateOverdueFines();

            // Parallelize requests for performance
            const [loansRes, finesRes, reservationsRes, seatsRes] = await Promise.all([
                supabase.from('active_loans').select('*, book:books(*)').eq('student_id', profile.id).order('due_date'),
                supabase.from('active_loans').select('fine_amount').eq('student_id', profile.id),
                supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('student_id', profile.id).eq('status', 'confirmed'),
                supabase.from('seats').select('*').eq('occupied_by', profile.id).limit(1)
            ]);

            const totalFines = finesRes.data?.reduce((sum, item) => sum + (item.fine_amount || 0), 0) || 0;
            const seat = seatsRes.data?.[0] || null;

            // Recommendations logic
            let { data: recs } = await supabase
                .from('books')
                .select('id, title, authors, cover_image_url, available_copies, category, departments')
                .contains('departments', [profile.department])
                .is('is_deleted', false)
                .limit(4);

            if (!recs || recs.length === 0) {
                const { data: fallbackRecs } = await supabase
                    .from('books')
                    .select('id, title, authors, cover_image_url, available_copies, category, departments')
                    .is('is_deleted', false)
                    .limit(4);
                recs = fallbackRecs;
            }

            // Seat auto-release logic check
            if (seat && !seat.is_checked_in) {
                const bookingStart = new Date(seat.booking_start);
                const now = new Date();
                const diffInMinutes = (now.getTime() - bookingStart.getTime()) / (1000 * 60);

                if (diffInMinutes > 15) {
                    await supabase.from('seats').update({
                        status: 'available',
                        occupied_by: null,
                        booking_start: null,
                        booking_end: null,
                        is_checked_in: false,
                        checked_in_at: null
                    }).eq('id', seat.id);

                    setStats({
                        activeLoans: loansRes.data?.length || 0,
                        fines: totalFines,
                        reservations: reservationsRes.count || 0,
                        recommendations: recs || [],
                        seat: null
                    });
                    setActiveLoanDetails(loansRes.data || []);
                    return;
                }
            }

            setStats({
                activeLoans: loansRes.data?.length || 0,
                fines: totalFines,
                reservations: reservationsRes.count || 0,
                recommendations: recs || [],
                seat: seat
            });
            setActiveLoanDetails(loansRes.data || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingScreen />;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring" as const, stiffness: 300, damping: 24 }
        }
    };

    return (
        <div className="min-h-screen pb-20">
            {/* Header Section */}
            <header className="mb-10 pt-4 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 dark:bg-slate-800/60 border border-white/20 dark:border-white/5 mb-3"
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                            {profile?.department} • {profile?.academic_year || t['student']}
                        </span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
                    >
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                            {t['welcomeBack']},
                        </span> <br />
                        {profile?.full_name?.split(' ')[0]}
                    </motion.h1>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3"
                >
                    <button
                        onClick={() => setShowIdCard(true)}
                        className="group relative overflow-hidden px-6 py-3 bg-slate-900 dark:bg-white rounded-2xl flex items-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 active:scale-95"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <QrCode size={20} className="text-white dark:text-slate-900 relative z-10 group-hover:rotate-12 transition-transform" />
                        <span className="font-bold text-white dark:text-slate-900 relative z-10 text-sm uppercase tracking-wide">{t['digitalId']}</span>
                    </button>
                    <button
                        onClick={() => setShowQrExplanation(true)}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-white hover:text-indigo-600 transition-all shadow-sm hover:shadow-md"
                    >
                        <InfoIcon size={20} />
                    </button>
                </motion.div>
            </header >

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-12 gap-6"
            >
                {/* Top Row: Main Status Cards (4 items) */}
                <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-2">
                    {/* Active Loans Card */}
                    <Link to="/my-loans" className="group relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-white/5 p-5 rounded-[1.5rem] hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                                    <BookOpen size={20} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tight text-slate-400 leading-tight">{t['myLoans']}</span>
                            </div>
                            <div className="mt-4">
                                <span className="text-3xl font-black text-slate-900 dark:text-white block mb-0.5">{stats.activeLoans}</span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 transition-colors">{t['activeLoans']}</span>
                            </div>
                        </div>
                    </Link>

                    {/* Fines Card */}
                    <Link to="/my-loans?tab=fines" className="group relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-white/5 p-5 rounded-[1.5rem] hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-300">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors" />
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                                    <IndianRupee size={20} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tight text-slate-400 leading-tight">{t['paymentRequired']}</span>
                            </div>
                            <div className="mt-4">
                                <span className="text-3xl font-black text-slate-900 dark:text-white block mb-0.5">₹{stats.fines}</span>
                                <span className={`text-xs font-bold transition-colors ${stats.fines > 0 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400 group-hover:text-rose-600'}`}>
                                    {stats.fines > 0 ? t['outstandingFines'] : t['noPendingDues']}
                                </span>
                            </div>
                        </div>
                    </Link>

                    {/* Reservations Card */}
                    <Link to="/my-loans?tab=reservations" className="group relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-white/5 p-5 rounded-[1.5rem] hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                                    <Calendar size={20} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tight text-slate-400 leading-tight">{t['reservations']}</span>
                            </div>
                            <div className="mt-4">
                                <span className="text-3xl font-black text-slate-900 dark:text-white block mb-0.5">{stats.reservations}</span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-amber-600 transition-colors">{t['reservations']}</span>
                            </div>
                        </div>
                    </Link>

                    {/* Seat Booking Card (Final item in Row 1) */}
                    <Link to="/seats" className="group block relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[1.5rem] p-5 text-white shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] transition-transform duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors duration-500" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-tight mb-0.5">{t['seatBooking']}</h3>
                                    <p className="text-indigo-100/80 font-bold text-[8px] uppercase tracking-wider">
                                        {stats.seat ? t['myActiveSpace'] : t['noActiveBooking']}
                                    </p>
                                </div>
                                <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                                    <MapPin size={14} className="text-indigo-100" />
                                </div>
                            </div>

                            <div className="mt-4">
                                {stats.seat ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-indigo-200">{t['seat']} {stats.seat.seat_number.split('-').pop()}</span>
                                            <span className="text-lg font-black tabular-nums">{timeLeft}</span>
                                        </div>
                                        {stats.seat.is_checked_in ? (
                                            <div className="text-[8px] font-black uppercase p-1 rounded bg-black/20 text-emerald-300">
                                                {t['occupied']}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleCheckIn();
                                                }}
                                                className="px-2 py-1.5 bg-white text-indigo-900 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                                            >
                                                {t['checkInNow']}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                                            <Search size={14} />
                                        </div>
                                        <span className="font-bold text-sm">{t['bookSeat']}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Main Content: Currently Reading & Quick Actions */}
                <div className="md:col-span-8 flex flex-col gap-6">
                    {activeLoanDetails.length > 0 && (
                        <motion.div variants={itemVariants} className="w-full">
                            <h2 className="text-base font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400" />
                                {t['currentlyReading']}
                            </h2>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {activeLoanDetails.map((loan) => (
                                    <div key={loan.id} className="min-w-[260px] bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-white/20 dark:border-white/5 shadow-sm flex gap-4 items-center">
                                        <div className="w-14 h-20 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
                                            <BookCover url={loan.book?.cover_image_url} title={loan.book?.title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-2 mb-1">{loan.book?.title}</h3>
                                            <p className={`text-[10px] mb-2 truncate ${isAfter(new Date(), new Date(loan.due_date)) ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {t['dueLabel']}: {new Date(loan.due_date).toLocaleDateString()}
                                            </p>
                                            <Link to={`/books/${loan.book_id}`} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline">
                                                {t['continueReading']} →
                                            </Link>
                                            {isAfter(new Date(), new Date(loan.due_date)) && (
                                                <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-red-500 animate-pulse">
                                                    {t['overdueInfo']}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                </div>

                {/* Sidebar: Quick Actions */}
                <div className="md:col-span-4 flex flex-col gap-4">
                    <h2 className="text-base font-black text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                        <Zap size={20} className="text-amber-500" />
                        Quick Links
                    </h2>

                    {/* Rules Card - Yellow Theme */}
                    <Link to="/rules" className="group relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 text-white p-4 rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-transform duration-300">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/30 transition-colors" />
                        <div className="relative z-10 flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md border border-white/20">
                                <FileText size={18} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-tight">{t['checkRules']}</h3>
                        </div>
                    </Link>

                    {/* My Activity Card - Indigo/Blue Theme */}
                    <Link to="/my-loans" className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-700 text-white p-4 rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-transform duration-300">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/30 transition-colors" />
                        <div className="relative z-10 flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md border border-white/20">
                                <Activity size={18} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-tight">{t['myActivity']}</h3>
                        </div>
                    </Link>

                    {/* Browse Catalog Card - Violet/Purple Theme */}
                    <Link to="/books" className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 text-white p-4 rounded-2xl shadow-xl shadow-purple-500/20 hover:scale-[1.02] transition-transform duration-300">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/30 transition-colors" />
                        <div className="relative z-10 flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md border border-white/20">
                                <Book size={18} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-tight">{t['browseCatalog']}</h3>
                        </div>
                    </Link>
                </div>

                {/* Recommendations Carousel (Full Width) */}
                <motion.div variants={itemVariants} className="md:col-span-12 mt-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                            <span className="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                            {t['recommendedBooks']}
                        </h2>
                        <Link to="/books" className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 group">
                            {t['exploreCatalog']} <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {stats.recommendations.map((book, i) => (
                                <motion.div
                                    key={book.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * i }}
                                >
                                    <Link to={`/books/${book.id}`} className="group block h-full">
                                        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-white/5 p-4 rounded-[2rem] hover:scale-[1.03] hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 h-full flex flex-col">
                                            <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-4 shadow-lg group-hover:shadow-xl transition-shadow relative">
                                                <BookCover
                                                    url={book.cover_image_url}
                                                    title={book.title}
                                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                                />
                                                <div className="absolute top-2 right-2">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/20 ${book.available_copies > 0 ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                                                        {book.available_copies > 0 ? t['availableStatus'] : 'Waitlist'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col">
                                                <h3 className="font-bold text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {book.title}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">
                                                    {book.authors?.join(', ')}
                                                </p>
                                                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/80">
                                                        {book.category}
                                                    </span>
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                        <ChevronRight size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>

            {/* Modals */}
            {
                showIdCard && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="relative w-full max-w-sm aspect-[1.58/1] bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2rem] shadow-2xl p-8 text-white overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
                            {/* ID Card Content - Kept mostly same but refined */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <GraduationCap size={24} className="text-indigo-400" />
                                            <span className="text-lg font-black tracking-tighter uppercase italic">SmartLIB</span>
                                        </div>
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">JAIN {t['university']} {t['memberStatus']}</p>
                                    </div>
                                    <button onClick={() => setShowIdCard(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex gap-6 items-center">
                                    <div className="bg-white p-2 rounded-2xl shadow-lg">
                                        <QRCodeCanvas value={`${window.location.origin}/verify/${profile?.id}`} size={80} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">{t['student']}</p>
                                        <p className="text-xl font-black uppercase tracking-tight mb-2">{profile?.full_name}</p>
                                        <div className="flex gap-4">
                                            <div>
                                                <p className="text-[8px] font-bold uppercase text-slate-400">{t['usn']}</p>
                                                <p className="font-bold text-sm text-indigo-300">{profile?.student_id}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold uppercase text-slate-400">{t['branch']}</p>
                                                <p className="font-bold text-sm text-indigo-300">{profile?.department}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-emerald-400 mt-2">
                                    <ShieldCheck size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{t['verifiedIdentity']}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* QR Explanation Modal - Simplified */}
            {
                showQrExplanation && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95">
                            <button onClick={() => setShowQrExplanation(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={20} />
                            </button>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{t['digitalId']}</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">{t['qrInstruction1']}</p>
                            <ul className="space-y-4">
                                <li className="flex gap-4 items-center p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-500/30 rounded-xl text-indigo-600 dark:text-indigo-400"><MapPin size={20} /></div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{t['qrInstruction2']}</span>
                                </li>
                                <li className="flex gap-4 items-center p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-500/30 rounded-xl text-purple-600 dark:text-purple-400"><BookOpen size={20} /></div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{t['requestBook']}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
