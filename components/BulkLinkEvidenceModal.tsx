import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Proof, InventoryItem } from '../types.ts';
import { SparklesIcon, XIcon, CheckCircleIcon, DocumentTextIcon, PhotoIcon, SpinnerIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';
import { useProofDataUrl } from '../hooks/useProofDataUrl.ts';

interface Props {
    unlinkedProofs: Proof[];
    inventory: InventoryItem[];
    initialSelectedItemIds?: string[];
    onClose: () => void;
    onBulkLink: (proofIds: string[], itemIds: string[]) => void;
}

const ProofPreview: React.FC<{ proof: Proof }> = ({ proof }) => {
    const { dataUrl, isLoading } = useProofDataUrl(proof.id);
    
    if (proof.type === 'document' || proof.mimeType.includes('pdf')) {
        return <div className="h-24 w-24 bg-slate-100 rounded-lg flex items-center justify-center p-2"><DocumentTextIcon className="h-8 w-8 text-slate-400"/></div>;
    }

    if (dataUrl) {
         return <img src={dataUrl} alt={proof.fileName} className="h-24 w-24 object-cover rounded-lg border border-slate-200" />;
    }

    return <div className="h-24 w-24 bg-slate-100 rounded-lg flex items-center justify-center">
        {isLoading ? <SpinnerIcon className="h-6 w-6 text-primary animate-spin" /> : <PhotoIcon className="h-8 w-8 text-slate-400"/>}
    </div>;
};

const BulkLinkEvidenceModal: React.FC<Props> = ({ unlinkedProofs, inventory, initialSelectedItemIds, onClose, onBulkLink }) => {
    const [selectedProofIds, setSelectedProofIds] = useState<Set<string>>(new Set());
    const [keyword, setKeyword] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [mappingResult, setMappingResult] = useState<{ suggestedItemIds: string[], confidence: number, reasoning: string } | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set(initialSelectedItemIds || []));

    const handleAnalyze = async () => {
        if (selectedProofIds.size !== 1) return;
        const selectedProof = unlinkedProofs.find(p => selectedProofIds.has(p.id));
        if (!selectedProof) return;
        setIsAnalyzing(true);
        try {
            const result = await geminiService.bulkMapProofToItems(selectedProof, inventory, keyword);
            setMappingResult(result);
            setSelectedItemIds(new Set(result.suggestedItemIds));
        } catch (error) {
            console.error("Mapping error", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleProof = (id: string) => {
        const next = new Set(selectedProofIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedProofIds(next);
        setMappingResult(null); // Clear map result if proofs change
    };

    const toggleItem = (id: string) => {
        const next = new Set(selectedItemIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedItemIds(next);
    };

    const handleConfirm = () => {
        if (selectedProofIds.size > 0 && selectedItemIds.size > 0) {
            onBulkLink(Array.from(selectedProofIds), Array.from(selectedItemIds));
        }
    };

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
                    className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl flex flex-col max-h-[85vh]"
                >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Bulk Link Evidence</h2>
                            <p className="text-sm text-slate-500">Map a single receipt or photo to multiple items.</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
                        {/* Left Column: Proof Selection */}
                        <div className="w-full md:w-1/3 border-r border-slate-100 bg-slate-50 p-6 flex flex-col">
                            <h3 className="font-bold text-sm text-slate-700 uppercase mb-4 tracking-wider">1. Select Proofs</h3>
                            {unlinkedProofs.length === 0 ? (
                                <div className="text-center p-6 text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                                    No unlinked proofs available. Upload receipts or photos first.
                                </div>
                            ) : (
                                <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                                    {unlinkedProofs.map(proof => (
                                        <button
                                            key={proof.id}
                                            onClick={() => toggleProof(proof.id)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all flex gap-3 items-center ${selectedProofIds.has(proof.id) ? 'border-primary bg-white shadow-sm ring-1 ring-primary/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                        >
                                            <div className="flex-shrink-0 scale-75 origin-left relative">
                                                <ProofPreview proof={proof} />
                                                {selectedProofIds.has(proof.id) && (
                                                    <div className="absolute -top-2 -right-2 bg-primary w-5 h-5 rounded-full flex items-center justify-center shadow">
                                                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold text-slate-800 truncate">{proof.fileName}</p>
                                                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{proof.type}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Column: AI Analysis & Mapping */}
                        <div className="w-full md:w-2/3 p-6 flex flex-col">
                            <h3 className="font-bold text-sm text-slate-700 uppercase mb-4 tracking-wider">2. Analyze & Map</h3>
                            
                            {selectedProofIds.size === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                    Select one or more proofs from the left panel to begin bulk mapping.
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col">
                                    <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <label className="block text-sm font-bold text-blue-900 mb-2">Optional: Add Keyword Context</label>
                                        <p className="text-xs text-blue-700 mb-3 leading-relaxed">
                                            If you selected a single complex receipt, you can guide the AI to focus on specific items. Auto-map is disabled when multiple proofs are selected.
                                        </p>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={keyword}
                                                onChange={e => setKeyword(e.target.value)}
                                                placeholder="e.g. 'Apple products', 'Kitchen appliances'"
                                                disabled={selectedProofIds.size !== 1}
                                                className="flex-1 px-4 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                            />
                                            <button 
                                                onClick={handleAnalyze}
                                                disabled={isAnalyzing || selectedProofIds.size !== 1}
                                                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isAnalyzing ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <SparklesIcon className="h-4 w-4"/>}
                                                {isAnalyzing ? 'Analyzing...' : 'Auto-Map'}
                                            </button>
                                        </div>
                                    </div>

                                    {mappingResult && (
                                        <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-bold text-slate-800">AI Suggestions</h4>
                                                <span className="text-sm text-slate-500 font-medium">Confidence: <span className="text-primary">{mappingResult.confidence}%</span></span>
                                            </div>
                                            <p className="text-sm text-slate-600 mb-0 leading-relaxed"><span className="font-bold">Reasoning:</span> {mappingResult.reasoning}</p>
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-y-auto">
                                        <h4 className="font-bold text-slate-800 mb-3">{mappingResult ? 'Select Items to Link' : 'Select Inventory Items'}</h4>
                                        <div className="space-y-2">
                                            {inventory.map(item => {
                                                const isSuggested = mappingResult?.suggestedItemIds.includes(item.id) || false;
                                                const isSelected = selectedItemIds.has(item.id);
                                                
                                                return (
                                                    <div 
                                                        key={item.id} 
                                                        onClick={() => toggleItem(item.id)}
                                                        className={`p-3 rounded-lg border cursor-pointer flex items-center gap-4 transition-all ${isSelected ? 'border-primary bg-primary/5' : isSuggested ? 'border-amber-200 bg-amber-50' : 'border-slate-200 hover:bg-slate-50 opacity-60 hover:opacity-100'}`}
                                                    >
                                                        <div className={`h-5 w-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-slate-300 bg-white'}`}>
                                                            {isSelected && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-bold text-sm text-slate-800">{item.itemName}</p>
                                                            <p className="text-xs text-slate-500">{item.brand} {item.model}</p>
                                                        </div>
                                                        {isSuggested && !isSelected && (
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-1 rounded">Suggested</span>
                                                        )}
                                                        <div className="text-sm font-mono text-slate-600">
                                                            ${item.replacementCostValueRCV || item.originalCost || 0}
                                                        </div>
                                                    </div>
                                                );
                                            }).sort((a, b) => {
                                                if (!mappingResult) return 0;
                                                const aItem = inventory.find(i => i.id === a.key);
                                                const bItem = inventory.find(i => i.id === b.key);
                                                const aSuggested = aItem ? mappingResult.suggestedItemIds.includes(aItem.id) : false;
                                                const bSuggested = bItem ? mappingResult.suggestedItemIds.includes(bItem.id) : false;
                                                if (aSuggested && !bSuggested) return -1;
                                                if (!aSuggested && bSuggested) return 1;
                                                return 0;
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button onClick={onClose} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition">Cancel</button>
                        <button 
                            onClick={handleConfirm}
                            disabled={selectedItemIds.size === 0}
                            className="px-5 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition disabled:opacity-50 flex items-center gap-2"
                        >
                            <CheckCircleIcon className="h-5 w-5"/>
                            Link {selectedItemIds.size} Items
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BulkLinkEvidenceModal;
