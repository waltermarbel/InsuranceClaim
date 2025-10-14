import React from 'react';
import { SpinnerIcon, DocumentTextIcon, CheckCircleIcon, ExclamationIcon } from './icons';

export interface UploadProgress {
  fileName: string;
  status: 'pending' | 'analyzing' | 'success' | 'error';
  errorMessage?: string;
}

interface UploadProgressViewProps {
  files: UploadProgress[];
  onDone: () => void;
  onCancel: () => void;
}

const UploadProgressView: React.FC<UploadProgressViewProps> = ({ files, onDone, onCancel }) => {
  const completedCount = files.filter(f => f.status === 'success' || f.status === 'error').length;
  const totalCount = files.length;
  const isComplete = completedCount === totalCount;

  return (
    <div className="flex flex-col items-center justify-center text-center h-full min-h-[70vh]">
      <div className="w-full max-w-2xl mx-auto">
        <SpinnerIcon className="h-16 w-16 text-primary mx-auto" />
        <h1 className="mt-6 text-3xl font-extrabold text-dark tracking-tight font-heading">
          {isComplete ? 'Analysis Complete' : 'Building Your Vault...'}
        </h1>
        <p className="mt-3 text-lg text-medium">
          {isComplete
            ? `Successfully processed ${completedCount} files.`
            : `Our AI is analyzing your files. This may take a few moments.`}
        </p>
        
        <div className="mt-8 text-left max-h-80 overflow-y-auto pr-4 space-y-3">
          {files.map((file, index) => (
            <div key={index} className="flex items-center p-3 bg-slate-50 rounded-md">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-slate-400"/>
              </div>
              <div className="flex-grow ml-3 overflow-hidden">
                <p className="text-sm font-medium text-dark truncate">{file.fileName}</p>
              </div>
              <div className="flex-shrink-0 ml-3">
                {file.status === 'pending' && <span className="text-xs text-medium">Waiting...</span>}
                {file.status === 'analyzing' && <SpinnerIcon className="h-5 w-5 text-primary"/>}
                {file.status === 'success' && <CheckCircleIcon className="h-5 w-5 text-success"/>}
                {file.status === 'error' && <ExclamationIcon className="h-5 w-5 text-danger" title={file.errorMessage}/>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          {isComplete ? (
            <button
              onClick={onDone}
              className="px-8 py-3 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition"
            >
              Review Items
            </button>
          ) : (
             <button
              onClick={onCancel}
              className="px-6 py-2 text-sm font-semibold bg-danger/10 text-danger rounded-md shadow-sm hover:bg-danger/20 transition"
            >
              Cancel Process
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadProgressView;
