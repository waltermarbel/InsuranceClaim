import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { InventoryItem, Proof, UploadProgress } from '../types.ts';
import {
    TagIcon, SpinnerIcon, SparklesIcon, ShieldCheckIcon,
    ChevronDownIcon, ChevronUpIcon, PlusIcon,
    CurrencyDollarIcon, PhotoIcon, DocumentTextIcon,
    PencilSquareIcon, GlobeIcon, TrashIcon, CheckCircleIcon,
    ArrowUpTrayIcon, MicrophoneIcon, XIcon, ArrowDownTrayIcon,
    ExclamationTriangleIcon, ClockIcon, MapPinIcon, BoltIcon, MagnifyingGlassIcon
} from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';
import { CurrencyInput } from './CurrencyInput.tsx';
import { ScoreIndicator } from './ScoreIndicator.tsx';
import { CATEGORIES, PROOF_PURPOSE_COLORS, ITEM_CONDITIONS } from '../constants.ts';
import { useProofDataUrl } from '../hooks/useProofDataUrl.ts';

import { calculateHealthMetric, isHighRiskOfDenial } from '../utils/healthMetric.ts';

interface ItemDetailViewProps {
    onAddProof: (itemId: string, files: File[]) => void;
    uploadProgress: UploadProgress | null;
    onEditImage: (proof: Proof) => void;
    onGenerateImage: (item: InventoryItem) => void;
    onRecordAudio: (item: InventoryItem) => void;
    onImageZoom: (url: string) => void;
    onFindWebImage: () => void;
    onEnrichItem: (item: InventoryItem) => void;
}

