
import React, { useRef } from 'react';
import { CubeIcon } from './icons';

interface HeaderProps {
    onReset: () => void;
    onShowGuide: () => void;
    onShowLog: () => void;
    onDownloadVault: () => void;
    showDownload: boolean;
    onSaveToFile: () => void;
    onLoadFromFile: (file: File) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    onReset, 
    onShowGuide, 
    onShowLog, 
    onDownloadVault, 
    showDownload,
    onSaveToFile,
    onLoadFromFile,
}) => {
  const loadFileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    loadFileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onLoadFromFile(event.target.files[0]);
      event.target.value = ''; // Reset file input to allow loading the same file again
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <input
        type="file"
        ref={loadFileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onReset}>
            <CubeIcon className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-dark tracking-tight font-heading">
              VeritasVault
            </span>
          </div>
          <div className="flex items-center space-x-4">
             {showDownload && (
                <button
                    onClick={onDownloadVault}
                    className="text-sm font-medium text-medium hover:text-primary transition-colors"
                >
                    Export CSV
                </button>
             )}
             <button
                onClick={onSaveToFile}
                className="text-sm font-medium text-medium hover:text-primary transition-colors"
              >
                Save to File
              </button>
             <button
                onClick={handleLoadClick}
                className="text-sm font-medium text-medium hover:text-primary transition-colors"
              >
                Load from File
              </button>
             <div className="h-6 border-l border-slate-200"></div>
             <button
                onClick={onShowLog}
                className="text-sm font-medium text-medium hover:text-primary transition-colors"
              >
                Log
              </button>
             <button
                onClick={onShowGuide}
                className="text-sm font-medium text-medium hover:text-primary transition-colors"
              >
                Guide
              </button>
            <button
              onClick={onReset}
              className="text-sm font-medium text-medium hover:text-primary transition-colors"
            >
              New
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};