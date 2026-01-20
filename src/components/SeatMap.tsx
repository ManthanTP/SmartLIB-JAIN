import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Info, Monitor, Layers, ChevronLeft, ArrowRight, Armchair, Search, User, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SeatManager } from '../lib/SeatManager';

type Seat = {
    id: string;
    seat_number: string;
    zone: string;
    status: 'available' | 'occupied' | 'maintenance';
    is_checked_in?: boolean;
    checked_in_at?: string;
    booking_start?: string;
    booking_end?: string;
    occupied_by?: string;
    occupant?: {
        full_name: string;
        profiles?: {
            student_id: string;
        };
    };
};

export const SeatMap: React.FC = () => {
    const { profile, isAdmin } = useAuth();
    const { t } = useLanguage();
    const [seats, setSeats] = useState<Seat[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [adminSelectedSeat, setAdminSelectedSeat] = useState<Seat | null>(null);
    const [searchUsn, setSearchUsn] = useState('');
    const [premiumSearchResults, setPremiumSearchResults] = useState<{ user: any; seat: Seat | null }[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [highlightedSeatId, setHighlightedSeatId] = useState<string | null>(null);
    const [seatTimeout, setSeatTimeout] = useState(4); // Default 4 hours
    const [checkInWindow, setCheckInWindow] = useState(15); // Default 15 mins
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        fetchSeats();
        fetchSettings();

        // Real-time seats
        const seatsSubscription = supabase
            .channel('seats_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, () => {
                fetchSeats();
            })
            .subscribe();

        // Real-time settings for instant Rate/Timeout updates
        const settingsSubscription = supabase
            .channel('settings_channel')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'system_settings',
                filter: `setting_key=eq.general_config`
            }, (payload) => {
                console.log('Settings updated in real-time:', payload.new);
                if (payload.new?.setting_value?.seat_timeout_hours) {
                    setSeatTimeout(payload.new.setting_value.seat_timeout_hours);
                }
                if (payload.new?.setting_value?.check_in_window_minutes) {
                    setCheckInWindow(payload.new.setting_value.check_in_window_minutes);
                }
            })
            .subscribe();

        return () => {
            seatsSubscription.unsubscribe();
            settingsSubscription.unsubscribe();
        };
    }, []);

    // Cleanup interval depends on checkInWindow
    useEffect(() => {
        // Initial check
        SeatManager.checkAndReleaseExpiredSeats(checkInWindow);

        const cleanupInterval = setInterval(() => {
            SeatManager.checkAndReleaseExpiredSeats(checkInWindow);
        }, 5 * 60 * 1000); // Check every 5 minutes

        return () => clearInterval(cleanupInterval);
    }, [checkInWindow]);


    // Premium Search Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (isAdmin && searchUsn.trim().length >= 2) {
                setSearchLoading(true);
                const results = await SeatManager.searchStudents(searchUsn);
                setPremiumSearchResults(results as any);
                setSearchLoading(false);
            } else {
                setPremiumSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchUsn, isAdmin]);

    const fetchSettings = async () => {
        const { data } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'general_config')
            .single();
        if (data?.setting_value?.seat_timeout_hours) {
            setSeatTimeout(data.setting_value.seat_timeout_hours);
        }
        if (data?.setting_value?.check_in_window_minutes) {
            setCheckInWindow(data.setting_value.check_in_window_minutes);
        }
    };

    const fetchSeats = async () => {
        const { data } = await supabase
            .from('seats')
            .select(`
                *,
                occupant:users(
                    full_name,
                    profiles(student_id)
                )
            `)
            .order('seat_number');
        setSeats(data as any[] || []);
        setLoading(false);
    };

    const groupedSeats = useMemo(() => {
        const groups: Record<string, Seat[]> = {};
        seats.forEach(s => {
            if (!groups[s.zone]) groups[s.zone] = [];
            groups[s.zone].push(s);
        });
        return groups;
    }, [seats]);

    const zones = Object.keys(groupedSeats).sort();

    const mySeat = useMemo(() => {
        return seats.find(s => s.status === 'occupied' && s.occupied_by === profile?.id);
    }, [seats, profile]);

    // Active Booking Timer
    useEffect(() => {
        const timer = setInterval(() => {
            if (mySeat?.booking_end) {
                const end = new Date(mySeat.booking_end);
                const now = new Date();
                const diff = end.getTime() - now.getTime();

                if (diff > 0) {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${h}h ${m}m ${s}s`);
                } else {
                    setTimeLeft('Expired');
                    fetchSeats(); // Refresh to clear
                }
            } else {
                setTimeLeft('');
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [mySeat]);

    const handleSeatClick = (seat: Seat) => {
        if (isAdmin) {
            setAdminSelectedSeat(seat);
        } else if (seat.status === 'available') {
            setSelectedSeat(seat);
        } else if (seat.status === 'occupied' && seat.occupied_by === profile?.id) {
            // Student clicking their own seat
            setAdminSelectedSeat(seat); // Reuse admin modal for release
        }
    };

    const resetFloor = async () => {
        if (!confirm(t.confirmResetFloor)) return;

        // Get all currently occupied seats to check out their occupants
        const occupiedSeats = seats.filter(s => s.status === 'occupied' && s.occupied_by);
        const studentIds = occupiedSeats.map(s => s.occupied_by).filter(Boolean);

        const { error } = await supabase
            .from('seats')
            .update({
                status: 'available',
                occupied_by: null,
                booking_start: null,
                booking_end: null,
                is_checked_in: false,
                checked_in_at: null
            })
            .neq('status', 'maintenance');

        if (!error) {
            // Check out all students who had seats
            if (studentIds.length > 0) {
                await supabase
                    .from('library_visits')
                    .update({ check_out: new Date().toISOString() })
                    .in('student_id', studentIds)
                    .is('check_out', null);
            }

            await supabase.from('audit_logs').insert([{
                admin_id: profile?.id,
                action_type: 'reset_floor',
                entity_type: 'floor',
                details: { timestamp: new Date().toISOString(), students_checked_out: studentIds.length }
            }]);
            fetchSeats();
            alert(t.floorResetSuccess);
        }
    };

    const toggleMaintenance = async (seat: Seat) => {
        const newStatus = seat.status === 'maintenance' ? 'available' : 'maintenance';
        const { error } = await supabase
            .from('seats')
            .update({ status: newStatus })
            .eq('id', seat.id);

        if (!error) {
            await supabase.from('audit_logs').insert([{
                admin_id: profile?.id,
                action_type: 'toggle_maintenance',
                entity_type: 'seat',
                entity_id: seat.id,
                details: { seat_number: seat.seat_number, status: newStatus }
            }]);
            setAdminSelectedSeat(null);
            fetchSeats();
        }
    };

    const releaseSeat = async (seat: Seat) => {
        const { error } = await supabase
            .from('seats')
            .update({
                status: 'available',
                occupied_by: null,
                booking_start: null,
                booking_end: null,
                is_checked_in: false,
                checked_in_at: null
            })
            .eq('id', seat.id);

        if (!error) {
            // Check out student from library if they have an active visit
            if (seat.occupied_by) {
                const { data: activeVisit } = await supabase
                    .from('library_visits')
                    .select('id')
                    .eq('student_id', seat.occupied_by)
                    .is('check_out', null)
                    .order('check_in', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (activeVisit) {
                    await supabase
                        .from('library_visits')
                        .update({ check_out: new Date().toISOString() })
                        .eq('id', activeVisit.id);
                }
            }

            await supabase.from('audit_logs').insert([{
                admin_id: profile?.id,
                action_type: 'release_seat',
                entity_type: 'seat',
                entity_id: seat.id,
                details: { seat_number: seat.seat_number }
            }]);
            setAdminSelectedSeat(null);
            fetchSeats();
        }
    };

    const handleCheckIn = async (seat: Seat) => {
        if (!seat || !profile) return;

        try {
            // 1. Check if student already has an active library visit (not checked out)
            const { data: existingVisit, error: visitCheckError } = await supabase
                .from('library_visits')
                .select('*')
                .eq('student_id', seat.occupied_by)
                .is('check_out', null)
                .order('check_in', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (visitCheckError) {
                console.error('Error checking existing visit:', visitCheckError);
            }

            // 2. Update seat check-in status
            const { error: seatError } = await supabase
                .from('seats')
                .update({
                    is_checked_in: true,
                    checked_in_at: new Date().toISOString()
                })
                .eq('id', seat.id);

            if (seatError) throw seatError;

            // 3. Create library visit entry if none exists
            if (!existingVisit) {
                const { error: visitError } = await supabase
                    .from('library_visits')
                    .insert([{
                        student_id: seat.occupied_by,
                        check_in: new Date().toISOString(),
                        visit_date: new Date().toISOString().split('T')[0]
                    }]);

                if (visitError) {
                    console.error('Failed to create library visit:', visitError);
                    // Don't fail the whole operation if visit logging fails
                }
            }

            alert(t.checkInSuccess);
            setAdminSelectedSeat(null);
            fetchSeats();
        } catch (err: any) {
            alert(t.failedToCheckIn + ': ' + err.message);
        }
    };

    const isCheckInWindowExceeded = (seat: Seat) => {
        if (!seat.booking_start || seat.is_checked_in) return false;
        const startTime = new Date(seat.booking_start).getTime();
        const now = Date.now();
        const windowMs = checkInWindow * 60 * 1000;
        return now - startTime > windowMs;
    };

    const confirmBooking = async () => {
        if (!selectedSeat || !profile) return;
        setBookingLoading(true);

        try {
            // Check for existing occupancy (Single Seat Rule)
            const activeBooking = await SeatManager.hasActiveBooking(profile.id);
            if (activeBooking) {
                alert(t.alreadyReserved);
                setBookingLoading(false);
                setSelectedSeat(null);
                return;
            }

            const { error } = await supabase
                .from('seats')
                .update({
                    status: 'occupied',
                    occupied_by: profile.id,
                    booking_start: new Date().toISOString(),
                    booking_end: new Date(Date.now() + seatTimeout * 60 * 60 * 1000).toISOString(),
                    is_checked_in: false,
                    checked_in_at: null
                })
                .eq('id', selectedSeat.id)
                .eq('status', 'available');

            if (error) throw error;
            alert(t.seatBookedSuccess);
            setSelectedSeat(null);
            fetchSeats();
        } catch (err: any) {
            alert(t.failedToBookSeat + ': ' + err.message);
        } finally {
            setBookingLoading(false);
        }
    };

    const handleLocateSeat = (seat: Seat) => {
        setSelectedZone(seat.zone);
        setAdminSelectedSeat(seat);
        setPremiumSearchResults([]);
        setSearchUsn('');

        // Highlight effect
        setHighlightedSeatId(seat.id);
        setTimeout(() => setHighlightedSeatId(null), 5000); // Highlight for 5 seconds
    };

    const isComputerZone = (z: string) => z.toLowerCase().includes('computer');

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-indigo-100 dark:border-slate-800 pb-8 gap-6 transition-colors">
                <div>
                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase block mb-1 tracking-widest">{t.librarySpace}</span>
                    <div className="flex items-center gap-4">
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
                            {selectedZone || t.floorMap}
                        </h2>
                        {isAdmin && (
                            <button
                                onClick={resetFloor}
                                className="px-3 py-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                            >
                                {t.resetFloor}
                            </button>
                        )}
                    </div>
                </div>

                {/* Admin USN Search */}
                {isAdmin && (
                    <div className="flex-1 max-w-md relative group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder={t.locateStudentPlaceholder}
                            value={searchUsn}
                            onChange={(e) => setSearchUsn(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold transition-all shadow-sm"
                        />

                        {/* Premium Search Results Dropdown */}
                        {premiumSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-[70] animate-in slide-in-from-top-2 duration-200">
                                <div className="p-2 space-y-1">
                                    {premiumSearchResults.map((result, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-2xl flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white leading-tight">
                                                        {result.user.full_name}
                                                    </h5>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {result.user.profiles?.student_id || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    {result.seat ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-black text-emerald-500 uppercase">{t.seated}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{result.seat.zone} • {result.seat.seat_number}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-red-500 uppercase">{t.notInLibrary}</span>
                                                    )}
                                                </div>
                                                {result.seat && (
                                                    <button
                                                        onClick={() => handleLocateSeat(result.seat as Seat)}
                                                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                                                    >
                                                        {t.locate}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {searchLoading && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                            </div>
                        )}
                    </div>
                )}

                {/* Legend */}
                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div> {t.available}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div> {t.occupied}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div> {t.maintenanceShort}
                    </div>
                </div>
            </header>

            {/* My Seat Banner */}
            {!isAdmin && mySeat && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-500/30 animate-in slide-in-from-top-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 border border-white/10 relative overflow-hidden group">
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform">
                            <Armchair size={32} />
                        </div>
                        <div className="flex flex-col">
                            <h4 className="font-black uppercase tracking-[0.2em] text-[10px] text-indigo-200 mb-1">{t.myActiveSpace}</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black uppercase tracking-tight">{t.table} {mySeat.zone}</span>
                                <span className="text-sm font-bold opacity-60">•</span>
                                <span className="text-2xl font-black uppercase tracking-tight">{t.seat} {mySeat.seat_number.split('-').pop()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 relative z-10">
                        {/* Prominent Timer */}
                        <div className="flex flex-col items-center justify-center px-8 py-3 bg-white/10 rounded-[1.5rem] border border-white/20 backdrop-blur-sm">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-0.5">{t.timeRemaining}</span>
                            <div className={`text-3xl font-black tabular-nums tracking-tighter ${(timeLeft.startsWith('0h 0m') || timeLeft.startsWith('0h 1') || timeLeft === 'Expired')
                                ? 'text-red-300 animate-pulse scale-105'
                                : 'text-white'
                                }`}>
                                {timeLeft}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {!mySeat.is_checked_in && (
                                <button
                                    onClick={() => handleCheckIn(mySeat)}
                                    className="flex-1 md:flex-none px-8 py-4 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl shadow-black/10 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={16} /> {t.checkInNow}
                                </button>
                            )}
                            <button
                                onClick={() => setAdminSelectedSeat(mySeat)}
                                className="flex-1 md:flex-none px-8 py-4 bg-indigo-500/30 text-white border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                            >
                                {t.manage}
                            </button>
                        </div>
                    </div>

                    {isCheckInWindowExceeded(mySeat) && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-500 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse border border-white/20">
                            {t.checkInRequiredImmediately}
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : selectedZone === null ? (
                /* Zone Selection View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {zones.map(zone => {
                        const zoneSeats = groupedSeats[zone];
                        const availableCount = zoneSeats.filter(s => s.status === 'available').length;
                        const isComp = isComputerZone(zone);

                        return (
                            <button
                                key={zone}
                                onClick={() => setSelectedZone(zone)}
                                className="p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-900 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all hover:scale-[1.02] text-left relative overflow-hidden group h-64 flex flex-col justify-between"
                            >
                                <div>
                                    {isComp ?
                                        <Monitor size={40} className="text-indigo-600 dark:text-indigo-400 mb-4 transition-transform group-hover:scale-110" /> :
                                        <Layers size={40} className="text-slate-400 group-hover:text-emerald-500 mb-4 transition-colors" />
                                    }
                                    <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                        {zone}
                                    </h3>
                                    <p className={`text-[10px] font-black uppercase mt-2 tracking-widest ${availableCount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {availableCount} {t.available}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {t.enterZone} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </div>

                                {/* Background Decoration */}
                                <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:scale-110 transition-transform duration-500 rotate-12">
                                    {isComp ? <Monitor size={180} /> : <Armchair size={180} />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                /* Seat Grid View */
                <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl relative animate-in zoom-in-95 duration-300">
                    <button
                        onClick={() => setSelectedZone(null)}
                        className="absolute top-8 left-8 p-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                        <ChevronLeft size={14} /> {t.back}
                    </button>

                    <div className="mt-12 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3 max-w-7xl mx-auto">
                        {groupedSeats[selectedZone].map(seat => {
                            const isComp = isComputerZone(seat.zone);
                            const isAvailable = seat.status === 'available';
                            const isMaintenance = seat.status === 'maintenance';

                            return (
                                <button
                                    key={seat.id}
                                    disabled={!isAdmin && !isAvailable}
                                    onClick={() => handleSeatClick(seat)}
                                    className={`relative aspect-square rounded-3xl flex flex-col items-center justify-center transition-all duration-300 border-2 
                                        ${isAvailable ? 'bg-white dark:bg-slate-800 border-emerald-500/20 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 cursor-pointer hover:scale-105 active:scale-95' : ''}
                                        ${seat.status === 'occupied' ? 'bg-slate-50 dark:bg-slate-800/50 border-transparent opacity-50 cursor-not-allowed grayscale' : ''}
                                        ${isMaintenance ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-500/20 cursor-not-allowed opacity-70' : ''}
                                        ${selectedSeat?.id === seat.id ? 'ring-4 ring-indigo-500/30 border-indigo-600 scale-110 z-10' : ''}
                                        ${highlightedSeatId === seat.id ? 'ring-8 ring-indigo-500/50 scale-110 z-20 animate-pulse' : ''}
                                    `}
                                >
                                    {isComp ? (
                                        <>
                                            <Monitor size={20} className={`mb-1 ${isAvailable ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400'}`} />
                                            <span className="text-[8px] font-black text-slate-400">{t.pc}-{seat.seat_number.split('-').pop()}</span>
                                        </>
                                    ) : (
                                        <span className={`text-base font-black ${isAvailable ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
                                            {seat.seat_number.split('-').pop()}
                                        </span>
                                    )}

                                    {/* Indicator Dot */}
                                    {isAvailable && <div className="absolute top-3 right-3 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                                    {seat.status === 'occupied' && (
                                        <div className={`absolute top-3 right-3 w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] 
                                            ${seat.is_checked_in ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse animate-duration-1000'}
                                        `}></div>
                                    )}

                                    {/* Occupant Labels */}
                                    {seat.status === 'occupied' && seat.occupant && (
                                        <div className="absolute -bottom-1 left-0 right-0 text-center pointer-events-none px-0.5">
                                            {isAdmin ? (
                                                <div className="bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-sm rounded-md py-0.5 px-0.5 border border-white/10 shadow-lg">
                                                    <p className="text-[6px] font-black leading-tight text-white truncate px-0.5">
                                                        {seat.occupant.full_name.split(' ')[0]}
                                                    </p>
                                                    <p className="text-[5px] font-bold text-indigo-400 tracking-tighter">
                                                        {seat.occupant.profiles?.student_id || 'N/A'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-sm rounded-md py-0.5 px-0.5 border border-white/10 shadow-lg">
                                                    <p className="text-[6px] font-black text-indigo-400 tracking-widest leading-none">
                                                        {(seat.occupant.profiles?.student_id || 'BUSY').slice(0, 6)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Admin Action Modal */}
            {adminSelectedSeat && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 md:p-10 border border-white/20 dark:border-slate-700 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">
                            {isAdmin ? t.adminSeatControl : t.mySeatControl}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-8">
                            {t.managing} <span className="text-indigo-600 dark:text-indigo-400 font-black">{adminSelectedSeat.seat_number}</span> ({adminSelectedSeat.status})
                        </p>

                        <div className="grid gap-3">
                            {adminSelectedSeat.status === 'occupied' && adminSelectedSeat.occupied_by === profile?.id && !adminSelectedSeat.is_checked_in && (
                                <div className="space-y-3">
                                    {isCheckInWindowExceeded(adminSelectedSeat) && (
                                        <div className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase text-center animate-pulse">
                                            {t.checkInWindowExceeded}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleCheckIn(adminSelectedSeat)}
                                        className="w-full py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                                    >
                                        <Check size={14} /> {t.checkInNow}
                                    </button>
                                </div>
                            )}
                            {(adminSelectedSeat.status === 'occupied' && (isAdmin || adminSelectedSeat.occupied_by === profile?.id)) && (
                                <button
                                    onClick={() => releaseSeat(adminSelectedSeat)}
                                    className="w-full py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                >
                                    {isAdmin ? t.forceRelease : t.releaseMySeat}
                                </button>
                            )}
                            {isAdmin && (
                                <button
                                    onClick={() => toggleMaintenance(adminSelectedSeat)}
                                    className={`w-full py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-colors ${adminSelectedSeat.status === 'maintenance'
                                        ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                        }`}
                                >
                                    {adminSelectedSeat.status === 'maintenance' ? t.makeAvailable : t.setToMaintenance}
                                </button>
                            )}
                            <button
                                onClick={() => setAdminSelectedSeat(null)}
                                className="w-full py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50"
                            >
                                {t.close}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Modal */}
            {selectedSeat && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 md:p-10 border border-white/20 dark:border-slate-700 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>

                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">{t.confirmSeat}</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-8">
                            {t.reserve} <span className="text-indigo-600 dark:text-indigo-400 font-black">{selectedSeat.seat_number}</span> in <span className="font-bold">{selectedSeat.zone}</span>?
                        </p>

                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl mb-8 flex gap-4">
                            <Info className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <p className="text-xs font-bold text-indigo-800 dark:text-indigo-200 leading-relaxed">
                                {t.validFor} <span className="underline">{seatTimeout} {t.hours}</span>. {t.checkInRequiredWithin} {checkInWindow} {t.minutesOfReservation}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setSelectedSeat(null)}
                                className="px-6 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                            >
                                {t.cancel}
                            </button>
                            <button
                                onClick={confirmBooking}
                                disabled={bookingLoading}
                                className="px-6 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {bookingLoading ? t.submitting : t.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
