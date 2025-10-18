import React from 'react';
import { SpinnerIcon, QueueListIcon } from './icons';

interface BackgroundProcessMonitorProps {
    queueLength: number;
    currentItemName: string;
}

export const BackgroundProcessMonitor: React.FC<BackgroundProcessMonitorProps> = ({ queueLength, currentItemName }) => {
    return (
        <div 
            className="fixed bottom-5 right-5 z-50 w-full max-w-sm"
            role="status"
            aria-live="polite"
        >
             <div className="bg-dark text-white rounded-lg shadow-2xl p-4 flex items-start space-x-4">
                 <div className="flex-shrink-0 mt-1">
                    <SpinnerIcon className="h-6 w-6 text-primary-light" />
                 </div>
                 <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-bold text-white">AI Analysis in Progress</p>
                    <p className="text-xs text-slate-300 mt-1">
                        Analyzing: <span className="font-medium text-white truncate">{currentItemName}</span>
                    </p>
                 </div>
                 <div className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-black/30 px-2 py-1 rounded-full">
                    <QueueListIcon className="h-4 w-4"/>
                    <span>{queueLength - 1} left</span>
                 </div>
             </div>
        </div>
    );
}
