import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ExclamationTriangleIcon, XCircleIcon, SpinnerIcon } from './icons.tsx';
import { useAppDispatch } from '../context/AppContext.tsx';
import { clearAllData } from '../services/storageService.ts';

interface ResetDataModalProps {
    onClose: () => void;
}

const ResetDataModal: React.FC<ResetDataModalProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = async () => {
        setIsResetting(true);
        try {
            // Clear all data from IndexedDB and Firestore
            await clearAllData();
            
            // Reset global state
            dispatch({ type: 'RESET_STATE' });
            
            // Reload page to ensure clean slate
            window.location.reload();
        } catch (error) {
            console.error("Failed to reset data:", error);
            setIsResetting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-xl">
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-600"/>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 font-heading">Reset All Data</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full transition">
                        <XCircleIcon className="h-6 w-6 text-red-400"/>
                    </button>
                </div>

                <div className="p-6 text-slate-600">
                    <p className="mb-4">
                        Are you sure you want to completely reset the application? 
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-500">
                        <li>All inventory items will be deleted.</li>
                        <li>All uploaded proofs and images will be removed.</li>
                        <li>All claims and policies will be cleared.</li>
                    </ul>
                    <p className="mt-4 font-bold text-red-600">
                        This action cannot be undone.
                    </p>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button 
                        onClick={onClose} 
                        disabled={isResetting}
                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleReset} 
                        disabled={isResetting}
                        className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                    >
                        {isResetting ? <SpinnerIcon className="h-4 w-4 animate-spin"/> : null}
                        Yes, Reset Everything
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ResetDataModal;
