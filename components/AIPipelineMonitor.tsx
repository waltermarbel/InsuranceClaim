import React from 'react';
import { SpinnerIcon, XIcon } from './icons.tsx';
import { PipelineStage } from '../types.ts';

interface AIPipelineMonitorProps {
    stage: PipelineStage;
    progress: { current: number; total: number; fileName: string };
    onCancel: () => void;
}

export const AIPipelineMonitor: React.FC<AIPipelineMonitorProps> = ({ stage, progress, onCancel }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 mb-8 relative animate-fade-in-down">
            <button onClick={onCancel} className="absolute top-3 right-3 text-medium hover:text-dark p-1 rounded-full hover:bg-slate-100 transition">
                <XIcon className="h-5 w-5"/>
            </button>
            <div className="flex items-center gap-6">
                <SpinnerIcon className="h-10 w-10 text-primary flex-shrink-0" />
                <div className="flex-grow">
                    <h3 className="text-lg font-bold text-dark font-heading">AI Pipeline is Running</h3>
                    <p className="text-sm text-medium">Your personal inventory expert is at work. This may take a moment.</p>
                </div>
            </div>

            <div className="mt-6">
                <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-primary capitalize">{stage}...</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 relative overflow-hidden">
                    <div className="bg-primary h-2 rounded-full animate-indeterminate-progress"></div>
                </div>
                <p className="text-xs text-medium mt-2 text-center truncate">
                    {progress.fileName}
                </p>
            </div>
            <style>{`
                @keyframes fade-in-down {
                    0% { opacity: 0; transform: translateY(-10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down { animation: fade-in-down 0.5s ease-out forwards; }
                
                @keyframes indeterminate-progress {
                    0% { left: -50%; width: 50%; }
                    100% { left: 100%; width: 50%; }
                }
                .animate-indeterminate-progress {
                    position: absolute;
                    animation: indeterminate-progress 1.5s infinite linear;
                }
            `}</style>
        </div>
    );
};
