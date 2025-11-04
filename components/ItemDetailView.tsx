// Fix: Removed invalid file marker that was causing a parsing error.
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, Proof, ParsedPolicy, AccountHolder, UploadProgress, ClaimDetails } from '../types.ts';
// Fix: Imported the missing DocumentTextIcon component.
import { ChevronLeftIcon, PlusIcon, TrashIcon, TagIcon, FolderIcon, SparklesIcon, GlobeIcon, DocumentMagnifyingGlassIcon, CalculatorIcon, TrophyIcon, PaperAirplaneIcon, LinkIcon, PencilIcon, XCircleIcon, CheckCircleIcon, CubeIcon, DocumentTextIcon, CameraIcon, InformationCircleIcon, ChevronRightIcon, QrCodeIcon, SearchIcon, PhotoIcon, ReceiptIcon, ExclamationTriangleIcon, PencilSquareIcon, SpinnerIcon } from './icons.tsx';
import { ScoreIndicator } from './ScoreIndicator.tsx';
import { CurrencyInput } from './CurrencyInput.tsx';
import { PROOF_PURPOSE_COLORS } from '../constants.ts';
import AnnotationEditor from './AnnotationEditor.tsx';

interface ItemDetailViewProps {
  item: InventoryItem;
  unlinkedProofs: Proof[];
  policy: ParsedPolicy | null;
  accountHolder: AccountHolder;
  onBack: () => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onFindMarketPrice: (item: InventoryItem) => void;
  onEnrichAsset: (item: InventoryItem) => void;
  onCalculateProofStrength: (item: InventoryItem) => void;
  onFindHighestRCV: (item: InventoryItem) => void;
  onDraftClaim: (item: InventoryItem) => void;
  onFindProductImage: (item: InventoryItem) => void;
  onVisualSearch: (item: InventoryItem) => void;
  onLinkMultipleProofs: (itemId: string, proofIds: string[]) => void;
  onUnlinkProof: (itemId: string, proofId: string) => void;
  onRejectSuggestion: (itemId: string, proofId: string) => void;
  onAddProof: (itemId: string, files: File[]) => void;
  uploadProgress: UploadProgress | null;
  itemCategories: string[];
  onExtractSerialNumber: (item: InventoryItem) => void;
  onExtractReceiptInfo: (itemId: string, proofId: string) => void;
  onEditImage: (proof: Proof) => void;
  onGenerateImage: (item: InventoryItem) => void;
  onRecordAudio: (item: InventoryItem) => void;
  onImageZoom: (imageUrl: string) => void;
  claimDetails: ClaimDetails;
  policyHolders: string[];
  onFindRecategorizationStrategy: (item: InventoryItem) => void;
  onGenerateSubmissionPackage: (item: InventoryItem) => void;
}

const Accordion: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
                aria-expanded={isOpen}
            >
                <h3 className="font-bold font-heading flex items-center gap-2 text-dark">
                    <span className="h-6 w-6 text-medium">{icon}</span>
                    {title}
                </h3>
                <ChevronRightIcon className={`h-5 w-5 text-medium accordion-icon ${isOpen ? 'open' : ''}`} />
            </button>
            <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
                <div className="p-4 border-t border-slate-200">
                    {children}
                </div>
            </div>
        </div>
    );
};

