
import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { SpinnerIcon } from './components/icons.tsx';
import * as geminiService from './services/geminiService.ts';
import { InventoryItem, Proof, AutonomousInventoryItem, ProcessingInference } from './types.ts';
import { urlToDataUrl, dataUrlToBlob, sanitizeFileName, exportToZip } from './utils/fileUtils.ts';

const App: React.FC = () => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { inventory, isInitialized, currentView } = state;
    
    // Workflow State
    const [activeTab, setActiveTab] = useState<'evidence' | 'inventory' | 'claim'>('inventory');

    // Modal/Overlay State
    const [showAssistant, setShowAssistant] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, { loaded: number, total: number }> | null>(null);
    
    // Processing State
    const [pipelineStage, setPipelineStage] = useState<'idle' | 'processing'>('idle');
    const [pipelineProgress, setPipelineProgress] = useState({ current: 0, total: 0, fileName: '' });
    const [processingQueue, setProcessingQueue] = useState<File[]>([]);
    const [accumulatedReviewItems, setAccumulatedReviewItems] = useState<InventoryItem[]>([]);

    const logActivity = useCallback((action: string, details: string, app: 'VeritasVault' | 'Gemini' = 'VeritasVault') => {
        dispatch({ type: 'LOG_ACTIVITY', payload: { action, details, app } });
    }, [dispatch]);

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
            alert("Export failed. Please try again.");
        }
    }, [state.inventory, state.unlinkedProofs, logActivity]);


    // --- AUTOMATED ENRICHMENT PIPELINE ---
    const runForensicEnrichment = useCallback(async (items: InventoryItem[]) => {
        const itemIds = items.map(i => i.id);
        dispatch({ type: 'BULK_UPDATE_ITEM_STATUS', payload: { ids: itemIds, status: 'enriching' } });

        for (const item of items) {
            let updatedItem = { ...item };
            try {
                // 1. Web Intelligence
                const webData = await geminiService.enrichAssetFromWeb(item);
                if (webData && webData.facts.length > 0) {
                    updatedItem.webIntelligence = [webData];
                    if (updatedItem.itemDescription.length < 20 && webData.facts[0].fact) {
                        updatedItem.itemDescription = `${updatedItem.itemDescription}\n\nSpecs: ${webData.facts[0].fact}`;
                    }
                }

                // 2. Market Valuation
                const pricing = await geminiService.findMarketPrice(updatedItem);
                if (pricing) {
                    updatedItem.replacementCostValueRCV = pricing.rcv;
                    updatedItem.actualCashValueACV = pricing.acv;
                    updatedItem.valuationHistory = [pricing];
                }

                // 3. Missing Image Recovery
                if (updatedItem.linkedProofs.length === 0) {
                     const imageResult = await geminiService.findProductImageFromWeb(updatedItem);
                     if (imageResult && imageResult.imageUrl) {
                        const dataUrl = await urlToDataUrl(imageResult.imageUrl);
                        const blob = dataUrlToBlob(dataUrl);
                        const cleanItemName = sanitizeFileName(`${updatedItem.brand || ''}_${updatedItem.itemName}`);
                        const newProof: Proof = {
                            id: `proof-auto-${Date.now()}`,
                            type: 'image',
                            fileName: `web_ref_${cleanItemName}.jpg`,
                            dataUrl: dataUrl,
                            mimeType: blob.type || 'image/jpeg',
                            createdBy: 'AI',
                            purpose: 'Proof of Possession', 
                            notes: `Sourced from: ${imageResult.source}`
                        };
                        updatedItem.linkedProofs = [newProof];
                        updatedItem.status = 'needs-review'; 
                     }
                }

                updatedItem.status = updatedItem.status === 'needs-review' ? 'needs-review' : 'active';
                dispatch({ type: 'UPDATE_ITEM', payload: updatedItem });
                logActivity('AUTO_ENRICHMENT_COMPLETE', `Enriched ${item.itemName} with market data.`, 'Gemini');

            } catch (e) {
                console.error(`Enrichment failed for ${item.id}`, e);
                dispatch({ type: 'UPDATE_ITEM', payload: { ...item, status: 'active' } });
            }
        }
    }, [dispatch, logActivity]);


    // --- AUTONOMOUS PROCESSING PIPELINE ---
    const handleFileUploads = useCallback(async (files: FileList) => {
        const filesArray = Array.from(files);
        if (filesArray.length === 0) return;

        setActiveTab('inventory');
        dispatch({ type: 'SET_VIEW', payload: 'autonomous-processor' });
        
        setProcessingQueue(filesArray);
        setPipelineStage('processing');
        setPipelineProgress({ current: 0, total: filesArray.length, fileName: 'Initializing AI Pipeline...' });
    }, [dispatch]);

    useEffect(() => {
        if (pipelineStage !== 'processing') return;

        if (processingQueue.length === 0) {
            setPipelineStage('idle');
            if (accumulatedReviewItems.length > 0) {
                dispatch({ type: 'SET_VIEW', payload: 'autonomous-review' });
            } else {
                dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
            }
            return;
        }

        const BATCH_SIZE = 5;
        let isCancelled = false;

        const processNextBatch = async () => {
            const batch = processingQueue.slice(0, BATCH_SIZE);
            const remainingInQueue = processingQueue.slice(BATCH_SIZE);
            const processedCount = pipelineProgress.total - processingQueue.length;
            
            setPipelineProgress(prev => ({ 
                ...prev, 
                current: processedCount + 1, 
                fileName: `Analyzing batch of ${batch.length} files...` 
            }));
            
            try {
                const results: AutonomousInventoryItem[] = await geminiService.runAutonomousProcessor(batch);
                
                const newItems: InventoryItem[] = results.map((item, i) => ({ 
                    id: `item-auto-${Date.now()}-${i}-${processedCount}`, 
                    status: 'processing', 
                    itemName: item.description, 
                    itemDescription: `${item.ainotes}\n\nSource: ${item.imagesource.join(', ')}`, 
                    itemCategory: item.category, 
                    originalCost: item.estimatedvaluercv, 
                    replacementCostValueRCV: item.estimatedvaluercv,
                    purchaseDate: item.lastseendate, 
                    brand: item.brandmodel.split(' ')[0] || 'Unknown', 
                    model: item.brandmodel.split(' ').slice(1).join(' ') || '', 
                    serialNumber: item.serialnumber || undefined, 
                    linkedProofs: [], 
                    createdAt: new Date().toISOString(), 
                    createdBy: 'AI Autonomous' 
                }));

                if (!isCancelled) {
                    setAccumulatedReviewItems(prev => [...prev, ...newItems]);
                    setProcessingQueue(remainingInQueue);
                }

            } catch (error) {
                console.error("Batch failed:", error);
                if (!isCancelled) setProcessingQueue(remainingInQueue);
            }
        };

        processNextBatch();
        return () => { isCancelled = true; };
    }, [pipelineStage, processingQueue, accumulatedReviewItems, pipelineProgress.total, dispatch]);


    const handleFinalizeAutonomousReview = useCallback((approvedItems: InventoryItem[], rejectedItems: InventoryItem[]) => {
        const itemsToAdd = approvedItems.map(i => ({...i, status: 'active' as const}));
        dispatch({ type: 'ADD_INVENTORY_ITEMS', payload: itemsToAdd });
        
        setAccumulatedReviewItems([]);
        dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
        
        runForensicEnrichment(itemsToAdd);

    }, [dispatch, runForensicEnrichment]);


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
            return <ProcessingPage progress={{ stage: pipelineStage, ...pipelineProgress }} onCancel={() => { setPipelineStage('idle'); setProcessingQueue([]); dispatch({ type: 'SET_VIEW', payload: 'dashboard' }); }} />;
        }
        if (currentView === 'autonomous-review') {
            return <BulkReviewPage items={accumulatedReviewItems} onFinalize={handleFinalizeAutonomousReview} />;
        }
        if (currentView === 'item-detail') {
            return <ItemDetailView 
                onAddProof={(itemId, files) => {}} 
                uploadProgress={uploadProgress} 
                onEditImage={() => {}} 
                onGenerateImage={() => {}} 
                onRecordAudio={() => {}} 
                onImageZoom={() => {}} 
                onFindWebImage={async () => {}} 
            />;
        }

        switch (activeTab) {
            case 'evidence':
                return <UploadPage onFilesSelected={handleFileUploads} uploadProgress={uploadProgress} />;
            case 'claim':
                return <StrategicDashboard />;
            case 'inventory':
            default:
                return <InventoryDashboard 
                    onAddItemFromWeb={() => {}}
                    onUploadPolicy={() => {}}
                    filteredItems={inventory}
                    onItemPhotosSelected={handleFileUploads}
                    searchTerm=""
                    onSearchTermChange={() => {}}
                />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-primary/20">
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
            {showAssistant && <GeminiAssistant onClose={() => setShowAssistant(false)} />}
            {showSaveModal && (
                <SaveModal 
                    onClose={() => setShowSaveModal(false)} 
                    onQuickBackup={handleQuickBackup} 
                    onForensicExport={handleForensicExport} 
                />
            )}
        </div>
    );
};

export default App;
