import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Building2, Hash, Calendar, BookOpen, AlertCircle, Edit, Save, X, Bell } from 'lucide-react';
import { format } from 'date-fns';

export const AdminStudentDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [student, setStudent] = useState<any>(null);
    const [loans, setLoans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        email: '',
        student_id: '',
        department: '',
        academic_year: '',
        status: 'active'
    });
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        if (id) {
            fetchStudentData();
            fetchDepts();

            const channel = supabase
                .channel(`student_details_${id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${id}` }, () => {
                    fetchStudentData();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${id}` }, () => {
                    fetchStudentData();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'active_loans', filter: `student_id=eq.${id}` }, () => {
                    fetchStudentData();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [id]);

    const fetchStudentData = async () => {
        // Fetch user and profile
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*, profiles(*)')
            .eq('id', id)
            .single();

        if (userError) {
            console.error(userError);
            setLoading(false);
            return;
        }

        // Fetch active loans
        const { data: loansData } = await supabase
            .from('active_loans')
            .select('*, book:books(title)')
            .eq('student_id', id);

        setStudent(userData);
        setLoans(loansData || []);
        setEditForm({
            full_name: userData.full_name || '',
            email: userData.email || '',
            student_id: userData.profiles?.student_id || '',
            department: userData.profiles?.department || '',
            academic_year: userData.profiles?.academic_year || '',
            status: userData.status || 'active'
        });
        setLoading(false);
    };

    const fetchDepts = async () => {
        const { data } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'general_config')
            .single();
        if (data?.setting_value?.departments) {
            setDepartments(data.setting_value.departments);
        }
    };

    const handleSave = async () => {
        try {
            // Update users table
            const { error: userError } = await supabase
                .from('users')
                .update({
                    full_name: editForm.full_name,
                    email: editForm.email,
                    status: editForm.status
                })
                .eq('id', id);

            if (userError) throw userError;

            // Update profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: id,
                    student_id: editForm.student_id,
                    department: editForm.department,
                    academic_year: editForm.academic_year
                });

            if (profileError) throw profileError;

            alert('Student information updated successfully!');
            setIsEditing(false);
            fetchStudentData();
        } catch (err: any) {
            alert('Error updating student: ' + err.message);
        }
    };

    const handleSendNotification = async () => {
        if (!confirm(`Send account approval notification to ${student.full_name}?`)) return;

        try {
            const { sendWelcomeEmail } = await import('../lib/email');
            const success = await sendWelcomeEmail(student.email, student.full_name);
            if (success) {
                alert('Account approval notification sent successfully!');
            } else {
                alert('Failed to send notification.');
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) return <div className="p-8 animate-pulse text-gray-500">Loading student details...</div>;
    if (!student) return <div className="p-8 text-red-500">Student not found</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-text-secondary hover:text-primary mb-6"
            >
                <ArrowLeft size={20} /> Back to Registry
            </button>

            {/* Header Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-border dark:border-slate-700 p-8 mb-6">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-xl font-bold text-text-primary dark:text-white">Student Information</h2>
                    {!isEditing ? (
                        <div className="flex gap-2">
                            <button
                                onClick={handleSendNotification}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
                            >
                                <Bell size={16} /> Notify Student
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Edit size={16} /> Edit
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                <X size={16} /> Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Save size={16} /> Save
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-24 h-24 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-indigo-400 text-3xl font-bold shrink-0">
                        {student.profiles?.profile_photo_url ? (
                            <img src={student.profiles.profile_photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            student.full_name?.charAt(0) || 'U'
                        )}
                    </div>

                    {!isEditing ? (
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-text-primary dark:text-white mb-2">{student.full_name}</h1>
                            <div className="flex flex-wrap gap-4 text-sm text-text-secondary dark:text-slate-400">
                                <div className="flex items-center gap-2"><Mail size={16} /> {student.email}</div>
                                <div className="flex items-center gap-2"><Hash size={16} /> {student.profiles?.student_id || 'No ID'}</div>
                                <div className="flex items-center gap-2"><Building2 size={16} /> {student.profiles?.department || 'No Dept'} • {student.profiles?.academic_year || 'Year N/A'}</div>
                                <div className="flex items-center gap-2"><Calendar size={16} /> Joined {student.created_at ? format(new Date(student.created_at), 'PP') : 'N/A'}</div>
                            </div>
                            <div className="mt-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                ${student.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                        student.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                            student.status === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                                    {student.status}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-border dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-text-primary dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-border dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-text-primary dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Student ID (USN)</label>
                                    <input
                                        type="text"
                                        value={editForm.student_id}
                                        onChange={(e) => setEditForm({ ...editForm, student_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-border dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-text-primary dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Department</label>
                                    <select
                                        value={editForm.department}
                                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                        className="w-full px-3 py-2 border border-border dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-text-primary dark:text-white"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Semester</label>
                                    <select
                                        value={editForm.academic_year}
                                        onChange={(e) => setEditForm({ ...editForm, academic_year: e.target.value })}
                                        className="w-full px-3 py-2 border border-border dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-text-primary dark:text-white disabled:opacity-50"
                                        disabled={editForm.department === 'PHD-ME'}
                                    >
                                        <option value="">{editForm.department === 'PHD-ME' ? 'Not Applicable' : 'Select Semester'}</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                                            if (editForm.department === 'MBA' && num > 4) return null;
                                            if (editForm.department === 'PHD-ME') return null;
                                            return (
                                                <option key={num} value={`${num}${num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Semester`}>
                                                    {num}{num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Semester
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-border dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-text-primary dark:text-white"
                                >
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats & Current Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-border dark:border-slate-700 p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary dark:text-indigo-400">
                        <BookOpen size={20} /> Active Loans
                    </h3>
                    {loans.length === 0 ? (
                        <p className="text-text-secondary dark:text-slate-400">No active loans.</p>
                    ) : (
                        <div className="space-y-3">
                            {loans.map(loan => (
                                <div key={loan.id} className="p-3 bg-gray-50 dark:bg-slate-700 rounded border border-gray-100 dark:border-slate-600 flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-text-primary dark:text-white">{loan.book?.title}</div>
                                        <div className="text-xs text-text-secondary dark:text-slate-400">Due: {format(new Date(loan.due_date), 'PP')}</div>
                                    </div>
                                    {new Date(loan.due_date) < new Date() && (
                                        <AlertCircle size={16} className="text-red-500 dark:text-red-400" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-border dark:border-slate-700 p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary dark:text-indigo-400">
                        <AlertCircle size={20} /> Violations / Fines
                    </h3>
                    <div className="text-center py-8 text-text-secondary dark:text-slate-400">
                        No active violations or unpaid fines.
                    </div>
                </div>
            </div>
        </div>
    );
};
