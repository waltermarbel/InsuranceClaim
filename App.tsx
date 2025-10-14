// Fix: Removed invalid file marker that was causing a parsing error.
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import UploadPage from './components/UploadPage';
import InventoryDashboard from './components/InventoryDashboard';
import ItemDetailView from './components/ItemDetailView';
import ProcessingPage from './components/ProcessingPage';
import BulkReviewPage from './components/BulkReviewPage';
import ActivityLogView from './components/ActivityLogView';
import ClaimStrategyGuide from './components/ClaimStrategyGuide';
import UndoToast from './components/UndoToast';
import SaveModal from './components/SaveModal';
import RoomScanView from './components/RoomScanView';

import * as geminiService from './services/geminiService';
import { InventoryItem, AccountHolder, ParsedPolicy, Proof, AppView, ActivityLogEntry, UndoableAction, ClaimDetails, ItemStatus, ProofSuggestion, UploadProgress } from './types';
import { fileToDataUrl, urlToDataUrl, sanitizeFileName, dataUrlToBlob, exportToCSV, exportToZip } from './utils/fileUtils';

// Mock data initialization
const INITIAL_INVENTORY: InventoryItem[] = geminiService.SCENARIO_INVENTORY_ITEMS;
const INITIAL_ACCOUNT_HOLDER: AccountHolder = geminiService.SCENARIO_ACCOUNT_HOLDER;
const INITIAL_POLICY: ParsedPolicy = geminiService.SCENARIO_POLICY;
const INITIAL_UNLINKED_PROOFS: Proof[] = geminiService.UNLINKED_PROOFS;

