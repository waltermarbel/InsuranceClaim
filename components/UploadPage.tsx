import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { UploadIcon, CubeIcon, SpinnerIcon } from './icons.tsx';
import { UploadProgress } from '../types.ts';

interface UploadPageProps {
  onFilesSelected: (files: FileList) => void;
  onPolicySelected: (file: File) => void;
  uploadProgress: UploadProgress | null;
  isAnalyzingPolicy?: boolean;
}

const UploadPage: React.FC<UploadPageProps> = ({ onFilesSelected, onPolicySelected, uploadProgress, isAnalyzingPolicy }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const policyInputRef = useRef<HTMLInputElement>(null);

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

  const handlePolicyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onPolicySelected(e.target.files[0]);
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
                Drag and drop all your evidence here—photos of items, receipts, warranties. Or, upload your insurance policy to get started.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                 <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-6 py-3 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition"
                 >
                    Upload Evidence
                </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); policyInputRef.current?.click(); }}
                    disabled={isAnalyzingPolicy}
                    className="px-6 py-3 text-sm font-semibold bg-white text-primary border border-primary rounded-md shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
                 >
                    Upload Policy
                </button>
            </div>
        </div>
      </div>
      <input 
          type="file" 
          ref={policyInputRef} 
          onChange={handlePolicyChange} 
          className="hidden"
          accept="application/pdf"
      />
      <p className="mt-6 text-sm text-slate-500">
        You can upload multiple files at once. Supported formats: JPG, PNG, PDF.
      </p>
    </motion.div>
  );
};

export default UploadPage;