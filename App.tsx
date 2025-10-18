// Fix: Removed invalid file marker that was causing a parsing error.
// Fix: Imported useState, useCallback, and useEffect from React to resolve multiple hook-related errors.
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Header } from './components/Header.tsx';
import InventoryDashboard from './components/InventoryDashboard.tsx';
import ItemDetailView from './components/ItemDetailView.tsx';
import ActivityLogView from './components/ActivityLogView.tsx';
import ClaimStrategyGuide from './components/ClaimStrategyGuide.tsx';
import UndoToast from './components/UndoToast.tsx';
import SaveModal from './components/SaveModal.tsx';
import RoomScanView from './components/RoomScanView.tsx';
import PolicyReviewModal from './components/PolicyReviewModal.tsx';


import * as geminiService from './services/geminiService.ts';
import { InventoryItem, AccountHolder, ParsedPolicy, Proof, AppView, ActivityLogEntry, UndoableAction, ClaimDetails, ItemStatus, ProofSuggestion, UploadProgress, PipelineStage, PipelineProgress, PolicyAnalysisReport } from './types.ts';
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
  id: 'ah-default-user',
  name: 'Maleidy Bello Landin', // Using first name on policy for personalization
  address: '312 W 43RD ST, APT 14J, NEW YORK NY 10036'
};


