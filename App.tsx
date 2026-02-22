
import React, { useState, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import { useAppState, useAppDispatch } from './context/AppContext.tsx';
import { Header } from './components/Header.tsx';
import InventoryDashboard from './components/InventoryDashboard.tsx';
import ItemDetailView from './components/ItemDetailView.tsx';
import StrategicDashboard from './components/StrategicDashboard.tsx';
import UploadPage from './components/UploadPage.tsx';
import GeminiAssistant from './components/GeminiAssistant.tsx';
import ProcessingPage from './components/ProcessingPage.tsx';
import BulkReviewPage from './components/BulkReviewPage.tsx';
import SaveModal from './components/SaveModal.tsx';
import ImageZoomModal from './components/ImageZoomModal.tsx';
import ImageEditorModal from './components/ImageEditorModal.tsx';
import ImageGeneratorModal from './components/ImageGeneratorModal.tsx';
import AudioRecorderModal from './components/AudioRecorderModal.tsx';
import AddItemFromWebModal from './components/AddItemFromWebModal.tsx';
import PolicyReviewModal from './components/PolicyReviewModal.tsx';
import { SpinnerIcon } from './components/icons.tsx';
import * as geminiService from './services/geminiService.ts';
import * as storageService from './services/storageService.ts';
import { InventoryItem, Proof, AutonomousInventoryItem, ProcessingInference, PolicyAnalysisReport, PipelineItem } from './types.ts';
import { urlToDataUrl, dataUrlToBlob, sanitizeFileName, exportToZip, fileToDataUrl, blobToDataUrl } from './utils/fileUtils.ts';

const App: React.FC = () => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { inventory, isInitialized, currentView, selectedItemId, lastScrollPosition, processingQueue } = state;
    
    // Workflow State
    const [activeTab, setActiveTab] = useState<'evidence' | 'inventory' | 'claim'>('inventory');
    // New: Central search state for AI control
    const [searchTerm, setSearchTerm] = useState('');

    // Modal/Overlay State
    const [showAssistant, setShowAssistant] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(true);
    const [showWebItemModal, setShowWebItemModal] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, { loaded: number, total: number }> | null>(null);
    
    // Policy Ingestion State
    const [policyAnalysisReport, setPolicyAnalysisReport] = useState<PolicyAnalysisReport | null>(null);
    const [isAnalyzingPolicy, setIsAnalyzingPolicy] = useState(false);

    // Item Detail Action States
    const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
    const [editingProof, setEditingProof] = useState<Proof | null>(null);
    const [generatingImageItem, setGeneratingImageItem] = useState<InventoryItem | null>(null);
    const [recordingAudioItem, setRecordingAudioItem] = useState<InventoryItem | null>(null);

    // Processing State (Durable Ledger Logic)
    const [accumulatedReviewItems, setAccumulatedReviewItems] = useState<InventoryItem[]>([]);

    const logActivity = useCallback((action: string, details: string, app: 'VeritasVault' | 'Gemini' = 'VeritasVault') => {
        dispatch({ type: 'LOG_ACTIVITY', payload: { action, details, app } });
    }, [dispatch]);

    // --- INITIALIZATION SIDE EFFECTS ---
    useEffect(() => {
        const initStaticData = async () => {
            if (!isInitialized) return;
            
            // Seed the MacBook receipt blob if missing (simulating the file existing on disk for the initial inventory item)
            const proofId = 'proof-macbook-receipt';
            const exists = await storageService.getProofBlob(proofId);
            
            if (!exists) {
                // Minimal valid PDF structure for visualization/download
                const pdfContent = `%PDF-1.4
%âãÏÓ
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 68
>>
stream
BT
/F1 24 Tf
50 700 Td
(Official Receipt) Tj
/F1 12 Tf
50 650 Td
(Item: MacBook Pro 16-inch) Tj
50 630 Td
(Date: 2019-02-21) Tj
50 610 Td
(Amount: $2,499.00) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000220 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
338
%%EOF`;
                const blob = new Blob([pdfContent], { type: 'application/pdf' });
                
                // We mock the Proof object just for the saveProof signature, only ID matters here
                const proofMeta: Proof = {
                    id: proofId,
                    type: 'document',
                    fileName: 'macbook_receipt.pdf',
                    mimeType: 'application/pdf',
                    createdBy: 'User'
                };
                
                await storageService.saveProof(proofMeta, blob);
                console.log('Seeded static proof blob:', proofId);
            }
        };
        
        initStaticData();
    }, [isInitialized]);

    // --- SCROLL PERSISTENCE ---
    // Restore scroll position when view is mounted/initialized
    useLayoutEffect(() => {
        if (isInitialized && lastScrollPosition !== undefined && lastScrollPosition > 0) {
            window.scrollTo(0, lastScrollPosition);
        }
    }, [isInitialized]); // Run once when app initializes

    // Track scroll position
    useEffect(() => {
        if (!isInitialized) return;

        let scrollTimeout: number;
        const handleScroll = () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = window.setTimeout(() => {
                dispatch({ type: 'UPDATE_SCROLL', payload: window.scrollY });
            }, 200); // Debounce scroll updates
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeout) clearTimeout(scrollTimeout);
        };
    }, [isInitialized, dispatch]);


    // --- NAVIGATION HANDLER ---
    const handleNavigate = (tab: 'evidence' | 'inventory' | 'claim') => {
        setActiveTab(tab);
        if (currentView !== 'dashboard') {
            dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
        }
    };

    // --- EXPORT HANDLERS ---
    const handleQuickBackup = useCallback(() => {
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `VeritasVault_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowSaveModal(false);
        logActivity('BACKUP_CREATED', 'User created a quick JSON backup.');
    }, [state, logActivity]);

    const handleForensicExport = useCallback(async () => {
        try {
            await exportToZip(state.inventory, state.unlinkedProofs);
            setShowSaveModal(false);
            logActivity('EXPORT_CREATED', 'User created a forensic ZIP export.');
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed. Please check console for details.");
        }
    }, [state.inventory, state.unlinkedProofs, logActivity]);


    // --- AUTOMATED ENRICHMENT PIPELINE ---
    const runForensicEnrichment = useCallback(async (items: InventoryItem[]) => {
        const itemIds = items.map(i => i.id);
        dispatch({ type: 'BULK_UPDATE_ITEM_STATUS', payload: { ids: itemIds, status: 'enriching' } });

        const batchClaimedProofIds = new Set<string>();

        for (const item of items) {
            let updatedItem = { ...item };
            try {
                // 1. Web Intelligence
                if (!item.webIntelligence || item.webIntelligence.length === 0) {
                    try {
                        const webData = await geminiService.enrichAssetFromWeb(item);
                        if (webData && webData.facts.length > 0) {
                            updatedItem.webIntelligence = [webData];
                            if (updatedItem.itemDescription.length < 20 && webData.facts[0].fact) {
                                updatedItem.itemDescription = `${updatedItem.itemDescription}\n\nSpecs: ${webData.facts[0].fact}`;
                            }
                        }
                    } catch (e) { console.warn("Web enrich failed", e); }
                }

                // 2. Market Valuation
                if (!item.replacementCostValueRCV || item.replacementCostValueRCV === 0) {
                    try {
                        const pricing = await geminiService.findMarketPrice(updatedItem);
                        if (pricing) {
                            updatedItem.replacementCostValueRCV = pricing.rcv;
                            updatedItem.actualCashValueACV = pricing.acv;
                            updatedItem.valuationHistory = [pricing];
                        }
                    } catch (e) { console.warn("Pricing failed", e); }
                }

                // 3. Auto-Link Evidence (Fuzzy Match)
                // Filter locally first to avoid re-linking proofs already taken in this batch
                const availableProofs = state.unlinkedProofs.filter(p => !batchClaimedProofIds.has(p.id));
                
                if (availableProofs.length > 0) {
                    try {
                        const matchResult = await geminiService.fuzzyMatchProofs(updatedItem, availableProofs);
                        const bestMatch = matchResult.suggestions.sort((a, b) => b.confidence - a.confidence)[0];
                        
                        if (bestMatch && bestMatch.confidence >= 80) {
                            const proof = availableProofs.find(p => p.id === bestMatch.proofId);
                            if (proof) {
                                updatedItem.linkedProofs = [...updatedItem.linkedProofs, proof];
                                updatedItem.status = 'active'; 
                                updatedItem.proofStrengthScore = (updatedItem.proofStrengthScore || 0) + 20; 
                                
                                batchClaimedProofIds.add(proof.id);
                                dispatch({ type: 'REMOVE_UNLINKED_PROOF', payload: proof.id });
                                
                                logActivity('AUTO_LINKED_PROOF', `Linked ${proof.fileName} to ${updatedItem.itemName} (${bestMatch.confidence}% match)`, 'Gemini');
                            }
                        } else if (matchResult.suggestions.length > 0) {
                            updatedItem.suggestedProofs = matchResult.suggestions;
                        }
                    } catch (e) { console.warn("Fuzzy match failed", e); }
                }

                // 4. Missing Image Recovery (Web)
                if (updatedItem.linkedProofs.length === 0) {
                     try {
                         const imageResult = await geminiService.findProductImageFromWeb(updatedItem);
                         if (imageResult && imageResult.imageUrl) {
                            const dataUrl = await urlToDataUrl(imageResult.imageUrl);
                            const blob = dataUrlToBlob(dataUrl);
                            const cleanItemName = sanitizeFileName(`${updatedItem.brand || ''}_${updatedItem.itemName}`);
                            const newProof: Proof = {
                                id: `proof-auto-${Date.now()}`,
                                type: 'image',
                                fileName: `web_ref_${cleanItemName}.jpg`,
                                // dataUrl: dataUrl, // Removed to save state size
                                mimeType: blob.type || 'image/jpeg',
                                createdBy: 'AI',
                                purpose: 'Proof of Possession', 
                                notes: `Sourced from: ${imageResult.source}`
                            };
                            
                            await storageService.saveProof(newProof, blob);
                            
                            updatedItem.linkedProofs = [newProof];
                            updatedItem.status = 'active'; 
                         }
                     } catch (e) { console.warn("Web image find failed", e); }
                }

                // 5. Visual Extraction (Vision API)
                const imageProof = updatedItem.linkedProofs.find(p => p.type === 'image');
                if (imageProof) {
                    // Check if we are missing key visual details
                    const missingDetails = !updatedItem.brand || !updatedItem.model || !updatedItem.serialNumber || !updatedItem.condition;
                    
                    if (missingDetails) {
                         try {
                            // Resolve dataUrl for analysis
                            let dataUrl = imageProof.dataUrl;
                            if (!dataUrl) {
                                 const blob = await storageService.getProofBlob(imageProof.id);
                                 if (blob) dataUrl = await blobToDataUrl(blob);
                            }

                            if (dataUrl) {
                                const visualData = await geminiService.analyzeImageForItemDetails({...imageProof, dataUrl}, updatedItem);
                                
                                // Merge found data
                                if (visualData.brand && !updatedItem.brand) updatedItem.brand = visualData.brand;
                                if (visualData.model && !updatedItem.model) updatedItem.model = visualData.model;
                                if (visualData.serialNumber && !updatedItem.serialNumber) updatedItem.serialNumber = visualData.serialNumber;
                                if (visualData.condition && !updatedItem.condition) updatedItem.condition = visualData.condition as any;
                                if (visualData.itemDescription && updatedItem.itemDescription.length < 50) {
                                    updatedItem.itemDescription = visualData.itemDescription;
                                }
                                
                                logActivity('VISUAL_EXTRACTION', `AI extracted details from ${imageProof.fileName}`, 'Gemini');
                            }
                         } catch (e) {
                             console.error("Visual extraction failed", e);
                             logActivity('VISUAL_EXTRACTION_ERROR', `Failed to extract details for ${updatedItem.itemName}`, 'Gemini');
                         }
                    }
                }

                // Recalculate proof strength
                try {
                    const strength = await geminiService.calculateProofStrength(updatedItem);
                    updatedItem.proofStrengthScore = strength.score;
                } catch (e) { console.warn("Strength calc failed", e); }

                updatedItem.status = updatedItem.status === 'needs-review' ? 'needs-review' : 'active';
                dispatch({ type: 'UPDATE_ITEM', payload: updatedItem });
                logActivity('AUTO_ENRICHMENT_COMPLETE', `Fully processed ${item.itemName}`, 'Gemini');

            } catch (e) {
                console.error(`Enrichment failed for ${item.id}`, e);
                dispatch({ type: 'UPDATE_ITEM', payload: { ...item, status: 'active' } });
            }
        }
    }, [dispatch, logActivity, state.unlinkedProofs]);


    // --- MANUAL ACTION HANDLERS ---

    const handleAddProof = useCallback(async (itemId: string, files: File[]) => {
        const item = inventory.find(i => i.id === itemId);
        if (!item) return;

        const newProofs: Proof[] = [];
        for (const file of files) {
            try {
                // Generate ID first
                const proofId = `proof-manual-${Date.now()}-${file.name}`;
                
                const newProof: Proof = {
                    id: proofId,
                    type: file.type.startsWith('image/') ? 'image' : 'document',
                    fileName: file.name,
                    // dataUrl: undefined, // Do not store base64 in Redux state
                    mimeType: file.type,
                    createdBy: 'User',
                    purpose: 'Supporting Document',
                    createdAt: new Date().toISOString()
                };
                
                // IMPORTANT: Persist the blob immediately to IndexedDB
                await storageService.saveProof(newProof, file);

                newProofs.push(newProof);
            } catch (e) {
                console.error("Error adding proof file", file.name, e);
            }
        }

        if (newProofs.length > 0) {
            dispatch({ type: 'ADD_PROOFS_TO_ITEM', payload: { itemId, proofs: newProofs } });
            logActivity('MANUAL_PROOF_ADDED', `User added ${newProofs.length} proof(s) to ${item.itemName}`);
            // Re-run enrichment to check if status/value can be updated with new proof
            runForensicEnrichment([item]); 
        }
    }, [inventory, dispatch, logActivity, runForensicEnrichment]);

    const handleFindWebImage = useCallback(async () => {
        if (!selectedItemId) return;
        const item = inventory.find(i => i.id === selectedItemId);
        if (!item) return;

        try {
            const imageResult = await geminiService.findProductImageFromWeb(item);
            if (imageResult && imageResult.imageUrl) {
                const dataUrl = await urlToDataUrl(imageResult.imageUrl);
                const blob = dataUrlToBlob(dataUrl);
                
                const newProof: Proof = {
                    id: `proof-web-${Date.now()}`,
                    type: 'image',
                    fileName: `web_image_${sanitizeFileName(item.itemName)}.jpg`,
                    // dataUrl: dataUrl,
                    mimeType: 'image/jpeg',
                    createdBy: 'AI',
                    purpose: 'Proof of Possession',
                    notes: `Sourced from web: ${imageResult.source}`
                };
                
                await storageService.saveProof(newProof, blob);
                
                dispatch({ type: 'ADD_PROOFS_TO_ITEM', payload: { itemId: item.id, proofs: [newProof] } });
                logActivity('WEB_IMAGE_FOUND', `AI found web image for ${item.itemName}`, 'Gemini');
            } else {
                alert("Could not find a suitable image on the web.");
            }
        } catch (error) {
            console.error("Error finding web image:", error);
            alert("Error searching for image. Please try again.");
        }
    }, [selectedItemId, inventory, dispatch, logActivity]);

    const handleSaveEditedImage = useCallback(async (originalProof: Proof, newDataUrl: string) => {
        if (!selectedItemId) return;
        
        const blob = dataUrlToBlob(newDataUrl);
        const newProof: Proof = {
            ...originalProof,
            id: `proof-edited-${Date.now()}`,
            fileName: `edited_${originalProof.fileName}`,
            // dataUrl: newDataUrl, 
            createdBy: 'AI',
            notes: `Edited version of ${originalProof.fileName}`
        };
        
        await storageService.saveProof(newProof, blob);
        
        dispatch({ type: 'ADD_PROOFS_TO_ITEM', payload: { itemId: selectedItemId, proofs: [newProof] } });
        setEditingProof(null);
        logActivity('IMAGE_EDITED', `AI edited image for item.`, 'Gemini');
    }, [selectedItemId, dispatch, logActivity]);

    const handleSaveGeneratedImage = useCallback(async (item: InventoryItem, dataUrl: string) => {
        const blob = dataUrlToBlob(dataUrl);
        const newProof: Proof = {
            id: `proof-gen-${Date.now()}`,
            type: 'image',
            fileName: `generated_visual_${sanitizeFileName(item.itemName)}.jpg`,
            // dataUrl: dataUrl,
            mimeType: 'image/jpeg',
            createdBy: 'AI',
            purpose: 'Proof of Possession', // Synthetic
            notes: 'AI Generated Visual Representation'
        };
        
        await storageService.saveProof(newProof, blob);
        
        dispatch({ type: 'ADD_PROOFS_TO_ITEM', payload: { itemId: item.id, proofs: [newProof] } });
        setGeneratingImageItem(null);
        logActivity('IMAGE_GENERATED', `AI generated visual for ${item.itemName}`, 'Gemini');
    }, [dispatch, logActivity]);

    const handleSaveAudioNote = useCallback(async (item: InventoryItem, audioBlob: Blob, transcription: string) => {
        const newProof: Proof = {
            id: `proof-audio-${Date.now()}`,
            type: 'audio',
            fileName: `audio_note_${Date.now()}.webm`,
            // dataUrl: dataUrl,
            mimeType: 'audio/webm',
            createdBy: 'User',
            purpose: 'Supporting Document',
            notes: `Transcription: ${transcription}`
        };
        
        await storageService.saveProof(newProof, audioBlob);
        
        dispatch({ type: 'ADD_PROOFS_TO_ITEM', payload: { itemId: item.id, proofs: [newProof] } });
        setRecordingAudioItem(null);
        logActivity('AUDIO_NOTE_ADDED', `User recorded audio note for ${item.itemName}`);
    }, [dispatch, logActivity]);

    // New: Handle CSV Import by triggering forensic enrichment pipeline
    const handleImportInventory = useCallback((items: InventoryItem[]) => {
        dispatch({ type: 'ADD_INVENTORY_ITEMS', payload: items });
        logActivity('CSV_IMPORT', `Imported ${items.length} items from CSV`, 'VeritasVault');
        // Immediately run enrichment to link proofs and find value
        runForensicEnrichment(items);
    }, [dispatch, runForensicEnrichment, logActivity]);


    // --- AUTONOMOUS PROCESSING PIPELINE (DURABLE LEDGER) ---
    const handleFileUploads = useCallback(async (files: FileList) => {
        const filesArray = Array.from(files);
        if (filesArray.length === 0) return;

        setActiveTab('inventory');
        dispatch({ type: 'SET_VIEW', payload: 'autonomous-processor' });
        
        const newPipelineItems: PipelineItem[] = [];

        // 1. Persist blobs immediately and create ledger entries
        for (const file of filesArray) {
            const proofId = `proof-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            // Save raw blob
            const dummyProof: Proof = { 
                id: proofId, 
                fileName: file.name, 
                mimeType: file.type, 
                type: 'document', // placeholder
                createdBy: 'AI'
            };
            await storageService.saveProof(dummyProof, file);

            newPipelineItems.push({
                id: `pipe-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                proofId: proofId,
                fileName: file.name,
                mimeType: file.type,
                status: 'pending',
                retries: 0
            });
        }

        dispatch({ type: 'ENQUEUE_PIPELINE_ITEMS', payload: newPipelineItems });
        // The useEffect below will react to the queue change
    }, [dispatch]);

    // Pipeline Processor Effect
    useEffect(() => {
        if (!processingQueue || processingQueue.length === 0) return;

        // Find the next pending item
        const nextItem = processingQueue.find(item => item.status === 'pending');
        
        // If everything is processed, check if we should switch views
        if (!nextItem) {
            const hasProcessing = processingQueue.some(item => item.status === 'processing');
            if (!hasProcessing) {
                // All done
                const processedItems = accumulatedReviewItems; // From state
                if (processedItems.length > 0 && currentView === 'autonomous-processor') {
                    // Slight delay to show 100% progress
                    setTimeout(() => {
                        dispatch({ type: 'SET_VIEW', payload: 'autonomous-review' });
                        // Clear the queue or mark as archived? 
                        // For now, we keep it in state until review is finalized, then clear.
                    }, 500);
                } else if (currentView === 'autonomous-processor') {
                     dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
                }
            }
            return;
        }

        // Process 'nextItem'
        const processItem = async () => {
            dispatch({ type: 'UPDATE_PIPELINE_ITEM_STATUS', payload: { id: nextItem.id, status: 'processing' } });
            
            try {
                // Retrieve Blob
                const fileBlob = await storageService.getProofBlob(nextItem.proofId);
                if (!fileBlob) throw new Error("File blob not found in storage");

                const file = new File([fileBlob], nextItem.fileName, { type: nextItem.mimeType });
                
                // Run AI (Single item batch)
                const results = await geminiService.runAutonomousProcessor([file]);
                const result = results[0];

                if (result && result.result) {
                    const itemData = result.result;
                    // Create Inventory Item
                    const newItem: InventoryItem = { 
                        id: `item-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
                        status: 'processing', // Will change to active after review
                        itemName: itemData.description, 
                        itemDescription: `${itemData.ainotes}\n\nSource: ${itemData.imagesource.join(', ')}`, 
                        itemCategory: itemData.category, 
                        originalCost: itemData.estimatedvaluercv, 
                        replacementCostValueRCV: itemData.estimatedvaluercv, 
                        purchaseDate: itemData.lastseendate, 
                        brand: itemData.brandmodel.split(' ')[0] || 'Unknown', 
                        model: itemData.brandmodel.split(' ').slice(1).join(' ') || '', 
                        serialNumber: itemData.serialnumber || undefined, 
                        linkedProofs: [{
                            id: nextItem.proofId,
                            type: file.type.startsWith('image/') ? 'image' : 'document',
                            fileName: file.name,
                            mimeType: file.type,
                            createdBy: 'AI',
                            purpose: 'Proof of Possession',
                            sourceType: 'local',
                            notes: itemData.ainotes,
                            summary: itemData.description
                        }], 
                        createdAt: new Date().toISOString(), 
                        createdBy: 'AI Autonomous' 
                    };

                    setAccumulatedReviewItems(prev => [...prev, newItem]);
                    dispatch({ 
                        type: 'UPDATE_PIPELINE_ITEM_STATUS', 
                        payload: { id: nextItem.id, status: 'complete', resultItemId: newItem.id } 
                    });
                } else {
                    throw new Error("AI returned no data");
                }

            } catch (error) {
                console.error(`Failed to process item ${nextItem.id}:`, error);
                dispatch({ 
                    type: 'UPDATE_PIPELINE_ITEM_STATUS', 
                    payload: { id: nextItem.id, status: 'error', error: String(error) } 
                });
            }
        };

        processItem();

    }, [processingQueue, accumulatedReviewItems, dispatch, currentView]);


    const handleFinalizeAutonomousReview = useCallback((approvedItems: InventoryItem[], rejectedItems: InventoryItem[]) => {
        const itemsToAdd = approvedItems.map(i => ({...i, status: 'active' as const}));
        dispatch({ type: 'ADD_INVENTORY_ITEMS', payload: itemsToAdd });
        
        // Extract proofs from rejected items to add to unlinked locker
        const rejectedProofs = rejectedItems.flatMap(i => i.linkedProofs);
        if (rejectedProofs.length > 0) {
            dispatch({ type: 'ADD_UNLINKED_PROOFS', payload: rejectedProofs });
            logActivity('AUTO_PIPELINE', `Archived ${rejectedProofs.length} proofs from rejected items to evidence locker`, 'VeritasVault');
        }

        setAccumulatedReviewItems([]);
        // Clear processed items from the queue to "reset" the pipeline state
        dispatch({ type: 'CLEAR_PROCESSED_PIPELINE_ITEMS' });
        
        dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
        
        runForensicEnrichment(itemsToAdd);

    }, [dispatch, runForensicEnrichment, logActivity]);

    // Calculate progress for UI
    const queueProgress = useMemo(() => {
        if (!processingQueue.length) return { current: 0, total: 0, fileName: '' };
        const completed = processingQueue.filter(i => i.status === 'complete' || i.status === 'error').length;
        const processingItem = processingQueue.find(i => i.status === 'processing');
        return {
            current: completed + (processingItem ? 1 : 0),
            total: processingQueue.length,
            fileName: processingItem?.fileName || 'Processing...'
        };
    }, [processingQueue]);

    const pipelineStageLabel = useMemo(() => {
        if (processingQueue.length === 0) return 'idle';
        if (processingQueue.some(i => i.status === 'processing')) return 'processing';
        return 'idle';
    }, [processingQueue]);


    // --- POLICY INGESTION HANDLERS ---
    const handlePolicyUpload = useCallback(async (file: File) => {
        setIsAnalyzingPolicy(true);
        try {
            const report = await geminiService.analyzeAndComparePolicy(file, state.policies, state.accountHolder);
            setPolicyAnalysisReport(report);
        } catch (error) {
            console.error("Policy analysis failed:", error);
            alert("Failed to analyze policy. Please ensure the PDF is clear and try again.");
        } finally {
            setIsAnalyzingPolicy(false);
        }
    }, [state.policies, state.accountHolder]);

    const handleSavePolicyReport = useCallback((report: PolicyAnalysisReport) => {
        dispatch({ type: 'SAVE_POLICY_FROM_REPORT', payload: report });
        setPolicyAnalysisReport(null);
        logActivity('POLICY_INGESTED', `Analyzed and saved policy: ${report.parsedPolicy.policyNumber}`, 'Gemini');
    }, [dispatch, logActivity]);


    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                     <SpinnerIcon className="h-16 w-16 text-primary animate-spin mx-auto mb-4"/>
                     <h2 className="text-xl font-bold text-dark font-heading">Loading Vault...</h2>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (currentView === 'autonomous-processor') {
            return <ProcessingPage 
                progress={{ stage: pipelineStageLabel, ...queueProgress }} 
                onCancel={() => { 
                    setAccumulatedReviewItems([]); 
                    dispatch({ type: 'CLEAR_PROCESSED_PIPELINE_ITEMS' }); 
                    dispatch({ type: 'SET_VIEW', payload: 'dashboard' }); 
                }} 
            />;
        }
        if (currentView === 'autonomous-review') {
            return <BulkReviewPage items={accumulatedReviewItems} onFinalize={handleFinalizeAutonomousReview} />;
        }
        if (currentView === 'item-detail') {
            return <ItemDetailView 
                onAddProof={handleAddProof} 
                uploadProgress={uploadProgress} 
                onEditImage={setEditingProof} 
                onGenerateImage={setGeneratingImageItem} 
                onRecordAudio={setRecordingAudioItem} 
                onImageZoom={setZoomedImageUrl} 
                onFindWebImage={handleFindWebImage} 
                onEnrichItem={(item) => runForensicEnrichment([item])}
            />;
        }

        switch (activeTab) {
            case 'evidence':
                return <UploadPage onFilesSelected={handleFileUploads} uploadProgress={uploadProgress} />;
            case 'claim':
                return <StrategicDashboard 
                            onPolicyUpload={handlePolicyUpload}
                            isPolicyAnalyzing={isAnalyzingPolicy}
                        />;
            case 'inventory':
            default:
                return <InventoryDashboard 
                    onAddItemFromWeb={() => setShowWebItemModal(true)}
                    onUploadPolicy={handlePolicyUpload}
                    filteredItems={inventory}
                    onItemPhotosSelected={handleFileUploads}
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    onImageZoom={setZoomedImageUrl}
                    onImportInventory={handleImportInventory}
                />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-primary/20 transition-colors duration-500">
            <Header 
                activeTab={activeTab}
                onNavigate={handleNavigate}
                onAskGemini={() => setShowAssistant(true)}
                onSave={() => setShowSaveModal(true)}
            />
            
            <main className="container mx-auto px-4 md:px-8 py-8 transition-all duration-300">
                {renderContent()}
            </main>

            {/* Global Modals */}
            {showAssistant && (
                <GeminiAssistant 
                    onClose={() => setShowAssistant(false)} 
                    onNavigate={handleNavigate}
                    onSearch={(query) => {
                        setSearchTerm(query);
                        if(activeTab !== 'inventory' || currentView !== 'dashboard') {
                            handleNavigate('inventory');
                        }
                    }}
                />
            )}
            {showSaveModal && (
                <SaveModal 
                    onClose={() => setShowSaveModal(false)} 
                    onQuickBackup={handleQuickBackup} 
                    onForensicExport={handleForensicExport} 
                />
            )}
            {zoomedImageUrl && <ImageZoomModal imageUrl={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />}
            {editingProof && <ImageEditorModal proof={editingProof} onClose={() => setEditingProof(null)} onSave={handleSaveEditedImage} />}
            {generatingImageItem && <ImageGeneratorModal item={generatingImageItem} onClose={() => setGeneratingImageItem(null)} onGenerate={handleSaveGeneratedImage} />}
            {recordingAudioItem && <AudioRecorderModal item={recordingAudioItem} onClose={() => setRecordingAudioItem(null)} onSave={handleSaveAudioNote} />}
            {showWebItemModal && <AddItemFromWebModal onClose={() => setShowWebItemModal(false)} />}
            
            {/* Policy Review Modal */}
            {policyAnalysisReport && (
                <PolicyReviewModal
                    report={policyAnalysisReport}
                    onSave={handleSavePolicyReport}
                    onClose={() => setPolicyAnalysisReport(null)}
                />
            )}
        </div>
    );
};

export default App;
