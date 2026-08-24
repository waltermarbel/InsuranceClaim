import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Proof, ClaimDetails, InventoryItem } from '../types.ts';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { CloudArrowUpIcon, DocumentTextIcon, ExclamationTriangleIcon, EyeIcon } from './icons.tsx';
import { analyzeProofForVault } from '../services/geminiService.ts';
import { blobToBase64 } from '../utils/fileUtils.ts';
import { saveProof, getProofBlob } from '../services/storageService.ts';

interface EvidenceVaultProps {
    onImageZoom: (url: string) => void;
}

export const EvidenceVault: React.FC<EvidenceVaultProps> = ({ onImageZoom }) => {
    const { inventory, unlinkedProofs, claims, currentClaimId } = useAppState();
    const dispatch = useAppDispatch();
    
    const [isDraggedOver, setIsDraggedOver] = useState(false);
    const [processingFiles, setProcessingFiles] = useState<{ id: string, name: string, status: string }[]>([]);
    const activeClaim = currentClaimId ? claims.find(c => c.id === currentClaimId) : claims[0];
    const dateOfLoss = activeClaim ? activeClaim.incidentDetails?.dateOfLoss : null;

    const vaultProofs = useMemo(() => {
        const uniqueProofs = new Map<string, Proof>();
        
        unlinkedProofs.forEach(p => uniqueProofs.set(p.id, p));
        inventory.forEach(item => {
            item.linkedProofs.forEach(p => uniqueProofs.set(p.id, p));
        });
        claims.forEach(claim => {
            claim.incidentDetails?.aleProofs?.forEach(p => uniqueProofs.set(p.id, p));
            claim.incidentDetails?.claimDocuments?.forEach(p => uniqueProofs.set(p.id, p));
        });
        
        return Array.from(uniqueProofs.values());
    }, [unlinkedProofs, inventory, claims]);

    const handleFiles = async (files: File[]) => {
        const newProcessing = files.map(f => ({ id: Math.random().toString(), name: f.name, status: 'Scanning with AI...' }));
        setProcessingFiles(prev => [...prev, ...newProcessing]);

        const newProofs: Proof[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const p = newProcessing[i];
            
            try {
                const proofId = `vault-proof-${Date.now()}-${i}`;
                const dummyProof: Proof = { 
                    id: proofId,
                    fileName: file.name,
                    mimeType: file.type,
                    type: file.type.startsWith('image/') ? 'image' : 'document',
                    createdBy: 'User',
                    extractedData: {}
                };

                // Store blob
                await saveProof(dummyProof, file);

                // Analyze with AI
                const base64 = await blobToBase64(file);
                const extracted = await analyzeProofForVault(base64.split(',')[1], file.type);
                
                // Flag contradictions
                let contradictionFlag = undefined;
                if (extracted.date && dateOfLoss) {
                    const extDate = new Date(extracted.date);
                    const lossDate = new Date(dateOfLoss);
                    if (extDate > lossDate && (extracted.amount || extracted.vendor)) {
                        contradictionFlag = `Receipt date (${extracted.date}) is after Date of Loss (${dateOfLoss}). Check if this is a post-loss expense (ALE) or an error.`;
                    }
                }

                const finalProof: Proof = {
                    ...dummyProof,
                    extractedData: extracted,
                    contradictionFlag
                };

                newProofs.push(finalProof);
            } catch (e) {
                console.error("Vault import failed", e);
            } finally {
                setProcessingFiles(prev => prev.filter(pf => pf.id !== p.id));
            }
        }

        if (newProofs.length > 0) {
            dispatch({ type: 'ADD_UNLINKED_PROOFS', payload: newProofs });
            dispatch({ type: 'LOG_ACTIVITY', payload: { action: 'VAULT_UPLOAD', details: `Added ${newProofs.length} items to Evidence Vault`, app: 'Assert' } });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggedOver(false);
        if (e.dataTransfer.files?.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const loadDataUrl = async (proof: Proof) => {
        if (proof.dataUrl) return proof.dataUrl;
        const blob = await getProofBlob(proof.id);
        if (blob) {
            return await blobToBase64(blob);
        }
        return '';
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">Evidence Vault</h1>
                    <p className="text-slate-500 mt-2 text-lg">Centralized, AI-scanned repository for all claim evidence.</p>
                </div>
            </div>

            {/* Dropzone */}
            <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDraggedOver ? 'border-primary bg-primary/10' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'} mb-8 cursor-pointer relative overflow-hidden`}
                onDragOver={e => { e.preventDefault(); setIsDraggedOver(true); }}
                onDragLeave={() => setIsDraggedOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('vault-upload')?.click()}
            >
                <input id="vault-upload" type="file" multiple className="hidden" onChange={e => e.target.files && handleFiles(Array.from(e.target.files))} />
                <CloudArrowUpIcon className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                <p className="font-bold text-slate-700 text-lg">Drag & drop evidence here</p>
                <p className="text-sm text-slate-500">Receipts, policies, photos, invoices. AI will OCR and cross-reference automatically.</p>
                
                {processingFiles.length > 0 && (
                    <div className="absolute inset-x-0 bottom-0 bg-primary/90 text-white p-2 text-xs font-bold animate-pulse">
                        Processing {processingFiles.length} file(s)...
                    </div>
                )}
            </div>

            {/* Evidence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                    {vaultProofs.map(proof => (
                        <motion.div key={proof.id} layout transition={{ duration: 0.2 }} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
                            <div className="h-40 bg-slate-100 flex items-center justify-center border-b border-slate-100 relative group overflow-hidden">
                                {proof.type === 'image' ? (
                                    <ViewableImage proof={proof} onImageZoom={onImageZoom} />
                                ) : (
                                    <DocumentTextIcon className="h-12 w-12 text-slate-300" />
                                )}
                            </div>
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="font-bold text-sm text-slate-800 truncate mb-2" title={proof.fileName}>{proof.fileName}</h3>
                                
                                {proof.extractedData && (Object.keys(proof.extractedData).length > 0) && (
                                    <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs mb-3 space-y-1 text-slate-600">
                                        {proof.extractedData.date && <div>🗓️ {proof.extractedData.date}</div>}
                                        {proof.extractedData.vendor && <div className="truncate">🏢 {proof.extractedData.vendor}</div>}
                                        {proof.extractedData.amount && <div>💰 ${proof.extractedData.amount.toFixed(2)}</div>}
                                        {proof.extractedData.itemNames && proof.extractedData.itemNames.length > 0 && (
                                            <div className="text-[10px] text-slate-500 truncate">Items: {proof.extractedData.itemNames.join(', ')}</div>
                                        )}
                                        {proof.extractedData.suggestedCategory && (
                                            <div className="text-[10px] text-indigo-600 font-medium">Category: {proof.extractedData.suggestedCategory}</div>
                                        )}
                                        {proof.extractedData.basicDetails && (
                                            <div className="text-[10px] text-slate-500 truncate" title={proof.extractedData.basicDetails}>Details: {proof.extractedData.basicDetails}</div>
                                        )}
                                    </div>
                                )}

                                {proof.contradictionFlag && (
                                    <div className="mt-auto bg-rose-50 border border-rose-200 rounded p-2 flex items-start gap-2">
                                        <ExclamationTriangleIcon className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-rose-700 font-medium leading-tight">
                                            {proof.contradictionFlag}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            {vaultProofs.length === 0 && (
                <div className="text-center text-slate-500 py-12">
                    <p>No evidence in the vault yet.</p>
                </div>
            )}
        </div>
    );
};

const ViewableImage = ({ proof, onImageZoom }: { proof: Proof, onImageZoom: (url: string) => void }) => {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        (async () => {
             if (proof.dataUrl) {
                 if(active) setSrc(proof.dataUrl);
             } else {
                 const blob = await getProofBlob(proof.id);
                 if (blob && active) {
                     setSrc(URL.createObjectURL(blob));
                 }
             }
        })();
        return () => { active = false; };
    }, [proof]);

    if (!src) return <div className="text-xs text-slate-400">Loading...</div>;

    return (
        <>
            <img src={src} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={proof.fileName} />
            <button 
                onClick={(e) => { e.stopPropagation(); onImageZoom(src); }}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
                <EyeIcon className="h-8 w-8" />
            </button>
        </>
    );
};
