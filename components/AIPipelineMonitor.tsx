import React from 'react';
import { SpinnerIcon, XIcon } from './icons.tsx';
import { WorkflowProgressBar } from './WorkflowProgressBar.tsx';
import { PipelineStage } from '../types.ts';

interface AIPipelineMonitorProps {
    stage: PipelineStage;
    progress: { current: number; total: number; fileName: string };
    onCancel: () => void;
}

const STAGES = ['Analyze', 'Cluster', 'Review'];

export const AIPipelineMonitor: React.FC<AIPipelineMonitorProps> = ({ stage, progress, onCancel }) => {
    const currentStepIndex = stage === 'analyzing' ? 0 : 1;
    const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 mb-8 relative animate-fade-in-down">
            <button onClick={onCancel} className="absolute top-3 right-3 text-medium hover:text-dark p-1 rounded-full hover:bg-slate-100 transition">
                <XIcon className="h-5 w-5"/>
            </button>
            <div className="flex items-center gap-6">
                <SpinnerIcon className="h-10 w-10 text-primary flex-shrink-0" />
                <div className="flex-grow">
                    <h3 className="text-lg font-bold text-dark font-heading">AI Pipeline is Running</h3>
                    <p className="text-sm text-medium">Your personal inventory expert is at work. You can continue to browse while the process runs.</p>
                </div>
            </div>

            <div className="mt-6">
                <WorkflowProgressBar steps={STAGES} currentStep={currentStepIndex} />
            </div>

            <div className="mt-12">
                <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-primary capitalize">{stage}... ({progress.current}/{progress.total})</span>
                    <span className="text-dark">{percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%`, transition: 'width 0.2s ease-out' }}></div>
                </div>
                <p className="text-xs text-medium mt-2 text-center truncate">
                    Current file: {progress.fileName}
                </p>
            </div>
            <style>{`
                @keyframes fade-in-down {
                    0% { opacity: 0; transform: translateY(-10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down { animation: fade-in-down 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};
