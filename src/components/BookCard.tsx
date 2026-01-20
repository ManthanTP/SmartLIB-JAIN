import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { BookCover } from './BookCover';

export type Book = {
    id: string;
    title: string;
    authors: string[];
    cover_image_url?: string;
    category: string;
    departments?: string[];
    available_copies: number;
    total_copies: number;
    description?: string;
    publisher?: string;
    publication_date?: string;
    isbn?: string;
    subject_code?: string;
    is_book_bank?: boolean;
};

type BookCardProps = {
    book: Book;
    onSelect?: (book: Book) => void;
};

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
    const isAvailable = book.available_copies > 0;
    const { t } = useLanguage();

    return (
        <Link
            to={`/books/${book.id}`}
            className="group bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-border dark:border-slate-700 overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col h-full block text-left"
        >
            <div className="aspect-[2/3] w-full bg-gray-100 dark:bg-slate-700 relative overflow-hidden">
                <BookCover
                    url={book.cover_image_url}
                    title={book.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    fallbackIconSize={48}
                />
                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${isAvailable ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                    }`}>
                    {isAvailable ? t.availableStatus : t.outOfStockStatus}
                </div>
                {book.is_book_bank && (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest bg-indigo-600 text-white shadow-lg">
                        Book Bank
                    </div>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="text-xs text-secondary dark:text-slate-400 font-medium uppercase tracking-wide mb-1">
                    {book.category}
                </div>
                <h3 className="font-bold text-text-primary dark:text-white line-clamp-2 mb-1 group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors" title={book.title}>
                    {book.title}
                </h3>
                <p className="text-sm text-text-secondary dark:text-slate-400 line-clamp-1 mb-3">
                    {book.authors?.join(', ') || t.unknownAuthor}
                </p>

                {book.subject_code && (
                    <div className="flex items-center gap-1.5 mb-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-tighter">
                            {book.subject_code}
                        </span>
                    </div>
                )}

                <div className="mt-auto flex items-center justify-between text-xs text-text-secondary dark:text-slate-400 border-t border-border dark:border-slate-700 pt-3 group-hover:border-primary/20 dark:group-hover:border-indigo-500/30 transition-colors">
                    <span>{book.available_copies} / {book.total_copies} {t.copiesLabel}</span>
                    <span className="text-primary dark:text-indigo-400 font-medium group-hover:underline">{t.viewDetails}</span>
                </div>
            </div>
        </Link>
    );
};