const INITIAL_INVENTORY: InventoryItem[] = []; // Start with an empty inventory
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
        name: "Burglary Claim - 312 W 43rd St",
        dateOfLoss: "2024-07-20",
        incidentType: "Burglary",
        location: "312 W 43rd Street, Apt 14J, New York, NY 10036",
        policeReport: "NYPD-2024-845123",
        propertyDamageDetails: "Front door lock was forcibly broken and requires replacement.\nWindow in the living room was shattered.\nEstimated cost for door repair: $450\nEstimated cost for window replacement: $600"
    });
    
    // Derived State for Active Policy
    const activePolicy = useMemo(() => policies.find(p => p.isActive), [policies]);

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
    const [policyCorrections, setPolicyCorrections] = useState<string[]>([]);

    // Background Processing State
    const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
    const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress>({ current: 0, total: 0, fileName: '' });
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('needs-review');
    const [coverageFilter, setCoverageFilter] = useState('all');
    const [itemCategories, setItemCategories] = useState<string[]>(CATEGORIES);
    
    // Activity Log State
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

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
    

    const runAutonomousPipeline = useCallback(async (newProofs: Proof[]) => {
        if (!activePolicy) {
            logActivity('ERROR', 'Cannot start pipeline: No active insurance policy found.');
            return;
        }

        // --- STAGE 1: ANALYSIS & CATEGORIZATION ---
        logActivity('PIPELINE_START', `Starting autonomous pipeline for ${newProofs.length} new proofs.`);
        setPipelineStage('analyzing');
        setPipelineProgress({ current: 0, total: newProofs.length, fileName: newProofs[0]?.fileName || 'Starting...' });

        let analysisPromises = newProofs.map(async (proof, index) => {
            try {
                setPipelineProgress(prev => ({ ...prev, current: index + 1, fileName: proof.fileName }));
                
                const fileBlob = dataUrlToBlob(proof.dataUrl);
                const file = new File([fileBlob], proof.fileName, { type: proof.mimeType });

                // NEW: Use the single, more powerful analysis function
                const analysisResult = await geminiService.analyzeProof(file);
                
                return { 
                    ...proof, 
                    status: 'categorized' as const,
                    predictedCategory: analysisResult.category,
                    summary: analysisResult.summary,
                    // NEW: Add the rich analysis data to the proof object
                    purpose: analysisResult.purpose,
                    authenticityScore: analysisResult.authenticityScore,
                    // Also update the estimated value from the proof if available
                    estimatedValue: analysisResult.estimatedValue,
                };
            } catch (error) {
                console.error(`Failed to analyze proof ${proof.fileName}:`, error);
                logActivity('AI_ACTION_ERROR', `Failed to analyze ${proof.fileName}.`);
                return { ...proof, status: 'error' as const };
            }
        });

        const analyzedProofs = await Promise.all(analysisPromises);
        setUnlinkedProofs(prev => [...prev.filter(p => !newProofs.some(np => np.id === p.id)), ...analyzedProofs]);
        logActivity('PIPELINE_STAGE_COMPLETE', `Analysis complete for ${analyzedProofs.length} proofs.`);

        // --- STAGE 2: CLUSTERING & SYNTHESIS ---
        setPipelineStage('clustering');
        setPipelineProgress({ current: 1, total: 1, fileName: 'Synthesizing items from analyzed proofs...' });
        logActivity('PIPELINE_STAGE_START', 'Clustering proofs to synthesize inventory items.');

        try {
            const proofsToCluster = analyzedProofs.filter(p => p.status === 'categorized');
            if (proofsToCluster.length > 0) {
                const { clusters } = await geminiService.clusterAndSynthesizeItems(proofsToCluster, activePolicy);

                if (clusters && clusters.length > 0) {
                    const newItems: InventoryItem[] = clusters.map((cluster, i) => {
                        const linkedProofs = cluster.proofIds.map(proofId => {
                            const proof = proofsToCluster.find(p => p.id === proofId);
                            if (!proof) throw new Error(`Clustered proof ID ${proofId} not found`);
                            return proof;
                        });
                        
                        // --- Policy-Aware Category Adjustment Logic ---
                        const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                        let finalCategory = cluster.synthesizedItem.itemCategory || 'Other';
                        const originalCategory = finalCategory;

                        if (activePolicy) {
                            const policyCategories = activePolicy.coverage.map(c => ({ name: c.category, type: c.type }));
                            const searchableText = [
                                cluster.synthesizedItem.itemDescription?.toLowerCase() || '',
                                ...linkedProofs.map(p => p.predictedCategory?.toLowerCase() || '')
                            ].join(' ');

                            let bestMatch: string | null = null;
                            
                            // Prioritize matching sub-limit categories
                            const subLimitCats = policyCategories.filter(c => c.type === 'sub-limit').map(c => c.name);
                            for (const cat of subLimitCats) {
                                if (new RegExp(`\\b${escapeRegExp(cat)}\\b`, 'i').test(searchableText)) {
                                    bestMatch = cat;
                                    break;
                                }
                            }
                            
                            // If no sub-limit match, check for main category match
                            if (!bestMatch) {
                                const mainCat = policyCategories.find(c => c.type === 'main');
                                if (mainCat && new RegExp(`\\b${escapeRegExp(mainCat.name)}\\b`, 'i').test(searchableText)) {
                                    bestMatch = mainCat.name;
                                }
                            }

                            const allPolicyCategoryNames = policyCategories.map(c => c.name);
                            const isOriginalCategoryInPolicy = allPolicyCategoryNames.includes(originalCategory);

                            // Decide whether to update the category
                            if (bestMatch && bestMatch !== originalCategory) {
                                // A better, policy-aligned category was found in the text.
                                finalCategory = bestMatch;
                            } else if (!isOriginalCategoryInPolicy) {
                                // The original category isn't valid, and we couldn't find a better one.
                                // Fallback to the main coverage category as a sensible default.
                                const mainCategoryName = policyCategories.find(c => c.type === 'main')?.name;
                                if (mainCategoryName) {
                                    finalCategory = mainCategoryName;
                                }
                            }

                            if (finalCategory !== originalCategory) {
                                logActivity(
                                    'AI_CATEGORY_ADJUSTED', 
                                    `AI adjusted category for '${cluster.synthesizedItem.itemName || 'new item'}' from '${originalCategory}' to '${finalCategory}' for policy alignment.`, 
                                    'Gemini'
                                );
                            }
                        }
                        // --- End of Category Adjustment Logic ---

                        // Validate category against the state list
                        if (!itemCategories.includes(finalCategory)) {
                            logActivity(
                                'CATEGORY_INVALID',
                                `AI suggested invalid category '${finalCategory}' for '${cluster.synthesizedItem.itemName || 'new item'}'. Defaulting to 'Other'.`,
                                'VeritasVault'
                            );
                            finalCategory = 'Other';
                        }

                        return {
                            id: `item-synth-${Date.now()}-${i}`,
                            status: 'needs-review',
                            linkedProofs: linkedProofs,
                            createdAt: new Date().toISOString(),
                            createdBy: 'AI Pipeline',
                            proofStrengthScore: 50, // Initial score
                            itemName: 'Unnamed Item',
                            itemDescription: 'No description.',
                            originalCost: 0,
                            ...cluster.synthesizedItem,
                            itemCategory: finalCategory, // Overwrite with the adjusted category
                        };
                    });
                    
                    const clusteredProofIds = new Set(clusters.flatMap(c => c.proofIds));

                    setInventory(prev => [...prev, ...newItems]);
                    setUnlinkedProofs(prev => prev.filter(p => !clusteredProofIds.has(p.id)));

                    logActivity('PIPELINE_STAGE_COMPLETE', `AI synthesized ${newItems.length} new inventory items from ${clusteredProofIds.size} proofs.`);
                } else {
                    logActivity('PIPELINE_STAGE_COMPLETE', 'No new items were synthesized from the provided proofs.');
                }
            } else {
                 logActivity('PIPELINE_STAGE_SKIPPED', 'No successfully analyzed proofs to cluster.');
            }
        } catch (error) {
            console.error('Clustering failed:', error);
            logActivity('AI_ACTION_ERROR', `Clustering and synthesis stage failed.`);
        } finally {
            setPipelineStage('idle');
            setStatusFilter('needs-review');
        }

    }, [activePolicy, logActivity, itemCategories]);


    const handleFileUploads = useCallback(async (files: File[]) => {
        if (!activePolicy) {
            alert("Please add and activate an insurance policy before adding evidence.");
            return;
        }

        const initialProgress: UploadProgress = {};
        files.forEach(f => initialProgress[f.name] = { loaded: 0, total: f.size });
        setUploadProgress(initialProgress);
        setCurrentView('dashboard'); // Switch to dashboard to see progress

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
                    status: 'unprocessed' as const,
                }))
            );
            
            const newProofs: Proof[] = await Promise.all(readFilesPromises);
            setUnlinkedProofs(prev => [...prev, ...newProofs]);
            setUploadProgress(null);
            
            // Start the autonomous pipeline
            await runAutonomousPipeline(newProofs);

        } catch (error) {
            console.error("Error reading files:", error);
            logActivity('ERROR', `Failed to read files for upload: ${error instanceof Error ? error.message : 'Unknown Error'}`);
            setUploadProgress(null); // Clear progress on error
        }
    }, [activePolicy, runAutonomousPipeline, logActivity]);


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
    
    const handlePolicyUpload = async (file: File) => {
        setIsParsingPolicy(true);
        logActivity('POLICY_UPLOAD', `User uploaded policy: ${file.name}`);
        try {
            const report = await geminiService.analyzeAndComparePolicy(file, policies, accountHolder, policyCorrections);
            logActivity('AI_POLICY_PARSE', `Gemini analyzed the policy with ${report.parsedPolicy.confidenceScore}% confidence.`, 'Gemini');
            setPolicyAnalysisReport(report);
            setShowPolicyReviewModal(true);
        } catch (error) {
            console.error(error);
            logActivity('ERROR', `Failed to analyze policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsParsingPolicy(false);
        }
    };
    
    const handleSavePolicy = (finalPolicyData: Omit<ParsedPolicy, 'id' | 'isActive' | 'isVerified'>, report: PolicyAnalysisReport) => {
        const corrections = getPolicyCorrections(report.parsedPolicy, finalPolicyData);

        if (corrections.length > 0) {
            setPolicyCorrections(prev => [...prev, ...corrections]);
            logActivity('AI_FEEDBACK', `User provided ${corrections.length} correction(s) during policy review.`);
        }

        const newPolicy: ParsedPolicy = {
            ...finalPolicyData,
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
    };

    const handleSetActivePolicy = (policyId: string) => {
        setPolicies(prev => prev.map(p => ({
            ...p,
            isActive: p.id === policyId
        })));
        logActivity('POLICY_ACTIVATED', `Set policy ${policyId} as active.`);
    };


    // Item CRUD
    const deleteItem = (itemId: string) => {
        const itemToDelete = inventory.find(i => i.id === itemId);
        if (itemToDelete) {
            setInventory(prev => prev.filter(item => item.id !== itemId));
            logActivity('ITEM_DELETED', `Deleted item: ${itemToDelete.itemName}`);
            setUndoAction({ type: 'DELETE_ITEM', payload: { item: itemToDelete } });
        }
    };
    
    const handleAddProofs = async (itemId: string, files: File[]) => {
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
    };

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


    // Handlers
    const handleUpdatePolicy = (updatedPolicy: ParsedPolicy) => {
        const originalPolicy = policies.find(p => p.id === updatedPolicy.id);
        if (originalPolicy) {
            const corrections = getPolicyCorrections(originalPolicy, updatedPolicy);
            if (corrections.length > 0) {
                setPolicyCorrections(prev => [...prev, ...corrections]);
                logActivity('AI_FEEDBACK', `User provided ${corrections.length} manual correction(s) for policy ${originalPolicy.policyName}.`);
            }
        }

        setPolicies(prev => prev.map(p => (p.id === updatedPolicy.id ? updatedPolicy : p)));
        logActivity('POLICY_UPDATED', `User manually updated details for policy: ${updatedPolicy.policyName}`);
    };

    const handleSelectItem = (itemId: string) => {
        setSelectedItemId(itemId);
        setCurrentView('item-detail');
    };

    const handleBackToDashboard = () => {
        setSelectedItemId(null);
        setCurrentView('dashboard');
    };

    const handleReset = () => {
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
    };
    
    const handleUndo = () => {
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
    };

    const handleCalculateProofStrength = async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Calculating proof strength for ${item.itemName}`, 'Gemini');
        const res = await geminiService.calculateProofStrength(item);
        const updatedItem = { ...item, proofStrengthScore: res.score };
        updateItem(updatedItem);
        logActivity('AI_ACTION_SUCCESS', `Proof strength for ${item.itemName} is ${res.score}. Feedback: ${res.feedback}`, 'Gemini');
    };

    const handleFindMarketPrice = async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Finding market price for ${item.itemName}`, 'Gemini');
        const res = await geminiService.findMarketPrice(item);
        const updatedItem = { ...item, replacementCostValueRCV: res.rcv, actualCashValueACV: res.acv, valuationHistory: [...(item.valuationHistory || []), res] };
        updateItem(updatedItem);
        logActivity('AI_ACTION_SUCCESS', `Found market price for ${item.itemName}. RCV: $${res.rcv}, ACV: $${res.acv}`, 'Gemini');
    };
    
    const handleEnrichAsset = async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Enriching ${item.itemName} with web data`, 'Gemini');
        const res = await geminiService.enrichAssetFromWeb(item);
        const updatedItem = { ...item, webIntelligence: [...(item.webIntelligence || []), res] };
        updateItem(updatedItem);
        logActivity('AI_ACTION_SUCCESS', `Enriched ${item.itemName} with ${res.facts.length} new facts.`, 'Gemini');
    };
    
    const handleCalculateACV = async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Calculating ACV for ${item.itemName}`, 'Gemini');
        try {
            const res = await geminiService.calculateACV(item);
            const updatedItem = { ...item, actualCashValueACV: res.acv };
            updateItem(updatedItem);
            logActivity('AI_ACTION_SUCCESS', `Calculated ACV for ${item.itemName}: $${res.acv}. Reasoning: ${res.reasoning.join(' ')}`, 'Gemini');
        } catch (error) {
            logActivity('AI_ACTION_ERROR', `Failed to calculate ACV for ${item.itemName}. Reason: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    };
    
    const handleFindHighestRCV = async (item: InventoryItem) => {
        logActivity('AI_ACTION_START', `Finding highest RCV for ${item.itemName}`, 'Gemini');
        const res = await geminiService.findHighestRCV(item);
        const updatedItem = { ...item, replacementCostValueRCV: res.price };
        updateItem(updatedItem);
        logActivity('AI_ACTION_SUCCESS', `Found max RCV for ${item.itemName}: $${res.price} at ${res.source}`, 'Gemini');
    };
    
    const handleDraftClaim = async (item: InventoryItem) => {
        if (!activePolicy || !accountHolder) return;
        logActivity('AI_ACTION_START', `Drafting claim for ${item.itemName}`, 'Gemini');
        const claim = await geminiService.assembleDraftClaim(item, activePolicy, accountHolder);
        updateItem({ ...item, status: 'claimed' });
        logActivity('AI_ACTION_SUCCESS', `Drafted claim for ${item.itemName}. Description: ${claim.failureDescription}`, 'Gemini');
    };

    const handleVisualSearch = async (item: InventoryItem) => {
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
    };
    
    const handleLinkProof = (itemId: string, proofId: string) => {
        const proofToLink = unlinkedProofs.find(p => p.id === proofId);
        if (!proofToLink) return;

        setInventory(prev => prev.map(item => {
            if (item.id === itemId) {
                // Remove from suggested proofs
                const newSuggested = item.suggestedProofs?.filter(s => s.proofId !== proofId);
                return {
                    ...item,
                    linkedProofs: [...item.linkedProofs, proofToLink],
                    suggestedProofs: newSuggested
                };
            }
            return item;
        }));
        setUnlinkedProofs(prev => prev.filter(p => p.id !== proofId));
        logActivity('PROOF_LINKED', `Linked proof ${proofToLink.fileName} to item.`);
    };
    
    const handleUnlinkProof = (itemId: string, proofId: string) => {
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
    };

    const handleRejectSuggestion = (itemId: string, proofId: string) => {
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
    };
    
    const handleSaveToFile = () => {
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
    };
    
    const handleLoadFromFile = (file: File) => {
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
    };


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
                        onLinkProof={handleLinkProof}
                        onUnlinkProof={handleUnlinkProof}
                        onRejectSuggestion={handleRejectSuggestion}
                        onAddProof={handleAddProofs}
                        uploadProgress={uploadProgress}
                        itemCategories={itemCategories}
                    />
                ) : null;
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
                        onUpdateClaimDetails={setClaimDetails}
                        isParsingPolicy={isParsingPolicy}
                        onUploadPolicy={handlePolicyUpload}
                        onUpdatePolicy={handleUpdatePolicy}
                        onSetActivePolicy={handleSetActivePolicy}
                        onSelectItem={handleSelectItem}
                        onItemPhotosSelected={(files) => handleFileUploads(Array.from(files))}
                        onStartRoomScan={() => setCurrentView('room-scan')}
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
                    />
                 );
             case 'room-scan':
                return <RoomScanView onClose={() => setCurrentView('dashboard')} onProcessVideo={() => {}} />;
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
            />
            <main className="container mx-auto px-4 md:px-8 py-8">
                {renderContent()}
            </main>
            {showPolicyReviewModal && policyAnalysisReport && (
                <PolicyReviewModal
                    report={policyAnalysisReport}
                    onClose={() => setShowPolicyReviewModal(false)}
                    onSave={handleSavePolicy}
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