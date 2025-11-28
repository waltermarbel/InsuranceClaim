
import React, { useState, useMemo, useRef } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { InventoryItem, Proof, UploadProgress } from '../types.ts';
import { ChevronLeftIcon, PlusIcon, TagIcon, FolderIcon, SparklesIcon, LinkIcon, CheckCircleIcon, PhotoIcon, ExclamationTriangleIcon, SpinnerIcon, QrCodeIcon, XCircleIcon, ChartPieIcon } from './icons.tsx';
import { ScoreIndicator } from './ScoreIndicator.tsx';
import { CurrencyInput } from './CurrencyInput.tsx';
import * as geminiService from '../services/geminiService.ts';

interface ItemDetailViewProps {
  onAddProof: (itemId: string, files: File[]) => void;
  uploadProgress: UploadProgress | null;
  onEditImage: (proof: Proof) => void;
  onGenerateImage: (item: InventoryItem) => void;
  onRecordAudio: (item: InventoryItem) => void;
  onImageZoom: (imageUrl: string) => void;
  onFindWebImage: () => Promise<void>;
}

const Accordion: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    rightContent?: React.ReactNode;
}> = ({ title, icon, children, defaultOpen = true, rightContent }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <span className="text-primary bg-primary/5 p-2 rounded-lg">{icon}</span>
                    <h3 className="font-bold text-slate-800 font-heading text-lg">{title}</h3>
                </div>
                <div className="flex items-center gap-4">
                    {rightContent}
                    <span className={`transform transition-transform duration-300 text-slate-400 ${isOpen ? 'rotate-180' : ''}`}>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                </div>
            </button>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const ProofThumbnail: React.FC<{ proof: Proof; onClick: () => void }> = ({ proof, onClick }) => {
    const { dataUrl } = proof;
    if (proof.type === 'image' && dataUrl) return <img src={dataUrl} alt={proof.fileName} className="h-28 w-28 rounded-lg object-cover flex-shrink-0 cursor-pointer border-2 border-slate-100 hover:border-primary hover:shadow-lg transition-all transform hover:scale-105 duration-200" onClick={onClick} />;
    return <div className="h-28 w-28 rounded-lg bg-slate-50 border-2 border-slate-100 flex flex-col items-center justify-center flex-shrink-0 cursor-pointer hover:border-primary hover:bg-white hover:shadow-lg transition-all gap-2 p-2 text-center group" onClick={onClick}><FolderIcon className="h-8 w-8 text-slate-300 group-hover:text-primary transition-colors"/><span className="text-[10px] font-semibold text-slate-500 truncate w-full group-hover:text-primary transition-colors">{proof.fileName}</span></div>;
};

const ItemDetailView: React.FC<ItemDetailViewProps> = ({ onAddProof, uploadProgress, onEditImage, onGenerateImage, onRecordAudio, onImageZoom }) => {
    const { inventory, selectedItemId, unlinkedProofs } = useAppState();
    const dispatch = useAppDispatch();
    
    const item = useMemo(() => inventory.find(i => i.id === selectedItemId), [inventory, selectedItemId]);
    
    const [isExtractingSN, setIsExtractingSN] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateItem = (updatedItem: InventoryItem) => {
        dispatch({ type: 'UPDATE_ITEM', payload: updatedItem });
    };

    const onBack = () => dispatch({ type: 'UNSELECT_ITEM' });
    const onDeleteItem = () => item && dispatch({ type: 'DELETE_ITEM', payload: { itemId: item.id } });

    const handleExtractSerialNumber = async () => {
        if (!item) return;
        const imageProof = item.linkedProofs.find(p => p.type === 'image');
        if (!imageProof?.dataUrl) {
            alert('No image proof available to scan.');
            return;
        }
        setIsExtractingSN(true);
        try {
            const res = await geminiService.extractSerialNumber(imageProof.dataUrl);
            if (res.serialNumber) {
                updateItem({ ...item, serialNumber: res.serialNumber });
            } else {
                alert('No serial number detected.');
            }
        } catch {
            alert('Extraction failed.');
        } finally {
            setIsExtractingSN(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && item) {
            onAddProof(item.id, Array.from(event.target.files));
        }
    };
    
    const handleAcceptSuggestion = (proofId: string) => {
        if (item) {
            dispatch({ type: 'ACCEPT_SUGGESTION', payload: { itemId: item.id, proofId } });
        }
    };

    const handleRejectSuggestion = (proofId: string) => {
         if (item) {
            dispatch({ type: 'REJECT_SUGGESTION_PERMANENT', payload: { itemId: item.id, proofId } });
        }
    };

    if (!item) return null;

    const primaryProof = item.linkedProofs.find(p => p.type === 'image') || item.linkedProofs[0] || null;
    const isEnriching = item.status === 'enriching';
    const suggestions = item.suggestedProofs || [];

    return (
        <div className="max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8">
            {/* Header / Nav */}
            <div className="flex items-center justify-between py-6">
                <button onClick={onBack} className="flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors group">
                    <span className="bg-white border border-slate-200 rounded-full p-1 group-hover:border-primary transition-colors"><ChevronLeftIcon className="h-4 w-4" /></span>
                    <span>Back to Schedule</span>
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">ID: {item.id.split('-').pop()}</span>
                    <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
                    <button onClick={onDeleteItem} className="text-rose-600 text-sm font-semibold hover:bg-rose-50 px-3 py-1.5 rounded transition">Delete Asset</button>
                </div>
            </div>

            {/* Top Overview Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 mb-8 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                    
                    {/* Visual Asset (Left) */}
                    <div className="md:col-span-4 lg:col-span-3 bg-slate-100 relative group min-h-[300px] md:min-h-full">
                        {primaryProof && primaryProof.dataUrl ? (
                            <>
                                <img src={primaryProof.dataUrl} alt={item.itemName} className="w-full h-full object-cover cursor-zoom-in absolute inset-0 transition-transform duration-700 group-hover:scale-105" onClick={() => onImageZoom(primaryProof.dataUrl!)} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                    <p className="text-white text-sm font-semibold flex items-center gap-2"><PhotoIcon className="h-4 w-4"/> View Full Resolution</p>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                                <PhotoIcon className="h-16 w-16 mb-4 opacity-30"/>
                                <span className="text-sm font-semibold">No Visual Evidence</span>
                                <button onClick={() => fileInputRef.current?.click()} className="mt-4 px-4 py-2 bg-white text-primary text-xs font-bold rounded-full shadow-sm hover:shadow transition">Upload Photo</button>
                            </div>
                        )}
                         <div className="absolute top-4 left-4">
                             <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${item.status === 'active' ? 'bg-emerald-500/90 text-white border-transparent' : 'bg-white/90 text-slate-700 border-slate-200'}`}>
                                {item.status === 'enriching' ? <><SpinnerIcon className="h-3 w-3 mr-1.5 text-white"/> Enriching...</> : item.status === 'active' ? 'Claim Ready' : 'Draft'}
                             </span>
                        </div>
                    </div>

                    {/* Meta Data (Right) */}
                    <div className="md:col-span-8 lg:col-span-9 p-8 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                            {item.itemCategory}
                                        </span>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading tracking-tight leading-tight">{item.itemName}</h1>
                                    <p className="text-lg text-slate-500 mt-2 font-medium">{item.brand} <span className="text-slate-300 mx-2">|</span> {item.model}</p>
                                </div>
                                <div className="hidden sm:block text-right bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <ScoreIndicator score={item.proofStrengthScore || 0} size="sm" />
                                    <p className="text-[10px] text-slate-400 mt-1 text-center font-bold uppercase tracking-wide">Confidence</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ChartPieIcon className="h-4 w-4 text-slate-400"/>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Replacement Cost (RCV)</p>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">${(item.replacementCostValueRCV || item.originalCost).toLocaleString()}</span>
                                        {item.valuationHistory && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center"><CheckCircleIcon className="h-3 w-3 mr-0.5"/> Verified</span>}
                                    </div>
                                </div>
                                <div className="p-5 bg-white rounded-xl border border-slate-200">
                                     <div className="flex items-center gap-2 mb-1">
                                        <TagIcon className="h-4 w-4 text-slate-400"/>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actual Cash Value (ACV)</p>
                                    </div>
                                    <span className="text-2xl font-bold text-slate-600 tracking-tight">${(item.actualCashValueACV || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-6 text-sm text-slate-500">
                             <div className="flex items-center gap-2">
                                <QrCodeIcon className={`h-4 w-4 ${item.serialNumber ? 'text-emerald-500' : 'text-slate-300'}`}/>
                                <span>{item.serialNumber ? `S/N: ${item.serialNumber}` : 'No Serial #'}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <FolderIcon className={`h-4 w-4 ${item.linkedProofs.length > 0 ? 'text-emerald-500' : 'text-slate-300'}`}/>
                                <span>{item.linkedProofs.length} Evidence Files</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content Column */}
                <div className="lg:col-span-8 space-y-6">
                     {/* Smart Suggestions Panel */}
                    {suggestions.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 mb-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-blue-500 rounded-full opacity-5 blur-2xl"></div>
                            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-4 relative z-10">
                                <SparklesIcon className="h-4 w-4 text-blue-600" />
                                AI Found Matching Evidence ({suggestions.length})
                            </h3>
                            <div className="space-y-3 relative z-10">
                                {suggestions.map(s => {
                                    const proof = unlinkedProofs.find(p => p.id === s.proofId);
                                    if (!proof) return null;
                                    return (
                                        <div key={s.proofId} className="flex items-start gap-4 bg-white p-4 rounded-lg border border-blue-100 shadow-sm transition-shadow hover:shadow-md">
                                             <div className="h-16 w-16 flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => proof.dataUrl && onImageZoom(proof.dataUrl)}>
                                                {proof.dataUrl && proof.type === 'image' ? (
                                                     <img src={proof.dataUrl} alt="suggestion" className="w-full h-full object-cover"/>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <PhotoIcon className="h-6 w-6 text-slate-300"/>
                                                    </div>
                                                )}
                                             </div>
                                             <div className="flex-grow">
                                                 <div className="flex justify-between items-start">
                                                     <div>
                                                         <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{proof.fileName}</p>
                                                         <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.reason}</p>
                                                     </div>
                                                     <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                         {s.confidence}% Match
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-3 mt-3">
                                                     <button onClick={() => handleAcceptSuggestion(s.proofId)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md transition-colors shadow-sm">
                                                         <LinkIcon className="h-3 w-3"/> Link Proof
                                                     </button>
                                                     <button onClick={() => handleRejectSuggestion(s.proofId)} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md text-xs font-bold transition-colors">
                                                         <XCircleIcon className="h-3 w-3"/> Dismiss
                                                     </button>
                                                 </div>
                                             </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 1. Item Particulars */}
                    <Accordion title="Forensic Details" icon={<TagIcon className="h-5 w-5"/>}>
                        <div className="space-y-6">
                             <div>
                                 <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Detailed Description</label>
                                 <textarea 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition shadow-inner"
                                    rows={4}
                                    value={item.itemDescription} 
                                    onChange={e => updateItem({...item, itemDescription: e.target.value})} 
                                 />
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                 <div>
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Brand</label>
                                     <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition" value={item.brand || ''} onChange={e => updateItem({...item, brand: e.target.value})} />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Model</label>
                                     <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition" value={item.model || ''} onChange={e => updateItem({...item, model: e.target.value})} />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Serial Number</label>
                                     <div className="flex gap-2">
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition" value={item.serialNumber || ''} onChange={e => updateItem({...item, serialNumber: e.target.value})} />
                                        <button onClick={handleExtractSerialNumber} disabled={isExtractingSN} className="p-3 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition text-slate-500 hover:text-primary">
                                            {isExtractingSN ? <SpinnerIcon className="h-5 w-5"/> : <QrCodeIcon className="h-5 w-5"/>}
                                        </button>
                                     </div>
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Purchase Date</label>
                                     <input type="date" className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition" value={item.purchaseDate || ''} onChange={e => updateItem({...item, purchaseDate: e.target.value})} />
                                 </div>
                             </div>
                             <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Original Cost</label>
                                    <CurrencyInput value={item.originalCost} onChange={val => updateItem({...item, originalCost: val})} className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition font-semibold text-slate-700" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Replacement Value</label>
                                    <CurrencyInput value={item.replacementCostValueRCV || 0} onChange={val => updateItem({...item, replacementCostValueRCV: val})} className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition font-bold text-slate-900" />
                                </div>
                             </div>
                        </div>
                    </Accordion>

                    {/* 2. Evidence Locker */}
                    <Accordion 
                        title={`Evidence Locker (${item.linkedProofs.length})`} 
                        icon={<FolderIcon className="h-5 w-5"/>}
                        rightContent={<button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-primary hover:text-primary-dark transition flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full"><PlusIcon className="h-3 w-3"/> Add File</button>}
                    >
                         <div className="flex flex-wrap gap-4">
                            {item.linkedProofs.map(proof => (
                                <ProofThumbnail key={proof.id} proof={proof} onClick={() => proof.dataUrl && onImageZoom(proof.dataUrl)} />
                            ))}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="h-28 w-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg hover:border-primary hover:bg-primary/5 transition text-slate-400 hover:text-primary bg-slate-50"
                            >
                                <PlusIcon className="h-8 w-8 mb-1" />
                                <span className="text-xs font-bold">Add</span>
                            </button>
                            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,application/pdf,audio/*" />
                         </div>
                    </Accordion>
                </div>

                {/* Sidebar Column: Intelligence & Verification */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Verification & Intelligence */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50">
                             <h3 className="font-bold text-slate-800 font-heading flex items-center gap-2">
                                <SparklesIcon className="h-5 w-5 text-primary"/>
                                Veritas Intelligence
                             </h3>
                        </div>
                         
                         <div className="p-5">
                            {item.webIntelligence && item.webIntelligence.length > 0 ? (
                                <div className="space-y-4">
                                    {item.webIntelligence[0].facts.map((fact, i) => (
                                        <div key={i} className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <p className="text-slate-700 leading-relaxed font-medium">{fact.fact}</p>
                                            {fact.source && (
                                                <a href={fact.source} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-3 flex items-center gap-1 w-full truncate font-semibold">
                                                    <LinkIcon className="h-3 w-3 flex-shrink-0"/>
                                                    {new URL(fact.source).hostname}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                                        <SparklesIcon className="h-8 w-8 text-slate-300"/>
                                    </div>
                                    <p className="text-sm font-medium">No intelligence gathered yet.</p>
                                    <p className="text-xs mt-1">AI runs automatically in background.</p>
                                    {isEnriching && <p className="text-xs text-primary mt-2 font-bold animate-pulse">Analyzing now...</p>}
                                </div>
                            )}
                         </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Claim Readiness</h4>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-between p-2 rounded hover:bg-slate-50 transition">
                                <span className={`text-sm font-medium ${item.linkedProofs.some(p => p.type === 'image') ? 'text-slate-700' : 'text-slate-400'}`}>Visual Evidence</span>
                                {item.linkedProofs.some(p => p.type === 'image') ? <CheckCircleIcon className="h-5 w-5 text-emerald-500"/> : <ExclamationTriangleIcon className="h-5 w-5 text-amber-400"/>}
                            </li>
                            <li className="flex items-center justify-between p-2 rounded hover:bg-slate-50 transition">
                                <span className={`text-sm font-medium ${item.serialNumber ? 'text-slate-700' : 'text-slate-400'}`}>Serial Number</span>
                                {item.serialNumber ? <CheckCircleIcon className="h-5 w-5 text-emerald-500"/> : <div className="h-4 w-4 rounded-full border-2 border-slate-200"></div>}
                            </li>
                            <li className="flex items-center justify-between p-2 rounded hover:bg-slate-50 transition">
                                <span className={`text-sm font-medium ${item.valuationHistory?.length ? 'text-slate-700' : 'text-slate-400'}`}>Market Value Source</span>
                                {item.valuationHistory?.length ? <CheckCircleIcon className="h-5 w-5 text-emerald-500"/> : <div className="h-4 w-4 rounded-full border-2 border-slate-200"></div>}
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailView;
