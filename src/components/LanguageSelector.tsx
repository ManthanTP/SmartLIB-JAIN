import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const LanguageSelector: React.FC = () => {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'hi', label: 'Hindi (हिंदी)' },
        { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' }
    ];

    const handleSelect = (code: string) => {
        setLanguage(code as 'en' | 'hi' | 'kn');
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                title="Select Language"
            >
                <Globe size={20} />
                <span className="text-xs font-medium uppercase">{language}</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-border py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleSelect(lang.code)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                                    ${language === lang.code ? 'text-primary font-bold bg-primary/5' : 'text-text-primary'}
                                `}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
