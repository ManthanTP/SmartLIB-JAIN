import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import type { Book } from '../components/BookCard';
import { Plus, Edit, Trash2, Search, FileJson, FileSpreadsheet } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { BookCover } from '../components/BookCover';
import { DEPARTMENTS } from '../lib/constants';

export const AdminInventory: React.FC = () => {
    const { t } = useLanguage();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [departments, setDepartments] = useState<string[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        isbn: '',
        title: '',
        authors: '',
        category: '',
        departments: [] as string[],
        total_copies: 1,
        cover_image_url: '',
        description: '',
        subject_code: '',
        is_book_bank: false
    });

    useEffect(() => {
        fetchBooks();
        fetchDepts();

        // Real-time subscription for inventory updates
        const subscription = supabase
            .channel('admin_inventory')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, (payload) => {
                console.log('Inventory change detected:', payload);
                fetchBooks();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [searchQuery]);

    const fetchBooks = async () => {
        setLoading(true);
        let query = supabase.from('books').select('*').is('is_deleted', false).order('created_at', { ascending: false });

        if (searchQuery) {
            query = query.ilike('title', `%${searchQuery}%`);
        }

        const { data } = await query;
        setBooks(data as Book[] || []);
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
        } else {
            setDepartments([...DEPARTMENTS]);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t.confirmDeleteBook)) return;

        // 1. Delete associated data
        await supabase.from('loan_requests').delete().eq('book_id', id);
        await supabase.from('active_loans').delete().eq('book_id', id);
        await supabase.from('reservations').delete().eq('book_id', id);

        // 2. Soft delete book
        const { error } = await supabase
            .from('books')
            .update({ is_deleted: true })
            .eq('id', id);

        if (error) {
            alert(t.errorDeletingBook);
        } else {
            fetchBooks();
        }
    };

    const openModal = (book?: Book) => {
        if (book) {
            setEditingBook(book);
            setFormData({
                isbn: (book as any).isbn,
                title: book.title,
                authors: book.authors?.join(', ') || '',
                category: book.category,
                departments: (book as any).departments || [],
                total_copies: book.total_copies,
                cover_image_url: book.cover_image_url || '',
                description: (book as any).description || '',
                subject_code: (book as any).subject_code || '',
                is_book_bank: (book as any).is_book_bank || false
            });
        } else {
            setEditingBook(null);
            setFormData({
                isbn: '',
                title: '',
                authors: '',
                category: '',
                departments: [],
                total_copies: 1,
                cover_image_url: '',
                description: '',
                subject_code: '',
                is_book_bank: false
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const authorsArray = formData.authors.split(',').map(a => a.trim());

        const payload = {
            isbn: formData.isbn,
            title: formData.title,
            authors: authorsArray,
            category: formData.category,
            departments: formData.departments,
            total_copies: formData.total_copies,
            available_copies: formData.total_copies, // Simplified logic: resetting available copies on edit is risky, but for new books it's correct.
            cover_image_url: formData.cover_image_url,
            description: formData.description,
            subject_code: formData.subject_code,
            is_book_bank: formData.is_book_bank
        };

        if (editingBook) {
            // Calculate difference to adjust available_copies
            const copyDifference = formData.total_copies - editingBook.total_copies;
            let newAvailable = editingBook.available_copies + copyDifference;

            // Safety clamp: Available copies cannot exceed Total copies
            // This fixes existing data corruption (like 9 available / 6 total)
            if (newAvailable > formData.total_copies) {
                newAvailable = formData.total_copies;
            }

            if (newAvailable < 0) {
                alert(t.errorReduceCopies);
                return;
            }

            const updatePayload = {
                ...payload,
                available_copies: newAvailable
            };

            const { error } = await supabase
                .from('books')
                .update(updatePayload)
                .eq('id', editingBook.id);

            if (error) alert(t.errorUpdatingBook + ': ' + error.message);
        } else {
            const { error } = await supabase.from('books').insert([payload]);
            if (error) alert(t.errorAddingBook + ': ' + error.message);
        }

        setIsModalOpen(false);
        fetchBooks();
    };

    const exportCSV = () => {
        const headers = ['ISBN', 'Title', 'Authors', 'Category', 'Total Copies', 'Available Copies'];
        const csvRows = books.map(book => [
            book.isbn || '',
            `"${book.title.replace(/"/g, '""')}"`,
            `"${book.authors.join(', ').replace(/"/g, '""')}"`,
            book.category,
            book.total_copies,
            book.available_copies
        ].join(','));

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `smartlib_inventory_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(books, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `smartlib_inventory_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-primary dark:text-indigo-400">{t.inventoryManagement}</h1>
                    <p className="text-text-secondary dark:text-slate-400">{t.inventoryManagementSubtitle}</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-bold text-sm"
                >
                    <Plus size={20} />
                    {t.addNewBook}
                </button>
            </div>

            {loading ? <LoadingScreen /> : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-border dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-border dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder={t.searchBooksPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-border dark:border-slate-700 rounded-lg w-full focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-900 text-text-primary dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={exportCSV}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-xs font-black active:scale-95 group"
                            >
                                <FileSpreadsheet size={16} className="group-hover:translate-y-[-2px] transition-transform" />
                                CSV
                            </button>
                            <button
                                onClick={exportJSON}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-amber-500 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all text-xs font-black active:scale-95 group"
                            >
                                <FileJson size={16} className="group-hover:translate-y-[-2px] transition-transform" />
                                JSON
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-slate-900/50 text-text-secondary dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">{t.book}</th>
                                    <th className="px-6 py-4">{t.category}</th>
                                    <th className="px-6 py-4 text-center">{t.copies}</th>
                                    <th className="px-6 py-4 text-right">{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border dark:divide-slate-700">
                                {books.map((book) => (
                                    <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-14 rounded-lg overflow-hidden shadow-sm">
                                                    <BookCover
                                                        url={book.cover_image_url}
                                                        title={book.title}
                                                        className="w-full h-full object-cover"
                                                        fallbackIconSize={20}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-text-primary dark:text-white leading-tight">{book.title}</div>
                                                    <div className="text-xs text-text-secondary dark:text-slate-500">{book.authors.join(', ')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                                                {book.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm">
                                                <span className="font-black text-indigo-600 dark:text-indigo-400">{book.available_copies}</span>
                                                <span className="text-gray-300 dark:text-slate-700 mx-1">/</span>
                                                <span className="text-text-secondary dark:text-slate-500 font-bold">{book.total_copies}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(book)}
                                                    className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                    title={t.editBook}
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(book.id)}
                                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title={t.confirmDeleteBook}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!loading && books.length === 0 && (
                            <div className="text-center py-12 text-text-secondary dark:text-slate-400">{t.noBooksFound}</div>
                        )}
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
                            <div className="p-6 border-b border-border dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                                <h2 className="text-xl font-black text-primary dark:text-indigo-400 uppercase tracking-tight">
                                    {editingBook ? t.editBook : t.addNewBook}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 transition-all"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-slate-500 mb-2">{t.bookTitle}</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-3 border border-border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-900 text-text-primary dark:text-white transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-slate-500 mb-2">{t.isbn}</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.isbn}
                                            onChange={e => setFormData({ ...formData, isbn: e.target.value })}
                                            className="w-full px-4 py-3 border border-border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-900 text-text-primary dark:text-white transition-all shadow-sm disabled:opacity-50"
                                            disabled={!!editingBook}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-slate-500 mb-2">{t.category}</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-3 border border-border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-900 text-text-primary dark:text-white transition-all shadow-sm"
                                            placeholder="e.g. Thermodynamics, Algorithms"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-slate-500 mb-2">Subject Code (VTU)</label>
                                        <input
                                            type="text"
                                            value={formData.subject_code}
                                            onChange={e => setFormData({ ...formData, subject_code: e.target.value })}
                                            className="w-full px-4 py-3 border border-border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-900 text-text-primary dark:text-white transition-all shadow-sm"
                                            placeholder="e.g. 18CS51"
                                        />
                                    </div>
                                    <div className="flex items-end pb-3">
                                        <label className="flex items-center gap-3 cursor-pointer group bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 rounded-xl border border-indigo-100 dark:border-indigo-800 w-full transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/30">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_book_bank}
                                                onChange={e => setFormData({ ...formData, is_book_bank: e.target.checked })}
                                                className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600 cursor-pointer"
                                            />
                                            <div>
                                                <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest block">Book Bank Copy</span>
                                                <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">Semester-long issue rules</span>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-slate-500 mb-2">Target Branches (Multiple)</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-border dark:border-slate-700">
                                            {departments.map((dept) => (
                                                <label key={dept} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.departments.includes(dept)}
                                                        onChange={(e) => {
                                                            const newDepts = e.target.checked
                                                                ? [...formData.departments, dept]
                                                                : formData.departments.filter(d => d !== dept);
                                                            setFormData({ ...formData, departments: newDepts });
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600 cursor-pointer"
                                                    />
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tighter">
                                                        {dept}
                                                    </span>
                                                </label>
                                            ))}
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.departments.includes('General')}
                                                    onChange={(e) => {
                                                        const dept = 'General';
                                                        const newDepts = e.target.checked
                                                            ? [...formData.departments, dept]
                                                            : formData.departments.filter(d => d !== dept);
                                                        setFormData({ ...formData, departments: newDepts });
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600 cursor-pointer"
                                                />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tighter">
                                                    General/Other
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-slate-500 mb-2">{t.authorsLabel}</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.authors}
                                            onChange={e => setFormData({ ...formData, authors: e.target.value })}
                                            className="w-full px-4 py-3 border border-border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-900 text-text-primary dark:text-white transition-all shadow-sm"
                                            placeholder="e.g. J.K. Rowling, Stephen King"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-slate-500 mb-2">{t.totalCopiesLabel}</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={formData.total_copies}
                                            onChange={e => setFormData({ ...formData, total_copies: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 border border-border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-900 text-text-primary dark:text-white transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-slate-500 mb-2">{t.coverImageUrlLabel}</label>
                                        <input
                                            type="url"
                                            value={formData.cover_image_url}
                                            onChange={e => setFormData({ ...formData, cover_image_url: e.target.value })}
                                            className="w-full px-4 py-3 border border-border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-900 text-text-primary dark:text-white transition-all shadow-sm"
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-slate-500 mb-2">{t.descriptionLabel}</label>
                                        <textarea
                                            rows={4}
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-3 border border-border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none bg-white dark:bg-slate-900 text-text-primary dark:text-white transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="pt-8 flex justify-end gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-text-secondary dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                                    >
                                        {t.cancel}
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                                    >
                                        {editingBook ? t.updateBook : t.addBook}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
