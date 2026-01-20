import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white animate-pulse">Loading SmartLIB</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Please wait moment...</p>
                </div>
            </div>
        </div>
    );
};
