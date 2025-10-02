import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, ParsedPolicy, ClaimStatus, Proof, ProofSuggestion, ItemCondition } from '../types';
import { CATEGORIES } from '../constants';
import { TrashIcon, XIcon, TagIcon, GlobeIcon, SparklesIcon, ShieldCheckIcon, DocumentTextIcon, CheckCircleIcon, PencilIcon, PaperAirplaneIcon, XCircleIcon, DocumentMagnifyingGlassIcon, TrophyIcon, PlusIcon, ChartPieIcon, UploadIcon, SpinnerIcon, LinkIcon, CalculatorIcon, ChevronLeftIcon, ChevronRightIcon, ShieldExclamationIcon } from './icons';
import { CurrencyInput } from './CurrencyInput';
import { ScoreIndicator } from './ScoreIndicator';

interface ItemDetailViewProps {
  item: InventoryItem;
  policy: ParsedPolicy | null;
  unlinkedProofs: Proof[];
  onClose: () => void;
  onUpdate: (updatedItem: InventoryItem) => void;
  onDelete: (itemId: string) => void;
  onFindMarketPrice: (item: InventoryItem) => void;
  onEnrichData: (item: InventoryItem) => void;
  onIdentifyApparel: (itemId: string, proofId: string) => void;
  onSelectCoverage: (itemId: string) => void;
  onDraftClaim: (itemId: string) => void;
  onFileClaim: (claimId: string) => void;
  onFindHighestRCV: (item: InventoryItem) => void;
  onExtractSerialNumber: (itemId: string, proofId: string) => void;
  onCalculateProofStrength: (itemId: string) => void;
  onCalculateACV: (itemId: string) => void;
  onAddProofs: (itemId: string, files: FileList) => void;
  isUploadingProof: boolean;
  onFuzzyMatch: (itemId: string) => void;
  onApproveProofSuggestion: (itemId: string, suggestion: ProofSuggestion) => void;
  onRejectProofSuggestion: (itemId: string, suggestion: ProofSuggestion) => void;
}

const ClaimStatusIndicator: React.FC<{ status: ClaimStatus }> = ({ status }) => {
    const config = {
        draft: { Icon: PencilIcon, text: 'Draft', color: 'text-medium' },
        system_ready_to_file: { Icon: DocumentTextIcon, text: 'Ready to File', color: 'text-purple-600' },
        submitted: { Icon: PaperAirplaneIcon, text: 'Submitted', color: 'text-blue-600' },
        approved: { Icon: CheckCircleIcon, text: 'Approved', color: 'text-success' },
        rejected: { Icon: XCircleIcon, text: 'Rejected', color: 'text-danger' },
    };
    const { Icon, text, color } = config[status];
    return (
        <span className={`font-bold capitalize flex items-center space-x-2 ${color}`}>
            <Icon className="h-4 w-4" />
            <span>{text}</span>
        </span>
    );
};


