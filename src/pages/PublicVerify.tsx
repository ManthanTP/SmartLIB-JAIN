import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, User, Building2, GraduationCap, MapPin, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LoadingScreen } from '../components/LoadingScreen';

export const PublicVerify: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useLanguage();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*, profiles(*)')
                    .eq('id', id)
                    .single();

                if (error || !data) {
                    setError(true);
                } else {
                    setProfile(data);
                }
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    if (loading) return <LoadingScreen />;

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-2xl border border-red-100 dark:border-red-900/30 text-center">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <User className="text-red-500" size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Invalid ID</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">This QR code does not belong to a registered SmartLIB student.</p>
                    <Link to="/" className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all">
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Animated background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/20 dark:border-slate-800 relative z-10 overflow-hidden transform transition-all duration-500 scale-100 h-auto">
                {/* Header Banner */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center p-2">
                            <img src="/logo.png" alt="SmartLIB" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <h2 className="text-white font-black uppercase tracking-[0.2em] text-xs mb-1 opacity-80">SmartLIB JAIN</h2>
                    <h1 className="text-white text-2xl font-black uppercase tracking-tighter">Student Identity</h1>
                </div>

                {/* Status Badge */}
                <div className="flex justify-center -mt-6 mb-8 px-8">
                    <div className="bg-green-500 text-white px-6 py-2.5 rounded-full shadow-lg flex items-center gap-2 border-4 border-white dark:border-slate-900 group">
                        <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-black uppercase tracking-widest">{t.verifiedIdentity || 'Verified Student'}</span>
                    </div>
                </div>

                {/* Profile Photo */}
                <div className="flex justify-center mb-6 px-8">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 dark:bg-indigo-900/30 border-4 border-indigo-100 dark:border-indigo-800 overflow-hidden shadow-xl ring-4 ring-indigo-500/10 group-hover:scale-105 transition-transform">
                            {profile.profiles?.profile_photo_url ? (
                                <img src={profile.profiles.profile_photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-indigo-600 dark:text-indigo-400">
                                    {profile.full_name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg border border-indigo-50 dark:border-slate-700">
                            <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={20} />
                        </div>
                    </div>
                </div>

                {/* Student Info */}
                <div className="px-10 pb-12 space-y-6">
                    <div className="text-center group">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight group-hover:text-indigo-600 transition-colors">
                            {profile.full_name}
                        </h3>
                        <p className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-[0.15em] mt-1">
                            {profile.profiles?.student_id || 'ID NOT ASSIGNED'}
                        </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 group">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:text-indigo-600 transition-colors">
                                <Building2 size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest opacity-50">{t.branch || 'Department'}</p>
                                <p className="font-bold text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform">{profile.profiles?.department || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 group">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:text-indigo-600 transition-colors">
                                <GraduationCap size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest opacity-50">{t.year || 'Academic Year'}</p>
                                <p className="font-bold text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform">{profile.profiles?.academic_year || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 group">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:text-indigo-600 transition-colors">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest opacity-50">Campus Location</p>
                                <p className="font-bold text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform">JAIN University, Bangalore</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <div className="w-full py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Verified on {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="mt-8 text-white/50 text-xs font-medium tracking-widest uppercase">
                &copy; {new Date().getFullYear()} SmartLIB Management System
            </footer>
        </div>
    );
};
