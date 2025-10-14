import React, { useRef } from 'react';
import { UploadIcon } from './icons';
import { UploadProgress } from '../types';

interface UploadPageProps {
  onItemPhotosSelected: (files: FileList) => void;
  onProofDocumentsSelected: (files: FileList) => void;
  uploadProgress: UploadProgress | null;
}

const UploadPage: React.FC<UploadPageProps> = ({ onItemPhotosSelected, onProofDocumentsSelected, uploadProgress }) => {
  const itemInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

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
      onItemPhotosSelected(e.dataTransfer.files);
    }
  };
  
  const handleItemFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onItemPhotosSelected(e.target.files);
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onProofDocumentsSelected(e.target.files);
    }
  };

  if (uploadProgress) {
    const files = Object.entries(uploadProgress);
    // Fix: Cast progress value to `any` to resolve TypeScript error where type is inferred as `unknown`.
    const totalLoaded = files.reduce((sum, [, p]) => sum + (p as any).loaded, 0);
    // Fix: Cast progress value to `any` to resolve TypeScript error where type is inferred as `unknown`.
    const totalSize = files.reduce((sum, [, p]) => sum + (p as any).total, 0);
    const overallPercentage = totalSize > 0 ? Math.round((totalLoaded / totalSize) * 100) : 0;

    return (
      <div className="flex flex-col items-center justify-center text-center h-full min-h-[70vh]">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-3xl font-extrabold text-dark tracking-tight font-heading">Reading Your Files...</h1>
          <p className="mt-2 text-lg text-medium">Preparing files for AI analysis.</p>

          <div className="mt-8 text-left">
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="font-semibold text-dark">Overall Progress</span>
              <span className="font-semibold text-medium">{overallPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${overallPercentage}%`, transition: 'width 0.2s ease' }}></div>
            </div>

            <div className="mt-6 max-h-80 overflow-y-auto pr-4 space-y-2">
              {files.map(([fileName, progress]) => {
                // Fix: Cast progress value to `any` to resolve TypeScript error where type is inferred as `unknown`.
                const filePercentage = (progress as any).total > 0 ? Math.round(((progress as any).loaded / (progress as any).total) * 100) : 0;
                return (
                  <div key={fileName} className="flex items-center gap-4 p-2 bg-slate-50 rounded-md">
                      <p className="text-sm text-medium truncate flex-grow text-left">{fileName}</p>
                      <div className="w-1/4 bg-slate-200 rounded-full h-2">
                          <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300 ease-linear"
                              style={{ width: `${filePercentage}%` }}
                          ></div>
                      </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center h-full min-h-[70vh]">
      <div 
        className="w-full max-w-3xl p-8 border-2 border-dashed border-slate-300 rounded-lg transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => itemInputRef.current?.click()}
      >
        <input 
            type="file" 
            multiple 
            ref={itemInputRef} 
            onChange={handleItemFileChange} 
            className="hidden"
            accept="image/*"
        />
         <input 
            type="file" 
            multiple 
            ref={proofInputRef} 
            onChange={handleProofFileChange} 
            className="hidden"
            accept="image/*,application/pdf"
        />
        <div className="flex flex-col items-center">
            <UploadIcon className="h-16 w-16 text-slate-400" />
            <h1 className="mt-6 text-4xl font-extrabold text-dark tracking-tight font-heading">
                Start Building Your Digital Vault
            </h1>
            <p className="mt-3 text-lg text-medium max-w-xl">
                Drag and drop photos of your items or receipts here. We'll use AI to automatically catalog everything.
            </p>
            <div className="mt-8 flex gap-4">
                 <button 
                    onClick={(e) => { e.stopPropagation(); itemInputRef.current?.click(); }}
                    className="px-6 py-3 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition"
                 >
                    Upload Item Photos
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); proofInputRef.current?.click(); }}
                    className="px-6 py-3 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition"
                >
                    Upload Receipts or Proofs
                </button>
            </div>
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-500">
        You can upload multiple files at once. Supported formats: JPG, PNG, PDF.
      </p>
    </div>
  );
};

export default UploadPage;