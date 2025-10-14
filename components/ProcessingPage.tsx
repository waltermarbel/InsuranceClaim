import React from 'react';
import { SpinnerIcon } from './icons';

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
        <SpinnerIcon className="h-16 w-16 text-primary mx-auto" />
        <h1 className="mt-6 text-3xl font-extrabold text-dark tracking-tight font-heading">
          Building Your Vault...
        </h1>
        <p className="mt-3 text-lg text-medium">
          Our AI is analyzing your documents and images. This may take a few moments.
        </p>

        <div className="w-full bg-slate-200 rounded-full h-2.5 mt-8">
          <div className="bg-primary h-2.5 rounded-full" style={{ width: `${percentage}%`, transition: 'width 0.5s ease' }}></div>
        </div>
        
        <div className="mt-4 text-sm text-medium">
           <p className="font-bold text-primary">
            Stage: {progress.stage}
          </p>
          <p>
            Processing: {progress.current} of {progress.total}
          </p>
          <p className="font-semibold text-dark mt-1 truncate max-w-md mx-auto">
            {progress.fileName}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="mt-8 px-6 py-2 text-sm font-semibold bg-danger/10 text-danger rounded-md shadow-sm hover:bg-danger/20 transition"
        >
          Cancel Process
        </button>
      </div>
    </div>
  );
};

export default ProcessingPage;
