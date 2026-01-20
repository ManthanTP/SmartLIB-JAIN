import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Hash, Building2, Calendar, BookOpen, GraduationCap, Clock, Award, Edit3, Save, X, Camera, Loader2, Lock, KeyRound, AlertTriangle, CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { BookCover } from '../components/BookCover';
import { DEPARTMENTS } from '../lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

interface ReadingHistoryItem {
    id: string;
    book_id: string;
    issue_date: string;
    return_date: string;
    fine_amount: number;
    books: {
        title: string;
        author: string;
        cover_image_url: string;
    };
}

export const Profile: React.FC = () => {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [notifsEnabled, setNotifsEnabled] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);
    const [departments, setDepartments] = useState<string[]>([]);

    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [showEmailChange, setShowEmailChange] = useState(false);
    const [newEmail, setNewEmail] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        student_id: '',
        department: '',
        academic_year: '',
    });

    useEffect(() => {
        if (profile) {
            fetchReadingHistory();
            fetchDepts();
            setFormData({
                full_name: profile.full_name || '',
                student_id: profile.student_id || '',
                department: profile.department || '',
                academic_year: profile.academic_year || '',
            });
        }
        checkNotifStatus();
    }, [profile]);

    const fetchDepts = async () => {
        const { data } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'general_config')
            .single();
        if (data?.setting_value?.departments) {
            setDepartments(data.setting_value.departments);
        } else {
            setDepartments([...DEPARTMENTS]);
        }
    };

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const checkNotifStatus = () => {
        if (!('Notification' in window)) return;
        setNotifsEnabled(Notification.permission === 'granted');
    };

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            setMessage({ type: 'error', text: 'Notifications not supported on this browser.' });
            return;
        }

        setNotifLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotifsEnabled(true);
                setMessage({ type: 'success', text: 'Notifications enabled!' });
            } else {
                setNotifsEnabled(false);
                setMessage({ type: 'error', text: 'Notification permission denied.' });
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
        setNotifLoading(false);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !profile) return;

        try {
            setUploading(true);
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${profile.id}/avatar.${fileExt}`;

            // 1. Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update profiles table
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ profile_photo_url: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            // Refresh page/profile - though AuthContext handles some, it might need nudge
            window.location.reload();
        } catch (error: any) {
            alert('Error uploading photo: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!profile) return;
        try {
            setLoading(true);

            // 1. Update users table (full_name)
            const { error: userError } = await supabase
                .from('users')
                .update({ full_name: formData.full_name })
                .eq('id', profile.id);

            if (userError) throw userError;

            // 2. Update profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    student_id: formData.student_id,
                    department: formData.department,
                    academic_year: formData.academic_year
                })
                .eq('id', profile.id);

            if (profileError) throw profileError;

            setIsEditing(false);
            window.location.reload(); // Quick way to refersh AuthContext state
        } catch (error: any) {
            alert('Error updating profile: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchReadingHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('reading_history')
                .select(`
                    *,
                    books (
                        title,
                        authors,
                        cover_image_url
                    )
                `)
                .eq('student_id', profile?.id)
                .order('return_date', { ascending: false });

            if (error) throw error;
            setReadingHistory(data || []);
        } catch (error) {
            console.error('Error fetching reading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordForm.newPassword
            });

            if (error) throw error;

            alert('Password updated successfully!');
            setShowPasswordChange(false);
            setPasswordForm({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            alert('Error updating password: ' + error.message);
        }
    };

    const handleEmailChange = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail
            });

            if (error) throw error;

            alert('Verification email sent! Please check your new email inbox to confirm the change.');
            setShowEmailChange(false);
            setNewEmail('');
        } catch (error: any) {
            alert('Error updating email: ' + error.message);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Notification Toast */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 border ${message.type === 'success'
                            ? 'bg-emerald-500/90 text-white border-emerald-400/50'
                            : 'bg-red-500/90 text-white border-red-400/50'
                            }`}
                    >
                        {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        <span className="font-bold text-sm">{message.text}</span>
                        <button onClick={() => setMessage(null)} className="ml-2 hover:scale-110 transition-transform">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="border-b border-indigo-100 dark:border-slate-800 pb-8 flex justify-between items-end">
                <div>
                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase block mb-1 tracking-widest">{t.portal}</span>
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
                        {t.profile}
                    </h2>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-2xl font-bold uppercase text-xs tracking-widest text-indigo-600 dark:text-indigo-400 hover:shadow-lg transition-all"
                    >
                        <Edit3 size={16} />
                        {t.editProfile}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold uppercase text-xs tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                        >
                            <X size={16} className="inline mr-2" />
                            {t.cancel}
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-900/20 transition-all"
                        >
                            <Save size={16} />
                            {t.saveChanges}
                        </button>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Identity Card */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="relative group perspective-1000">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden">
                            {/* Card Decoration */}
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <GraduationCap size={150} />
                            </div>

                            {/* Header */}
                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className="relative group/photo">
                                    <div className="border-2 border-indigo-100 dark:border-slate-700 rounded-2xl p-1 overflow-hidden">
                                        {profile?.profile_photo_url ? (
                                            <img
                                                src={profile.profile_photo_url}
                                                alt="Profile"
                                                className="w-24 h-24 rounded-xl object-cover"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                                                <User size={40} className="text-indigo-500" />
                                            </div>
                                        )}

                                        {isEditing && (
                                            <label className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handlePhotoUpload}
                                                    disabled={uploading}
                                                />
                                                {uploading ? (
                                                    <Loader2 size={24} className="text-white animate-spin" />
                                                ) : (
                                                    <Camera size={24} className="text-white" />
                                                )}
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-1">JAIN</h3>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{t.university}</p>
                                </div>
                            </div>

                            {/* User Details */}
                            <div className="space-y-4 relative z-10">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.fullName}</label>
                                            <input
                                                type="text"
                                                value={formData.full_name}
                                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition-colors"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.usn}</label>
                                                <input
                                                    type="text"
                                                    value={formData.student_id}
                                                    onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase hover:border-indigo-300 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.branch}</label>
                                                <select
                                                    value={formData.department}
                                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase hover:border-indigo-300 transition-colors"
                                                >
                                                    {departments.map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Semester</label>
                                            <select
                                                value={formData.academic_year}
                                                onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition-colors disabled:opacity-50"
                                                disabled={formData.department === 'PHD-ME'}
                                            >
                                                <option value="">{formData.department === 'PHD-ME' ? 'Not Applicable' : 'Select Semester'}</option>
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                                                    if (formData.department === 'MBA' && num > 4) return null;
                                                    if (formData.department === 'PHD-ME') return null;
                                                    return (
                                                        <option key={num} value={`${num}${num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Semester`}>
                                                            {num}{num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Semester
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.fullName}</p>
                                            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{profile?.full_name}</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.usn}</p>
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                                                    <Hash size={14} className="text-indigo-500" />
                                                    {profile?.student_id || 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.branch}</p>
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                                                    <Building2 size={14} className="text-indigo-500" />
                                                    {profile?.department || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.email}</p>
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
                                                <Mail size={14} className="text-indigo-500" />
                                                {profile?.email}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Token Footer */}
                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.securityToken}</p>
                                    <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-1">{profile?.id?.slice(0, 8)}...</p>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <QRCodeCanvas
                                        value={`${window.location.origin}/verify/${profile?.id}`}
                                        size={64}
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Security Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <Lock size={20} />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{t.accountSecurity}</h3>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={() => setShowPasswordChange(true)}
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <KeyRound size={18} className="text-slate-400 group-hover:text-orange-500" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{t.changePassword}</p>
                                        <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{t.changePasswordSubtitle}</p>
                                    </div>
                                </div>
                                <X size={16} className="text-slate-300 group-hover:text-orange-500 rotate-45" />
                            </button>

                            <button
                                onClick={() => setShowEmailChange(true)}
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <Mail size={18} className="text-slate-400 group-hover:text-orange-500" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{t.updateEmail}</p>
                                        <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{t.updateEmailSubtitle}</p>
                                    </div>
                                </div>
                                <X size={16} className="text-slate-300 group-hover:text-orange-500 rotate-45" />
                            </button>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="glass rounded-[2.5rem] p-8 border border-white/20 dark:border-slate-800 shadow-xl space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Bell size={20} />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Notification Settings</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group text-left">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white">Push Notifications</p>
                                    <p className="text-xs text-slate-500">Get alerts for due dates and new resources.</p>
                                </div>
                                <button
                                    onClick={requestNotificationPermission}
                                    disabled={notifLoading || notifsEnabled}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${notifsEnabled
                                        ? 'bg-emerald-100 text-emerald-600 cursor-default'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-95'
                                        }`}
                                >
                                    {notifLoading ? '...' : notifsEnabled ? <><CheckCircle2 size={16} /> Enabled</> : 'Enable'}
                                </button>
                            </div>

                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                <div className="flex gap-3">
                                    <AlertCircle size={18} className="text-amber-600 shrink-0" />
                                    <p className="text-[10px] text-amber-800/70 dark:text-amber-400/70 font-bold leading-tight">
                                        <span className="uppercase text-amber-600 dark:text-amber-500 mr-1">[Tip]:</span>
                                        Browser notifications must be allowed in your device settings for these alerts to appear.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Stats & History */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <BookOpen className="text-indigo-500 mb-3" />
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{readingHistory.length}</h4>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{t.booksRead}</p>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <Clock className="text-purple-500 mb-3" />
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white">0</h4>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{t.lateReturns}</p>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <Award className="text-amber-500 mb-3" />
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{t.statusVerified}</h4>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{t.memberStatus}</p>
                        </div>
                    </div>

                    {/* Reading History List */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl">
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                            <Calendar className="text-indigo-500" />
                            {t.readingHistory}
                        </h3>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : readingHistory.length > 0 ? (
                            <div className="space-y-4">
                                {readingHistory.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors group">
                                        <div className="w-12 h-16 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                                            <BookCover
                                                url={item.books?.cover_image_url}
                                                title={item.books?.title}
                                                className="w-full h-full object-cover"
                                                fallbackIconSize={18}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                                                {item.books?.title}
                                            </h4>
                                            <p className="text-xs text-slate-500">{item.books?.author}</p>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.returned}</p>
                                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                                {format(new Date(item.return_date), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <BookOpen size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                                <p className="text-slate-400 font-medium">{t.noReadingHistory}</p>
                                <p className="text-xs text-slate-300 mt-1">{t.noReadingHistorySubtitle}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordChange && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowPasswordChange(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        >
                            <X size={20} className="text-slate-600 dark:text-slate-400" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
                                <KeyRound size={32} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t.updatePassword}</h2>
                            <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">{t.secureAccount}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.newPassword}</label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder={t.minCharacters}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.confirmPassword}</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={handlePasswordChange}
                                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-700 shadow-xl shadow-orange-900/20 transition-all mt-4"
                            >
                                {t.updatePassword}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Change Modal */}
            {showEmailChange && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowEmailChange(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        >
                            <X size={20} className="text-slate-600 dark:text-slate-400" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
                                <Mail size={32} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t.updateEmail}</h2>
                            <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">{t.registeredAddress}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 mb-2">
                                <div className="flex gap-3">
                                    <AlertTriangle size={18} className="text-blue-600 shrink-0" />
                                    <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase leading-tight">
                                        {t.emailChangeVerification}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.newEmailAddress}</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="e.g. name@example.com"
                                />
                            </div>
                            <button
                                onClick={handleEmailChange}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-900/20 transition-all mt-4"
                            >
                                {t.sendVerification}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
