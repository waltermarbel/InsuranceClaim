import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BatchConflict, InventoryItem } from '../types.ts';
import { ExclamationTriangleIcon, XIcon, CheckCircleIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';

interface Props {
    inventory: InventoryItem[];
    onClose: () => void;
}

const BatchConflictCheckModal: React.FC<Props> = ({ inventory, onClose }) => {
    const [isScanning, setIsScanning] = useState(true);
    const [conflicts, setConflicts] = useState<BatchConflict[]>([]);

    useEffect(() => {
        let mounted = true;
        const runScan = async () => {
            const results = await geminiService.runBatchConflictCheck(inventory);
            if (mounted) {
                setConflicts(results);
                setIsScanning(false);
            }
        };
        runScan();
        return () => { mounted = false; };
    }, [inventory]);

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-2xl flex flex-col max-h-[85vh]"
                >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                <ExclamationTriangleIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Batch Conflict Check</h2>
                                <p className="text-sm text-slate-500">Scanning for serial duplicates, date overlaps, & value mismatch</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
                        {isScanning ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="h-12 w-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                                <h3 className="text-lg font-bold text-slate-700">Analyzing Inventory Database...</h3>
                                <p className="text-sm text-slate-500">Running multi-pass heuristics over {inventory.length} items.</p>
                            </div>
                        ) : conflicts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto">
                                <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                                    <CheckCircleIcon className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">No Conflicts Detected</h3>
                                <p className="text-sm text-slate-500 mt-2">Your inventory shows no signs of duplicate serials, overlapping dates, or valuation anomalies.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {conflicts.map((conflict, idx) => (
                                    <div key={idx} className="bg-white border text-left rounded-xl p-4 shadow-sm border-amber-200">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-800">{conflict.type.replace('_', ' ')}</span>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${conflict.severity === 'High' ? 'bg-rose-100 text-rose-700' : conflict.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {conflict.severity}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 mb-3">{conflict.description}</p>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
                                                    {conflict.items.map(itemId => {
                                                        const item = inventory.find(i => i.id === itemId);
                                                        const isValuationConflict = conflict.type === 'VALUATION_INCONSISTENCY';
                                                        const isDateConflict = conflict.type === 'DATE_OVERLAP';
                                                        const isSerialConflict = conflict.type === 'DUPLICATE_SERIAL';
                                                        
                                                        return item ? (
                                                            <div key={itemId} className="p-2 bg-slate-50 rounded text-xs border border-slate-100">
                                                                <p className="font-bold text-slate-700 truncate">{item.itemName}</p>
                                                                <div className="text-slate-500 mt-1 flex justify-between">
                                                                    <span>{item.brand} {item.model}</span>
                                                                    <span className={`font-medium font-mono px-1 rounded ${isValuationConflict ? 'bg-amber-100 text-amber-800 border border-amber-200' : ''}`}>${item.replacementCostValueRCV || item.originalCost || 0}</span>
                                                                </div>
                                                                <div className="text-slate-500 mt-1 flex justify-between">
                                                                    <span className={`px-1 rounded ${isSerialConflict ? 'bg-amber-100 text-amber-800 border border-amber-200' : ''}`}>S/N: {item.serialNumber || 'None'}</span>
                                                                    <span className={`px-1 rounded ${isDateConflict ? 'bg-amber-100 text-amber-800 border border-amber-200' : ''}`}>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'No Date'}</span>
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BatchConflictCheckModal;
