import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XIcon, SparklesIcon, ShieldCheckIcon } from './icons.tsx';
import { generateAcquisitionStrategy } from '../services/geminiService.ts';
import Markdown from 'react-markdown';

interface AdvisorStrategyModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentType: string;
}

export const AdvisorStrategyModal: React.FC<AdvisorStrategyModalProps> = ({ isOpen, onClose, documentType }) => {
    const [strategy, setStrategy] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && documentType) {
            setStrategy('');
            setIsLoading(true);
            generateAcquisitionStrategy(documentType)
                .then(setStrategy)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, documentType]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
                    >
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex justify-between items-start shrink-0">
                            <div className="flex gap-4">
                                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shadow-inner shrink-0 self-start">
                                    <ShieldCheckIcon className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                                        The Advisor <SparklesIcon className="h-5 w-5 text-emerald-200" />
                                    </h2>
                                    <p className="text-emerald-50 mt-1">Legitimate Acquisition Strategy for "{documentType}"</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-grow bg-slate-50">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
                                    <SparklesIcon className="h-10 w-10 animate-spin mb-4" />
                                    <p className="font-semibold animate-pulse">The Advisor is formulating a strategy...</p>
                                </div>
                            ) : (
                                <div className="prose prose-emerald max-w-none text-slate-700 bg-white p-6 rounded-xl border border-emerald-100 shadow-sm markdown-body">
                                    <Markdown>{strategy}</Markdown>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end shrink-0">
                            <button onClick={onClose} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-sm">
                                Got It
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
