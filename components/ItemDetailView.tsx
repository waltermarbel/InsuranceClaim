
import React, { useState, useMemo, useRef } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { InventoryItem, Proof, UploadProgress } from '../types.ts';
import { ChevronLeftIcon, PlusIcon, TagIcon, FolderIcon, SparklesIcon, LinkIcon, CheckCircleIcon, PhotoIcon, ExclamationTriangleIcon, SpinnerIcon, QrCodeIcon, XCircleIcon, ChartPieIcon, GlobeIcon, DocumentTextIcon, CameraIcon } from './icons.tsx';
import { ScoreIndicator } from './ScoreIndicator.tsx';
import { CurrencyInput } from './CurrencyInput.tsx';
import * as geminiService from '../services/geminiService.ts';
import { useProofDataUrl } from '../hooks/useProofDataUrl.ts';
import * as storageService from '../services/storageService.ts';
import { blobToDataUrl } from '../utils/fileUtils.ts';
import { CATEGORIES } from '../constants.ts';
import LinkEvidenceModal from './LinkEvidenceModal.tsx';

interface ItemDetailViewProps {
  onAddProof: (itemId: string, files: File[]) => void;
  uploadProgress: UploadProgress | null;
  onEditImage: (proof: Proof) => void;
  onGenerateImage: (item: InventoryItem) => void;
  onRecordAudio: (item: InventoryItem) => void;
  onImageZoom: (imageUrl: string) => void;
  onFindWebImage: () => Promise<void>;
  onEnrichItem: (item: InventoryItem) => void;
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

const ProofThumbnail: React.FC<{ proof: Proof; onClick: (url: string) => void }> = ({ proof, onClick }) => {
    const { dataUrl: loadedUrl, isLoading } = useProofDataUrl(proof.id);
    const displayUrl = proof.dataUrl || loadedUrl;
    
    // Handle PDFs or generic files
    if (proof.mimeType === 'application/pdf' || proof.fileName.endsWith('.pdf')) {
         return (
            <div className="h-28 w-28 rounded-lg bg-red-50 border-2 border-red-100 flex flex-col items-center justify-center flex-shrink-0 cursor-pointer hover:border-red-400 hover:shadow-lg transition-all gap-1 p-2 text-center group" onClick={() => displayUrl && onClick(displayUrl)}>
                <DocumentTextIcon className="h-10 w-10 text-red-400 group-hover:text-red-600 transition-colors"/>
                <span className="text-[10px] font-bold text-red-800 truncate w-full px-1">PDF Document</span>
                <span className="text-[9px] text-red-600 truncate w-full">{proof.fileName}</span>
            </div>
         )
    }

    if (proof.type === 'image') {
        if (displayUrl) {
            return <img src={displayUrl} alt={proof.fileName} className="h-28 w-28 rounded-lg object-cover flex-shrink-0 cursor-pointer border-2 border-slate-100 hover:border-primary hover:shadow-lg transition-all transform hover:scale-105 duration-200" onClick={() => onClick(displayUrl)} />;
        } else if (isLoading) {
             return <div className="h-28 w-28 rounded-lg bg-slate-50 flex items-center justify-center border-2 border-slate-100"><SpinnerIcon className="h-6 w-6 text-primary"/></div>;
        }
    }
    
    return <div className="h-28 w-28 rounded-lg bg-slate-50 border-2 border-slate-100 flex flex-col items-center justify-center flex-shrink-0 cursor-pointer hover:border-primary hover:bg-white hover:shadow-lg transition-all gap-2 p-2 text-center group" onClick={() => displayUrl && onClick(displayUrl)}><FolderIcon className="h-8 w-8 text-slate-300 group-hover:text-primary transition-colors"/><span className="text-[10px] font-semibold text-slate-500 truncate w-full group-hover:text-primary transition-colors">{proof.fileName}</span></div>;
};

// Component to handle Hero Image loading
const HeroImage: React.FC<{ proof: Proof; itemName: string; onImageZoom: (url: string) => void; status: string }> = ({ proof, itemName, onImageZoom, status }) => {
    const { dataUrl } = useProofDataUrl(proof.id);
    const displayUrl = proof.dataUrl || dataUrl;

    if (displayUrl) {
        return (
            <>
                <img src={displayUrl} alt={itemName} className="w-full h-full object-cover cursor-zoom-in absolute inset-0 transition-transform duration-700 group-hover:scale-105" onClick={() => onImageZoom(displayUrl)} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <p className="text-white text-sm font-semibold flex items-center gap-2"><PhotoIcon className="h-4 w-4"/> View Full Resolution</p>
                </div>
            </>
        );
    }
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center bg-slate-100">
            <SpinnerIcon className="h-8 w-8 text-primary"/>
        </div>
    );
}

