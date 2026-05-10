import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { UploadIcon, CubeIcon, SpinnerIcon } from './icons.tsx';
import { UploadProgress, ParsedPolicy } from '../types.ts';

interface UploadPageProps {
  onFilesSelected: (files: FileList) => void;
  onPolicySelected: (file: File) => void;
  uploadProgress: UploadProgress | null;
  isAnalyzingPolicy?: boolean;
  activePolicy?: ParsedPolicy | null;
}

const UploadPage: React.FC<UploadPageProps> = ({ onFilesSelected, onPolicySelected, uploadProgress, isAnalyzingPolicy, activePolicy }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-primary', 'bg-primary/5');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(e.target.files);
    }
  };

  if (uploadProgress || isAnalyzingPolicy) {
    if (isAnalyzingPolicy) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center text-center h-full min-h-[70vh]"
            >
                <div className="w-full max-w-2xl mx-auto">
                    <SpinnerIcon className="h-12 w-12 text-primary mx-auto"/>
                    <h1 className="mt-6 text-3xl font-extrabold text-dark tracking-tight font-heading">
                        Analyzing Policy...
                    </h1>
                    <p className="mt-2 text-lg text-medium">
                        Extracting coverages, limits, and exclusions. This may take a moment.
                    </p>
                </div>
            </motion.div>
        );
    }

    // FIX: Explicitly type `fileProgresses` to ensure correct type inference in subsequent operations.
    const fileProgresses: { loaded: number; total: number }[] = Object.values(uploadProgress || {});
    const totalLoaded = fileProgresses.reduce((sum, p) => sum + p.loaded, 0);
    const totalSize = fileProgresses.reduce((sum, p) => sum + p.total, 0);
    const overallPercentage = totalSize > 0 ? Math.round((totalLoaded / totalSize) * 100) : 0;
    const fileCount = fileProgresses.length;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center text-center h-full min-h-[70vh]"
      >
        <div className="w-full max-w-2xl mx-auto">
            <SpinnerIcon className="h-12 w-12 text-primary mx-auto"/>
            <h1 className="mt-6 text-3xl font-extrabold text-dark tracking-tight font-heading">
                Reading Your Files...
            </h1>
            <p className="mt-2 text-lg text-medium">
                Preparing {fileCount} file{fileCount > 1 ? 's' : ''} for AI analysis.
            </p>

            <div className="mt-8">
                <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-primary">Overall Progress</span>
                    <span className="text-dark">{overallPercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${overallPercentage}%`, transition: 'width 0.2s ease-out' }}></div>
                </div>
            </div>

            <div className="mt-6 text-left max-h-60 overflow-y-auto pr-4 -mr-4 space-y-3">
                {/* FIX: Explicitly type the destructured `progress` object to avoid type errors. */}
                {Object.entries(uploadProgress).map(([fileName, progress]: [string, { loaded: number; total: number }]) => {
                    const percentage = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
                    return (
                        <div key={fileName} className="p-2">
                            <div className="flex justify-between items-center text-xs mb-1">
                                <p className="text-medium truncate pr-4">{fileName}</p>
                                <p className="font-semibold text-dark">{percentage}%</p>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${percentage}%`, transition: 'width 0.2s ease-out' }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center text-center h-full min-h-[70vh]"
    >
      <div 
        className="w-full max-w-3xl p-8 border-2 border-dashed border-slate-300 rounded-lg transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden"
            accept="image/*,application/pdf"
        />
        <div className="flex flex-col items-center">
            <UploadIcon className="h-16 w-16 text-slate-400" />
            <h1 className="mt-6 text-4xl font-extrabold text-dark tracking-tight font-heading">
                Start Building Your Digital Vault
            </h1>
            <p className="mt-3 text-lg text-medium max-w-xl">
                Drag and drop all your evidence here—photos of items, receipts, warranties.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                 <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-6 py-3 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition"
                 >
                    Upload Evidence
                </button>
            </div>
            {activePolicy && (
               <div className="mt-8 text-sm text-indigo-800 bg-indigo-50 p-5 border border-indigo-200 rounded-xl text-left max-w-xl w-full shadow-sm" onClick={e => e.stopPropagation()}>
                  <p className="font-semibold mb-3 flex items-center gap-2">
                     <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     Upload Guidance for {activePolicy.policyName || activePolicy.policyNumber}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-indigo-700">
                     {activePolicy.conditions?.some(c => c.toLowerCase().includes('receipt') || c.toLowerCase().includes('invoice')) && (
                         <li>This policy strictly requires clear, legible receipts for all claims. PDF format is highly recommended.</li>
                     )}
                     {activePolicy.exclusions?.some(c => c.toLowerCase().includes('jewelry') || c.toLowerCase().includes('art') || c.toLowerCase().includes('electronics')) && (
                         <li>Certain high-value categories (e.g. jewelry or electronics) require an appraisal or serial number. Standard photos alone may be insufficient.</li>
                     )}
                     <li>Ensure photos are well-lit and serial numbers or identifying marks are clearly visible.</li>
                     <li>Audio notes and PDF documents are fully supported for additional context.</li>
                  </ul>
               </div>
            )}
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-500">
        You can upload multiple files at once. Supported formats: JPG, PNG, PDF.
      </p>
    </motion.div>
  );
};

export default UploadPage;