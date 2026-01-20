import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Check, X, Ban, UserCheck, Search } from 'lucide-react';
import { format } from 'date-fns';

export const AdminUsers: React.FC = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchUsers();

        const channel = supabase
            .channel('admin_users')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [searchQuery, filterStatus]);

    const fetchUsers = async () => {
        setLoading(true);
        let query = supabase
            .from('users')
            .select('*, profiles(*)')
            .eq('role', 'student')
            .order('created_at', { ascending: false });

        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        if (searchQuery) {
            query = query.ilike('full_name', `%${searchQuery}%`);
        }

        const { data } = await query;
        setStudents(data || []);
        setLoading(false);
    };

    const handleStatusChange = async (userId: string, newStatus: string) => {
        if (!confirm(`Change user status to ${newStatus}?`)) return;

        const { error } = await supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', userId);

        if (error) {
            alert('Error updating status: ' + error.message);
        } else {
            fetchUsers();
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-primary mb-6">User Registry</h1>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-border dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-border dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-border dark:border-slate-700 rounded-md w-full focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-900 text-text-primary dark:text-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 border border-border dark:border-slate-700 rounded-md focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-900 text-text-primary dark:text-white"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-slate-900 text-xs uppercase text-text-secondary dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-3">Student</th>
                                <th className="px-6 py-3">ID / Dept</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Joined</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-slate-700 text-sm">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-secondary dark:text-slate-400">Loading...</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-secondary dark:text-slate-400">No students found.</td></tr>
                            ) : (
                                students.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="px-6 py-4">
                                            <Link to={`/admin/users/${student.id}`} className="font-medium text-text-primary dark:text-white hover:text-primary dark:hover:text-indigo-400 hover:underline">
                                                {student.full_name}
                                            </Link>
                                            <div className="text-xs text-text-secondary dark:text-slate-400">{student.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-text-primary dark:text-white">{student.profiles?.student_id || 'N/A'}</div>
                                            <div className="text-xs text-text-secondary dark:text-slate-400">{student.profiles?.department || '-'} • {student.profiles?.academic_year || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${student.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                                    student.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                                        student.status === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary dark:text-slate-400">
                                            {format(new Date(student.created_at), 'PP')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {student.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleStatusChange(student.id, 'active')}
                                                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium text-xs flex items-center gap-1"
                                                    >
                                                        <Check size={14} /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(student.id, 'rejected')}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium text-xs flex items-center gap-1"
                                                    >
                                                        <X size={14} /> Reject
                                                    </button>
                                                </div>
                                            )}
                                            {student.status === 'active' && (
                                                <button
                                                    onClick={() => handleStatusChange(student.id, 'suspended')}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium text-xs flex items-center gap-1 ml-auto"
                                                >
                                                    <Ban size={14} /> Suspend
                                                </button>
                                            )}
                                            {student.status === 'suspended' && (
                                                <button
                                                    onClick={() => handleStatusChange(student.id, 'active')}
                                                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium text-xs flex items-center gap-1 ml-auto"
                                                >
                                                    <UserCheck size={14} /> Reactivate
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