const ItemDetailView: React.FC<ItemDetailViewProps> = ({ 
    onAddProof, 
    uploadProgress, 
    onEditImage, 
    onGenerateImage, 
    onRecordAudio, 
    onImageZoom, 
    onFindWebImage,
    onEnrichItem
}) => {
    const { inventory, selectedItemId, unlinkedProofs } = useAppState();
    const dispatch = useAppDispatch();
    
    const item = useMemo(() => inventory.find(i => i.id === selectedItemId), [inventory, selectedItemId]);
    
    const [isExtractingSN, setIsExtractingSN] = useState(false);
    const [isFindingImage, setIsFindingImage] = useState(false);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateItem = (updatedItem: InventoryItem) => {
        dispatch({ type: 'UPDATE_ITEM', payload: updatedItem });
    };

    const onBack = () => dispatch({ type: 'UNSELECT_ITEM' });
    const onDeleteItem = () => item && dispatch({ type: 'DELETE_ITEM', payload: { itemId: item.id } });

    const handleExtractSerialNumber = async () => {
        if (!item) return;
        const imageProof = item.linkedProofs.find(p => p.type === 'image');
        if (!imageProof) {
            alert('No image proof available to scan.');
            return;
        }
        setIsExtractingSN(true);
        try {
            // Resolve dataUrl if missing
            let dataUrl = imageProof.dataUrl;
            if (!dataUrl) {
                const blob = await storageService.getProofBlob(imageProof.id);
                if (blob) {
                    dataUrl = await blobToDataUrl(blob);
                }
            }

            if (dataUrl) {
                const res = await geminiService.extractSerialNumber(dataUrl);
                if (res.serialNumber) {
                    updateItem({ ...item, serialNumber: res.serialNumber });
                } else {
                    alert('No serial number detected.');
                }
            } else {
                alert('Could not load image data.');
            }
        } catch {
            alert('Extraction failed.');
        } finally {
            setIsExtractingSN(false);
        }
    };

    const handleWebSearch = async () => {
        setIsFindingImage(true);
        try {
            await onFindWebImage();
        } catch (e) {
            console.error(e);
        } finally {
            setIsFindingImage(false);
        }
    };

    const handleEnrichment = () => {
        if (item) {
            onEnrichItem(item);
        }
    };

    const handleAutoFill = async () => {
        if (!item) return;
        setIsAutoFilling(true);
        try {
            const enrichedData = await geminiService.autocompleteItemDetails(item);
            const updatedItem = {
                ...item,
                ...enrichedData,
            };
            updateItem(updatedItem);
        } catch (error) {
            console.error("Auto-fill failed", error);
            alert("Failed to auto-fill details from the web.");
        } finally {
            setIsAutoFilling(false);
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

    const handleLinkEvidence = (proofIds: string[]) => {
        if (!item) return;
        proofIds.forEach(id => {
            dispatch({ type: 'ACCEPT_SUGGESTION', payload: { itemId: item.id, proofId: id } });
        });
        setShowLinkModal(false);
    };

    if (!item) return null;

    const primaryProof = item.linkedProofs.find(p => p.type === 'image') || item.linkedProofs[0] || null;
    const isEnriching = item.status === 'enriching';
    const isProcessing = isEnriching || isFindingImage || isExtractingSN || isAutoFilling;
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

            {/* Progress Bar */}
            {isProcessing && (
                <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-center gap-4 shadow-sm animate-pulse-subtle">
                     <div className="flex items-center gap-2">
                        <SpinnerIcon className="h-5 w-5 text-blue-600 animate-spin"/>
                        <span className="text-sm font-bold text-blue-800">
                            {isFindingImage ? 'Scouring the web for product images...' : isExtractingSN ? 'Analyzing image for Serial Number...' : isAutoFilling ? 'Hunting for product specs and pricing...' : 'AI is extracting details, linking proofs & finding value...'}
                        </span>
                     </div>
                     <div className="w-full sm:w-64 h-2 bg-blue-200 rounded-full overflow-hidden relative">
                         <div className="absolute inset-y-0 bg-blue-600 rounded-full animate-indeterminate-progress w-1/2"></div>
                     </div>
                </div>
            )}

            {/* Top Overview Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 mb-8 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                    
                    {/* Visual Asset (Left) */}
                    <div className="md:col-span-4 lg:col-span-3 bg-slate-100 relative group min-h-[300px] md:min-h-full">
                        {primaryProof ? (
                            <HeroImage proof={primaryProof} itemName={item.itemName} onImageZoom={onImageZoom} status={item.status} />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                                <PhotoIcon className="h-16 w-16 mb-4 opacity-30"/>
                                <span className="text-sm font-semibold">No Visual Evidence</span>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white text-primary text-xs font-bold rounded-full shadow-sm hover:shadow transition">Upload</button>
                                    <button onClick={handleWebSearch} disabled={isFindingImage} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-full shadow-sm hover:bg-primary-dark transition disabled:opacity-50">
                                        {isFindingImage ? 'Searching...' : 'Auto-Find'}
                                    </button>
                                </div>
                            </div>
                        )}
                         <div className="absolute top-4 left-4 pointer-events-none">
                             <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${item.status === 'active' ? 'bg-emerald-500/90 text-white border-transparent' : 'bg-white/90 text-slate-700 border-slate-200'}`}>
                                {item.status === 'enriching' ? <><SpinnerIcon className="h-3 w-3 mr-1.5 text-white"/> Enriching...</> : item.status === 'active' ? 'Claim Ready' : 'Draft'}
                             </span>
                        </div>
                    </div>

                    {/* Meta Data (Right) */}
                    <div className="md:col-span-8 lg:col-span-9 p-8 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-grow pr-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <select 
                                            value={item.itemCategory} 
                                            onChange={(e) => updateItem({...item, itemCategory: e.target.value})}
                                            className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 hover:bg-slate-200"
                                        >
                                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={item.itemName} 
                                        onChange={(e) => updateItem({...item, itemName: e.target.value})}
                                        className="w-full text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading tracking-tight leading-tight bg-transparent border-none focus:ring-0 px-0 outline-none placeholder-slate-300"
                                        placeholder="Item Name"
                                    />
                                    <p className="text-lg text-slate-500 mt-2 font-medium">{item.brand} <span className="text-slate-300 mx-2">|</span> {item.model}</p>
                                </div>
                                <div className="hidden sm:block text-right bg-slate-50 p-3 rounded-xl border border-slate-100 flex-shrink-0">
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
                                        <CurrencyInput 
                                            value={item.replacementCostValueRCV || 0} 
                                            onChange={val => updateItem({...item, replacementCostValueRCV: val})} 
                                            className="text-3xl font-extrabold text-slate-900 tracking-tight bg-transparent border-none p-0 w-full focus:ring-0 outline-none" 
                                        />
                                        {item.valuationHistory && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center flex-shrink-0"><CheckCircleIcon className="h-3 w-3 mr-0.5"/> Verified</span>}
                                    </div>
                                </div>
                                <div className="p-5 bg-white rounded-xl border border-slate-200">
                                     <div className="flex items-center gap-2 mb-1">
                                        <TagIcon className="h-4 w-4 text-slate-400"/>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actual Cash Value (ACV)</p>
                                    </div>
                                    <CurrencyInput 
                                        value={item.actualCashValueACV || 0} 
                                        onChange={val => updateItem({...item, actualCashValueACV: val})} 
                                        className="text-2xl font-bold text-slate-600 tracking-tight bg-transparent border-none p-0 w-full focus:ring-0 outline-none" 
                                    />
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
                                                <ProofThumbnail proof={proof} onClick={(url) => onImageZoom(url)}/>
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
                    <Accordion 
                        title="Forensic Details" 
                        icon={<TagIcon className="h-5 w-5"/>}
                        rightContent={
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleAutoFill} 
                                    disabled={isAutoFilling} 
                                    className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark disabled:opacity-50 transition bg-primary/10 px-3 py-1.5 rounded-full"
                                >
                                    <SparklesIcon className="h-3 w-3" />
                                    {isAutoFilling ? 'Filling...' : 'Auto-Fill Details from Web'}
                                </button>
                            </div>
                        }
                    >
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
                                 <div>
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Condition</label>
                                     <select 
                                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                                        value={item.condition || ''}
                                        onChange={e => updateItem({...item, condition: e.target.value as any})}
                                     >
                                        <option value="" disabled>Select Condition</option>
                                        <option value="New">New</option>
                                        <option value="Like New">Like New</option>
                                        <option value="Good">Good</option>
                                        <option value="Fair">Fair</option>
                                        <option value="Poor">Poor</option>
                                     </select>
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
                        rightContent={
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleEnrichment}
                                    disabled={isEnriching}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 disabled:opacity-50"
                                    title="Use AI to find matching proofs from the locker"
                                >
                                    <SparklesIcon className="h-3 w-3"/> Auto-Link Evidence
                                </button>
                                {unlinkedProofs.length > 0 && (
                                    <button onClick={() => setShowLinkModal(true)} className="text-xs font-bold text-slate-600 hover:text-primary transition flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200">
                                        <LinkIcon className="h-3 w-3"/> Link Existing
                                    </button>
                                )}
                                <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-primary hover:text-primary-dark transition flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
                                    <PlusIcon className="h-3 w-3"/> Add File
                                </button>
                            </div>
                        }
                    >
                         <div className="flex flex-wrap gap-4">
                            {item.linkedProofs.map(proof => (
                                <ProofThumbnail key={proof.id} proof={proof} onClick={(url) => onImageZoom(url)} />
                            ))}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="h-28 w-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg hover:border-primary hover:bg-primary/5 transition text-slate-400 hover:text-primary bg-slate-50"
                            >
                                <PlusIcon className="h-8 w-8 mb-1" />
                                <span className="text-xs font-bold">Add New</span>
                            </button>
                            <button 
                                onClick={handleWebSearch}
                                disabled={isFindingImage}
                                className="h-28 w-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg hover:border-primary hover:bg-primary/5 transition text-slate-400 hover:text-primary bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isFindingImage ? <SpinnerIcon className="h-8 w-8 mb-1 text-primary"/> : <GlobeIcon className="h-8 w-8 mb-1" />}
                                <span className="text-xs font-bold text-center px-1">{isFindingImage ? 'Searching...' : 'Find Web Image'}</span>
                            </button>
                            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,application/pdf,audio/*" />
                         </div>
                    </Accordion>
                </div>

                {/* Sidebar Column: Intelligence & Verification */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Verification & Intelligence */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                             <h3 className="font-bold text-slate-800 font-heading flex items-center gap-2">
                                <SparklesIcon className="h-5 w-5 text-primary"/>
                                Web Intelligence
                             </h3>
                             <button onClick={handleEnrichment} disabled={isEnriching} className="text-xs font-bold text-primary hover:underline disabled:opacity-50">
                                {isEnriching ? 'Processing...' : 'Auto-Process Item'}
                             </button>
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
                                    <p className="text-xs mt-1">Enrichment finds specs, links proof, & gets value.</p>
                                    {isEnriching ? (
                                        <p className="text-xs text-primary mt-2 font-bold animate-pulse">Analyzing now...</p>
                                    ) : (
                                        <button 
                                            onClick={handleEnrichment}
                                            className="mt-4 px-4 py-2 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-600 hover:text-primary hover:border-primary transition"
                                        >
                                            Auto-Process Item
                                        </button>
                                    )}
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
            
            {showLinkModal && (
                <LinkEvidenceModal 
                    unlinkedProofs={unlinkedProofs} 
                    onClose={() => setShowLinkModal(false)} 
                    onLink={handleLinkEvidence} 
                />
            )}

            <style>{`
                @keyframes indeterminate-progress {
                    0% { left: -50%; width: 50%; }
                    100% { left: 100%; width: 50%; }
                }
                .animate-indeterminate-progress {
                    position: absolute;
                    animation: indeterminate-progress 1.5s infinite linear;
                }
                @keyframes pulse-subtle {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.8; }
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default ItemDetailView;