const Accordion: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
                <div className="flex items-center gap-3 font-bold text-slate-700">
                    <span className="text-primary">{icon}</span>
                    {title}
                </div>
                {isOpen ? <ChevronUpIcon className="h-5 w-5 text-slate-400" /> : <ChevronDownIcon className="h-5 w-5 text-slate-400" />}
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 border-t border-slate-100">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ProofThumbnail: React.FC<{ proof: Proof, onZoom: (url: string) => void, onEdit: () => void }> = ({ proof, onZoom, onEdit }) => {
    const { dataUrl, isLoading } = useProofDataUrl(proof.id);
    const displayUrl = proof.dataUrl || dataUrl;
    const isImage = proof.type === 'image' || proof.mimeType?.startsWith('image/');

    if (isLoading) return <div className="h-24 w-24 bg-slate-100 rounded-lg flex items-center justify-center"><SpinnerIcon className="h-6 w-6 text-slate-300" /></div>;

    return (
        <div className="relative group h-24 w-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
            {displayUrl && isImage ? (
                <img 
                    src={displayUrl} 
                    alt={proof.fileName} 
                    className="h-full w-full object-cover cursor-pointer"
                    onClick={() => onZoom(displayUrl)} 
                />
            ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 bg-slate-100/50 p-2 text-center">
                    {proof.type === 'audio' || proof.mimeType?.startsWith('audio/') ? (
                        <MicrophoneIcon className="h-7 w-7 mb-1 text-slate-400" />
                    ) : (
                        <DocumentTextIcon className="h-7 w-7 mb-1 text-slate-400" />
                    )}
                    <span className="text-[10px] w-full truncate font-medium">{proof.fileName}</span>
                </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {displayUrl && (
                    <button onClick={() => onZoom(displayUrl!)} className="p-1.5 bg-white/90 rounded-full text-slate-700 hover:text-blue-500 transition focus-visible:ring-2 focus-visible:outline-none focus-visible:opacity-100" aria-label={isImage ? "Zoom Image" : "View Document"} title={isImage ? "Zoom Image" : "View Document"}>
                        <MagnifyingGlassIcon className="h-4 w-4" />
                    </button>
                )}
                {isImage && (
                    <button onClick={onEdit} className="p-1.5 bg-white/90 rounded-full text-slate-700 hover:text-primary transition focus-visible:ring-2 focus-visible:outline-none focus-visible:opacity-100" aria-label="Edit Image" title="Edit Image">
                        <PencilSquareIcon className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

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
    const { inventory, selectedItemId } = useAppState();
    const dispatch = useAppDispatch();
    const item = inventory.find(i => i.id === selectedItemId);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Local state for editing fields
    const [localItemState, setLocalItemState] = useState<Partial<InventoryItem>>({});
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [isHealing, setIsHealing] = useState(false);

    useEffect(() => {
        if (item) {
            setLocalItemState(item);
        }
    }, [item]);

    if (!item) return <div className="text-center py-20 text-slate-500">Item not found.</div>;

    const handleLocalChange = (field: keyof InventoryItem, value: any) => {
        setLocalItemState(prev => ({ ...prev, [field]: value }));
    };

    const handleBlur = (field: keyof InventoryItem) => {
        if (localItemState[field] !== item[field]) {
            const reason = window.prompt(`Please enter the Reason for Change for updating ${field}:`, 'User manual correction') || 'System Auto-Generated';
            dispatch({ type: 'UPDATE_ITEM', payload: { ...item, [field]: localItemState[field] } });
            dispatch({ type: 'LOG_ACTIVITY', payload: { action: 'MANUAL_UPDATE', details: `Updated ${field} for ${item.itemName}`, reasonForChange: reason, app: 'Assert' } });
        }
    };

    const handleAutoFill = async () => {
        setIsAutoFilling(true);
        try {
            const updates = await geminiService.autocompleteItemDetails(item);
            const newItem = { ...item, ...updates };
            dispatch({ type: 'UPDATE_ITEM', payload: newItem });
            setLocalItemState(newItem);
            dispatch({ type: 'LOG_ACTIVITY', payload: { action: 'AI_AUTOFILL', details: `Gemini enhanced details for ${item.itemName}`, reasonForChange: 'AI Valuation / Context Generation', app: 'Gemini' } });
        } catch (e) {
            console.error(e);
            alert("Failed to auto-fill details.");
        } finally {
            setIsAutoFilling(false);
        }
    };

    const handleForensicHeal = async () => {
        setIsHealing(true);
        try {
            const report = await geminiService.autoHealAsset(item);
            if (report.status === 'HEALED' && report.correctedAttributes) {
                const newItem = { ...item, ...report.correctedAttributes };
                dispatch({ type: 'UPDATE_ITEM', payload: newItem });
                setLocalItemState(newItem);
                dispatch({ type: 'LOG_ACTIVITY', payload: { action: 'AI_FORENSIC_HEAL', details: `Healed: ${report.summary}`, reasonForChange: 'AI Forensic Market Analysis', app: 'Gemini' } });
                alert(`Forensic Heal Complete: ${report.summary}`);
            } else {
                alert(`Audit Complete: ${report.summary}`);
            }
        } catch (e) {
            console.error(e);
            alert("Forensic audit failed.");
        } finally {
            setIsHealing(false);
        }
    };

    const handleDelete = () => {
        const reason = window.prompt('Please enter the Reason for Change for deleting this item:', 'Item no longer relevant') || 'System Auto-Generated';
        dispatch({ type: 'DELETE_ITEM', payload: { itemId: item.id } });
        dispatch({ type: 'LOG_ACTIVITY', payload: { action: 'DELETE_ITEM', details: `Deleted item ${item.itemName}`, reasonForChange: reason, app: 'Assert' } });
        dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
    };

    // Calculate EXIF Warnings
    const purchaseDateMs = localItemState.purchaseDate ? new Date(localItemState.purchaseDate).getTime() : null;
    const itemsWithExif = item.linkedProofs.filter(p => p.exif && Object.keys(p.exif).length > 0);
    const exifWarnings: { proof: Proof, diffDays: number }[] = [];
    
    if (purchaseDateMs) {
        itemsWithExif.forEach(proof => {
            if (proof.exif?.dateTimeOriginal) {
                const dateTakenMs = new Date(proof.exif.dateTimeOriginal).getTime();
                const diffTime = Math.abs(dateTakenMs - purchaseDateMs);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 7) { // Flag items with > 7 days discrepancy
                    exifWarnings.push({ proof, diffDays });
                }
            }
        });
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-5xl mx-auto space-y-6 pb-20"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <button 
                        onClick={() => dispatch({ type: 'SET_VIEW', payload: 'dashboard' })}
                        className="text-xs font-bold text-slate-400 hover:text-primary mb-2 flex items-center gap-1 uppercase tracking-wide"
                    >
                        <ChevronUpIcon className="h-3 w-3 rotate-90" /> Back to Schedule
                    </button>
                    <input
                        type="text"
                        value={localItemState.itemName || ''}
                        onChange={e => handleLocalChange('itemName', e.target.value)}
                        onBlur={() => handleBlur('itemName')}
                        className="text-3xl font-extrabold text-slate-900 bg-transparent border-none focus:ring-0 p-0 placeholder-slate-300 w-full md:w-auto"
                        placeholder="Item Name"
                    />
                    <div className="flex items-center gap-3 mt-2">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border border-slate-200">
                            {localItemState.itemCategory || 'Uncategorized'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                            {item.status.replace('-', ' ').toUpperCase()}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-center flex flex-col items-center">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Claim Readiness</div>
                        <div className="flex items-center gap-2">
                            <ScoreIndicator score={calculateHealthMetric(item)} size="sm" />
                            {isHighRiskOfDenial(calculateHealthMetric(item)) && (
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-rose-500 text-white px-2 py-1 rounded shadow-sm">High Risk of Denial</span>
                            )}
                        </div>
                    </div>
                    <div className="h-10 w-px bg-slate-200"></div>
                    <button onClick={handleDelete} className="text-slate-400 hover:text-rose-500 transition p-2 rounded-full hover:bg-rose-50">
                        <TrashIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details */}
                <div className="lg:col-span-2">
                    {/* 1. Item Particulars */}
                    <Accordion title="Forensic Details" icon={<TagIcon className="h-5 w-5" />}>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold uppercase text-slate-400">Detailed Description</label>
                                    <button
                                        onClick={handleAutoFill}
                                        disabled={isAutoFilling}
                                        className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {isAutoFilling ? <SpinnerIcon className="h-3 w-3 animate-spin"/> : <SparklesIcon className="h-3 w-3"/>}
                                        Auto-Fill Details
                                    </button>
                                </div>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition shadow-inner"
                                    rows={4}
                                    value={localItemState.itemDescription || ''}
                                    onChange={e => handleLocalChange('itemDescription', e.target.value)}
                                    onBlur={() => handleBlur('itemDescription')}
                                />
                            </div>
                            <div className="flex items-end gap-2 mb-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-grow">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Brand</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                                            value={localItemState.brand || ''}
                                            onChange={e => handleLocalChange('brand', e.target.value)}
                                            onBlur={() => handleBlur('brand')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Model</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                                            value={localItemState.model || ''}
                                            onChange={e => handleLocalChange('model', e.target.value)}
                                            onBlur={() => handleBlur('model')}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAutoFill}
                                    disabled={isAutoFilling}
                                    className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg hover:bg-blue-100 transition shadow-sm disabled:opacity-50"
                                    title="Auto-Fill Details from Web"
                                >
                                    {isAutoFilling ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                                </button>
                                <button
                                    onClick={handleForensicHeal}
                                    disabled={isHealing}
                                    className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-100 transition shadow-sm disabled:opacity-50"
                                    title="Run Forensic Validation"
                                >
                                    {isHealing ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <ShieldCheckIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Serial Number</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                                        value={localItemState.serialNumber || ''}
                                        onChange={e => handleLocalChange('serialNumber', e.target.value)}
                                        onBlur={() => handleBlur('serialNumber')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Category</label>
                                    <select
                                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                                        value={localItemState.itemCategory || 'Other'}
                                        onChange={e => {
                                            handleLocalChange('itemCategory', e.target.value);
                                            // Ideally verify sub-limits here or trigger a check
                                            handleBlur('itemCategory');
                                        }}
                                    >
                                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Accordion>

                    {/* 2. Valuation */}
                    <Accordion title="Valuation & Acquisition" icon={<CurrencyDollarIcon className="h-5 w-5" />}>
                        {item.valuationHistory && item.valuationHistory.length > 0 && item.valuationHistory[0].isUnderclaiming && (
                            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex gap-3 items-start">
                                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-sm">Under-claiming Risk Detected</p>
                                    <p className="mt-1 text-xs opacity-90 leading-relaxed">
                                        {item.valuationHistory[0].reasoning}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Original Cost</label>
                                <CurrencyInput
                                    value={localItemState.originalCost || 0}
                                    onChange={(val) => {
                                        setLocalItemState(prev => ({ ...prev, originalCost: val }));
                                        dispatch({ type: 'UPDATE_ITEM', payload: { ...item, originalCost: val } });
                                    }}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Purchase Date</label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                                    value={localItemState.purchaseDate || ''}
                                    onChange={e => handleLocalChange('purchaseDate', e.target.value)}
                                    onBlur={() => handleBlur('purchaseDate')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Replacement Value (RCV)</label>
                                <div className="flex gap-2">
                                    <CurrencyInput
                                        value={localItemState.replacementCostValueRCV || localItemState.originalCost || 0}
                                        onChange={(val) => {
                                            setLocalItemState(prev => ({ ...prev, replacementCostValueRCV: val }));
                                            dispatch({ type: 'UPDATE_ITEM', payload: { ...item, replacementCostValueRCV: val } });
                                        }}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-emerald-600 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                                    />
                                    <button 
                                        onClick={() => onEnrichItem({ ...item, valuationHistory: [] })}
                                        className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition"
                                        title="Get Market Valuation (Recursive Engine)"
                                    >
                                        <CurrencyDollarIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Condition</label>
                                <select
                                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                                    value={localItemState.condition || 'Good'}
                                    onChange={e => {
                                        handleLocalChange('condition', e.target.value as any);
                                        handleBlur('condition');
                                    }}
                                >
                                    {ITEM_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </Accordion>
                </div>

                {/* Right Column: Evidence Locker */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <ShieldCheckIcon className="h-5 w-5 text-slate-400" /> Evidence Locker
                                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{item.linkedProofs.length}</span>
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onRecordAudio(item)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-xs font-semibold hover:bg-rose-100 transition shadow-sm"
                                >
                                    <MicrophoneIcon className="h-4 w-4" />
                                    Record Audio
                                </button>
                                <button
                                    onClick={onFindWebImage}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-semibold hover:bg-blue-100 transition shadow-sm"
                                >
                                    <GlobeIcon className="h-4 w-4" />
                                    Web Image
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold hover:bg-indigo-100 transition shadow-sm"
                                >
                                    <ArrowUpTrayIcon className="h-4 w-4" />
                                    Upload
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-4 flex-grow overflow-y-auto max-h-[500px]">
                            <div className="grid grid-cols-3 gap-2">
                                {item.linkedProofs.map(proof => (
                                    <ProofThumbnail 
                                        key={proof.id} 
                                        proof={proof} 
                                        onZoom={onImageZoom} 
                                        onEdit={() => onEditImage(proof)}
                                    />
                                ))}
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-24 w-24 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition gap-1"
                                >
                                    <PlusIcon className="h-6 w-6" />
                                    <span className="text-[9px] font-bold uppercase">Add</span>
                                </button>
                                <input 
                                    type="file" 
                                    multiple 
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={(e) => e.target.files && onAddProof(item.id, Array.from(e.target.files))}
                                />
                            </div>
                        </div>

                        {itemsWithExif.length > 0 && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-xs">
                                <h4 className="font-bold text-slate-700 mb-2 uppercase tracking-wide">EXIF Metadata</h4>
                                {exifWarnings.length > 0 && (
                                    <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded flex gap-2 items-start">
                                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Date Anomaly Detected</p>
                                            <p className="mt-0.5 opacity-90 text-[10px]">
                                                {exifWarnings.length} image(s) have 'Date Taken' differing significantly from the set Acquisition Date.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-3 max-h-32 overflow-y-auto pr-2">
                                    {itemsWithExif.map(proof => (
                                        <div key={`exif-${proof.id}`} className="bg-white p-2 border border-slate-100 rounded text-[10px] text-slate-500 space-y-1">
                                            <p className="font-bold text-slate-700 truncate">{proof.fileName}</p>
                                            {proof.exif?.dateTimeOriginal && (
                                                <p className="flex items-center gap-1"><ClockIcon className="h-3 w-3 inline text-slate-400" /> {new Date(proof.exif.dateTimeOriginal).toLocaleDateString()}</p>
                                            )}
                                            {proof.exif?.make && proof.exif?.model && (
                                                <p className="flex items-center gap-1"><PhotoIcon className="h-3 w-3 inline text-slate-400" /> {proof.exif.make} {proof.exif.model}</p>
                                            )}
                                            {proof.exif?.latitude && proof.exif?.longitude && (
                                                <p className="flex items-center gap-1"><MapPinIcon className="h-3 w-3 inline text-slate-400" /> {proof.exif.latitude.toFixed(4)}, {proof.exif.longitude.toFixed(4)}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-2">
                            <button onClick={() => onEnrichItem(item)} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md transition gap-1 group col-span-2">
                                <BoltIcon className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold text-slate-600">Run Forensic Enrichment</span>
                            </button>
                            <button onClick={() => onGenerateImage(item)} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md transition gap-1 group">
                                <PhotoIcon className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold text-slate-600">Gen Image</span>
                            </button>
                            <button onClick={onFindWebImage} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md transition gap-1 group">
                                <GlobeIcon className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold text-slate-600">Web Search</span>
                            </button>
                            <button onClick={() => onRecordAudio(item)} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md transition gap-1 group">
                                <MicrophoneIcon className="h-5 w-5 text-rose-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold text-slate-600">Dictate Note</span>
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md transition gap-1 group">
                                <ArrowUpTrayIcon className="h-5 w-5 text-slate-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold text-slate-600">Upload</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ItemDetailView;