const ProofThumbnail: React.FC<{ proof: Proof; onClick: () => void }> = ({ proof, onClick }) => {
    const { dataUrl } = proof;

    if (proof.type === 'image' && dataUrl) {
        return <img src={dataUrl} alt={proof.fileName} className="h-10 w-10 rounded-md object-cover flex-shrink-0 cursor-pointer" onClick={onClick} />;
    }
    
    // Fallback for non-image proofs or images that have no dataUrl
    return (
        <div className="h-10 w-10 rounded-md bg-slate-200 flex items-center justify-center flex-shrink-0">
            {proof.type === 'audio' ? <svg className="h-6 w-6 text-slate-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg> : <DocumentTextIcon className="h-6 w-6 text-slate-500" />}
        </div>
    );
};

const PrimaryProofDisplay: React.FC<{ proof: Proof | null, onEditImage: () => void, onGenerateImage: () => void, onImageZoom: (url: string) => void }> = ({ proof, onEditImage, onGenerateImage, onImageZoom }) => {
    const dataUrl = proof?.dataUrl;

    if (proof && proof.type === 'image' && dataUrl) {
        return (
            <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center relative group">
                <img src={dataUrl} alt={proof.fileName} className="w-full h-full object-cover cursor-pointer" onClick={() => onImageZoom(dataUrl)} />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={onEditImage} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white/90 text-dark rounded-md backdrop-blur-sm">
                        <SparklesIcon className="h-5 w-5"/> Edit with AI
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
            <div className="text-center">
                <PhotoIcon className="h-24 w-24 text-slate-300" />
                <button onClick={onGenerateImage} className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-dark rounded-md border border-slate-300">
                    <SparklesIcon className="h-5 w-5"/> Generate Image
                </button>
            </div>
        </div>
    );
};

const AiActionButton: React.FC<{onClick: () => void; children: React.ReactNode, disabled?: boolean}> = ({ onClick, children, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center justify-start gap-2 p-2 text-sm font-semibold text-dark bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {children}
    </button>
);


const ItemDetailView: React.FC<ItemDetailViewProps> = ({
    item, unlinkedProofs, onBack, onUpdateItem, onDeleteItem, onFindMarketPrice, onEnrichAsset, onCalculateProofStrength, onFindHighestRCV, onDraftClaim, onUnlinkProof, onAddProof, onLinkMultipleProofs, onRejectSuggestion, onFindProductImage, onVisualSearch, uploadProgress, itemCategories, onExtractSerialNumber, onExtractReceiptInfo, onEditImage, onGenerateImage, onRecordAudio, onImageZoom, claimDetails, policyHolders, onFindRecategorizationStrategy, onGenerateSubmissionPackage, policy
}) => {
    const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
    const [isAnnotating, setIsAnnotating] = useState(false);
    const [selectedProofIds, setSelectedProofIds] = useState<string[]>([]);
    const [proofSearchTerm, setProofSearchTerm] = useState('');
    const proofInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        setSelectedProofIds([]); // Reset selections when item changes
    }, [item]);

    const isItemDateInvalid = useMemo(() => {
        if (!item.purchaseDate || !claimDetails.dateOfLoss) return false;
        // Compare dates only, ignoring time. Add one day to lossDate to make it inclusive.
        const itemDate = new Date(item.purchaseDate);
        const lossDate = new Date(claimDetails.dateOfLoss);
        return itemDate > lossDate;
    }, [item.purchaseDate, claimDetails.dateOfLoss]);
    
    const sublimit = policy?.coverage.find(c => c.type === 'sub-limit' && c.category === item.itemCategory);

    const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onAddProof(item.id, Array.from(event.target.files));
        }
    };

    const handleAnnotate = (proof: Proof) => {
        setSelectedProof(proof);
        setIsAnnotating(true);
    };

    const handleSaveAnnotation = async (newDataUrl: string) => {
        if (selectedProof) {
            const newProof: Proof = {
                ...selectedProof,
                id: `proof-${Date.now()}`,
                dataUrl: newDataUrl,
                createdBy: 'User',
                fileName: `annotated_${selectedProof.fileName}`
            }
            const file = new File([await (await fetch(newDataUrl)).blob()], newProof.fileName, {type: newProof.mimeType});
            onAddProof(item.id, [file]);
        }
        setIsAnnotating(false);
        setSelectedProof(null);
    };

    const handleProofSelectionChange = (proofId: string) => {
        setSelectedProofIds(prev =>
            prev.includes(proofId)
                ? prev.filter(id => id !== proofId)
                : [...prev, proofId]
        );
    };

    const handleSelectAll = () => {
        const allSuggestedIds = item.suggestedProofs?.map(s => s.proofId) || [];
        // Filter to only include proofs that are actually present in the unlinkedProofs list
        const allVisibleIds = allSuggestedIds.filter(id => unlinkedProofs.some(p => p.id === id));
        setSelectedProofIds(allVisibleIds);
    };
    
    const handleDeselectAll = () => {
        setSelectedProofIds([]);
    };

    const handleBulkLink = () => {
        onLinkMultipleProofs(item.id, selectedProofIds);
        setSelectedProofIds([]);
    };

    const isProofDateOutOfRange = (proof: Proof): boolean => {
        const { startDate, endDate } = claimDetails.claimDateRange || {};
        if (!startDate || !endDate || !proof.receiptData?.transactionDate) {
            return false;
        }
        const proofDate = new Date(proof.receiptData.transactionDate);
        return proofDate < new Date(startDate) || proofDate > new Date(endDate);
    };
    
    const primaryProof = item.linkedProofs.find(p => p.type === 'image') || item.linkedProofs[0] || null;

    const filteredProofs = item.linkedProofs.filter(proof =>
        proof.fileName.toLowerCase().includes(proofSearchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto">
             {isAnnotating && selectedProof && (
                <AnnotationEditor 
                    proof={selectedProof} 
                    onSave={handleSaveAnnotation} 
                    onCancel={() => { setIsAnnotating(false); setSelectedProof(null); }} 
                />
            )}
            <input type="file" ref={proofInputRef} onChange={handleProofFileChange} className="hidden" accept="image/*,application/pdf" multiple />
            <button onClick={onBack} className="flex items-center space-x-2 text-sm font-semibold text-medium hover:text-dark mb-6">
                <ChevronLeftIcon className="h-5 w-5" />
                <span>Back to Ledger</span>
            </button>

            {isItemDateInvalid && (
                <div className="p-4 mb-6 bg-warning/20 border-l-4 border-warning text-dark/80">
                    <div className="flex">
                        <div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-warning" /></div>
                        <div className="ml-3">
                            <p className="text-sm font-bold">Coverage Warning</p>
                            <p className="text-xs">This item's acquisition date ({item.purchaseDate}) is after the date of loss ({claimDetails.dateOfLoss}) and may not be covered by your policy.</p>
                        </div>
                    </div>
                </div>
            )}
            
            {sublimit && (
                <div className="p-4 mb-6 bg-warning/20 border-l-4 border-warning text-dark/80">
                    <div className="flex">
                        <div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-warning" /></div>
                        <div className="ml-3">
                            <p className="text-sm font-bold">Sub-Limit Warning</p>
                            <p className="text-xs">This item's category "{item.itemCategory}" is subject to a ${sublimit.limit.toLocaleString()} sub-limit on your policy.</p>
                            {!item.recategorizationStrategy && (
                                <button onClick={() => onFindRecategorizationStrategy(item)} className="mt-2 text-xs font-bold text-primary hover:underline">Find a Recategorization Strategy</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {item.recategorizationStrategy && (
                <div className="p-4 mb-6 bg-blue-100/60 border-l-4 border-blue-500 text-dark/90">
                    <div className="flex">
                        <div className="flex-shrink-0"><SparklesIcon className="h-5 w-5 text-blue-500" /></div>
                        <div className="ml-3">
                            <p className="text-sm font-bold">AI Recategorization Strategy</p>
                            <p className="text-xs mt-1"><strong>Suggested Category:</strong> {item.recategorizationStrategy.newCategory}</p>
                            <p className="text-xs mt-1"><strong>Reasoning:</strong> {item.recategorizationStrategy.reasoning}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Image & Proofs */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <PrimaryProofDisplay
                            proof={primaryProof}
                            onEditImage={() => primaryProof && onEditImage(primaryProof)}
                            onGenerateImage={() => onGenerateImage(item)}
                            onImageZoom={onImageZoom}
                        />
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-3 gap-2">
                             <h3 className="font-bold text-dark font-heading flex-shrink-0">Linked Proofs</h3>
                             <div className="relative w-full max-w-xs">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                                    <SearchIcon className="h-4 w-4 text-slate-400" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search proofs..."
                                    value={proofSearchTerm}
                                    onChange={(e) => setProofSearchTerm(e.target.value)}
                                    className="block w-full pl-8 pr-2 py-1 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-xs"
                                />
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1">
                                <button onClick={() => onRecordAudio(item)} title="Record Audio Note" className="p-1.5 text-primary hover:bg-slate-100 rounded-md"><svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm0 12.5a4.5 4.5 0 0 1-4.5-4.5H6a6 6 0 0 0 5.25 5.95V21h1.5v-2.55A6 6 0 0 0 18 10h-1.5a4.5 4.5 0 0 1-4.5 4.5z" /></svg></button>
                                <button onClick={() => proofInputRef.current?.click()} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline flex-shrink-0">
                                    <PlusIcon className="h-3 w-3" /> Add
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {uploadProgress && Object.entries(uploadProgress).map(([fileName, progress]) => {
                                const percentage = (progress as any).total > 0 ? Math.round(((progress as any).loaded / (progress as any).total) * 100) : 0;
                                return (
                                    <div key={fileName} className="p-2 bg-slate-50 rounded-md">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <p className="text-medium truncate pr-4">{fileName}</p>
                                            <p className="font-semibold text-dark">{percentage}%</p>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1">
                                            <div className="bg-primary h-1 rounded-full" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredProofs.map(proof => (
                                <div key={proof.id} className="group p-2 bg-slate-50 rounded-md hover:bg-slate-100">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-2 overflow-hidden">
                                            <ProofThumbnail proof={proof} onClick={() => proof.dataUrl && onImageZoom(proof.dataUrl)} />
                                            <div className="overflow-hidden">
                                                <p className="text-sm text-medium truncate">{proof.fileName}</p>
                                                {proof.purpose && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PROOF_PURPOSE_COLORS[proof.purpose]?.bg || 'bg-slate-100'} ${PROOF_PURPOSE_COLORS[proof.purpose]?.text || 'text-slate-600'}`}>
                                                            {proof.purpose}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                                {proof.type === 'image' && !proof.receiptData && <button onClick={() => onExtractReceiptInfo(item.id, proof.id)} className="p-1 text-medium hover:text-primary" title="Extract Receipt Info"><ReceiptIcon className="h-4 w-4"/></button>}
                                                <button onClick={() => onUnlinkProof(item.id, proof.id)} className="p-1 text-medium hover:text-danger" title="Unlink Proof"><TrashIcon className="h-4 w-4"/></button>
                                            </div>
                                        </div>
                                    </div>
                                     {proof.receiptData && (
                                        <div className="mt-2 text-xs text-slate-600 border-t border-slate-200 pt-2 ml-12 space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <p><strong>Date:</strong> {proof.receiptData.transactionDate}</p>
                                                {/* Fix: Wrap icon in a span to apply the title attribute correctly. */}
                                                {isProofDateOutOfRange(proof) && <span title="Proof date is outside the claim timeframe."><ExclamationTriangleIcon className="h-4 w-4 text-warning" /></span>}
                                            </div>
                                            <p><strong>Vendor:</strong> {proof.receiptData.vendor}</p>
                                            <p><strong>Total:</strong> ${proof.receiptData.totalAmount.toFixed(2)}</p>
                                            {proof.receiptData.lineItems && proof.receiptData.lineItems.length > 0 && (
                                                <div className="pt-1 mt-1 border-t border-slate-200/50">
                                                    <p className="font-semibold">Items:</p>
                                                    <ul className="list-disc pl-4 space-y-0.5">
                                                        {proof.receiptData.lineItems.map((lineItem, index) => (
                                                            <li key={index} className="truncate" title={`${lineItem.quantity}x ${lineItem.description} - $${lineItem.price.toFixed(2)}`}>
                                                                {lineItem.quantity}x {lineItem.description} - <strong>${lineItem.price.toFixed(2)}</strong>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="ml-12 mt-2 space-y-1 text-xs text-medium">
                                        {proof.owner && <p><strong>Owner:</strong> {proof.owner}</p>}
                                        {proof.notes && <p className="whitespace-pre-wrap"><strong>Notes:</strong> {proof.notes}</p>}
                                    </div>
                                </div>
                            ))}
                             {filteredProofs.length === 0 && item.linkedProofs.length > 0 && (
                                <p className="text-sm text-center text-medium py-4">No proofs match your search.</p>
                            )}
                            {item.linkedProofs.length === 0 && !uploadProgress && <p className="text-sm text-center text-medium py-4">No proofs linked.</p>}
                        </div>
                    </div>
                </div>

                {/* Middle Column: Details & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start">
                             <div>
                                <h1 className="text-3xl font-bold tracking-tight text-dark font-heading">{item.itemName}</h1>
                                <p className="text-sm font-semibold text-primary mt-1">{item.itemCategory}</p>
                             </div>
                            {item.proofStrengthScore !== undefined && <ScoreIndicator score={item.proofStrengthScore} />}
                        </div>
                        
                        <p className="mt-4 text-medium">{item.itemDescription}</p>

                        <div className="mt-4">
                            <label htmlFor="notes" className="text-xs font-semibold text-medium uppercase tracking-wider">Item Notes</label>
                            <div className="mt-1 text-medium whitespace-pre-wrap p-3 bg-slate-50 rounded-md border min-h-[4rem]">
                                {item.notes || <span className="text-slate-400 italic">No notes added.</span>}
                            </div>
                        </div>

                        <div className="mt-6 border-t pt-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                            <div><p className="text-xs text-medium">{item.isGift ? "Estimated Value" : "Original Cost"}</p><p className="font-semibold text-dark">${item.originalCost.toLocaleString()}</p></div>
                            <div><p className="text-xs text-medium">Replacement Cost (RCV)</p><p className="font-semibold text-dark">${(item.replacementCostValueRCV || 0).toLocaleString()}</p></div>
                            <div><p className="text-xs text-medium">Actual Cash Value (ACV)</p><p className="font-medium text-medium">${(item.actualCashValueACV || 0).toLocaleString()}</p></div>
                            <div><p className="text-xs text-medium">{item.isGift ? "Date Acquired" : "Purchase Date"}</p><p className="font-semibold text-dark">{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</p></div>
                            <div><p className="text-xs text-medium">Brand</p><p className="font-semibold text-dark">{item.brand || 'N/A'}</p></div>
                            <div><p className="text-xs text-medium">Model</p><p className="font-semibold text-dark">{item.model || 'N/A'}</p></div>
                            <div><p className="text-xs text-medium">Serial #</p><p className="font-semibold text-dark">{item.serialNumber || 'N/A'}</p></div>
                            {item.isGift && <div><p className="text-xs text-medium">Gifted By</p><p className="font-semibold text-dark">{item.giftedBy || 'N/A'}</p></div>}
                        </div>
                        <div className="mt-6 border-t pt-4 flex flex-wrap gap-2">
                            <button onClick={() => onDeleteItem(item.id)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white text-danger border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition"><TrashIcon className="h-4 w-4"/> Delete Item</button>
                        </div>
                    </div>
                     {item.provenance && (
                        <Accordion title="AI Synthesis Report" icon={<InformationCircleIcon />} defaultOpen={true}>
                             <p className="text-sm text-medium italic">
                                This item was automatically created by clustering multiple pieces of evidence.
                            </p>
                            <p className="mt-2 text-sm text-dark">
                                <span className="font-bold">AI Reasoning:</span> {item.provenance}
                            </p>
                        </Accordion>
                    )}
                     {(item.webIntelligence || (item.valuationHistory && item.valuationHistory.length > 0)) && (
                        <Accordion title="Web Intelligence" icon={<GlobeIcon />} defaultOpen={true}>
                            <div className="space-y-4">
                                {item.webIntelligence && item.webIntelligence.map((intel, index) => (
                                    <div key={`intel-${index}`}>
                                        <h4 className="text-sm font-bold text-dark mb-2">Enrichment Facts</h4>
                                        {intel.facts.map((fact, factIndex) => (
                                            <div key={`fact-${factIndex}`} className="text-sm text-medium border-b border-slate-100 py-2 last:border-b-0">
                                                <p className="text-dark">{fact.fact}</p>
                                                <a href={fact.source} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                                                    {fact.source}
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                {item.valuationHistory && item.valuationHistory.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-dark mb-2 mt-4">Valuation History</h4>
                                        {item.valuationHistory.map((valuation, index) => (
                                            <div key={`val-${index}`} className="text-sm text-medium border-b border-slate-100 py-2 last:border-b-0">
                                                <p><strong>RCV:</strong> ${valuation.rcv.toLocaleString()}, <strong>ACV:</strong> ${valuation.acv.toLocaleString()}</p>
                                                {valuation.sources.map((source, sourceIndex) => (
                                                    <a key={`source-${sourceIndex}`} href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                                                        {source.title || source.url}
                                                    </a>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Accordion>
                    )}
                    <Accordion title="AI Actions" icon={<SparklesIcon />} defaultOpen={false}>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                           <AiActionButton onClick={() => onFindMarketPrice(item)}><GlobeIcon className="h-5 w-5 text-primary" /> Find Market Price</AiActionButton>
                           <AiActionButton onClick={() => onEnrichAsset(item)}><DocumentMagnifyingGlassIcon className="h-5 w-5 text-primary" /> Enrich with Web Data</AiActionButton>
                           <AiActionButton onClick={() => onFindHighestRCV(item)}><TrophyIcon className="h-5 w-5 text-primary" /> Find Highest RCV</AiActionButton>
                           <AiActionButton onClick={() => onVisualSearch(item)} disabled={!item.linkedProofs.some(p => p.type === 'image')}><CameraIcon className="h-5 w-5 text-primary" /> Visual Search</AiActionButton>
                           <AiActionButton onClick={() => onExtractSerialNumber(item)} disabled={!item.linkedProofs.some(p => p.type === 'image')}><QrCodeIcon className="h-5 w-5 text-primary" /> Extract Serial Number</AiActionButton>
                           <AiActionButton onClick={() => onCalculateProofStrength(item)}><CubeIcon className="h-5 w-5 text-primary" /> Calculate Proof Strength</AiActionButton>
                        </div>
                    </Accordion>
                    <Accordion title="Claim Actions" icon={<PaperAirplaneIcon />} defaultOpen={true}>
                       <div className="space-y-4">
                            <div>
                                <button onClick={() => onDraftClaim(item)} disabled={item.status === 'claimed'} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    {item.status === 'claimed' ? 'Item Claimed' : 'Draft Claim Narrative'}
                                </button>
                                {item.status === 'claimed' && <p className="text-xs text-center mt-1 text-medium">This item has been included in a draft claim.</p>}
                            </div>
                            <div>
                                <button onClick={() => onGenerateSubmissionPackage(item)} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition">
                                    Generate Submission Package
                                </button>
                                <p className="text-xs text-center mt-1 text-medium">Export a .zip file with a formal letter and all proofs for this item.</p>
                            </div>
                        </div>
                    </Accordion>
                </div>
            </div>
        </div>
    );
};
// Fix: Add default export to make the component importable.
export default ItemDetailView;