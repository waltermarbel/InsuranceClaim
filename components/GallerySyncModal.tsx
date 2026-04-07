import React, { useState } from 'react';
import { XCircleIcon, SparklesIcon, SpinnerIcon, PhotoIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';
import { InventoryItem, Proof } from '../types.ts';
import { useAppDispatch } from '../context/AppContext.tsx';
import { fileToDataUrl } from '../utils/fileUtils.ts';
import * as storageService from '../services/storageService.ts';

interface GallerySyncModalProps {
    onClose: () => void;
}

const GallerySyncModal: React.FC<GallerySyncModalProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [results, setResults] = useState<geminiService.GallerySyncResult | null>(null);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles: File[] = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
            
            // Generate previews
            const newUrls = await Promise.all(newFiles.map((f: File) => fileToDataUrl(f)));
            setPreviewUrls(prev => [...prev, ...newUrls]);
        }
    };

    const handleSync = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setProgress('Analyzing images and grouping items...');
        
        try {
            const syncResult = await geminiService.processGallerySync(files);
            setResults(syncResult);
            setProgress('Analysis complete. Review the grouped items below.');
        } catch (error) {
            console.error("Sync error:", error);
            setProgress('An error occurred during synchronization.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImport = async () => {
        if (!results) return;
        setIsProcessing(true);
        setProgress('Importing items to inventory...');

        try {
            for (const obj of results.uniqueObjects) {
                const itemId = `item-sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                
                const linkedProofs: Proof[] = [];
                
                for (const idx of obj.imageIndices) {
                    if (idx >= 0 && idx < files.length) {
                        const file = files[idx];
                        const proofId = `proof-sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                        
                        const proof: Proof = {
                            id: proofId,
                            type: file.type.startsWith('image/') ? 'image' : 'document',
                            fileName: file.name,
                            mimeType: file.type,
                            createdBy: 'Gallery Sync',
                            purpose: 'Proof of Possession',
                            sourceType: 'local'
                        };
                        
                        // Save blob
                        await storageService.saveProof(proof, file);
                        
                        linkedProofs.push(proof);
                    }
                }

                const newItem: InventoryItem = {
                    id: itemId,
                    status: 'active',
                    itemName: obj.itemName,
                    itemDescription: obj.itemDescription,
                    itemCategory: obj.itemCategory,
                    originalCost: obj.estimatedValue,
                    replacementCostValueRCV: obj.estimatedValue,
                    brand: obj.brand,
                    model: obj.model,
                    condition: obj.condition,
                    linkedProofs,
                    createdAt: new Date().toISOString(),
                    createdBy: 'Gallery Sync'
                };

                dispatch({ type: 'ADD_INVENTORY_ITEMS', payload: [newItem] });
            }
            
            onClose();
        } catch (error) {
            console.error("Import error:", error);
            setProgress('An error occurred during import.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <PhotoIcon className="h-6 w-6 text-indigo-600"/>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 font-heading">Gallery Sync & Auto-Discovery</h2>
                            <p className="text-xs text-slate-500">Upload multiple photos to automatically detect and group items.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><XCircleIcon className="h-6 w-6 text-slate-400"/></button>
                </div>

                <div className="flex-grow overflow-y-auto p-6">
                    {!results ? (
                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition">
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                    id="gallery-upload"
                                />
                                <label htmlFor="gallery-upload" className="cursor-pointer flex flex-col items-center">
                                    <PhotoIcon className="h-12 w-12 text-slate-400 mb-4" />
                                    <span className="text-sm font-bold text-slate-700">Click to select photos</span>
                                    <span className="text-xs text-slate-500 mt-1">Upload multiple angles of your items</span>
                                </label>
                            </div>

                            {previewUrls.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-3">Selected Photos ({previewUrls.length})</h3>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {previewUrls.map((url, i) => (
                                            <img key={i} src={url} alt={`Preview ${i}`} className="h-20 w-20 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isProcessing && (
                                <div className="bg-indigo-50 p-4 rounded-lg flex items-center gap-3 text-indigo-700">
                                    <SpinnerIcon className="h-5 w-5 animate-spin"/>
                                    <span className="text-sm font-bold">{progress}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800">Discovered Items ({results.uniqueObjects.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.uniqueObjects.map((obj, idx) => (
                                    <div key={idx} className="border border-slate-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-900">{obj.itemName}</h4>
                                            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">${obj.estimatedValue}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-3">{obj.itemDescription}</p>
                                        <div className="flex gap-2 overflow-x-auto">
                                            {obj.imageIndices.map(i => previewUrls[i] && (
                                                <img key={i} src={previewUrls[i]} alt="Item view" className="h-12 w-12 object-cover rounded border border-slate-200" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition">Cancel</button>
                    {!results ? (
                        <button 
                            onClick={handleSync} 
                            disabled={files.length === 0 || isProcessing}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
                        >
                            {isProcessing ? <SpinnerIcon className="h-4 w-4 animate-spin"/> : <SparklesIcon className="h-4 w-4"/>}
                            Analyze & Group
                        </button>
                    ) : (
                        <button 
                            onClick={handleImport} 
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                            {isProcessing ? <SpinnerIcon className="h-4 w-4 animate-spin"/> : null}
                            Import to Inventory
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GallerySyncModal;
