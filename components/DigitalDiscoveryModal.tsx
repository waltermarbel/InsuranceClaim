
import React, { useState } from 'react';
import { InventoryItem } from '../types.ts';
import { XIcon, SparklesIcon, SpinnerIcon, CheckCircleIcon, CubeIcon, PhotoIcon, CloudArrowUpIcon, LinkIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';
import { useAppDispatch } from '../context/AppContext.tsx';

interface DigitalDiscoveryModalProps {
    onClose: () => void;
    onImport: (items: InventoryItem[]) => void;
}

const DigitalDiscoveryModal: React.FC<DigitalDiscoveryModalProps> = ({ onClose, onImport }) => {
    const dispatch = useAppDispatch();
    const [step, setStep] = useState<'connect' | 'scanning' | 'review'>('connect');
    const [selectedSource, setSelectedSource] = useState<'email' | 'photos'>('email');
    const [scanLog, setScanLog] = useState<string[]>([]);
    const [discoveredItems, setDiscoveredItems] = useState<InventoryItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const startDiscovery = async () => {
        setStep('scanning');
        setScanLog([`Initiating secure connection to ${selectedSource === 'email' ? 'Email Provider' : 'Cloud Photos'}...`]);
        
        try {
            const { items, log } = await geminiService.performDigitalDiscovery(selectedSource);
            
            // Simulate log streaming for UX
            for (const line of log) {
                setScanLog(prev => [...prev, line]);
                await new Promise(r => setTimeout(r, 800)); // Fake delay
            }
            
            setDiscoveredItems(items);
            setSelectedIds(new Set(items.map(i => i.id))); // Select all by default
            setStep('review');
        } catch (error) {
            console.error(error);
            setScanLog(prev => [...prev, "Error: Discovery failed. Please try again."]);
            // Allow user to go back after error? For now, stuck in error state or close.
        }
    };

    const handleImport = () => {
        const finalItems = discoveredItems.filter(i => selectedIds.has(i.id));
        onImport(finalItems);
        dispatch({ type: 'LOG_ACTIVITY', payload: { action: 'DIGITAL_DISCOVERY', details: `Discovered ${finalItems.length} items from ${selectedSource}`, app: 'Gemini' } });
        onClose();
    };

    const toggleItem = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
                        <CloudArrowUpIcon className="h-6 w-6 text-primary"/>
                        Digital Asset Discovery
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><XIcon className="h-6 w-6"/></button>
                </div>

                <div className="flex-grow overflow-y-auto p-8">
                    {step === 'connect' && (
                        <div className="space-y-8">
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold text-slate-800">Connect Your Digital Archives</h3>
                                <p className="text-sm text-slate-500">Allow AI to scan your history for forgotten assets, receipts, and visual evidence.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setSelectedSource('email')}
                                    className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all hover:shadow-md ${selectedSource === 'email' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 hover:border-primary/50'}`}
                                >
                                    <div className="bg-white p-3 rounded-full shadow-sm">
                                        <CubeIcon className="h-8 w-8 text-blue-600"/>
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-bold text-slate-700">Email Archives</h4>
                                        <p className="text-xs text-slate-500 mt-1">Gmail, Outlook, Yahoo</p>
                                        <p className="text-[10px] text-primary font-semibold mt-2">Finds: Receipts, Order Confirmations</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => setSelectedSource('photos')}
                                    className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all hover:shadow-md ${selectedSource === 'photos' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 hover:border-primary/50'}`}
                                >
                                    <div className="bg-white p-3 rounded-full shadow-sm">
                                        <PhotoIcon className="h-8 w-8 text-purple-600"/>
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-bold text-slate-700">Photo Cloud</h4>
                                        <p className="text-xs text-slate-500 mt-1">Google Photos, iCloud, Dropbox</p>
                                        <p className="text-[10px] text-primary font-semibold mt-2">Finds: Visual Evidence of Ownership</p>
                                    </div>
                                </button>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                                <SparklesIcon className="h-4 w-4 flex-shrink-0 mt-0.5"/>
                                <p><strong>Privacy First:</strong> The AI scans metadata locally where possible. Only extracted asset details are stored in your vault. No raw emails or photos are permanently saved without your permission.</p>
                            </div>
                        </div>
                    )}

                    {step === 'scanning' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                <SpinnerIcon className="h-16 w-16 text-primary relative z-10 animate-spin"/>
                            </div>
                            <div className="w-full max-w-sm space-y-2">
                                <h3 className="text-center font-bold text-slate-700">Scanning Archives...</h3>
                                <div className="bg-slate-100 rounded-lg p-3 h-32 overflow-y-auto font-mono text-xs text-slate-600 border border-slate-200 shadow-inner">
                                    {scanLog.map((line, i) => (
                                        <div key={i} className="mb-1">
                                            <span className="text-primary mr-2">&gt;</span>{line}
                                        </div>
                                    ))}
                                    <div className="animate-pulse text-slate-400">_</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Found {discoveredItems.length} Potential Assets</h3>
                                <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircleIcon className="h-3 w-3"/> Market Values Updated
                                </span>
                            </div>
                            <div className="space-y-3">
                                {discoveredItems.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => toggleItem(item.id)}
                                        className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedIds.has(item.id) ? 'bg-primary/5 border-primary ring-1 ring-primary/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border mt-1 transition-colors ${selectedIds.has(item.id) ? 'bg-primary border-primary' : 'bg-white border-slate-300'}`}>
                                            {selectedIds.has(item.id) && <CheckCircleIcon className="h-4 w-4 text-white"/>}
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-800">{item.itemName}</h4>
                                                <span className="font-bold text-emerald-600">${(item.replacementCostValueRCV || 0).toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{item.brand} {item.model} • {item.purchaseDate ? `Purchased ~${item.purchaseDate}` : 'Date Unknown'}</p>
                                            <p className="text-xs text-slate-400 italic mt-2 border-t border-slate-100 pt-2 flex items-center gap-1">
                                                <LinkIcon className="h-3 w-3"/>
                                                {item.itemDescription.split('.')[1] || "Metadata match found"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                    {step === 'connect' && (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition">Cancel</button>
                            <button onClick={startDiscovery} className="px-6 py-2 text-sm font-bold bg-primary text-white rounded-lg shadow-md hover:bg-primary-dark transition">Start Scan</button>
                        </>
                    )}
                    {step === 'scanning' && (
                        <button disabled className="px-6 py-2 text-sm font-bold bg-slate-300 text-white rounded-lg cursor-not-allowed">Scanning...</button>
                    )}
                    {step === 'review' && (
                        <>
                            <button onClick={() => setStep('connect')} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition">Back</button>
                            <button onClick={handleImport} disabled={selectedIds.size === 0} className="px-6 py-2 text-sm font-bold bg-primary text-white rounded-lg shadow-md hover:bg-primary-dark transition disabled:opacity-50">
                                Import {selectedIds.size} Items
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DigitalDiscoveryModal;
