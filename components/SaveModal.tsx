import React, { useState } from 'react';
import { XIcon, CubeIcon, DocumentTextIcon, SpinnerIcon } from './icons';

interface SaveModalProps {
  onClose: () => void;
  onQuickBackup: () => void;
  onForensicExport: () => Promise<void>;
}

const SaveModal: React.FC<SaveModalProps> = ({ onClose, onQuickBackup, onForensicExport }) => {
    const [isZipping, setIsZipping] = useState(false);

    const handleExportClick = async () => {
        setIsZipping(true);
        try {
            await onForensicExport();
        } catch (error) {
            console.error("Failed to create forensic export:", error);
            alert("An error occurred while creating the ZIP archive. Please try again.");
        } finally {
            setIsZipping(false);
        }
    };

    return (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
          onClick={onClose}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
              <h2 className="text-xl font-bold text-dark font-heading">Save & Export</h2>
              <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition">
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 md:p-8">
                <p className="text-center text-medium mb-6">Choose your preferred export format. We recommend making regular backups.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        onClick={onQuickBackup}
                        disabled={isZipping}
                        className="group text-left p-6 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-100 group-hover:bg-primary/10 rounded-full p-3 transition-colors">
                                <CubeIcon className="h-8 w-8 text-slate-500 group-hover:text-primary transition-colors" />
                            </div>
                            <div>
                                <h3 className="font-bold text-dark font-heading">Quick Backup</h3>
                                <p className="text-sm text-medium mt-1">A single <span className="font-semibold">.json</span> file. Ideal for quickly saving your work and loading it back into VeritasVault.</p>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={handleExportClick}
                        disabled={isZipping}
                        className="group text-left p-6 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 disabled:opacity-50"
                    >
                        <div className="flex items-center gap-4">
                             <div className="bg-slate-100 group-hover:bg-primary/10 rounded-full p-3 transition-colors">
                                {isZipping ? (
                                    <SpinnerIcon className="h-8 w-8 text-primary"/>
                                ) : (
                                    <DocumentTextIcon className="h-8 w-8 text-slate-500 group-hover:text-primary transition-colors" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-dark font-heading">{isZipping ? 'Exporting...' : 'Forensic Export'}</h3>
                                <p className="text-sm text-medium mt-1">An organized <span className="font-semibold">.zip</span> archive with all proofs. Perfect for insurance submissions or your personal records.</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
          </div>
        </div>
    );
};

export default SaveModal;
