import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { Search, Download, FileText, Filter, GraduationCap } from 'lucide-react';
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

export const VtuResources: React.FC = () => {
    const { t } = useLanguage();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedSemester, setSelectedSemester] = useState('all');

    useEffect(() => {
        fetchResources();
    }, [searchQuery, selectedType, selectedSemester]);

    const fetchResources = async () => {
        setLoading(true);
        let query = supabase.from('academic_resources').select('*').order('created_at', { ascending: false });

        if (selectedType !== 'all') {
            query = query.eq('type', selectedType);
        }

        if (selectedSemester !== 'all') {
            query = query.eq('semester', parseInt(selectedSemester));
        }

        if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,subject_code.ilike.%${searchQuery}%`);
        }

        const { data } = await query;
        setResources(data || []);
        setLoading(false);
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'paper': return t['questionPaper'];
            case 'note': return t['digitalNotes'];
            case 'manual': return t['labManual'];
            default: return type;
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col">
            <header className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                        <GraduationCap size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{t['vtuHub']}</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{t['vtuSubtitle']}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder={t['search'] || "Search by Title or Subject Code..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold transition-all shadow-sm"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full h-full px-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold transition-all shadow-sm appearance-none"
                        >

                            <option value="all">{t['allResources']}</option>
                            <option value="paper">{t['questionPapers']}</option>
                            <option value="note">{t['digitalNotes']}</option>
                            <option value="manual">{t['labManuals']}</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <select
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="w-full h-full px-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold transition-all shadow-sm appearance-none"
                        >
                            <option value="all">{t['anySemester']}</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                <option key={s} value={s}>{t['semester']} {s}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {loading ? <LoadingScreen /> : (
                <div className="flex-1">
                    {resources.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {resources.map((res) => (
                                <div key={res.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 hover:shadow-xl transition-all group flex gap-6 items-center">
                                    <div className={`p-5 rounded-3xl ${res.type === 'paper' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' :
                                        res.type === 'note' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' :
                                            'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                                        }`}>
                                        <FileText size={32} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-[8px] font-black uppercase tracking-widest">
                                                {getTypeLabel(res.type)}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                {t['scheme']} {res.scheme} • {t['semester']} {res.semester}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {res.title}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            {res.subject_code}
                                        </p>
                                    </div>

                                    <a
                                        href={res.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl text-slate-400 hover:bg-indigo-600 hover:text-white transition-all group/btn"
                                    >
                                        <Download size={24} className="group-hover/btn:translate-y-0.5 transition-transform" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <GraduationCap size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
                            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">{t['noResources']}</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">{t['clearFilters']}</p>
                        </div>
                    )}
                </div>
            )}

            <footer className="mt-12 space-y-6">
                {/* Official VTU Portals Section */}
                <div className="p-8 bg-indigo-600 dark:bg-indigo-900/40 rounded-[2.5rem] border border-indigo-500/20">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 shadow-sm">
                            <GraduationCap size={24} />
                        </div>
                        <div>
                            <h4 className="font-black text-white uppercase tracking-tight text-lg">VTU Official Portals</h4>
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Direct Access to University Resources</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <a
                            href="https://vtu.ac.in/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                    <GraduationCap size={20} />
                                </div>
                                <div>
                                    <p className="font-black text-white text-sm">VTU Official Website</p>
                                    <p className="text-indigo-200 text-xs font-medium">vtu.ac.in</p>
                                </div>
                            </div>
                            <div className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all">→</div>
                        </a>

                        <a
                            href="https://results.vtu.ac.in/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="font-black text-white text-sm">Results Portal</p>
                                    <p className="text-indigo-200 text-xs font-medium">results.vtu.ac.in</p>
                                </div>
                            </div>
                            <div className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all">→</div>
                        </a>

                        <a
                            href="https://vtu.ac.in/en/examination/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="font-black text-white text-sm">Examination Division</p>
                                    <p className="text-indigo-200 text-xs font-medium">Exam notifications & circulars</p>
                                </div>
                            </div>
                            <div className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all">→</div>
                        </a>

                        <a
                            href="https://vtu.ac.in/en/b-e-scheme-syllabus/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="font-black text-white text-sm">Syllabus & Schemes</p>
                                    <p className="text-indigo-200 text-xs font-medium">All programs & years</p>
                                </div>
                            </div>
                            <div className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all">→</div>
                        </a>
                    </div>
                </div>

                {/* Quick Filters Footer */}
                <div className="p-8 bg-indigo-50 dark:bg-indigo-950/20 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-100 dark:border-indigo-900/30">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 shadow-sm">
                            <Filter size={20} />
                        </div>
                        <div>
                            <h4 className="font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-tight">{t['quickFilters']}</h4>
                            <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-widest">{t['findWhatYouNeed']}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {['18CS51', '21CS32', '18MAT41', '21PHY12'].map(code => (
                            <button
                                key={code}
                                onClick={() => setSearchQuery(code)}
                                className="px-4 py-2 bg-white dark:bg-slate-900 rounded-full text-[10px] font-black uppercase text-indigo-600 border border-indigo-100 dark:border-indigo-800 hover:border-indigo-600 transition-all shadow-sm"
                            >
                                {code}
                            </button>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};
