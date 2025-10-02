import React, { useRef } from 'react';
import { UploadIcon, SpinnerIcon } from './icons';

interface UploadPageProps {
  onFilesSelected: (files: FileList) => void;
  isLoading: boolean;
}

const UploadPage: React.FC<UploadPageProps> = ({ onFilesSelected, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFilesSelected(event.target.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-dark tracking-tight font-heading">
          Build Your Forensic Inventory
        </h1>
        <p className="mt-4 text-lg text-medium">
          Centralize ownership proof and prepare for insurance claims. Upload photos, receipts, and statements to get started.
        </p>
      </div>

      <div
        className="mt-10 max-w-2xl mx-auto border-2 border-dashed border-slate-300 rounded-xl p-8 md:p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
        onClick={handleClick}
      >
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <SpinnerIcon className="h-12 w-12 text-primary" />
            <p className="text-medium font-medium">Analyzing with Gemini...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <UploadIcon className="h-12 w-12 text-slate-400" />
            <p className="text-medium font-medium">
              Drag & Drop Files Here or{' '}
              <span className="text-primary font-semibold">Browse Files</span>
            </p>
            <p className="text-sm text-slate-500">Supports Images (JPEG, PNG) and Documents (PDF)</p>
          </div>
        )}
      </div>
      <p className="mt-6 text-sm text-slate-500">
        <span className="font-semibold">Tip:</span> For best results, start with clear photos of your most valuable items.
      </p>
    </div>
  );
};

export default UploadPage;
