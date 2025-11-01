// Fix: Removed invalid file marker that was causing a parsing error.
// Fix: Imported useState, useCallback, and useEffect from React to resolve multiple hook-related errors.
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header.tsx';
import InventoryDashboard from './components/InventoryDashboard.tsx';
import ItemDetailView from './components/ItemDetailView.tsx';
import ActivityLogView from './components/ActivityLogView.tsx';
import ClaimStrategyGuide from './components/ClaimStrategyGuide.tsx';
import UndoToast from './components/UndoToast.tsx';
import SaveModal from './components/SaveModal.tsx';
import RoomScanView from './components/RoomScanView.tsx';
import PolicyReviewModal from './components/PolicyReviewModal.tsx';
import GeminiAssistant from './components/GeminiAssistant.tsx';
import ImageEditorModal from './components/ImageEditorModal.tsx';
import ImageGeneratorModal from './components/ImageGeneratorModal.tsx';
import AudioRecorderModal from './components/AudioRecorderModal.tsx';
import BulkImageEditModal from './components/BulkImageEditModal.tsx';
import BulkEditModal from './components/BulkEditModal.tsx';
import ImageAnalysisModal from './components/ImageAnalysisModal.tsx';
import ProcessingPreview from './components/ProcessingPreview.tsx';
import ImageZoomModal from './components/ImageZoomModal.tsx';


import * as geminiService from './services/geminiService.ts';
import { InventoryItem, AccountHolder, ParsedPolicy, Proof, AppView, ActivityLogEntry, UndoableAction, ClaimDetails, ItemStatus, ProofSuggestion, UploadProgress, PipelineStage, PipelineProgress, PolicyAnalysisReport, ProcessingInference } from './types.ts';
import { fileToDataUrl, urlToDataUrl, sanitizeFileName, dataUrlToBlob, exportToCSV, exportToZip } from './utils/fileUtils.ts';
import { CATEGORIES } from './constants.ts';

// New default policy based on user-provided document
const DEFAULT_POLICY: ParsedPolicy = {
  id: 'policy-default-8462410',
  policyName: "Renter's Policy (Default)",
  isActive: true,
  isVerified: true,
  provider: "American Bankers Insurance Company",
  policyNumber: "RI8462410",
  policyHolder: "Maleidy Bello Landin & Roydel Marquez Bello",
  effectiveDate: "2024-08-26",
  expirationDate: "2025-08-26",
  deductible: 100,
  lossSettlementMethod: 'RCV',
  policyType: 'Renters Insurance',
  coverageD_limit: 19000,
  coverage: [
    { category: "Personal Property", limit: 95000, type: "main" },
    { category: "Identity Fraud", limit: 15000, type: "sub-limit" },
    { category: "Drain/Sewer Backup", limit: 2500, type: "sub-limit" },
    { category: "Flood", limit: 2500, type: "sub-limit" },
  ],
  exclusions: ["Flood Damage (standard policy, specific flood coverage may apply)", "Earthquake", "Intentional Acts"],
  confidenceScore: 100,
};

const DEFAULT_ACCOUNT_HOLDER: AccountHolder = {
  id: 'ah-victim-roy del',
  name: 'Roydel Marquez Bello',
  address: '421 W 56 ST, APT 4A, NEW YORK NY 10019'
};


