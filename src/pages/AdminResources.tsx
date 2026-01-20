import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FileUp, Search, Trash2, FileText, Download, ExternalLink } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';

interface Resource {
    id: string;
    type: string;
    title: string;
    subject_code: string;
    semester: number;
    scheme: string;
    cycle: string;
    file_url: string;
    is_external: boolean;
    created_at: string;
}

export const AdminResources: React.FC = () => {
    const { profile } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    const [formData, setFormData] = useState({
        type: 'paper',
        title: '',
        subject_code: '',
        semester: 1,
        scheme: '2022',
        cycle: 'N/A',
        is_external: false,
        external_url: '',
        file: null as File | null
    });

    useEffect(() => {
        fetchResources();

        const channel = supabase
            .channel('admin_resources')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'academic_resources' }, () => {
                fetchResources();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [searchQuery, filterType]);

    const fetchResources = async () => {
        setLoading(true);
        let query = supabase.from('academic_resources').select('*').order('created_at', { ascending: false });

        if (filterType !== 'all') {
            query = query.eq('type', filterType);
        }

        if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,subject_code.ilike.%${searchQuery}%`);
        }

        const { data } = await query;
        setResources(data || []);
        setLoading(false);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let fileUrl = formData.external_url;

            if (!formData.is_external && formData.file) {
                const file = formData.file;
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `academic_resources/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('resources')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('resources')
                    .getPublicUrl(filePath);

                fileUrl = publicUrl;
            }

            const { error } = await supabase.from('academic_resources').insert([{
                type: formData.type,
                title: formData.title,
                subject_code: formData.subject_code,
                semester: formData.semester,
                scheme: formData.scheme,
                cycle: formData.cycle,
                file_url: fileUrl,
                is_external: formData.is_external,
                uploaded_by: profile?.id
            }]);

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({
                type: 'paper',
                title: '',
                subject_code: '',
                semester: 1,
                scheme: '2022',
                cycle: 'N/A',
                is_external: false,
                external_url: '',
                file: null
            });
            fetchResources();
        } catch (error: any) {
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, fileUrl: string, isExternal: boolean) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;

        try {
            if (!isExternal) {
                // Extract file path from URL
                const pathParts = fileUrl.split('resources/');
                if (pathParts.length > 1) {
                    const filePath = pathParts[1];
                    await supabase.storage.from('resources').remove([filePath]);
                }
            }

            const { error } = await supabase.from('academic_resources').delete().eq('id', id);
            if (error) throw error;
            fetchResources();
        } catch (error: any) {
            alert('Delete failed: ' + error.message);
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-end border-b border-indigo-100 dark:border-slate-800 pb-8">
                <div>
                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase block mb-1 tracking-widest">VTU HUB</span>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Resource Manager</h2>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-900/20 transition-all active:scale-95"
                >
                    <FileUp size={18} /> Add Resource
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by title or subject code (e.g. 18CS51)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold transition-all shadow-sm"
                        />
                    </div>
                </div>
                <div className="md:col-span-4 flex gap-2">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full px-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold transition-all shadow-sm appearance-none"
                    >
                        <option value="all">All Types</option>
                        <option value="paper">Question Papers</option>
                        <option value="note">Study Notes</option>
                        <option value="manual">Lab Manuals</option>
                    </select>
                </div>
            </div>

            {loading ? <LoadingScreen /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resources.map((res) => (
                        <div key={res.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl ${res.type === 'paper' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' :
                                    res.type === 'note' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' :
                                        'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                                    }`}>
                                    <FileText size={24} />
                                </div>
                                <button
                                    onClick={() => handleDelete(res.id, res.file_url, res.is_external)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                                {res.title}
                            </h3>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black uppercase text-slate-500 tracking-widest">{res.subject_code}</span>
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black uppercase text-slate-500 tracking-widest">Sem {res.semester}</span>
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black uppercase text-slate-500 tracking-widest">Scheme {res.scheme}</span>
                            </div>

                            <a
                                href={res.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"
                            >
                                {res.is_external ? <ExternalLink size={14} /> : <Download size={14} />}
                                {res.is_external ? 'Open Link' : 'Download PDF'}
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl max-w-xl w-full border border-white/20 overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-indigo-50 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Add Academic Resource</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                        </div>

                        <form onSubmit={handleUpload} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold"
                                    >
                                        <option value="paper">Question Paper</option>
                                        <option value="note">Study Notes</option>
                                        <option value="manual">Lab Manual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Scheme</label>
                                    <select
                                        value={formData.scheme}
                                        onChange={e => setFormData({ ...formData, scheme: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold"
                                    >
                                        <option value="2022">2022 Scheme</option>
                                        <option value="2021">2021 Scheme</option>
                                        <option value="2018">2018 Scheme</option>
                                        <option value="2017">2017 Scheme</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Resource Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold"
                                        placeholder="e.g. 2023 Regular Exam - Data Structures"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Subject Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.subject_code}
                                        onChange={e => setFormData({ ...formData, subject_code: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold uppercase"
                                        placeholder="e.g. 18CS51"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Semester</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="8"
                                        required
                                        value={formData.semester}
                                        onChange={e => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_external}
                                        onChange={e => setFormData({ ...formData, is_external: e.target.checked })}
                                        className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Use External Link (Mediafire/Drive)</span>
                                </label>

                                {formData.is_external ? (
                                    <input
                                        type="url"
                                        required
                                        value={formData.external_url}
                                        onChange={e => setFormData({ ...formData, external_url: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold"
                                        placeholder="Paste link here..."
                                    />
                                ) : (
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            required
                                            onChange={e => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer group"
                                        >
                                            <FileUp size={32} className="text-slate-300 group-hover:text-indigo-600 transition-colors mb-2" />
                                            <span className="text-[10px] font-black uppercase text-slate-500">{formData.file ? formData.file.name : 'Choose PDF File'}</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-900/20 disabled:opacity-50 transition-all"
                            >
                                {uploading ? 'Uploading...' : 'Confirm Upload'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
