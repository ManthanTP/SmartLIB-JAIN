import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookCard, type Book } from '../components/BookCard';
import { Search, BookOpen } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

export const Catalog: React.FC = () => {
    const { t } = useLanguage();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');


    useEffect(() => {
        fetchBooks();

        // Real-time subscription for book updates (availability changes)
        const subscription = supabase
            .channel('public:books')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, (payload) => {
                console.log('Book update received:', payload);
                fetchBooks();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [searchQuery, selectedCategory]);

    const fetchBooks = async () => {
        setLoading(true);
        try {
            let query = supabase.from('books').select('*');

            if (searchQuery) {
                query = query.or(`title.ilike.%${searchQuery}%,subject_code.ilike.%${searchQuery}%`);
            }

            if (selectedCategory !== 'All') {
                query = query.eq('category', selectedCategory);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching books:', error);
            } else {
                setBooks(data as Book[] || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        { key: 'All', label: t['all'] },
        { key: 'Computer Science', label: t['cs'] },
        { key: 'Software Engineering', label: t['se'] },
        { key: 'Literature', label: t['lit'] },
        { key: 'History', label: t['his'] }
    ];

    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen pb-20">
            {/* Header & Search Section */}
            <div className="relative mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                            {t['catalog']}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-xl">
                            {t['catalogSubtitle']}
                        </p>
                    </motion.div>
                </div>

                {/* Floating Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky top-4 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2rem] p-4 shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row gap-4 items-center"
                >
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder={t['searchPlaceholder']}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border-transparent focus:bg-white dark:focus:bg-slate-700/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat.key}
                                onClick={() => setSelectedCategory(cat.key)}
                                className={`px-6 py-4 rounded-3xl text-sm font-black uppercase tracking-wide whitespace-nowrap transition-all ${selectedCategory === cat.key
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Results Grid */}
            <AnimatePresence mode="wait">
                {books.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {books.map((book, index) => (
                            <motion.div
                                key={book.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <BookCard book={book} />
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                            <BookOpen size={48} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{t['noBooksFound']}</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">{t['clearFilters']}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
