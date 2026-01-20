import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Shield, Clock, IndianRupee, BookOpen, CheckCircle2, X, MapPin, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FineManager } from '../lib/FineManager';

type LibraryRule = {
    id: string;
    title: string;
    content: string;
    icon: string;
};

type SystemSettings = {
    id: string;
    setting_key: string;
    setting_value: {
        fine_per_day: number;
        max_loan_duration_days: number;
        book_bank_duration_days: number;
        auto_approve_loan_requests: boolean;
        auto_approve_registrations: boolean;
        seat_timeout_hours: number;
        check_in_window_minutes: number;
        library_rules?: LibraryRule[];
        departments?: string[];
    };
    description: string;
};

export const AdminSettings: React.FC = () => {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [seats, setSeats] = useState<any[]>([]);
    const [newSeatNumber, setNewSeatNumber] = useState('');
    const [newZone, setNewZone] = useState('');
    const [newDepartment, setNewDepartment] = useState('');

    useEffect(() => {
        fetchSettings();
        fetchSeats();

        const channel = supabase
            .channel('admin_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: 'setting_key=eq.general_config' }, () => {
                fetchSettings();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, () => {
                fetchSeats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('system_settings')
            .select('*')
            .eq('setting_key', 'general_config')
            .single();

        if (data) {
            const val = data.setting_value;
            setSettings({
                ...data,
                setting_value: {
                    fine_per_day: val.fine_per_day ?? 5,
                    max_loan_duration_days: val.max_loan_duration_days ?? 30,
                    book_bank_duration_days: val.book_bank_duration_days ?? 180,
                    auto_approve_loan_requests: val.auto_approve_loan_requests ?? false,
                    auto_approve_registrations: val.auto_approve_registrations ?? false,
                    seat_timeout_hours: val.seat_timeout_hours ?? 3,
                    check_in_window_minutes: val.check_in_window_minutes ?? 15,
                    library_rules: val.library_rules ?? [],
                    departments: val.departments ?? ['CSE', 'ECE', 'CE', 'ME', 'AIML', 'MBA', 'PHD-ME']
                }
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setMessage(null);

        const { error } = await supabase
            .from('system_settings')
            .update({
                setting_value: settings.setting_value,
                updated_at: new Date().toISOString(),
                updated_by: profile?.id
            })
            .eq('id', settings.id);

        if (error) {
            setMessage({ type: 'error', text: 'Failed to save settings: ' + error.message });
        } else {
            setMessage({ type: 'success', text: 'Settings updated successfully!' });

            // Trigger background updates instantly
            await FineManager.updateOverdueFines();

            await supabase.from('audit_logs').insert([{
                admin_id: profile?.id,
                action_type: 'update_settings',
                entity_type: 'system_settings',
                details: settings.setting_value
            }]);
        }
        setSaving(false);
    };

    const updateValue = (key: keyof SystemSettings['setting_value'], value: any) => {
        if (!settings) return;
        setSettings({
            ...settings,
            setting_value: {
                ...settings.setting_value,
                [key]: value
            }
        });
    };

    const addRule = () => {
        if (!settings) return;
        const newRule: LibraryRule = {
            id: crypto.randomUUID(),
            title: 'New Rule',
            content: 'Description of the rule...',
            icon: 'BookOpen'
        };
        const rules = [...(settings.setting_value.library_rules || []), newRule];
        updateValue('library_rules', rules);
    };

    const updateRule = (id: string, field: keyof LibraryRule, value: string) => {
        if (!settings) return;
        const rules = settings.setting_value.library_rules?.map(r =>
            r.id === id ? { ...r, [field]: value } : r
        );
        updateValue('library_rules', rules);
    };

    const removeRule = (id: string) => {
        if (!settings) return;
        const rules = settings.setting_value.library_rules?.filter(r => r.id !== id);
        updateValue('library_rules', rules);
    };

    const fetchSeats = async () => {
        const { data } = await supabase.from('seats').select('*').order('zone, seat_number');
        setSeats(data || []);
    };

    const addSeat = async () => {
        if (!newSeatNumber || !newZone) {
            setMessage({ type: 'error', text: 'Please enter both seat number and zone' });
            return;
        }

        const { error } = await supabase.from('seats').insert([{
            seat_number: `${newZone}-${newSeatNumber}`,
            zone: newZone,
            status: 'available'
        }]);

        if (error) {
            setMessage({ type: 'error', text: 'Failed to add seat: ' + error.message });
        } else {
            setMessage({ type: 'success', text: 'Seat added successfully!' });
            setNewSeatNumber('');
            setNewZone('');
            fetchSeats();
        }
    };

    const deleteSeat = async (id: string, seatNumber: string) => {
        if (!confirm(`Delete seat ${seatNumber}?`)) return;

        const { error } = await supabase.from('seats').delete().eq('id', id);

        if (error) {
            setMessage({ type: 'error', text: 'Failed to delete seat: ' + error.message });
        } else {
            setMessage({ type: 'success', text: 'Seat deleted successfully!' });
            fetchSeats();
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading system configuration...</div>;

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-primary dark:text-white mb-2">{t.settings}</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{t.settingsSubtitle}</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-[1.5rem] font-bold shadow-lg shadow-indigo-500/25 transition-all active:scale-95 min-w-[180px]"
                >
                    <Save size={20} />
                    {saving ? '...' : t.saveChanges}
                </button>
            </div>

            {message && (
                <div className={`p-4 mb-8 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                    <p className="text-sm font-bold">{message.text}</p>
                </div>
            )}

            <div className="grid gap-8">
                {/* Rates & Limits */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-border dark:border-slate-700 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                            <IndianRupee size={20} />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-lg text-primary dark:text-white">{t.ratesLimits}</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.finePerDay}</label>
                            <div className="relative">
                                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="number"
                                    value={settings?.setting_value.fine_per_day}
                                    onChange={(e) => updateValue('fine_per_day', Number(e.target.value))}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.maxLoanDuration}</label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="number"
                                    value={settings?.setting_value.max_loan_duration_days}
                                    onChange={(e) => updateValue('max_loan_duration_days', Number(e.target.value))}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Book Bank Duration (Semester)</label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="number"
                                    value={settings?.setting_value.book_bank_duration_days}
                                    onChange={(e) => updateValue('book_bank_duration_days', Number(e.target.value))}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Days</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workflow Automation */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-border dark:border-slate-700 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Shield size={20} />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-lg text-primary dark:text-white">{t.workflowAutomation}</h3>
                    </div>

                    <div className="grid gap-4">
                        <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white">{t.autoApproveLoans}</p>
                                <p className="text-xs text-slate-500">Enable automatic approval for book requests from verified students.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings?.setting_value.auto_approve_loan_requests}
                                    onChange={(e) => updateValue('auto_approve_loan_requests', e.target.checked)}
                                />
                                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 rounded-full"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white">{t.autoApproveUsers}</p>
                                <p className="text-xs text-slate-500">New students are automatically verified when they join.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings?.setting_value.auto_approve_registrations}
                                    onChange={(e) => updateValue('auto_approve_registrations', e.target.checked)}
                                />
                                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 rounded-full"></div>
                            </label>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.seatTimeout}</label>
                            <input
                                type="number"
                                value={settings?.setting_value.seat_timeout_hours}
                                onChange={(e) => updateValue('seat_timeout_hours', Number(e.target.value))}
                                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.checkInWindow}</label>
                            <input
                                type="number"
                                value={settings?.setting_value.check_in_window_minutes}
                                onChange={(e) => updateValue('check_in_window_minutes', Number(e.target.value))}
                                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                            />
                        </div>
                    </div>
                </div>

                {/* Seat Management Section */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-border dark:border-slate-700 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <MapPin size={20} />
                            </div>
                            <h3 className="font-black uppercase tracking-tight text-lg text-primary dark:text-white">Seat Management</h3>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                        <input
                            type="text"
                            value={newZone}
                            onChange={(e) => setNewZone(e.target.value)}
                            placeholder="Zone (e.g., A1, Computer)"
                            className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm"
                        />
                        <input
                            type="text"
                            value={newSeatNumber}
                            onChange={(e) => setNewSeatNumber(e.target.value)}
                            placeholder="Seat # (e.g., 001, 042)"
                            className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm"
                        />
                        <button
                            onClick={addSeat}
                            className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> Add Seat
                        </button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {Object.entries(seats.reduce((acc: any, seat) => {
                            if (!acc[seat.zone]) acc[seat.zone] = [];
                            acc[seat.zone].push(seat);
                            return acc;
                        }, {})).map(([zone, zoneSeats]: [string, any]) => (
                            <div key={zone} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-black uppercase text-sm text-slate-900 dark:text-white">{zone} ({zoneSeats.length} seats)</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {zoneSeats.map((seat: any) => (
                                        <div key={seat.id} className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{seat.seat_number}</span>
                                            <button
                                                onClick={() => deleteSeat(seat.id, seat.seat_number)}
                                                className="text-red-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Library Rules Editor */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-border dark:border-slate-700 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                <BookOpen size={20} />
                            </div>
                            <h3 className="font-black uppercase tracking-tight text-lg text-primary dark:text-white">{t.libraryRules}</h3>
                        </div>
                        <button
                            onClick={addRule}
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all"
                        >
                            + {t.addRule}
                        </button>
                    </div>

                    <div className="grid gap-6">
                        {settings?.setting_value.library_rules && settings.setting_value.library_rules.length > 0 ? (
                            settings.setting_value.library_rules.map((rule, index) => (
                                <div key={rule.id} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 relative group">
                                    <div className="flex justify-between items-start">
                                        <div className="text-xs font-black text-indigo-500 uppercase tracking-widest">{t.ruleNumber}{index + 1}</div>
                                        <button
                                            onClick={() => removeRule(rule.id)}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div className="md:col-span-1 space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.title}</label>
                                            <input
                                                type="text"
                                                value={rule.title}
                                                onChange={(e) => updateRule(rule.id, 'title', e.target.value)}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none font-bold text-sm"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.policyContent}</label>
                                            <textarea
                                                value={rule.content}
                                                onChange={(e) => updateRule(rule.id, 'content', e.target.value)}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none font-medium text-sm h-20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                                <p className="text-slate-400 font-medium">{t.noRulesDefined}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Department Management Section */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-border dark:border-slate-700 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <BookOpen size={20} />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-lg text-primary dark:text-white">Department Management</h3>
                    </div>

                    <div className="flex gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                        <input
                            type="text"
                            value={newDepartment}
                            onChange={(e) => setNewDepartment(e.target.value)}
                            placeholder="Add New Department (e.g. CSE, AIML)"
                            className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm uppercase tracking-widest"
                            onKeyPress={(e) => e.key === 'Enter' && (() => {
                                if (!newDepartment) return;
                                const deps = [...(settings?.setting_value.departments || []), newDepartment.toUpperCase()];
                                updateValue('departments', [...new Set(deps)]);
                                setNewDepartment('');
                            })()}
                        />
                        <button
                            onClick={() => {
                                if (!newDepartment) return;
                                const deps = [...(settings?.setting_value.departments || []), newDepartment.toUpperCase()];
                                updateValue('departments', [...new Set(deps)]);
                                setNewDepartment('');
                            }}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                            <Plus size={16} /> Add
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {settings?.setting_value.departments?.map((dept) => (
                            <div key={dept} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800 group transition-all hover:border-indigo-300">
                                <span className="text-xs font-black uppercase tracking-widest">{dept}</span>
                                <button
                                    onClick={() => {
                                        const deps = settings.setting_value.departments?.filter(d => d !== dept);
                                        updateValue('departments', deps);
                                    }}
                                    className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-lg transition-colors text-indigo-400 hover:text-indigo-600"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security Note */}
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30">
                    <div className="flex gap-4">
                        <Shield className="shrink-0 text-indigo-600 dark:text-indigo-400" size={32} />
                        <div>
                            <h4 className="font-black uppercase tracking-tight text-indigo-600 dark:text-indigo-400 mb-2">Security & Auditing Note</h4>
                            <p className="text-xs text-indigo-800/70 dark:text-indigo-300/60 leading-relaxed font-medium">
                                All configuration changes are logged with your administrator ID and timestamp. Auto-approval settings should only be enabled if the institution's verification process is integrated or managed via official college domains. These settings take effect globally for all new transactions and registrations.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
