
import React from 'react';
import { SpinnerIcon, SparklesIcon } from './icons';

interface ProcessingPageProps {
  progress: {
    stage: string;
    current: number;
    total: number;
    fileName: string;
  };
  onCancel: () => void;
}

const ProcessingPage: React.FC<ProcessingPageProps> = ({ progress, onCancel }) => {
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center text-center h-full min-h-[50vh]">
      <div className="max-w-2xl mx-auto">
        <div className="relative inline-block">
            <SpinnerIcon className="h-20 w-20 text-primary mx-auto animate-spin" />
            <SparklesIcon className="h-8 w-8 text-secondary absolute -top-1 -right-1 animate-pulse" />
        </div>
        <h1 className="mt-8 text-3xl font-extrabold text-dark tracking-tight font-heading">
          AI Analysis Pipeline Active
        </h1>
        <p className="mt-3 text-lg text-medium">
          Extracting item details, estimating values, and categorizing evidence.
        </p>

        <div className="w-full bg-slate-200 rounded-full h-3 mt-10 overflow-hidden shadow-inner">
          <div 
            className="bg-gradient-to-r from-primary to-blue-400 h-3 rounded-full shadow-lg" 
            style={{ width: `${percentage}%`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
          ></div>
        </div>
        
        <div className="mt-6 text-sm text-medium bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
           <div className="flex justify-between mb-2 border-b border-slate-100 pb-2">
               <span className="font-bold text-slate-500 uppercase tracking-wide text-xs">Status</span>
               <span className="font-bold text-primary capitalize">{progress.stage}...</span>
           </div>
           <div className="flex justify-between mb-2">
                <span className="font-bold text-slate-500 uppercase tracking-wide text-xs">Progress</span>
                <span className="font-mono text-dark">{progress.current} / {progress.total}</span>
           </div>
           <div className="text-left">
                <span className="font-bold text-slate-500 uppercase tracking-wide text-xs block mb-1">Currently Processing</span>
                <p className="font-semibold text-dark truncate bg-slate-50 p-2 rounded border border-slate-100">
                    {progress.fileName}
                </p>
           </div>
        </div>

        <button
          onClick={onCancel}
          className="mt-8 px-6 py-2.5 text-sm font-bold bg-white text-danger border border-danger/20 rounded-lg shadow-sm hover:bg-danger/5 hover:border-danger/50 transition-all"
        >
          Cancel Process
        </button>
      </div>
    </div>
  );
};

export default ProcessingPage;