const ItemDetailView: React.FC<ItemDetailViewProps> = ({ 
    item, 
    policy,
    unlinkedProofs,
    onClose, 
    onUpdate, 
    onDelete,
    onFindMarketPrice,
    onEnrichData,
    onIdentifyApparel,
    onSelectCoverage,
    onDraftClaim,
    onFileClaim,
    onFindHighestRCV,
    onExtractSerialNumber,
    onCalculateProofStrength,
    onCalculateACV,
    onAddProofs,
    isUploadingProof,
    onFuzzyMatch,
    onApproveProofSuggestion,
    onRejectProofSuggestion,
}) => {
  const [editedItem, setEditedItem] = useState(item);
  const [currentProofIndex, setCurrentProofIndex] = useState(0);
  const [isValuationLoading, setIsValuationLoading] = useState(false);
  const [isEnrichLoading, setIsEnrichLoading] = useState(false);
  const [isIdentifyLoading, setIsIdentifyLoading] = useState(false);
  const [isDraftingClaim, setIsDraftingClaim] = useState(false);
  const [isFindingHighestRcv, setIsFindingHighestRcv] = useState(false);
  const [isExtractingSerial, setIsExtractingSerial] = useState(false);
  const [isCalculatingProof, setIsCalculatingProof] = useState(false);
  const [isCalculatingACV, setIsCalculatingACV] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isFuzzyMatching, setIsFuzzyMatching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemClaims = item.claims || [];
  const currentProof = editedItem.linkedProofs && editedItem.linkedProofs.length > 0 ? editedItem.linkedProofs[currentProofIndex] : null;


  useEffect(() => {
    setEditedItem(item);
    setCurrentProofIndex(0);
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedItem(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleValueChange = (newValue: number) => {
    setEditedItem(prev => ({
        ...prev,
        originalCost: newValue,
    }));
  };

  const handleSave = () => {
    onUpdate({ ...editedItem, status: 'active' });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this item?')) {
        onDelete(item.id);
    }
  };

  const handleFindValue = async () => {
    setIsValuationLoading(true);
    await onFindMarketPrice(editedItem);
    setIsValuationLoading(false);
  };
  
  const handleEnrich = async () => {
    setIsEnrichLoading(true);
    await onEnrichData(editedItem);
    setIsEnrichLoading(false);
  };

  const handleIdentify = async () => {
    if (!currentProof) return;
    setIsIdentifyLoading(true);
    await onIdentifyApparel(item.id, currentProof.id);
    setIsIdentifyLoading(false);
  };

  const handleDraftClaim = async () => {
      setIsDraftingClaim(true);
      await onDraftClaim(item.id);
      setIsDraftingClaim(false);
  };

  const handleFindHighestValue = async () => {
    setIsFindingHighestRcv(true);
    await onFindHighestRCV(editedItem);
    setIsFindingHighestRcv(false);
  };

  const handleExtractSerial = async () => {
    if (!currentProof) return;
    setIsExtractingSerial(true);
    await onExtractSerialNumber(item.id, currentProof.id);
    setIsExtractingSerial(false);
  };

  const handleCalculateProof = async () => {
      setIsCalculatingProof(true);
      await onCalculateProofStrength(item.id);
      setIsCalculatingProof(false);
  };

  const handleCalculateACV = async () => {
      setIsCalculatingACV(true);
      await onCalculateACV(item.id);
      setIsCalculatingACV(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddProofs(item.id, e.dataTransfer.files);
    }
  };

  const handleUploadClick = () => {
    if (!isUploadingProof) {
        fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onAddProofs(item.id, event.target.files);
    }
  };
  
  const handleFuzzyMatch = async () => {
    setIsFuzzyMatching(true);
    await onFuzzyMatch(item.id);
    setIsFuzzyMatching(false);
  };
  
  const getCoverageReason = (): string => {
    if (!item.recommendedCoverage) return '';
    if (item.recommendedCoverage.type === 'sub-limit') {
        return `This '${item.recommendedCoverage.category}' sub-limit was applied because it specifically matches the item's category, offering more precise coverage.`;
    }
    return `This item falls under your main '${item.recommendedCoverage.category}' coverage as no specific sub-limit applies to its category.`;
  };

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full md:w-1/2 bg-slate-100 flex-shrink-0 flex flex-col">
            <div className="flex-grow relative flex items-center justify-center">
                 {currentProof ? (
                    currentProof.type === 'image' ? (
                        <img src={currentProof.dataUrl} alt={currentProof.fileName} className="w-full h-full object-contain"/>
                    ) : (
                        <DocumentTextIcon className="h-48 w-48 text-slate-300" />
                    )
                ) : (
                    <div className="text-center text-slate-400 p-8">
                        <DocumentTextIcon className="h-48 w-48 mx-auto" />
                        <p className="mt-4 font-semibold">No Proofs Attached</p>
                        <p className="text-sm">Upload a photo or document to get started.</p>
                    </div>
                )}
               <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-slate-500 bg-white/70 backdrop-blur-sm rounded-full p-1 hover:text-dark hover:bg-white transition shadow-md">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>

            {editedItem.linkedProofs.length > 0 && (
                <div className="flex-shrink-0 p-2 bg-slate-200/50">
                    <div className="flex items-center space-x-2 overflow-x-auto">
                        {editedItem.linkedProofs.map((proof, index) => (
                            <button
                                key={proof.id}
                                onClick={() => setCurrentProofIndex(index)}
                                className={`flex-shrink-0 h-16 w-16 rounded-md overflow-hidden ring-2 transition ${
                                    index === currentProofIndex ? 'ring-primary' : 'ring-transparent hover:ring-primary/50'
                                }`}
                            >
                                {proof.type === 'image' ? (
                                    <img src={proof.dataUrl} alt={proof.fileName} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full bg-white flex items-center justify-center">
                                        <DocumentTextIcon className="h-8 w-8 text-slate-400" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
        <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto">
            <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-dark mb-4 font-heading">Item Details</h2>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="itemName" className="block text-sm font-medium text-medium">Item Name</label>
                    <input
                        type="text" name="itemName" id="itemName" value={editedItem.itemName} onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="brand" className="block text-sm font-medium text-medium">Brand</label>
                        <input
                            type="text" name="brand" id="brand" value={editedItem.brand || ''} onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="model" className="block text-sm font-medium text-medium">Model</label>
                        <input
                            type="text" name="model" id="model" value={editedItem.model || ''} onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                </div>
                {item.itemCategory === 'Electronics' && (
                    <div>
                        <label htmlFor="serialNumber" className="block text-sm font-medium text-medium">Serial Number</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="text" name="serialNumber" id="serialNumber" value={editedItem.serialNumber || ''} onChange={handleChange}
                                placeholder="Not extracted yet"
                                className="block w-full flex-1 rounded-none rounded-l-md border border-slate-300 px-3 py-2 bg-white placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                            <button 
                                type="button"
                                onClick={handleExtractSerial} 
                                disabled={isExtractingSerial || currentProof?.type !== 'image'} 
                                className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-medium hover:bg-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <DocumentMagnifyingGlassIcon className="h-5 w-5 text-medium"/>
                                <span>{isExtractingSerial ? 'Extracting...' : 'Extract'}</span>
                            </button>
                        </div>
                    </div>
                )}
                <div>
                    <label htmlFor="itemDescription" className="block text-sm font-medium text-medium">Description</label>
                    <textarea
                        name="itemDescription" id="itemDescription" rows={4} value={editedItem.itemDescription} onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="itemCategory" className="block text-sm font-medium text-medium">Category</label>
                        <select name="itemCategory" id="itemCategory" value={editedItem.itemCategory} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" >
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="originalCost" className="block text-sm font-medium text-medium">Original Cost</label>
                        <CurrencyInput
                            id="originalCost"
                            name="originalCost"
                            value={editedItem.originalCost}
                            onChange={handleValueChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="0.00"
                        />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="purchaseDate" className="block text-sm font-medium text-medium">Purchase Date</label>
                        <input
                            type="date" name="purchaseDate" id="purchaseDate" value={editedItem.purchaseDate || ''} onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="condition" className="block text-sm font-medium text-medium">Condition</label>
                         <select name="condition" id="condition" value={editedItem.condition || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" >
                            <option value="">Select Condition</option>
                            {(['New', 'Like New', 'Good', 'Fair', 'Damaged'] as ItemCondition[]).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="lastKnownLocation" className="block text-sm font-medium text-medium">Last Known Location</label>
                    <input
                        type="text" name="lastKnownLocation" id="lastKnownLocation" value={editedItem.lastKnownLocation || ''} onChange={handleChange}
                        placeholder="e.g., Living Room, Office"
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
            </div>

            <div className="mt-6 border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-dark font-heading">Linked Proofs</h3>
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleUploadClick}
                    className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDraggingOver ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/70'
                    } ${isUploadingProof ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                    <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isUploadingProof}
                    />
                    {isUploadingProof ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                        <SpinnerIcon className="h-8 w-8 text-primary" />
                        <p className="text-sm text-medium font-medium">Uploading...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center space-y-2">
                        <UploadIcon className="h-8 w-8 text-slate-400" />
                        <p className="text-sm text-medium font-medium">
                            Drag & Drop to add proofs or{' '}
                            <span className="text-primary font-semibold">Browse</span>
                        </p>
                        <p className="text-xs text-slate-500">Supports Images and PDFs</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-dark font-heading">AI Intelligence Modules</h3>
                
                <div className="bg-slate-50 p-3 rounded-lg border">
                    <h4 className="font-semibold text-sm mb-2 font-heading">Proof Strength Score</h4>
                     {item.proofStrengthScore !== undefined ? (
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                                <ScoreIndicator score={item.proofStrengthScore} size="lg" />
                            </div>
                            <div className="text-sm">
                                <p className="text-medium">{item.proofStrengthFeedback}</p>
                                <button onClick={handleCalculateProof} disabled={isCalculatingProof} className="text-xs text-primary hover:underline mt-1">
                                    {isCalculatingProof ? 'Recalculating...' : 'Recalculate'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={handleCalculateProof} disabled={isCalculatingProof} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition disabled:opacity-50">
                            <ChartPieIcon className="h-4 w-4 text-medium"/>
                            <span>{isCalculatingProof ? 'Analyzing...' : 'Analyze Proof Strength'}</span>
                        </button>
                    )}
                </div>
                
                <div className="bg-slate-50 p-3 rounded-lg border">
                    <h4 className="font-semibold text-sm mb-2 font-heading">Depreciation & ACV Calculator</h4>
                    {item.acvDepreciation ? (
                        <div>
                            <div className="flex justify-between items-center p-2 bg-primary/10 border border-primary/20 rounded-md">
                                <span className="font-semibold text-primary">Est. ACV: ${item.acvDepreciation.acv.toFixed(2)}</span>
                            </div>
                            <ul className="mt-2 text-xs text-medium space-y-1 pl-4 list-disc">
                                {item.acvDepreciation.reasoning.map((reason, i) => <li key={i}>{reason}</li>)}
                            </ul>
                            <button onClick={handleCalculateACV} disabled={isCalculatingACV || !editedItem.purchaseDate} className="mt-2 text-xs text-primary hover:underline">
                                {isCalculatingACV ? 'Recalculating...' : 'Recalculate'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-medium mb-3">
                                Calculates the item's Actual Cash Value based on its age and category. Requires a purchase date and an RCV/original cost.
                            </p>
                            <button onClick={handleCalculateACV} disabled={isCalculatingACV || !editedItem.purchaseDate || ((editedItem.replacementCostValueRCV || editedItem.originalCost) <= 0)} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                <CalculatorIcon className="h-4 w-4 text-medium"/>
                                <span>{isCalculatingACV ? 'Calculating...' : 'Calculate Depreciated Value (ACV)'}</span>
                            </button>
                        </>
                    )}
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border">
                    <h4 className="font-semibold text-sm mb-2 font-heading">AI Proof Finder</h4>
                    <p className="text-xs text-medium mb-3">
                        Automatically scan unlinked documents (e.g., from synced accounts) to find matching proofs for this item.
                    </p>
                    <button onClick={handleFuzzyMatch} disabled={isFuzzyMatching} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition disabled:opacity-50">
                        <LinkIcon className="h-4 w-4 text-medium"/>
                        <span>{isFuzzyMatching ? 'Searching...' : 'Find Matching Proofs'}</span>
                    </button>

                    {item.suggestedProofs && item.suggestedProofs.length > 0 && (
                        <div className="mt-4 border-t pt-3">
                            <h5 className="text-xs font-bold text-medium uppercase mb-2">Suggestions</h5>
                            <ul className="space-y-2">
                                {item.suggestedProofs.map(suggestion => {
                                    const proof = unlinkedProofs.find(p => p.id === suggestion.proofId);
                                    if (!proof) return null;
                                    return (
                                        <li key={suggestion.proofId} className="bg-white p-2 rounded border border-slate-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <DocumentTextIcon className="h-5 w-5 text-slate-400 flex-shrink-0"/>
                                                    <span className="text-sm font-medium text-dark truncate" title={proof.fileName}>{proof.fileName}</span>
                                                </div>
                                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">{suggestion.confidence}%</span>
                                            </div>
                                            <p className="text-xs text-medium italic mt-1 pl-1">"{suggestion.reason}"</p>
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => onRejectProofSuggestion(item.id, suggestion)} className="px-2 py-1 text-xs font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50">
                                                    Reject
                                                </button>
                                                <button onClick={() => onApproveProofSuggestion(item.id, suggestion)} className="px-2 py-1 text-xs font-semibold bg-success text-white rounded-md shadow-sm hover:opacity-90">
                                                    Approve
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                {['Clothing', 'Jewelry'].includes(item.itemCategory) && currentProof?.type === 'image' && (
                    <div className="bg-slate-50 p-3 rounded-lg border">
                        <h4 className="font-semibold text-sm font-heading">Designer Identification</h4>
                        <button onClick={handleIdentify} disabled={isIdentifyLoading} className="mt-2 w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition disabled:opacity-50">
                            <SparklesIcon className="h-4 w-4 text-purple-500"/>
                            <span>{isIdentifyLoading ? 'Identifying...' : 'Identify via Visual Search'}</span>
                        </button>
                    </div>
                )}
                
                <div className="bg-slate-50 p-3 rounded-lg border space-y-3">
                    <h4 className="font-semibold text-sm font-heading">AI-Powered Valuation</h4>
                    <div>
                        {item.replacementCostValueRCV ? (
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between"><span>Est. Replacement Cost (RCV):</span> <span className="font-bold">${item.replacementCostValueRCV.toFixed(2)}</span></div>
                                {(item.aiNotes || []).filter(n => n.includes("ACV")).map((note, i) => <p key={i} className="text-xs text-medium">{note}</p>)}
                            </div>
                        ) : (
                            <button onClick={handleFindValue} disabled={isValuationLoading} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition disabled:opacity-50">
                                <TagIcon className="h-4 w-4 text-success"/>
                                <span>{isValuationLoading ? 'Searching...' : 'Find Market Value'}</span>
                            </button>
                        )}
                    </div>
                    <div className="border-t pt-3">
                        <button onClick={handleFindHighestValue} disabled={isFindingHighestRcv} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition disabled:opacity-50">
                            <TrophyIcon className="h-4 w-4 text-secondary"/>
                            <span>{isFindingHighestRcv ? 'Searching...' : 'Find Highest Retail Price'}</span>
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border">
                    <h4 className="font-semibold text-sm font-heading">AI Web Intelligence</h4>
                     <button onClick={handleEnrich} disabled={isEnrichLoading} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition disabled:opacity-50">
                        <GlobeIcon className="h-4 w-4 text-blue-500"/>
                        <span>{isEnrichLoading ? 'Enriching...' : 'Enrich Data from Web'}</span>
                    </button>
                    {item.aiNotes && item.aiNotes.length > 0 && (
                        <ul className="mt-4 text-xs text-medium space-y-1 border-t pt-3">
                            {item.aiNotes.map((note, i) => (
                                <li key={i}>{note}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            
            {item.status === 'active' && (
                <div className="mt-6 border-t pt-6">
                    <h3 className="text-lg font-semibold text-dark font-heading">Claim Actions</h3>
                    <div className="mt-2 bg-slate-50 p-3 rounded-lg border space-y-4">
                        {!policy || !policy.isVerified ? (
                            <div className="text-center text-sm text-medium p-4">
                                <ShieldExclamationIcon className="h-8 w-8 mx-auto text-slate-400 mb-2"/>
                                Upload and verify your insurance policy on the main dashboard to enable claim actions.
                            </div>
                        ) : !item.recommendedCoverage ? (
                             <button onClick={() => onSelectCoverage(item.id)} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                                <ShieldCheckIcon className="h-4 w-4 text-primary" />
                                <span>Find Best Coverage</span>
                            </button>
                        ) : (
                             <>
                                <div>
                                    <h4 className="text-sm font-semibold text-medium mb-2 font-heading">Applicable Coverage</h4>
                                    <div className="bg-white p-3 rounded-md border border-slate-200">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-dark">{item.recommendedCoverage.category}</p>
                                                <p className="text-sm text-medium capitalize">{item.recommendedCoverage.type.replace('-', ' ')} Limit</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-dark">${item.recommendedCoverage.limit.toLocaleString()}</p>
                                                <p className="text-sm text-medium">Deductible: ${policy.deductible}</p>
                                            </div>
                                        </div>
                                         <p className="text-xs text-medium mt-2 italic border-t pt-2">{getCoverageReason()}</p>
                                    </div>
                                </div>
                                <button onClick={handleDraftClaim} disabled={isDraftingClaim} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50">
                                    <DocumentTextIcon className="h-4 w-4" />
                                    <span>{isDraftingClaim ? 'Drafting...' : 'Draft a New Claim'}</span>
                                </button>
                            </>
                        )}
                        
                        {itemClaims.length > 0 && (
                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-sm text-dark font-heading">Claim History</h4>
                                <ul className="mt-2 space-y-3">
                                    {itemClaims.map(claim => (
                                        <li key={claim.id} className="text-sm">
                                            <div className="flex justify-between items-center">
                                                <ClaimStatusIndicator status={claim.status} />
                                                <span className="text-xs text-medium">{new Date(claim.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs italic text-medium bg-white p-2 rounded border mt-1">"{claim.failureDescription}"</p>
                                            {claim.status === 'system_ready_to_file' && (
                                                <button onClick={() => onFileClaim(claim.id)} className="mt-2 text-xs w-full flex items-center justify-center space-x-2 px-3 py-1.5 font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                                                    <PaperAirplaneIcon className="h-3.5 w-3.5" />
                                                    <span>File This Claim</span>
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
             <div className="mt-6 border-t pt-6 space-y-2 text-xs text-slate-400">
                {item.createdAt && <p>Created: {new Date(item.createdAt).toLocaleString()} by {item.createdBy}</p>}
                {item.lastModifiedAt && <p>Last Modified: {new Date(item.lastModifiedAt).toLocaleString()}</p>}
             </div>


            <div className="mt-8 flex justify-between items-center">
                 <button onClick={handleDelete} className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-danger/10 text-danger border border-danger/20 rounded-md shadow-sm hover:bg-danger/20 transition" >
                    <TrashIcon className="h-4 w-4"/>
                    <span>Delete</span>
                </button>
                <div className="flex space-x-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition" >
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition" >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailView;
