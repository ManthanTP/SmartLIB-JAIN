import React, { useState } from 'react';
import { Book as BookIcon } from 'lucide-react';

interface BookCoverProps {
    url?: string;
    title?: string;
    className?: string;
    fallbackIconSize?: number;
}

export const BookCover: React.FC<BookCoverProps> = ({
    url,
    title = 'Book Cover',
    className = '',
    fallbackIconSize = 24
}) => {
    const [error, setError] = useState(false);

    // Fallback Image
    const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300&h=400";

    if (url && !error) {
        return (
            <img
                src={url}
                alt={title}
                className={className}
                onError={() => setError(true)}
            />
        );
    }

    // Fallback Render
    return (
        <div className={`relative overflow-hidden bg-gray-200 dark:bg-slate-700 flex items-center justify-center ${className}`}>
            <img
                src={FALLBACK_IMAGE}
                alt="Default Cover"
                className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale"
            />
            <div className="relative z-10 text-slate-600 dark:text-slate-300 drop-shadow-md">
                <BookIcon size={fallbackIconSize} />
            </div>
        </div>
    );
};