const INITIAL_INVENTORY: InventoryItem[] = [
    { id: `item-import-${Date.now()}-1`, status: 'claimed', itemName: 'Apple Mac #1', itemDescription: 'Stolen laptop, as per police report.', itemCategory: 'Electronics', originalCost: 1250, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-2`, status: 'claimed', itemName: 'Apple Mac #2', itemDescription: 'Stolen laptop, as per police report.', itemCategory: 'Electronics', originalCost: 1250, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-3`, status: 'claimed', itemName: 'Gold Chain', itemDescription: 'Stolen jewelry, as per police report.', itemCategory: 'Jewelry', originalCost: 8000, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-4`, status: 'claimed', itemName: 'Bracelet', itemDescription: 'Stolen jewelry, as per police report.', itemCategory: 'Jewelry', originalCost: 2000, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-5`, status: 'claimed', itemName: 'iPhone #1', itemDescription: 'Stolen phone, as per police report.', itemCategory: 'Electronics', originalCost: 600, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-6`, status: 'claimed', itemName: 'iPhone #2', itemDescription: 'Stolen phone, as per police report.', itemCategory: 'Electronics', originalCost: 600, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-7`, status: 'claimed', itemName: 'iPhone #3', itemDescription: 'Stolen phone, as per police report.', itemCategory: 'Electronics', originalCost: 600, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-8`, status: 'claimed', itemName: 'iPad #1', itemDescription: 'Stolen tablet, as per police report.', itemCategory: 'Electronics', originalCost: 25, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-9`, status: 'claimed', itemName: 'iPad #2', itemDescription: 'Stolen tablet, as per police report.', itemCategory: 'Electronics', originalCost: 25, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-10`, status: 'claimed', itemName: 'Oculus VR Headset #1', itemDescription: 'Stolen VR headset, as per police report.', itemCategory: 'Electronics', originalCost: 250, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-11`, status: 'claimed', itemName: 'Oculus VR Headset #2', itemDescription: 'Stolen VR headset, as per police report.', itemCategory: 'Electronics', originalCost: 250, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-12`, status: 'claimed', itemName: 'Samsung TV', itemDescription: 'Stolen television, as per police report.', itemCategory: 'Electronics', originalCost: 100, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-13`, status: 'claimed', itemName: 'Painting #1', itemDescription: 'Stolen artwork, as per police report.', itemCategory: 'Art', originalCost: 4000, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-14`, status: 'claimed', itemName: 'Painting #2', itemDescription: 'Stolen artwork, as per police report.', itemCategory: 'Art', originalCost: 4000, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-15`, status: 'claimed', itemName: 'Apple HomePod #1', itemDescription: 'Stolen smart speaker, as per police report.', itemCategory: 'Electronics', originalCost: 0, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-16`, status: 'claimed', itemName: 'Apple HomePod #2', itemDescription: 'Stolen smart speaker, as per police report.', itemCategory: 'Electronics', originalCost: 0, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-17`, status: 'claimed', itemName: 'Smart Frame', itemDescription: 'Stolen smart frame, as per police report.', itemCategory: 'Electronics', originalCost: 50, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-18`, status: 'claimed', itemName: 'HP Printer #1', itemDescription: 'Stolen printer, as per police report.', itemCategory: 'Electronics', originalCost: 140, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-19`, status: 'claimed', itemName: 'HP Printer #2', itemDescription: 'Stolen printer, as per police report.', itemCategory: 'Electronics', originalCost: 140, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-20`, status: 'claimed', itemName: 'Luis Vuitton Accessory #1', itemDescription: 'Stolen designer accessory, as per police report.', itemCategory: 'Clothing', originalCost: 25, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-21`, status: 'claimed', itemName: 'Luis Vuitton Accessory #2', itemDescription: 'Stolen designer accessory, as per police report.', itemCategory: 'Clothing', originalCost: 25, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-22`, status: 'claimed', itemName: 'Sonos Sound System', itemDescription: 'Stolen sound system, as per police report.', itemCategory: 'Electronics', originalCost: 2000, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-23`, status: 'claimed', itemName: 'NAS Computer System', itemDescription: 'Stolen NAS, as per police report.', itemCategory: 'Electronics', originalCost: 50, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
    { id: `item-import-${Date.now()}-24`, status: 'claimed', itemName: 'Home Server', itemDescription: 'Stolen server, as per police report.', itemCategory: 'Electronics', originalCost: 50, linkedProofs: [], createdAt: '2024-11-28', createdBy: 'System Import' },
];
const INITIAL_UNLINKED_PROOFS: Proof[] = []; // Start with no unlinked proofs

/**
 * Generates specific, high-quality correction strings for AI learning by comparing two policy objects.
 * @param original The original policy object (from AI or previous state).
 * @param updated The new policy object with user corrections.
 * @returns An array of human-readable correction strings.
 */
const getPolicyCorrections = (
    original: Partial<ParsedPolicy>, 
    updated: Partial<ParsedPolicy>
): string[] => {
    const corrections: string[] = [];
    const keysToCompare = Object.keys(updated) as (keyof ParsedPolicy)[];

    for (const key of keysToCompare) {
        if (key === 'coverage') continue; // Handle coverage separately

        const originalValue = original[key];
        const updatedValue = updated[key];

        if (JSON.stringify(originalValue) !== JSON.stringify(updatedValue)) {
            if (originalValue === undefined) {
                corrections.push(`User set field '${key}' to '${JSON.stringify(updatedValue)}'.`);
            } else {
                corrections.push(`User corrected field '${key}' from '${JSON.stringify(originalValue)}' to '${JSON.stringify(updatedValue)}'.`);
            }
        }
    }

    // Detailed comparison for the 'coverage' array
    const originalCoverage = original.coverage || [];
    const updatedCoverage = updated.coverage || [];

    const originalMain = originalCoverage.find(c => c.type === 'main');
    const updatedMain = updatedCoverage.find(c => c.type === 'main');

    if (originalMain?.limit !== updatedMain?.limit) {
         corrections.push(`User corrected main coverage limit from '${originalMain?.limit}' to '${updatedMain?.limit}'.`);
    }

    const originalSubLimits = originalCoverage.filter(c => c.type === 'sub-limit');
    // Fix: Changed .find() to .filter() to correctly iterate over all sub-limits.
    const updatedSubLimits = updatedCoverage.filter(c => c.type === 'sub-limit');

    updatedSubLimits.forEach(updatedSub => {
        const originalSub = originalSubLimits.find(os => os.category === updatedSub.category);
        if (originalSub && originalSub.limit !== updatedSub.limit) {
            corrections.push(`User corrected sub-limit '${updatedSub.category}' from '${originalSub.limit}' to '${updatedSub.limit}'.`);
        } else if (!originalSub) {
            corrections.push(`User added new sub-limit '${updatedSub.category}' with limit '${updatedSub.limit}'.`);
        }
    });

    return corrections;
};


const App: React.FC = () => {
    // Core State
    const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
    const [policies, setPolicies] = useState<ParsedPolicy[]>([DEFAULT_POLICY]);
    const [unlinkedProofs, setUnlinkedProofs] = useState<Proof[]>(INITIAL_UNLINKED_PROOFS);
    const [accountHolder, setAccountHolder] = useState<AccountHolder>(DEFAULT_ACCOUNT_HOLDER);
    const [claimDetails, setClaimDetails] = useState<ClaimDetails>({
        name: "Claim for Burglary at 421 W 56 ST",
        dateOfLoss: "2024-11-28",
        incidentType: "Burglary",
        location: "421 W 56 ST, APT 4A, NEW YORK NY 10019",
        policeReport: "NYPD: 2024-018-012043",
        propertyDamageDetails: "Victim states at TPO he had packed boxes in his apartment since he is in the process of moving. Victim left his apartment on Wednesday 11/27/24 at 0800 hours and ensured he locked his door before leaving. Victim returned to apartment at 7am 11/28/24 to find his door partially opened and upon entering apartment noticed his packed boxes were missing and his doorknob was very loose and a window he had closed before leaving had been left halfway open.",
        claimDateRange: {
            startDate: "2024-11-27",
            endDate: "2024-11-28",
        }
    });
    
    // Derived State for Active Policy
    const activePolicy = useMemo(() => policies.find(p => p.isActive), [policies]);
    const policyHolders = useMemo(() => activePolicy?.policyHolder.split(/ & | and /i).map(s => s.trim()).filter(Boolean) || [], [activePolicy]);

    // UI State
    const [currentView, setCurrentView] = useState<AppView>('dashboard');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isParsingPolicy, setIsParsingPolicy] = useState(false);
    const [showLog, setShowLog] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [undoAction, setUndoAction] = useState<UndoableAction | null>(null);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const [showPolicyReviewModal, setShowPolicyReviewModal] = useState(false);
    const [policyAnalysisReport, setPolicyAnalysisReport] = useState<PolicyAnalysisReport | null>(null);
    const [showAssistant, setShowAssistant] = useState(false);
    const [editingProof, setEditingProof] = useState<Proof | null>(null);
    const [generatingForItem, setGeneratingForItem] = useState<InventoryItem | null>(null);
    const [recordingForItem, setRecordingForItem] = useState<InventoryItem | null>(null);
    const [showBulkImageEditModal, setShowBulkImageEditModal] = useState(false);
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    // Fix: Declared missing state variable for bulk image editing.
    const [itemsToBulkEdit, setItemsToBulkEdit] = useState<InventoryItem[]>([]);
    const [showImageAnalysisModal, setShowImageAnalysisModal] = useState(false);
    const [proofsToProcess, setProofsToProcess] = useState<Proof[]>([]);
    const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);


    // Background Processing State
    const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
    const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress>({ current: 0, total: 0, fileName: '' });
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('claimed');
    const [coverageFilter, setCoverageFilter] = useState('all');
    const [itemCategories, setItemCategories] = useState<string[]>(CATEGORIES);
    
    // Activity Log State
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
    
    // Selection State
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const imageAnalysisInputRef = useRef<HTMLInputElement>(null);

    const logActivity = useCallback((action: string, details: string, app: 'VeritasVault' | 'Gemini' = 'VeritasVault') => {
        const newEntry: ActivityLogEntry = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            app,
            action,
            details,
        };
        setActivityLog(prev => [...prev, newEntry]);
    }, []);

     const updateItem = useCallback((updatedItem: InventoryItem) => {
        setInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        logActivity('ITEM_UPDATED', `Updated item: ${updatedItem.itemName}`);
    }, [logActivity]);
    
    const handleUpdateClaimDetails = useCallback((updatedDetails: Partial<ClaimDetails>) => {
        setClaimDetails(prev => ({ ...prev, ...updatedDetails }));
        logActivity('CLAIM_DETAILS_UPDATED', `Claim details were updated.`);
    }, [logActivity]);

    const handleFindProductImage = useCallback(async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Searching for web image for ${item.itemName}`, 'Gemini');
        try {
            const imageResult = await geminiService.findProductImageFromWeb(item);
            if (imageResult && imageResult.imageUrl) {
                const dataUrl = await urlToDataUrl(imageResult.imageUrl);
                const blob = dataUrlToBlob(dataUrl);
                
                const cleanItemName = sanitizeFileName(`${item.brand || ''}_${item.model || item.itemName}`);
                
                const newProof: Proof = {
                    id: `proof-web-${Date.now()}`,
                    type: 'image',
                    fileName: `web_image_${cleanItemName}.jpg`,
                    dataUrl: dataUrl,
                    mimeType: blob.type || 'image/jpeg',
                    createdBy: 'AI',
                };

                const newSuggestion: ProofSuggestion = {
                    proofId: newProof.id,
                    confidence: 90, // High confidence as it was a targeted search
                    reason: `Found on web at ${new URL(imageResult.source).hostname}`,
                    sourceUrl: imageResult.source,
                };
                
                setUnlinkedProofs(prev => [...prev, newProof]);
                setInventory(prev => prev.map(i => {
                    if (i.id === item.id) {
                        const existingSuggestion = i.suggestedProofs?.find(s => s.proofId === newProof.id);
                        if (existingSuggestion) return i;
                        return { ...i, suggestedProofs: [...(i.suggestedProofs || []), newSuggestion] };
                    }
                    return i;
                }));

                logActivity('AI_ACTION_SUCCESS', `Found and suggested a web image for ${item.itemName}`, 'Gemini');
            } else {
                 logActivity('AI_ACTION_SUCCESS', `No suitable web image found for ${item.itemName}`, 'Gemini');
            }
        } catch (error) {
            console.error('Finding product image failed:', error);
            logActivity('AI_ACTION_ERROR', `Failed to find web image for ${item.itemName}.`);
        }
    }, [logActivity]);
     
     const runAutonomousEnrichment = useCallback(async (item: InventoryItem) => {
        // --- Fuzzy Match Proofs ---
        if (unlinkedProofs.length > 0) {
            logActivity('AI_ACTION_START', `Fuzzy matching proofs for ${item.itemName}`, 'Gemini');
            try {
                const { suggestions } = await geminiService.fuzzyMatchProofs(item, unlinkedProofs);
                if (suggestions && suggestions.length > 0) {
                    const currentLinkedProofIds = new Set(item.linkedProofs.map(p => p.id));
                    const newSuggestions = suggestions.filter(s => !currentLinkedProofIds.has(s.proofId));

                    if (newSuggestions.length > 0) {
                        setInventory(prev => prev.map(i => i.id === item.id ? { ...i, suggestedProofs: [...(i.suggestedProofs || []), ...newSuggestions] } : i));
                        logActivity('AI_ACTION_SUCCESS', `Found ${newSuggestions.length} potential proof(s) for ${item.itemName}.`, 'Gemini');
                    }
                }
            } catch (error) {
                console.error('Fuzzy matching failed:', error);
                logActivity('AI_ACTION_ERROR', `Fuzzy matching failed for ${item.itemName}.`);
            }
        }
        
        // --- Find Web Image if Lacking Visual Proof ---
        const hasVisualProof = item.linkedProofs.some(p => p.type === 'image');
        if (!hasVisualProof) {
            logActivity('AI_ACTION_START', `Item lacks visual proof. Searching web for image for ${item.itemName}.`, 'VeritasVault');
            await handleFindProductImage(item);
        }

        // Mark as complete
        setInventory(prev => prev.map(i => i.id === item.id ? { ...i, status: 'active' } : i));
        logActivity('ITEM_ENRICHED', `Autonomous enrichment complete for ${item.itemName}. Item is now active.`);
    }, [unlinkedProofs, logActivity, handleFindProductImage]);
    

    const handleFileUploads = useCallback(async (files: File[]) => {
        if (!activePolicy) {
            alert("Please add and activate an insurance policy before adding evidence.");
            return;
        }

        const initialProgress: UploadProgress = {};
        files.forEach(f => initialProgress[f.name] = { loaded: 0, total: f.size });
        setUploadProgress(initialProgress);

        try {
            const readFilesPromises = files.map((file, i) => 
                fileToDataUrl(file, (event) => {
                    setUploadProgress(prev => prev ? { ...prev, [file.name]: { loaded: event.loaded, total: event.total } } : null);
                }).then(dataUrl => ({
                    id: `proof-upload-${Date.now()}-${i}`,
                    type: file.type.startsWith('image/') ? 'image' as const : 'document' as const,
                    fileName: file.name,
                    dataUrl,
                    mimeType: file.type,
                    createdBy: 'User' as const,
                }))
            );
            
            const newProofs: Proof[] = await Promise.all(readFilesPromises);
            setProofsToProcess(newProofs);
            setUploadProgress(null);
            setCurrentView('processing-preview');

        } catch (error) {
            console.error("Error reading files:", error);
            logActivity('ERROR', `Failed to read files for upload: ${error instanceof Error ? error.message : 'Unknown Error'}`);
            setUploadProgress(null); // Clear progress on error
        }
    }, [activePolicy, logActivity]);
    
    const handleFinalizeProcessing = useCallback((finalizedInferences: ProcessingInference[]) => {
        const approvedInferences = finalizedInferences.filter(inf => inf.userSelection === 'approved');
        logActivity('PROCESSING_FINALIZE', `User finalized processing, approving ${approvedInferences.length} of ${finalizedInferences.length} inferences.`);

        const newItems: InventoryItem[] = [];
        const itemsToUpdate = new Map<string, Proof[]>();
        const newUnlinkedProofs: Proof[] = [];

        for (const inference of approvedInferences) {
            const finalProof: Proof = {
                ...inference.proof,
                notes: inference.notes,
                owner: inference.owner,
            };

            switch (inference.analysisType) {
                case 'NEW_ITEM':
                    const synthItem = inference.synthesizedItem || {};
                    const newItem: InventoryItem = {
                        id: `item-final-${Date.now()}-${newItems.length}`,
                        status: 'needs-review',
                        itemName: synthItem.itemName || 'Untitled Item',
                        itemDescription: synthItem.itemDescription || 'No description provided.',
                        itemCategory: synthItem.itemCategory || 'Other',
                        originalCost: synthItem.originalCost || 0,
                        purchaseDate: synthItem.purchaseDate,
                        isGift: synthItem.isGift,
                        giftedBy: synthItem.giftedBy,
                        linkedProofs: [finalProof],
                        createdAt: new Date().toISOString(),
                        createdBy: 'AI Interactive',
                    };
                    newItems.push(newItem);
                    break;

                case 'EXISTING_ITEM_MATCH':
                    if (inference.matchedItemId) {
                        const existingProofs = itemsToUpdate.get(inference.matchedItemId) || [];
                        itemsToUpdate.set(inference.matchedItemId, [...existingProofs, finalProof]);
                    }
                    break;
                
                case 'ALE_EXPENSE':
                    if (inference.aleDetails) {
                        const aleProof: Proof = {
                            ...finalProof,
                            purpose: 'Supporting Document',
                            costType: inference.aleDetails.costType,
                            estimatedValue: inference.aleDetails.amount,
                            summary: `${inference.aleDetails.vendor} - $${inference.aleDetails.amount.toFixed(2)} on ${inference.aleDetails.date}`
                        };
                        newUnlinkedProofs.push(aleProof);
                    }
                    break;
            }
        }

        // Apply updates
        setInventory(prev => {
            let updatedInventory = [...prev, ...newItems];
            
            if (itemsToUpdate.size > 0) {
                updatedInventory = updatedInventory.map(item => {
                    const proofsToAdd = itemsToUpdate.get(item.id);
                    if (proofsToAdd) {
                        return { ...item, linkedProofs: [...item.linkedProofs, ...proofsToAdd] };
                    }
                    return item;
                });
            }
            return updatedInventory;
        });

        if (newUnlinkedProofs.length > 0) {
            setUnlinkedProofs(prev => [...prev, ...newUnlinkedProofs]);
        }

        // Clean up and go back to dashboard
        setProofsToProcess([]);
        setCurrentView('dashboard');
        setStatusFilter('needs-review');
    }, [logActivity]);


    const handleApproveItem = useCallback((itemId: string) => {
        const item = inventory.find(i => i.id === itemId);
        if (item && item.status === 'needs-review') {
            const updatedItem = { ...item, status: 'enriching' as ItemStatus };
            updateItem(updatedItem);
            logActivity('ITEM_APPROVED', `User approved item: ${item.itemName}`);
            runAutonomousEnrichment(updatedItem);
        }
    }, [inventory, updateItem, runAutonomousEnrichment, logActivity]);
    
    const handleRejectItem = useCallback((itemId: string) => {
         const item = inventory.find(i => i.id === itemId);
         if (item && (item.status === 'needs-review' || item.status === 'enriching')) {
            updateItem({ ...item, status: 'rejected' });
            logActivity('ITEM_REJECTED', `User rejected item: ${item.itemName}`);
         }
    }, [inventory, updateItem, logActivity]);

    // Derived State
    const selectedItem = useMemo(() => inventory.find(item => item.id === selectedItemId), [inventory, selectedItemId]);
    
    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const searchMatch = searchTerm.length === 0 ||
                item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const categoryMatch = categoryFilter === 'all' || item.itemCategory === categoryFilter;
            const statusMatch = statusFilter === 'all' || item.status === statusFilter;

            const coverageMatch = coverageFilter === 'all' || (
                activePolicy && activePolicy.isVerified && geminiService.selectBestCoverage(item.itemCategory, activePolicy)?.category === coverageFilter
            );
            
            return searchMatch && categoryMatch && statusMatch && coverageMatch;
        });
    }, [inventory, searchTerm, categoryFilter, statusFilter, coverageFilter, activePolicy]);

    // Selection Handlers
    const handleToggleItemSelection = useCallback((itemId: string) => {
        setSelectedItemIds(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    }, []);

    const handleSelectAllFilteredItems = useCallback(() => {
        setSelectedItemIds(filteredInventory.map(item => item.id));
    }, [filteredInventory]);

    const handleClearSelection = useCallback(() => {
        setSelectedItemIds([]);
    }, []);
    
    // Bulk Actions (now based on selection state)
    const handleApproveSelectedItems = useCallback(() => {
        const itemsToApprove = inventory.filter(i => selectedItemIds.includes(i.id) && i.status === 'needs-review');
        if (itemsToApprove.length === 0) return;

        if (!window.confirm(`Are you sure you want to approve all ${itemsToApprove.length} selected items? This will start the enrichment process.`)) {
            return;
        }

        logActivity('BULK_APPROVE', `User approved ${itemsToApprove.length} selected items.`);
        
        const approvedItemIds = new Set(itemsToApprove.map(i => i.id));
        const updatedInventory = inventory.map(item => 
            approvedItemIds.has(item.id) ? { ...item, status: 'enriching' as ItemStatus } : item
        );
        
        setInventory(updatedInventory);

        updatedInventory
            .filter(i => approvedItemIds.has(i.id))
            .forEach(item => runAutonomousEnrichment(item));
            
        setSelectedItemIds([]);
    }, [inventory, selectedItemIds, runAutonomousEnrichment, logActivity]);

    const handleRejectSelectedItems = useCallback(() => {
        const itemsToReject = inventory.filter(i => selectedItemIds.includes(i.id));
        if (itemsToReject.length === 0) return;

        if (!window.confirm(`Are you sure you want to reject all ${itemsToReject.length} selected items?`)) {
            return;
        }

        logActivity('BULK_REJECT', `User rejected ${itemsToReject.length} selected items.`);

        const rejectedItemIds = new Set(itemsToReject.map(i => i.id));
        const updatedInventory = inventory.map(item => 
            rejectedItemIds.has(item.id) ? { ...item, status: 'rejected' as ItemStatus } : item
        );
        
        setInventory(updatedInventory);
        setSelectedItemIds([]);
    }, [inventory, selectedItemIds, logActivity]);
    
    const handlePolicyUpload = useCallback(async (file: File) => {
        setIsParsingPolicy(true);
        logActivity('POLICY_UPLOAD', `User uploaded policy: ${file.name}`);
        try {
            const report = await geminiService.analyzeAndComparePolicy(file, policies, accountHolder);
            logActivity('AI_POLICY_PARSE', `Gemini analyzed the policy with ${report.parsedPolicy.confidenceScore}% confidence.`, 'Gemini');
            setPolicyAnalysisReport(report);
            setShowPolicyReviewModal(true);
        } catch (error) {
            console.error(error);
            logActivity('ERROR', `Failed to analyze policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsParsingPolicy(false);
        }
    }, [policies, accountHolder, logActivity]);
    
    const handleSavePolicy = useCallback((report: PolicyAnalysisReport) => {
        const finalPolicyData = report.parsedPolicy;

        const newPolicy: ParsedPolicy = {
            ...finalPolicyData,
            policyName: `Policy ${finalPolicyData.provider} ${finalPolicyData.effectiveDate.split('-')[0]}`,
            id: `policy-${Date.now()}`,
            isVerified: true,
            isActive: false, // Default to inactive
        };

        if (report.analysisType === 'update' && report.targetPolicyId) {
            // Update existing policy
            setPolicies(prev => prev.map(p => p.id === report.targetPolicyId ? { ...p, ...newPolicy, id: p.id, isActive: p.isActive } : p));
            logActivity('POLICY_UPDATED', `Updated policy: ${newPolicy.policyName}`);
        } else {
             // Add new policy, ensuring only one is active
            setPolicies(prev => {
                const newPolicies = [...prev.map(p => ({...p, isActive: false})), { ...newPolicy, isActive: true }];
                return newPolicies;
            });
            logActivity('POLICY_ADDED', `Added new policy: ${newPolicy.policyName}`);
        }
        setShowPolicyReviewModal(false);
        setPolicyAnalysisReport(null);
    }, [logActivity]);

    const handleSetActivePolicy = useCallback((policyId: string) => {
        setPolicies(prev => prev.map(p => ({
            ...p,
            isActive: p.id === policyId
        })));
        logActivity('POLICY_ACTIVATED', `Set policy ${policyId} as active.`);
    }, [logActivity]);


    // Item CRUD
    const deleteItem = useCallback((itemId: string) => {
        const itemToDelete = inventory.find(i => i.id === itemId);
        if (itemToDelete) {
            setInventory(prev => prev.filter(item => item.id !== itemId));
            logActivity('ITEM_DELETED', `Deleted item: ${itemToDelete.itemName}`);
            setUndoAction({ type: 'DELETE_ITEM', payload: { item: itemToDelete } });
        }
    }, [inventory, logActivity]);
    
    const handleAddProofs = useCallback(async (itemId: string, files: File[]) => {
        const initialProgress: UploadProgress = {};
        files.forEach(f => initialProgress[f.name] = { loaded: 0, total: f.size });
        setUploadProgress(initialProgress);

        const newProofs = await Promise.all(files.map(async (file, i) => {
            const dataUrl = await fileToDataUrl(file, (event) => {
                setUploadProgress(prev => prev ? { ...prev, [file.name]: { loaded: event.loaded, total: event.total } } : null);
            });
            return {
                id: `proof-manual-${Date.now()}-${i}`,
                type: file.type.startsWith('image/') ? 'image' as const : 'document' as const,
                fileName: file.name,
                dataUrl,
                mimeType: file.type,
                createdBy: 'User' as const,
            };
        }));
        
        const itemToUpdate = inventory.find(i => i.id === itemId);
        if(itemToUpdate) {
            const updatedItem = {
                ...itemToUpdate,
                linkedProofs: [...itemToUpdate.linkedProofs, ...newProofs]
            };
            updateItem(updatedItem);
        }
        logActivity('PROOFS_ADDED', `Added ${newProofs.length} proof(s) to ${itemToUpdate?.itemName}`);
        setUploadProgress(null);
    }, [inventory, updateItem, logActivity]);

    // Handlers
    const handleSelectItem = useCallback((itemId: string) => {
        setSelectedItemId(itemId);
        setCurrentView('item-detail');
    }, []);

    const handleBackToDashboard = useCallback(() => {
        setSelectedItemId(null);
        setCurrentView('dashboard');
    }, []);

    const handleReset = useCallback(() => {
        if (window.confirm("Are you sure you want to start a new vault? This will clear all current data.")) {
            setInventory(INITIAL_INVENTORY);
            setUnlinkedProofs(INITIAL_UNLINKED_PROOFS);
            setPolicies([DEFAULT_POLICY]);
            setAccountHolder(DEFAULT_ACCOUNT_HOLDER);
            setActivityLog([]);
            setCurrentView('dashboard');
            setSelectedItemId(null);
            logActivity('VAULT_RESET', 'User started a new vault.');
        }
    }, [logActivity]);
    
    const handleUndo = useCallback(() => {
        if (undoAction?.type === 'DELETE_ITEM') {
            setInventory(prev => [...prev, undoAction.payload.item]);
            logActivity('ITEM_RESTORED', `Restored item: ${undoAction.payload.item.itemName}`);
        } else if (undoAction?.type === 'REJECT_SUGGESTION') {
            // Find the item and add the suggestion back
            setInventory(prev => prev.map(item => {
                if (item.id === undoAction.payload.itemId) {
                     const suggestionToRestore = item.suggestedProofs?.find(s => s.proofId === undoAction.payload.proofId);
                     // This part is simplified; a real implementation would need to store the suggestion details
                     // For now, we assume it's lost, which is a limitation.
                }
                return item;
            }));
            logActivity('SUGGESTION_RESTORED', `User undid rejection of proof suggestion for item ID ${undoAction.payload.itemId}.`);
        }
        setUndoAction(null);
    }, [undoAction, logActivity]);

    const handleCalculateProofStrength = useCallback(async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Calculating proof strength for ${item.itemName}`, 'Gemini');
        const res = await geminiService.calculateProofStrength(item);
        const updatedItem = { ...item, proofStrengthScore: res.score };
        updateItem(updatedItem);
        logActivity('AI_ACTION_SUCCESS', `Proof strength for ${item.itemName} is ${res.score}. Feedback: ${res.feedback}`, 'Gemini');
    }, [logActivity, updateItem]);

    const handleFindMarketPrice = useCallback(async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Finding market price for ${item.itemName}`, 'Gemini');
        const res = await geminiService.findMarketPrice(item);
        const updatedItem = { ...item, replacementCostValueRCV: res.rcv, actualCashValueACV: res.acv, valuationHistory: [...(item.valuationHistory || []), res] };
        updateItem(updatedItem);
        logActivity('AI_ACTION_SUCCESS', `Found market price for ${item.itemName}. RCV: $${res.rcv}, ACV: $${res.acv}`, 'Gemini');
    }, [logActivity, updateItem]);
    
    const handleEnrichAsset = useCallback(async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Enriching ${item.itemName} with web data`, 'Gemini');
        const res = await geminiService.enrichAssetFromWeb(item);
        const updatedItem = { ...item, webIntelligence: [...(item.webIntelligence || []), res] };
        updateItem(updatedItem);
        logActivity('AI_ACTION_SUCCESS', `Enriched ${item.itemName} with ${res.facts.length} new facts.`, 'Gemini');
    }, [logActivity, updateItem]);
    
    const handleCalculateACV = useCallback(async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Calculating ACV for ${item.itemName}`, 'Gemini');
        try {
            const res = await geminiService.calculateACV(item);
            const updatedItem = { ...item, actualCashValueACV: res.acv };
            updateItem(updatedItem);
            logActivity('AI_ACTION_SUCCESS', `Calculated ACV for ${item.itemName}: $${res.acv}. Reasoning: ${res.reasoning.join(' ')}`, 'Gemini');
        } catch (error) {
            logActivity('AI_ACTION_ERROR', `Failed to calculate ACV for ${item.itemName}. Reason: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }, [logActivity, updateItem]);
    
    const handleFindHighestRCV = useCallback(async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Finding highest RCV for ${item.itemName}`, 'Gemini');
        const res = await geminiService.findHighestRCV(item);
        const updatedItem = { ...item, replacementCostValueRCV: res.price };
        updateItem(updatedItem);
        logActivity('AI_ACTION_SUCCESS', `Found max RCV for ${item.itemName}: $${res.price} at ${res.source}`, 'Gemini');
    }, [logActivity, updateItem]);
    
    const handleDraftClaim = useCallback(async (item: InventoryItem) => {
        if (!activePolicy || !accountHolder) return;
        logActivity('AI_ACTION_START', `Drafting claim for ${item.itemName}`, 'Gemini');
        const claim = await geminiService.assembleDraftClaim(item, activePolicy, accountHolder);
        updateItem({ ...item, status: 'claimed' });
        logActivity('AI_ACTION_SUCCESS', `Drafted claim for ${item.itemName}. Description: ${claim.failureDescription}`, 'Gemini');
    }, [activePolicy, accountHolder, logActivity, updateItem]);

    const handleVisualSearch = useCallback(async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Performing visual search for ${item.itemName}`, 'Gemini');
        try {
            const res = await geminiService.findItemWithGoogleLens(item);
             logActivity('AI_ACTION_SUCCESS', `Visual search result for ${item.itemName}: ${res.itemName} found at ${res.sourceUrl}`, 'Gemini');
             if (window.confirm(`Visual search identified this as "${res.itemName}".\n\nWould you like to open the product page in a new tab?\n\n${res.sourceUrl}`)) {
                window.open(res.sourceUrl, '_blank');
             }
        } catch(e) {
             logActivity('AI_ACTION_ERROR', `Visual search failed for ${item.itemName}.`, 'Gemini');
        }
    }, [logActivity]);

    const handleExtractSerialNumber = useCallback(async (item: InventoryItem) => {
        const imageProof = item.linkedProofs.find(p => p.type === 'image');
        if (!imageProof?.dataUrl) {
            alert('This item needs an image proof to extract a serial number.');
            logActivity('AI_ACTION_FAIL', `No image for S/N extraction on ${item.itemName}.`);
            return;
        }

        logActivity('AI_ACTION_START', `Extracting serial number for ${item.itemName}`, 'Gemini');
        try {
            const res = await geminiService.extractSerialNumber(imageProof.dataUrl);
            if (res.serialNumber) {
                const updatedItem = { ...item, serialNumber: res.serialNumber };
                updateItem(updatedItem);
                logActivity('AI_ACTION_SUCCESS', `Extracted S/N for ${item.itemName}: ${res.serialNumber}`, 'Gemini');
            } else {
                logActivity('AI_ACTION_SUCCESS', `No serial number found for ${item.itemName}.`, 'Gemini');
            }
        } catch (error) {
            logActivity('AI_ACTION_ERROR', `Failed to extract serial number for ${item.itemName}.`);
        }
    }, [logActivity, updateItem]);

    const handleExtractReceiptInfo = useCallback(async (itemId: string, proofId: string) => {
        const item = inventory.find(i => i.id === itemId);
        const proof = item?.linkedProofs.find(p => p.id === proofId);

        if (!item || !proof || proof.type !== 'image') {
            logActivity('AI_ACTION_FAIL', `Cannot extract receipt info: No valid image proof found.`);
            return;
        }

        logActivity('AI_ACTION_START', `Extracting receipt info from ${proof.fileName} for ${item.itemName}`, 'Gemini');

        try {
            const receiptData = await geminiService.extractReceiptInfo(proof.dataUrl);
            
            let updatedItem = { ...item };
            
            const updatedProofs = item.linkedProofs.map(p => 
                p.id === proofId ? { ...p, receiptData } : p
            );
            updatedItem.linkedProofs = updatedProofs;

            const costIsUnset = !item.originalCost || item.originalCost === 0;
            const dateIsUnset = !item.purchaseDate;
            
            if ( (costIsUnset || dateIsUnset) && window.confirm(`AI extracted a total of $${receiptData.totalAmount.toFixed(2)} and a date of ${receiptData.transactionDate}.\n\nDo you want to update this item's Original Cost and Purchase Date with this information?`)) {
                if (costIsUnset) {
                    updatedItem.originalCost = receiptData.totalAmount;
                }
                if (dateIsUnset) {
                    updatedItem.purchaseDate = receiptData.transactionDate;
                }
                logActivity('ITEM_UPDATED', `Item details updated from receipt for ${item.itemName}.`);
            }

            updateItem(updatedItem);
            logActivity('AI_ACTION_SUCCESS', `Successfully extracted receipt info for ${item.itemName}.`, 'Gemini');

        } catch (error) {
            logActivity('AI_ACTION_ERROR', `Failed to extract receipt info for ${item.itemName}. ${error instanceof Error ? error.message : ''}`);
            alert("The AI could not extract information from this receipt. Please ensure it is a clear image.");
        }
    }, [inventory, updateItem, logActivity]);
    
    const handleBulkExtractSerialNumbers = useCallback(async () => {
        const items = inventory.filter(i => selectedItemIds.includes(i.id));
        if (!window.confirm(`This will run AI serial number extraction on ${items.length} item(s) with image proofs. This may take some time and incur costs. Continue?`)) {
            return;
        }
        logActivity('BULK_ACTION_START', `Starting bulk S/N extraction for ${items.length} items.`);
        
        const updates: { id: string, serialNumber: string }[] = [];

        for (const item of items) {
            const imageProof = item.linkedProofs.find(p => p.type === 'image');
            if (!imageProof?.dataUrl) {
                logActivity('AI_ACTION_SKIPPED', `Skipping ${item.itemName}: No image proof.`, 'VeritasVault');
                continue;
            }
            try {
                const res = await geminiService.extractSerialNumber(imageProof.dataUrl);
                if (res.serialNumber && res.serialNumber.length > 0) {
                    updates.push({ id: item.id, serialNumber: res.serialNumber });
                    logActivity('AI_ACTION_SUCCESS', `Extracted S/N for ${item.itemName}: ${res.serialNumber}`, 'Gemini');
                } else {
                    logActivity('AI_ACTION_SUCCESS', `No S/N found for ${item.itemName}.`, 'Gemini');
                }
            } catch (error) {
                 logActivity('AI_ACTION_ERROR', `S/N extraction failed for ${item.itemName}.`);
            }
        }

        setInventory(prev => prev.map(item => {
            const update = updates.find(u => u.id === item.id);
            return update ? { ...item, serialNumber: update.serialNumber } : item;
        }));
        logActivity('BULK_ACTION_COMPLETE', `Finished bulk S/N extraction. ${updates.length} item(s) updated.`);
        setSelectedItemIds([]);
    }, [inventory, selectedItemIds, logActivity]);

    // FIX: All subsequent handlers were missing useCallback wrappers, leading to scope issues.
    // Wrapped all handlers in useCallback with appropriate dependencies.
    // New Bulk Action Handlers
    const runBulkAiAction = useCallback(async <T extends unknown>(
        actionName: string,
        serviceCall: (item: InventoryItem) => Promise<T>,
        updateLogic: (item: InventoryItem, result: T) => InventoryItem,
        itemFilter?: (item: InventoryItem) => boolean
    ) => {
        let items = inventory.filter(i => selectedItemIds.includes(i.id));
        if (itemFilter) {
            items = items.filter(itemFilter);
        }
        
        if (items.length === 0) {
            alert(`No suitable items selected for "${actionName}".`);
            return;
        }

        if (!window.confirm(`This will run "${actionName}" on ${items.length} item(s). This may take some time and incur costs. Continue?`)) {
            return;
        }

        logActivity('BULK_ACTION_START', `Starting bulk ${actionName} for ${items.length} items.`);
        
        const updates = new Map<string, InventoryItem>();
        for (const item of items) {
            try {
                const result = await serviceCall(item);
                const updatedItem = updateLogic(item, result);
                updates.set(item.id, updatedItem);
                logActivity('AI_ACTION_SUCCESS', `${actionName} successful for ${item.itemName}`, 'Gemini');
            } catch (error) {
                logActivity('AI_ACTION_ERROR', `${actionName} failed for ${item.itemName}.`);
            }
        }

        setInventory(prev => prev.map(item => updates.get(item.id) || item));
        logActivity('BULK_ACTION_COMPLETE', `Finished bulk ${actionName}. ${updates.size} item(s) updated.`);
        setSelectedItemIds([]);
    }, [inventory, logActivity, selectedItemIds, setInventory, setSelectedItemIds]);
    
    const handleBulkFindMarketPrice = useCallback(() => runBulkAiAction(
        "Find Market Price",
        geminiService.findMarketPrice,
        (item, res) => ({ ...item, replacementCostValueRCV: res.rcv, actualCashValueACV: res.acv, valuationHistory: [...(item.valuationHistory || []), res] })
    ), [runBulkAiAction]);

    const handleBulkEnrichData = useCallback(() => runBulkAiAction(
        "Enrich Data",
        geminiService.enrichAssetFromWeb,
        (item, res) => ({ ...item, webIntelligence: [...(item.webIntelligence || []), res] })
    ), [runBulkAiAction]);

    const handleBulkVisualSearch = useCallback(() => runBulkAiAction(
        "Visual Search",
        geminiService.findItemWithGoogleLens,
        // Fix: Added explicit type for `res` to resolve 'unknown' type error.
        (item, res: { itemName: string, sourceUrl: string }) => {
            // Visual search doesn't update the item, just logs and optionally opens a tab
            if (window.confirm(`Visual search identified "${item.itemName}" as "${res.itemName}".\n\nOpen product page?\n\n${res.sourceUrl}`)) {
                window.open(res.sourceUrl, '_blank');
            }
            return item;
        },
        item => item.linkedProofs.some(p => p.type === 'image')
    ), [runBulkAiAction]);

    const handleBulkGenerateImages = useCallback(() => runBulkAiAction(
        "Generate Images",
        (item) => geminiService.generateImage(item.itemName, '4:3'),
        // Fix: Added explicit type for `dataUrl` to resolve 'unknown' type error.
        (item, dataUrl: string) => {
            const newProof: Proof = {
                id: `proof-gen-${Date.now()}`,
                type: 'image',
                fileName: `generated_${sanitizeFileName(item.itemName)}.jpg`,
                dataUrl,
                mimeType: 'image/jpeg',
                createdBy: 'AI',
                purpose: 'Proof of Possession',
            };
            return { ...item, linkedProofs: [...item.linkedProofs, newProof] };
        },
        item => !item.linkedProofs.some(p => p.type === 'image')
    ), [runBulkAiAction]);
    
    const handleOpenBulkImageEditModal = useCallback(() => {
        const itemsWithImages = inventory.filter(i => selectedItemIds.includes(i.id) && i.linkedProofs.some(p => p.type === 'image'));
        if (itemsWithImages.length === 0) {
            alert("No selected items have images to edit.");
            return;
        }
        setItemsToBulkEdit(itemsWithImages);
        setShowBulkImageEditModal(true);
    }, [inventory, selectedItemIds]);

    const handleBulkEditImages = useCallback(async (prompt: string) => {
        setShowBulkImageEditModal(false);
        logActivity('BULK_ACTION_START', `Starting bulk image edit for ${itemsToBulkEdit.length} items with prompt: "${prompt}"`);

        const newProofs: {itemId: string, proof: Proof}[] = [];
        for (const item of itemsToBulkEdit) {
            const imageProof = item.linkedProofs.find(p => p.type === 'image');
            if (imageProof) {
                try {
                    const newDataUrl = await geminiService.editImageWithPrompt(imageProof.dataUrl, prompt);
                    const newProof: Proof = {
                        id: `proof-edit-bulk-${Date.now()}`,
                        type: 'image',
                        fileName: `edited_${imageProof.fileName}`,
                        dataUrl: newDataUrl,
                        mimeType: imageProof.mimeType,
                        createdBy: 'AI',
                    };
                    newProofs.push({ itemId: item.id, proof: newProof });
                    logActivity('AI_ACTION_SUCCESS', `Bulk edit successful for ${item.itemName}`, 'Gemini');
                } catch (error) {
                    logActivity('AI_ACTION_ERROR', `Bulk edit failed for ${item.itemName}.`);
                }
            }
        }

        setInventory(prev => prev.map(item => {
            const proofsToAdd = newProofs.filter(p => p.itemId === item.id).map(p => p.proof);
            if (proofsToAdd.length > 0) {
                return { ...item, linkedProofs: [...item.linkedProofs, ...proofsToAdd] };
            }
            return item;
        }));

        logActivity('BULK_ACTION_COMPLETE', `Finished bulk image edit. ${newProofs.length} image(s) created.`);
        setSelectedItemIds([]);
        setItemsToBulkEdit([]);
    }, [itemsToBulkEdit, logActivity]);

    const handleBulkEditItems = useCallback((updates: Partial<Pick<InventoryItem, 'status' | 'itemCategory' | 'lastKnownLocation' | 'condition'>>) => {
        setShowBulkEditModal(false);
        if (Object.keys(updates).length === 0) return;

        logActivity('BULK_EDIT', `Applying bulk edits to ${selectedItemIds.length} items: ${JSON.stringify(updates)}`);

        setInventory(prev => prev.map(item => {
            if (selectedItemIds.includes(item.id)) {
                return { ...item, ...updates };
            }
            return item;
        }));

        setSelectedItemIds([]);
    }, [selectedItemIds, logActivity]);
    
    const handleLinkMultipleProofs = useCallback((itemId: string, proofIds: string[]) => {
        const proofsToLink = unlinkedProofs.filter(p => proofIds.includes(p.id));
        const itemToUpdate = inventory.find(i => i.id === itemId);

        if (!itemToUpdate || proofsToLink.length === 0) return;

        setInventory(prev => prev.map(item => {
            if (item.id === itemId) {
                // Remove from suggested proofs
                const newSuggested = item.suggestedProofs?.filter(s => !proofIds.includes(s.proofId));
                return {
                    ...item,
                    linkedProofs: [...item.linkedProofs, ...proofsToLink],
                    suggestedProofs: newSuggested
                };
            }
            return item;
        }));
        setUnlinkedProofs(prev => prev.filter(p => !proofIds.includes(p.id)));
        logActivity('PROOFS_LINKED', `Linked ${proofsToLink.length} proof(s) to ${itemToUpdate.itemName}.`);
    }, [inventory, unlinkedProofs, logActivity]);
    
    const handleUnlinkProof = useCallback((itemId: string, proofId: string) => {
         const item = inventory.find(i => i.id === itemId);
         const proofToUnlink = item?.linkedProofs.find(p => p.id === proofId);
         if (!item || !proofToUnlink) return;

         const updatedItem = {
            ...item,
            linkedProofs: item.linkedProofs.filter(p => p.id !== proofId)
         };
         
         updateItem(updatedItem);
         setUnlinkedProofs(prev => [...prev, proofToUnlink]);
         logActivity('PROOF_UNLINKED', `Unlinked proof ${proofToUnlink.fileName}.`);
    }, [inventory, updateItem, logActivity]);

    const handleRejectSuggestion = useCallback((itemId: string, proofId: string) => {
        setInventory(prev => prev.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    suggestedProofs: item.suggestedProofs?.filter(s => s.proofId !== proofId)
                };
            }
            return item;
        }));
        logActivity('SUGGESTION_REJECTED', `User rejected a proof suggestion.`);
    }, [logActivity]);
    
    const handleSaveToFile = useCallback(() => {
        const data = {
            inventory,
            unlinkedProofs,
            policies,
            accountHolder,
            claimDetails,
            activityLog,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VeritasVault_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logActivity('VAULT_SAVED', 'User saved vault to a local JSON file.');
    }, [inventory, unlinkedProofs, policies, accountHolder, claimDetails, activityLog, logActivity]);
    
    const handleLoadFromFile = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.inventory && data.policies) {
                    setInventory(data.inventory);
                    setUnlinkedProofs(data.unlinkedProofs || []);
                    setPolicies(data.policies);
                    setAccountHolder(data.accountHolder);
                    setClaimDetails(data.claimDetails);
                    setActivityLog(data.activityLog || []);
                    logActivity('VAULT_LOADED', `Loaded vault from ${file.name}`);
                    setCurrentView('dashboard');
                } else {
                    alert('Invalid file format. The file must contain "inventory" and "policies" data.');
                    logActivity('ERROR', `Failed to load vault from ${file.name}: Invalid file format.`);
                }
            } catch (error) {
                alert('Error loading file. It may be corrupted.');
                console.error(error);
                logActivity('ERROR', `Failed to load vault from ${file.name}: File could not be parsed. ${error instanceof Error ? error.message : ''}`);
            }
        };
        reader.readAsText(file);
    }, [logActivity]);

    const handleProcessVideo = useCallback(async (videoBlob: Blob) => {
        logActivity('AI_ACTION_START', 'Analyzing room scan video...', 'Gemini');
        setCurrentView('dashboard');
        setPipelineStage('processing');
        setPipelineProgress({ current: 0, total: 1, fileName: 'Analyzing video for items...' });
        try {
            const results = await geminiService.analyzeVideoForItems(videoBlob);
            logActivity('AI_ACTION_SUCCESS', `Video analysis complete. Found ${results.items.length} potential items.`, 'Gemini');

            if (results.items.length > 0) {
                 const newItems: InventoryItem[] = results.items.map((item, i) => ({
                    id: `item-video-${Date.now()}-${i}`,
                    status: 'needs-review',
                    itemName: item.name,
                    itemDescription: item.description,
                    itemCategory: item.category,
                    originalCost: item.estimatedValue || 0,
                    linkedProofs: [],
                    createdAt: new Date().toISOString(),
                    createdBy: 'AI Video Analysis',
                 }));
                 setInventory(prev => [...prev, ...newItems]);
            }
        } catch (error) {
            logActivity('AI_ACTION_ERROR', `Video analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setPipelineStage('idle');
            setStatusFilter('needs-review');
        }
    }, [logActivity]);

    const handleAnalyzeImages = useCallback(async (files: File[], prompt: string): Promise<string> => {
        logActivity('AI_ACTION_START', `Analyzing ${files.length} image(s) with prompt: "${prompt}"`, 'Gemini');
        try {
            const imageDataUrls = await Promise.all(
                files.map(async file => {
                    const dataUrl = await fileToDataUrl(file);
                    return {
                        data: dataUrl.split(',')[1],
                        mimeType: file.type
                    };
                })
            );
            const result = await geminiService.analyzeImages(imageDataUrls, prompt);
            logActivity('AI_ACTION_SUCCESS', `Image analysis complete.`);
            return result;
        } catch (error) {
            logActivity('AI_ACTION_ERROR', `Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error; // Re-throw to be caught in the modal
        }
    }, [logActivity]);
    
    const handleSaveEditedImage = useCallback((originalProof: Proof, newDataUrl: string) => {
        const newProof: Proof = {
            id: `proof-edit-${Date.now()}`,
            type: 'image',
            fileName: `edited_${originalProof.fileName}`,
            dataUrl: newDataUrl,
            mimeType: originalProof.mimeType,
            createdBy: 'AI',
            purpose: originalProof.purpose,
        };

        // Find which item this proof belonged to and add the new one
        setInventory(prev => prev.map(item => {
            if (item.linkedProofs.some(p => p.id === originalProof.id)) {
                return {
                    ...item,
                    linkedProofs: [...item.linkedProofs, newProof]
                };
            }
            return item;
        }));
        logActivity('PROOF_CREATED', `AI edited an image, creating new proof: ${newProof.fileName}`);
        setEditingProof(null);
    }, [logActivity]);

    const handleSaveGeneratedImage = useCallback((item: InventoryItem, dataUrl: string) => {
         const newProof: Proof = {
            id: `proof-gen-${Date.now()}`,
            type: 'image',
            fileName: `generated_${sanitizeFileName(item.itemName)}.jpg`,
            dataUrl,
            mimeType: 'image/jpeg',
            createdBy: 'AI',
            purpose: 'Proof of Possession',
        };
         const updatedItem = {
            ...item,
            linkedProofs: [...item.linkedProofs, newProof]
        };
        updateItem(updatedItem);
        logActivity('PROOF_CREATED', `AI generated an image for item: ${item.itemName}`);
        setGeneratingForItem(null);
    }, [updateItem, logActivity]);
    
    const handleSaveAudioNote = useCallback((item: InventoryItem, audioBlob: Blob, transcription: string) => {
        const dataUrlPromise = fileToDataUrl(new File([audioBlob], 'audio_note.webm', { type: audioBlob.type }));
        Promise.all([dataUrlPromise]).then(([audioDataUrl]) => {
             const audioProof: Proof = {
                id: `proof-audio-${Date.now()}`,
                type: 'audio',
                fileName: `audio_note_${new Date().toISOString()}.webm`,
                dataUrl: audioDataUrl,
                mimeType: audioBlob.type,
                createdBy: 'User',
                purpose: 'Supporting Document',
                summary: transcription,
            };

            const updatedItem = {
                ...item,
                linkedProofs: [...item.linkedProofs, audioProof]
            };
            updateItem(updatedItem);
            logActivity('PROOF_CREATED', `Added transcribed audio note to ${item.itemName}`);
            setRecordingForItem(null);
        });
    }, [updateItem, logActivity]);

    const renderContent = () => {
        switch (currentView) {
            case 'item-detail':
                return selectedItem ? (
                    <ItemDetailView
                        item={selectedItem}
                        unlinkedProofs={unlinkedProofs}
                        policy={activePolicy || null}
                        accountHolder={accountHolder}
                        onBack={handleBackToDashboard}
                        onUpdateItem={updateItem}
                        onDeleteItem={deleteItem}
                        onFindMarketPrice={handleFindMarketPrice}
                        onEnrichAsset={handleEnrichAsset}
                        onCalculateProofStrength={handleCalculateProofStrength}
                        onCalculateACV={handleCalculateACV}
                        onFindHighestRCV={handleFindHighestRCV}
                        onDraftClaim={handleDraftClaim}
                        onVisualSearch={handleVisualSearch}
                        onFindProductImage={handleFindProductImage}
                        onLinkMultipleProofs={handleLinkMultipleProofs}
                        onUnlinkProof={handleUnlinkProof}
                        onRejectSuggestion={handleRejectSuggestion}
                        onAddProof={handleAddProofs}
                        uploadProgress={uploadProgress}
                        itemCategories={itemCategories}
                        onExtractSerialNumber={handleExtractSerialNumber}
                        onExtractReceiptInfo={handleExtractReceiptInfo}
                        onEditImage={setEditingProof}
                        onGenerateImage={setGeneratingForItem}
                        onRecordAudio={setRecordingForItem}
                        onImageZoom={setZoomedImageUrl}
                        claimDetails={claimDetails}
                        policyHolders={policyHolders}
                    />
                ) : null;
            case 'processing-preview':
                return (
                    <ProcessingPreview
                        proofs={proofsToProcess}
                        inventory={inventory}
                        onFinalize={handleFinalizeProcessing}
                        onCancel={() => {
                            setProofsToProcess([]);
                            setCurrentView('dashboard');
                        }}
                        policyHolders={policyHolders}
                        onImageZoom={setZoomedImageUrl}
                        claimDetails={claimDetails}
                    />
                );
            case 'dashboard':
            default:
                 return (
                    <InventoryDashboard
                        items={inventory}
                        filteredItems={filteredInventory}
                        accountHolder={accountHolder}
                        policies={policies}
                        activePolicy={activePolicy}
                        claimDetails={claimDetails}
                        onUpdateClaimDetails={handleUpdateClaimDetails}
                        isParsingPolicy={isParsingPolicy}
                        onUploadPolicy={handlePolicyUpload}
                        onSetActivePolicy={handleSetActivePolicy}
                        onSelectItem={handleSelectItem}
                        onItemPhotosSelected={(files) => handleFileUploads(Array.from(files))}
                        onStartRoomScan={() => setCurrentView('room-scan')}
                        onOpenImageAnalysis={() => setShowImageAnalysisModal(true)}
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        categoryFilter={categoryFilter}
                        onCategoryFilterChange={setCategoryFilter}
                        itemCategories={itemCategories}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        coverageFilter={coverageFilter}
                        onCoverageFilterChange={setCoverageFilter}
                        onApproveItem={handleApproveItem}
                        onRejectItem={handleRejectItem}
                        pipelineStage={pipelineStage}
                        pipelineProgress={pipelineProgress}
                        onCancelPipeline={() => setPipelineStage('idle')}
                        
                        selectedItemIds={selectedItemIds}
                        onToggleItemSelection={handleToggleItemSelection}
                        onSelectAllFilteredItems={handleSelectAllFilteredItems}
                        onClearSelection={handleClearSelection}
                        onApproveSelected={handleApproveSelectedItems}
                        onRejectSelected={handleRejectSelectedItems}
                        onBulkExtractSerialNumbers={handleBulkExtractSerialNumbers}
                        onBulkFindMarketPrice={handleBulkFindMarketPrice}
                        onBulkEnrichData={handleBulkEnrichData}
                        onBulkVisualSearch={handleBulkVisualSearch}
                        onBulkGenerateImages={handleBulkGenerateImages}
                        onOpenBulkImageEditModal={handleOpenBulkImageEditModal}
                        onOpenBulkEdit={() => setShowBulkEditModal(true)}
                    />
                 );
             case 'room-scan':
                return <RoomScanView onClose={() => setCurrentView('dashboard')} onProcessVideo={handleProcessVideo} />;
        }
    };

    return (
        <div className="min-h-screen bg-light">
            <Header 
                onReset={handleReset} 
                onShowGuide={() => setShowGuide(true)}
                onShowLog={() => setShowLog(true)}
                onDownloadVault={() => exportToCSV(inventory, `VeritasVault_Export_${new Date().toISOString().split('T')[0]}.csv`)}
                showDownload={inventory.length > 0}
                onSaveToFile={() => setShowSaveModal(true)}
                onLoadFromFile={handleLoadFromFile}
                onAskGemini={() => setShowAssistant(true)}
            />
            <main className="container mx-auto px-4 md:px-8 py-8">
                {renderContent()}
            </main>
            {zoomedImageUrl && (
                <ImageZoomModal 
                    imageUrl={zoomedImageUrl}
                    onClose={() => setZoomedImageUrl(null)}
                />
            )}
            {showAssistant && (
                <GeminiAssistant
                    onClose={() => setShowAssistant(false)}
                    inventory={inventory}
                    policy={activePolicy}
                />
            )}
            {editingProof && (
                <ImageEditorModal
                    proof={editingProof}
                    onClose={() => setEditingProof(null)}
                    onSave={handleSaveEditedImage}
                />
            )}
            {generatingForItem && (
                <ImageGeneratorModal
                    item={generatingForItem}
                    onClose={() => setGeneratingForItem(null)}
                    onGenerate={handleSaveGeneratedImage}
                />
            )}
             {recordingForItem && (
                <AudioRecorderModal
                    item={recordingForItem}
                    onClose={() => setRecordingForItem(null)}
                    onSave={handleSaveAudioNote}
                />
            )}
            {showImageAnalysisModal && (
                <ImageAnalysisModal
                    onClose={() => setShowImageAnalysisModal(false)}
                    onAnalyze={handleAnalyzeImages}
                />
            )}
            {showPolicyReviewModal && policyAnalysisReport && (
                <PolicyReviewModal
                    report={policyAnalysisReport}
                    onClose={() => setShowPolicyReviewModal(false)}
                    onSave={handleSavePolicy}
                />
            )}
            {showBulkImageEditModal && (
                <BulkImageEditModal
                    itemCount={itemsToBulkEdit.length}
                    onClose={() => setShowBulkImageEditModal(false)}
                    onSave={handleBulkEditImages}
                />
            )}
            {showBulkEditModal && (
                <BulkEditModal
                    itemCount={selectedItemIds.length}
                    itemCategories={itemCategories}
                    onClose={() => setShowBulkEditModal(false)}
                    onSave={handleBulkEditItems}
                />
            )}
            {showLog && <ActivityLogView log={activityLog} onClose={() => setShowLog(false)} />}
            {showGuide && <ClaimStrategyGuide onClose={() => setShowGuide(false)} />}
            {showSaveModal && (
                <SaveModal 
                    onClose={() => setShowSaveModal(false)}
                    onQuickBackup={handleSaveToFile}
                    onForensicExport={() => exportToZip(inventory, unlinkedProofs)}
                />
            )}
            {undoAction && <UndoToast action={undoAction} onUndo={handleUndo} onDismiss={() => setUndoAction(null)} />}
        </div>
    );
};

export default App;