const App: React.FC = () => {
    // Core State
    const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
    const [policy, setPolicy] = useState<ParsedPolicy | null>(INITIAL_POLICY);
    const [unlinkedProofs, setUnlinkedProofs] = useState<Proof[]>(INITIAL_UNLINKED_PROOFS);
    const [accountHolder, setAccountHolder] = useState<AccountHolder>(INITIAL_ACCOUNT_HOLDER);
    const [claimDetails, setClaimDetails] = useState<ClaimDetails>({
        name: "Burglary Claim - 312 W 43rd St",
        dateOfLoss: "2024-07-20",
        incidentType: "Burglary",
        location: "312 W 43rd Street, Apt 14J, New York, NY 10036",
        policeReport: "NYPD-2024-845123",
        propertyDamageDetails: "Front door lock was forcibly broken and requires replacement.\nWindow in the living room was shattered.\nEstimated cost for door repair: $450\nEstimated cost for window replacement: $600"
    });

    // UI State
    const [currentView, setCurrentView] = useState<AppView>('dashboard');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [processingProgress, setProcessingProgress] = useState({ stage: '', current: 0, total: 0, fileName: '' });
    const [newlyProcessedItems, setNewlyProcessedItems] = useState<InventoryItem[]>([]);
    const [isParsingPolicy, setIsParsingPolicy] = useState(false);
    const [showLog, setShowLog] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [undoAction, setUndoAction] = useState<UndoableAction | null>(null);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [coverageFilter, setCoverageFilter] = useState('all');
    
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
                
                const newProof: Proof = {
                    id: `proof-web-${Date.now()}`,
                    type: 'image',
                    fileName: sanitizeFileName(`web_image_${item.itemName}.jpg`),
                    dataUrl: dataUrl,
                    mimeType: blob.type || 'image/jpeg',
                    createdBy: 'AI',
                };

                const newSuggestion: ProofSuggestion = {
                    proofId: newProof.id,
                    confidence: 90, // High confidence as it was a targeted search
                    reason: `Found on web at ${new URL(imageResult.source).hostname}`
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
    
    const processFiles = useCallback(async (files: File[], isProof: boolean) => {
        // Stage 1: Reading files with progress reporting
        const initialProgress: UploadProgress = {};
        files.forEach(f => initialProgress[f.name] = { loaded: 0, total: f.size });
        setUploadProgress(initialProgress);

        const filesWithDataUrl = await Promise.all(files.map(async file => {
            const dataUrl = await fileToDataUrl(file, (event) => {
                setUploadProgress(prev => prev ? { ...prev, [file.name]: { loaded: event.loaded, total: event.total } } : null);
            });
            return { file, dataUrl };
        }));

        setUploadProgress(null); // Uploading finished, now start processing
        setCurrentView('processing');

        // Stage 2: AI analysis
        const tempItems: InventoryItem[] = [];
        for (let i = 0; i < filesWithDataUrl.length; i++) {
            const { file, dataUrl } = filesWithDataUrl[i];
            setProcessingProgress({ stage: 'Analyzing with Gemini', current: i + 1, total: files.length, fileName: file.name });
            logActivity('FILE_UPLOADED', `User uploaded file: ${file.name}`);
            
            try {
                let analysisResult;
                if (file.type.startsWith('image/')) {
                    analysisResult = isProof ? await geminiService.analyzeProofImageWithGemini(file) : await geminiService.analyzeImageWithGemini(file);
                } else if (file.type === 'application/pdf') {
                    analysisResult = await geminiService.analyzeDocumentWithGemini(file);
                } else {
                    continue; // Skip unsupported file types
                }
                logActivity('AI_ANALYSIS_COMPLETE', `Gemini analyzed ${file.name}`, 'Gemini');

                const proof: Proof = {
                    id: `proof-${Date.now()}-${i}`,
                    type: file.type.startsWith('image/') ? 'image' : 'document',
                    fileName: file.name,
                    dataUrl: dataUrl,
                    mimeType: file.type,
                    createdBy: 'User',
                };
                
                const newItem: InventoryItem = {
                    id: `item-${Date.now()}-${i}`,
                    status: 'needs-review',
                    itemName: analysisResult.itemName,
                    itemDescription: analysisResult.description,
                    itemCategory: analysisResult.category,
                    originalCost: analysisResult.estimatedValue,
                    replacementCostValueRCV: analysisResult.estimatedValue,
                    brand: analysisResult.brand,
                    model: analysisResult.model,
                    linkedProofs: [proof],
                    createdAt: new Date().toISOString(),
                    createdBy: 'AI Assisted',
                    proofStrengthScore: 60, // Default score
                };
                tempItems.push(newItem);
            } catch (error) {
                console.error(`Failed to process file ${file.name}:`, error);
                logActivity('PROCESSING_ERROR', `Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        setNewlyProcessedItems(tempItems);
        setCurrentView('bulk-review');

    }, [logActivity]);
    
    // Background task to categorize unlinked proofs on startup
    useEffect(() => {
        const categorizeProofs = async () => {
            const proofsToCategorize = unlinkedProofs.filter(p => !p.predictedCategory);
            if (proofsToCategorize.length === 0) return;

            logActivity('AI_ACTION_START', `Categorizing ${proofsToCategorize.length} unlinked proofs.`, 'Gemini');

            const categorizedProofs = await Promise.all(proofsToCategorize.map(async proof => {
                try {
                    const result = await geminiService.categorizeUnlinkedProof(proof);
                    return { ...proof, predictedCategory: result.category, predictedCategoryReasoning: result.reasoning };
                } catch (error) {
                    console.error(`Failed to categorize proof ${proof.fileName}:`, error);
                    return proof; // Return original proof if categorization fails
                }
            }));

            // Create a map for efficient updates
            const categorizedMap = new Map(categorizedProofs.map(p => [p.id, p]));

            setUnlinkedProofs(prevProofs =>
                prevProofs.map(p => categorizedMap.get(p.id) || p)
            );
             logActivity('AI_ACTION_SUCCESS', `Successfully categorized ${proofsToCategorize.length} proofs.`, 'Gemini');
        };

        categorizeProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    const handlePolicyUpload = async (file: File) => {
        setIsParsingPolicy(true);
        logActivity('POLICY_UPLOAD', `User uploaded policy: ${file.name}`);
        try {
            const parsed = await geminiService.parsePolicyDocument(file);
            logActivity('AI_POLICY_PARSE', `Gemini parsed the policy with ${parsed.confidenceScore}% confidence.`, 'Gemini');
            setPolicy({ ...parsed, isVerified: false }); // Set to unverified for review
        } catch (error) {
            console.error(error);
            logActivity('ERROR', `Failed to parse policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsParsingPolicy(false);
        }
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
            const newProof: Proof = {
                id: `proof-detail-${Date.now()}-${i}`,
                type: file.type.startsWith('image/') ? 'image' : 'document',
                fileName: file.name,
                dataUrl: dataUrl,
                mimeType: file.type,
                createdBy: 'User',
            };
            return newProof;
        }));

        setUploadProgress(null);
        setInventory(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, linkedProofs: [...item.linkedProofs, ...newProofs] }
                : item
        ));
        logActivity('PROOFS_ADDED', `Added ${newProofs.length} proof(s) to item.`);
    };

    const handleDownloadVault = () => {
        const date = new Date().toISOString().split('T')[0];
        let filename = `VeritasVault_Export_${date}.csv`;
        let itemsToExport = filteredItems;

        // Create a more descriptive filename if filters are active
        if (categoryFilter !== 'all' || statusFilter !== 'all' || searchTerm) {
            const cat = categoryFilter !== 'all' ? `_${categoryFilter}` : '';
            const stat = statusFilter !== 'all' ? `_${statusFilter}` : '';
            const search = searchTerm ? `_search-${sanitizeFileName(searchTerm)}` : '';
            if(itemsToExport.length === 1) {
                filename = `VeritasVault_Export_${sanitizeFileName(itemsToExport[0].itemName)}.csv`
            } else {
                filename = `VeritasVault_Export${cat}${stat}${search}_${date}.csv`;
            }
        }
        
        exportToCSV(itemsToExport, filename);
        logActivity('EXPORT_CSV', `Exported ${itemsToExport.length} items to CSV.`);
    };
    
    // AI Actions
    const runAiAction = async <T,>(
        item: InventoryItem, 
        action: (item: InventoryItem) => Promise<T>,
        updateLogic: (item: InventoryItem, result: T) => Partial<InventoryItem>,
        actionName: string,
        details: (result: T) => string
    ) => {
        try {
            logActivity(`AI_ACTION_START`, `Running "${actionName}" for ${item.itemName}`, 'Gemini');
            const result = await action(item);
            const updates = updateLogic(item, result);
            updateItem({ ...item, ...updates });
            logActivity(`AI_ACTION_SUCCESS`, `"${actionName}" successful. ${details(result)}`, 'Gemini');
        } catch(error) {
            console.error(`Error with ${actionName}:`, error);
            logActivity(`AI_ACTION_ERROR`, `Error with ${actionName} on ${item.itemName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleLinkProof = (itemId: string, proofId: string) => {
        const itemToUpdate = inventory.find(i => i.id === itemId);
        const proofToLink = unlinkedProofs.find(p => p.id === proofId);

        if (itemToUpdate && proofToLink) {
            const updatedItem = {
                ...itemToUpdate,
                linkedProofs: [...itemToUpdate.linkedProofs, proofToLink],
                suggestedProofs: itemToUpdate.suggestedProofs?.filter(s => s.proofId !== proofId)
            };
            setInventory(prev => prev.map(i => i.id === itemId ? updatedItem : i));
            setUnlinkedProofs(prev => prev.filter(p => p.id !== proofId));
            logActivity('PROOF_LINKED', `Linked proof '${proofToLink.fileName}' to item '${itemToUpdate.itemName}'.`);
        }
    };

    const handleRejectSuggestion = (itemId: string, proofId: string) => {
        const itemToUpdate = inventory.find(i => i.id === itemId);
        if (itemToUpdate) {
            const updatedItem = {
                ...itemToUpdate,
                suggestedProofs: itemToUpdate.suggestedProofs?.filter(s => s.proofId !== proofId)
            };
            updateItem(updatedItem);
            logActivity('SUGGESTION_REJECTED', `Rejected proof suggestion for item '${itemToUpdate.itemName}'.`);
        }
    };

    // Rendering Logic
    const selectedItem = inventory.find(item => item.id === selectedItemId);

    const filteredItems = inventory.filter(item => {
        const searchMatch = searchTerm ? 
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        const categoryMatch = categoryFilter !== 'all' ? item.itemCategory === categoryFilter : true;
        const statusMatch = statusFilter !== 'all' ? item.status === statusFilter : true;
        const coverageMatch = coverageFilter !== 'all' && policy?.isVerified ? geminiService.selectBestCoverage(item.itemCategory, policy!)?.category === coverageFilter : true;

        return searchMatch && categoryMatch && statusMatch && coverageMatch;
    });
    
    const renderContent = () => {
        if (currentView === 'upload' && uploadProgress) {
             return <UploadPage onItemPhotosSelected={() => {}} onProofDocumentsSelected={() => {}} uploadProgress={uploadProgress} />;
        }

        switch (currentView) {
            case 'upload':
                return <UploadPage onItemPhotosSelected={(f) => processFiles(Array.from(f), false)} onProofDocumentsSelected={(f) => processFiles(Array.from(f), true)} uploadProgress={uploadProgress} />;
            case 'processing':
                return <ProcessingPage progress={processingProgress} onCancel={() => setCurrentView('dashboard')} />;
            case 'bulk-review':
                return <BulkReviewPage items={newlyProcessedItems} onFinalize={(approved, rejected) => {
                    const enrichedApproved = approved.map(item => ({ ...item, status: 'enriching' as ItemStatus }));
                    setInventory(prev => [...prev, ...enrichedApproved]);
                    logActivity('BULK_ADD', `Added ${approved.length} new items to vault for enrichment.`);
                    if (rejected.length > 0) logActivity('BULK_REJECT', `Rejected ${rejected.length} items.`);
                    
                    enrichedApproved.forEach(item => runAutonomousEnrichment(item));

                    setNewlyProcessedItems([]);
                    setCurrentView('dashboard');
                }} />;
            case 'item-detail':
                return selectedItem ? <ItemDetailView 
                    item={selectedItem}
                    unlinkedProofs={unlinkedProofs}
                    policy={policy}
                    accountHolder={accountHolder}
                    onBack={() => setSelectedItemId(null)}
                    onUpdateItem={updateItem}
                    onDeleteItem={deleteItem}
                    // AI Actions
                    onFindMarketPrice={item => runAiAction(item, geminiService.findMarketPrice, (i, r) => ({ replacementCostValueRCV: r.rcv, actualCashValueACV: r.acv }), 'Market Price', r => `RCV: $${r.rcv}, ACV: $${r.acv}`)}
                    onEnrichAsset={item => runAiAction(item, geminiService.enrichAssetFromWeb, (i, r) => ({ itemDescription: `${i.itemDescription}\n\nWeb Intelligence:\n${r.facts.map(f => `- ${f.fact}`).join('\n')}` }), 'Enrich Data', r => `Found ${r.facts.length} facts.`)}
                    onCalculateProofStrength={item => runAiAction(item, geminiService.calculateProofStrength, (i, r) => ({ proofStrengthScore: r.score }), 'Proof Strength', r => `Score: ${r.score}`)}
                    onCalculateACV={item => runAiAction(item, geminiService.calculateACV, (i, r) => ({ actualCashValueACV: r.acv }), 'Calculate ACV', r => `ACV: $${r.acv}`)}
                    onFindHighestRCV={item => runAiAction(item, geminiService.findHighestRCV, (i, r) => ({ replacementCostValueRCV: r.price }), 'Find Max RCV', r => `Price: $${r.price}`)}
                    onDraftClaim={item => runAiAction(item, (i) => geminiService.assembleDraftClaim(i, policy!, accountHolder), (i, r) => ({ status: 'claimed' }), 'Draft Claim', r => `Draft created with ID ${r.id}`)}
                    onFuzzyMatch={() => {}} // Now autonomous
                    onFindProductImage={handleFindProductImage}
                    onLinkProof={handleLinkProof}
                    onUnlinkProof={() => {}} // Placeholder
                    onRejectSuggestion={handleRejectSuggestion}
                    onAddProof={handleAddProofs}
                    uploadProgress={uploadProgress}
                /> : null;
            case 'room-scan':
                return <RoomScanView onClose={() => setCurrentView('dashboard')} onProcessVideo={() => {}} />;
            case 'dashboard':
            default:
                return <InventoryDashboard
                    items={inventory}
                    filteredItems={filteredItems}
                    accountHolder={accountHolder}
                    policy={policy}
                    claimDetails={claimDetails}
                    onUpdateClaimDetails={setClaimDetails}
                    isParsingPolicy={isParsingPolicy}
                    onUploadPolicy={handlePolicyUpload}
                    onUpdatePolicy={(p) => setPolicy(p)}
                    onVerifyPolicy={() => {
                        if (policy) {
                            setPolicy({ ...policy, isVerified: true });
                            logActivity('POLICY_VERIFIED', 'User verified the insurance policy.');
                        }
                    }}
                    onSelectItem={(id) => setSelectedItemId(id)}
                    onItemPhotosSelected={(f) => processFiles(Array.from(f), false)}
                    onProofDocumentsSelected={(f) => processFiles(Array.from(f), true)}
                    onStartRoomScan={() => setCurrentView('room-scan')}
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    categoryFilter={categoryFilter}
                    onCategoryFilterChange={setCategoryFilter}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    coverageFilter={coverageFilter}
                    onCoverageFilterChange={setCoverageFilter}
                />;
        }
    };
    
    useEffect(() => {
        if (selectedItemId) {
            setCurrentView('item-detail');
        } else if (currentView === 'item-detail') {
            setCurrentView('dashboard');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItemId]);

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <Header 
                onReset={() => {
                    setInventory([]);
                    setPolicy(null);
                    setUnlinkedProofs([]);
                    setActivityLog([]);
                    setCurrentView('upload');
                }}
                onShowGuide={() => setShowGuide(true)}
                onShowLog={() => setShowLog(true)}
                onDownloadVault={handleDownloadVault}
                showDownload={inventory.length > 0}
                onSaveToFile={() => setShowSaveModal(true)}
                onLoadFromFile={() => {}}
            />
            <main className="container mx-auto p-4 md:p-8">
                {renderContent()}
            </main>
            {showLog && <ActivityLogView log={activityLog} onClose={() => setShowLog(false)} />}
            {showGuide && <ClaimStrategyGuide onClose={() => setShowGuide(false)} />}
            {showSaveModal && <SaveModal onClose={() => setShowSaveModal(false)} onQuickBackup={() => {}} onForensicExport={() => exportToZip(inventory, unlinkedProofs)} />}
            {undoAction && <UndoToast action={undoAction} onDismiss={() => setUndoAction(null)} onUndo={() => {
                if (undoAction.type === 'DELETE_ITEM') {
                    setInventory(prev => [...prev, undoAction.payload.item].sort((a,b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)));
                    logActivity('UNDO_DELETE', `Restored item: ${undoAction.payload.item.itemName}`);
                }
                setUndoAction(null);
            }} />}
        </div>
    );
};

export default App;
