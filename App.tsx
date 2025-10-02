import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import UploadPage from './components/UploadPage';
import InventoryDashboard from './components/InventoryDashboard';
import ItemDetailView from './components/ItemDetailView';
import ClaimStrategyGuide from './components/ClaimStrategyGuide';
import RoomScanView from './components/RoomScanView';
import ActivityLogView from './components/ActivityLogView';
import { InventoryItem, ParsedPolicy, DraftClaim, AccountHolder, Proof, ProofSuggestion, ActivityLogEntry, SyncStatus, ActivityLogAction } from './types';
import { 
    analyzeImageWithGemini, 
    findMarketPrice, 
    enrichAssetFromWeb,
    identifyApparel,
    selectBestCoverage,
    assembleDraftClaim,
    findHighestRCV,
    extractSerialNumber,
    calculateProofStrength,
    calculateACV,
    fuzzyMatchProofs,
    parsePolicyDocument,
    SCENARIO_ACCOUNT_HOLDER,
    SCENARIO_INVENTORY_ITEMS,
    SCENARIO_POLICY,
    UNLINKED_PROOFS,
} from './services/geminiService';
import { fileToDataUrl, extractFramesFromVideo } from './utils/fileUtils';

function App() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(SCENARIO_INVENTORY_ITEMS);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [parsedPolicy, setParsedPolicy] = useState<ParsedPolicy | null>(SCENARIO_POLICY);
  const [isParsingPolicy, setIsParsingPolicy] = useState(false);
  const [accountHolder] = useState<AccountHolder>(SCENARIO_ACCOUNT_HOLDER);
  const [draftClaims, setDraftClaims] = useState<DraftClaim[]>([]);
  const [showClaimGuide, setShowClaimGuide] = useState(false);
  const [isRoomScanning, setIsRoomScanning] = useState(false);
  const [unlinkedProofs, setUnlinkedProofs] = useState<Proof[]>(UNLINKED_PROOFS);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isActivityLogVisible, setIsActivityLogVisible] = useState(false);
  const syncTimeoutRef = useRef<number | null>(null);

  const handleSync = () => {
    if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
    }
    setSyncStatus('syncing');
    
    // Simulate API call
    setTimeout(() => {
        setSyncStatus('synced');
        // After showing "synced" for a few seconds, return to idle
        syncTimeoutRef.current = window.setTimeout(() => {
            setSyncStatus('idle');
            syncTimeoutRef.current = null;
        }, 2000);
    }, 500); // Short delay for syncing
  };

  const logActivity = (action: ActivityLogAction, details: string) => {
    const newEntry: ActivityLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        app: 'VeritasVault',
        action,
        details,
    };
    setActivityLog(prev => [...prev, newEntry]);
    handleSync(); // Auto-save/sync on every action
  };

  const handleFilesSelected = async (files: FileList | File[], createdBy: InventoryItem['createdBy'] = 'User - Manual') => {
    setIsLoading(true);
    const newItems: { item: InventoryItem, file: File }[] = [];
    const now = new Date().toISOString();

    for (const file of Array.from(files)) {
      const id = `${Date.now()}-${file.name}-${Math.random()}`;
      const dataUrl = await fileToDataUrl(file);

      const newProof: Proof = {
        id: `proof-${id}`,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        fileName: file.name,
        dataUrl,
      };

      const placeholderItem: InventoryItem = {
        id,
        linkedProofs: [newProof],
        status: 'processing',
        itemName: file.name,
        itemDescription: 'Analyzing with Gemini...',
        itemCategory: 'Other',
        originalCost: 0,
        claims: [],
        createdAt: now,
        createdBy: createdBy,
      };
      newItems.push({ item: placeholderItem, file });
    }
    
    setInventoryItems(prev => [...prev, ...newItems.map(ni => ni.item)]);
    
    if (newItems.length > 0) {
        logActivity('ITEM_ADDED', `Added ${newItems.length} new item(s) for processing.`);
    }

    const processingPromises = newItems.map(({ item, file }) =>
      file.type.startsWith('image/') ?
      analyzeImageWithGemini(file)
        .then(result => {
          setInventoryItems(prev =>
            prev.map(i =>
              i.id === item.id
                ? {
                    ...i,
                    status: 'needs-review',
                    itemName: result.itemName,
                    itemDescription: result.description,
                    itemCategory: result.category,
                    originalCost: result.estimatedValue,
                    brand: result.brand,
                    model: result.model,
                    aiNotes: [`Initial analysis complete. Gemini suggested category: ${result.category} and value: $${result.estimatedValue}`],
                  }
                : i
            )
          );
        })
        .catch(error => {
          console.error(`Error processing file ${file.name}:`, error);
          setInventoryItems(prev =>
            prev.map(i =>
              i.id === item.id
                ? { ...i, status: 'error', error: error.message }
                : i
            )
          );
        })
        : Promise.resolve().then(() => { // Handle non-image files gracefully
          setInventoryItems(prev =>
              prev.map(i =>
                  i.id === item.id
                  ? {
                      ...i,
                      status: 'needs-review',
                      itemName: file.name,
                      itemDescription: '',
                      itemCategory: 'Documents',
                      originalCost: 0,
                      aiNotes: ['Document ready for review. Please add details manually.'],
                  }
                  : i
              )
          );
        })
    );

    await Promise.all(processingPromises);
    setIsLoading(false);
  };

  const handleAddProofs = async (itemId: string, files: FileList) => {
    setIsUploadingProof(true);
    const itemToUpdate = inventoryItems.find(i => i.id === itemId);
    if (!itemToUpdate) {
        setIsUploadingProof(false);
        console.error("Item not found for adding proofs");
        return;
    }

    const newProofs: Proof[] = [];
    for (const file of Array.from(files)) {
        const dataUrl = await fileToDataUrl(file);
        const newProof: Proof = {
            id: `proof-${Date.now()}-${file.name}-${Math.random()}`,
            type: file.type.startsWith('image/') ? 'image' : 'document',
            fileName: file.name,
            dataUrl,
        };
        newProofs.push(newProof);
    }

    setInventoryItems(prev =>
        prev.map(item =>
            item.id === itemId
            ? { ...item, linkedProofs: [...item.linkedProofs, ...newProofs] }
            : item
        )
    );

    if (newProofs.length > 0) {
        logActivity('PROOF_LINKED', `Added ${newProofs.length} proof(s) to item: ${itemToUpdate.itemName}`);
    }
    
    // Also update the selected item if it's the one being modified
    if (selectedItemId === itemId) {
        const updatedSelectedItem = inventoryItems.find(i => i.id === itemId);
        if (updatedSelectedItem) {
            setSelectedItemId(itemId); // This forces a re-render of the detail view with new proofs
        }
    }


    setIsUploadingProof(false);
  };

  const handleReset = () => {
    setInventoryItems([]);
    setSelectedItemId(null);
    setIsLoading(false);
    setDraftClaims([]);
    setParsedPolicy(null);
    setUnlinkedProofs(UNLINKED_PROOFS);
    setActivityLog([]);
    setSyncStatus('idle');
  };

  const handleApproveItem = (itemId: string) => {
    setInventoryItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, status: 'active' } : item
      )
    );
  };

  const handleRejectItem = (itemId: string) => {
    setInventoryItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, status: 'rejected' } : item
      )
    );
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
  };
  
  const handleCloseDetailView = () => {
    setSelectedItemId(null);
  };

  const handleUpdateItem = (updatedItem: InventoryItem) => {
    logActivity('ITEM_UPDATED', `Saved changes for item: ${updatedItem.itemName}`);
    setInventoryItems(prev =>
      prev.map(item => (item.id === updatedItem.id ? { ...updatedItem, lastModifiedAt: new Date().toISOString() } : item))
    );
    setSelectedItemId(null);
  };
  
  const handleDeleteItem = (itemId: string) => {
    const itemToDelete = inventoryItems.find(i => i.id === itemId);
    if (itemToDelete) {
        logActivity('ITEM_DELETED', `Deleted item: ${itemToDelete.itemName}`);
    }
    setInventoryItems(prev => prev.filter(item => item.id !== itemId));
    setDraftClaims(prev => prev.filter(claim => claim.assetId !== itemId));
    setSelectedItemId(null);
  };
  
  const handleFindMarketPrice = async (item: InventoryItem) => {
    logActivity('AI_ANALYSIS_PERFORMED', `Requested Market Valuation for ${item.itemName}`);
    const results = await findMarketPrice(item);
    setInventoryItems(prev =>
        prev.map(i =>
            i.id === item.id
            ? { 
                ...i, 
                replacementCostValueRCV: results.rcv, 
                aiNotes: [
                    ...(i.aiNotes || []),
                    `Market valuation found RCV: $${results.rcv}, ACV: $${results.acv}. Sources: ${results.sources.map(s => s.url).join(', ')}`
                ]
              }
            : i
        )
    );
  };

  const handleFindHighestRCV = async (item: InventoryItem) => {
    logActivity('AI_ANALYSIS_PERFORMED', `Requested Highest RCV for ${item.itemName}`);
    const result = await findHighestRCV(item);
    setInventoryItems(prev =>
        prev.map(i =>
            i.id === item.id
            ? { 
                ...i, 
                replacementCostValueRCV: result.price, 
                aiNotes: [
                    ...(i.aiNotes || []),
                    `Highest RCV found: $${result.price} from ${result.source}`
                ]
            }
            : i
        )
    );
  };

  const handleExtractSerialNumber = async (itemId: string, proofId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    const proof = item?.linkedProofs.find(p => p.id === proofId);

    if (!item || !proof || proof.type !== 'image') return;
    
    logActivity('AI_ANALYSIS_PERFORMED', `Requested Serial Number Extraction for ${item.itemName}`);

    const result = await extractSerialNumber(proof.dataUrl);
    if (result.serialNumber) {
        logActivity('ITEM_UPDATED', `Extracted serial number for ${item.itemName}`);
        setInventoryItems(prev =>
            prev.map(i =>
                i.id === itemId
                ? { ...i, serialNumber: result.serialNumber }
                : i
            )
        );
    }
  };

  const handleEnrichData = async (item: InventoryItem) => {
      logActivity('AI_ANALYSIS_PERFORMED', `Requested Web Intelligence for ${item.itemName}`);
      const results = await enrichAssetFromWeb(item);
      setInventoryItems(prev =>
        prev.map(i =>
            i.id === item.id
            ? { 
                ...i,
                aiNotes: [
                    ...(i.aiNotes || []),
                    ...results.facts.map(f => `${f.fact} (Source: ${f.source})`)
                ]
            }
            : i
        )
      );
  };
  
  const handleIdentifyApparel = async (itemId: string, proofId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    const proof = item?.linkedProofs.find(p => p.id === proofId);

    if (!item || !proof || proof.type !== 'image') return;
    logActivity('AI_ANALYSIS_PERFORMED', `Requested Apparel Identification for ${item.itemName}`);

    const result = await identifyApparel(proof.dataUrl);
    setInventoryItems(prev =>
        prev.map(i =>
            i.id === itemId
            ? { 
                ...i, 
                itemName: `${result.brand} ${result.model}`, 
                originalCost: result.msrp,
                brand: result.brand,
                model: result.model,
                itemDescription: `${result.brand} ${result.model}. MSRP: $${result.msrp}` 
            }
            : i
        )
    );
  };

  const handleCalculateProofStrength = async (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;
    logActivity('AI_ANALYSIS_PERFORMED', `Calculated Proof Strength for ${item.itemName}`);
    const result = await calculateProofStrength(item);
    setInventoryItems(prev =>
        prev.map(i =>
            i.id === itemId
            ? { ...i, proofStrengthScore: result.score, proofStrengthFeedback: result.feedback }
            : i
        )
    );
  };

  const handleCalculateACV = async (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    logActivity('AI_ANALYSIS_PERFORMED', `Calculated ACV & Depreciation for ${item.itemName}`);
    try {
        const result = await calculateACV(item);
        setInventoryItems(prev =>
            prev.map(i =>
                i.id === itemId
                ? { ...i, acvDepreciation: { acv: result.acv, reasoning: result.reasoning } }
                : i
            )
        );
    } catch (error) {
        console.error("Error calculating ACV:", error);
        alert(`Could not calculate ACV: ${error.message}`);
    }
  };
  
  const handleUploadPolicy = async (file: File) => {
    setIsParsingPolicy(true);
    logActivity('POLICY_UPLOADED', `Uploaded policy document: ${file.name}`);
    try {
        const result = await parsePolicyDocument(file);
        const policyData: ParsedPolicy = {
            ...result,
            isVerified: result.confidenceScore >= 85, // Auto-verify if confidence is high
        };
        setParsedPolicy(policyData);
        logActivity('POLICY_PARSED', `Successfully parsed policy ${result.policyNumber}`);
    } catch (error) {
        console.error("Error parsing policy:", error);
        alert(`Could not parse the policy document: ${error.message}`);
    } finally {
        setIsParsingPolicy(false);
    }
  };
  
  const handleUpdateParsedPolicy = (updatedPolicy: ParsedPolicy) => {
    setParsedPolicy(updatedPolicy);
  };

  const handleVerifyPolicy = () => {
    if (parsedPolicy) {
        logActivity('POLICY_VERIFIED', `User verified policy details for ${parsedPolicy.policyNumber}`);
        setParsedPolicy({ ...parsedPolicy, isVerified: true });
    }
  };


  const handleSelectCoverage = (itemId: string) => {
    if (!parsedPolicy) {
        alert("Please upload and parse an insurance policy first.");
        return;
    }
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    const bestCoverage = selectBestCoverage(item.itemCategory, parsedPolicy);
    
    if (bestCoverage) {
        setInventoryItems(prev =>
            prev.map(i =>
                i.id === itemId ? { ...i, recommendedCoverage: bestCoverage } : i
            )
        );
    } else {
        alert(`No specific coverage found for category "${item.itemCategory}" in your policy. It will fall under your main personal property limit.`);
        const mainCoverage = parsedPolicy.coverage.find(c => c.type === 'main');
         if (mainCoverage) {
            setInventoryItems(prev =>
                prev.map(i =>
                    i.id === itemId ? { ...i, recommendedCoverage: mainCoverage } : i
                )
            );
        }
    }
  };

  const handleDraftClaim = async (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item || !item.recommendedCoverage || !parsedPolicy) return;
    
    logActivity('CLAIM_DRAFTED', `Drafted a new claim for item: ${item.itemName}`);
    const newClaim = await assembleDraftClaim(item, parsedPolicy, accountHolder);
    setDraftClaims(prev => [...prev, newClaim]);
    setInventoryItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, claims: [...(i.claims || []), newClaim], isClaimed: true, status: 'claimed' }
          : i
      )
    );
  };

  const handleFileClaim = (claimId: string) => {
    const updateStatus = (claims: DraftClaim[]) =>
      claims.map(c => c.id === claimId ? { ...c, status: 'submitted' as const } : c);

    setDraftClaims(prev => updateStatus(prev));
    setInventoryItems(prev =>
      prev.map(item =>
        item.claims?.some(c => c.id === claimId)
          ? { ...item, claims: updateStatus(item.claims) }
          : item
      )
    );
  };
  
  const handleShowGuide = () => setShowClaimGuide(true);
  const handleCloseGuide = () => setShowClaimGuide(false);

  const handleStartRoomScan = () => setIsRoomScanning(true);
  const handleCloseRoomScan = () => setIsRoomScanning(false);
  
  const handleProcessRoomScanVideo = async (videoBlob: Blob) => {
    handleCloseRoomScan();
    setIsLoading(true); // Use the global loader
    try {
        const frames = await extractFramesFromVideo(videoBlob, 1); // 1 frame per second
        if (frames.length > 0) {
            await handleFilesSelected(frames, 'AI - Room Scan');
        } else {
            setIsLoading(false);
        }
    } catch (error) {
        console.error("Error processing room scan video:", error);
        alert("There was an error processing the video. Please try again.");
        setIsLoading(false);
    }
  };

  const handleFuzzyMatch = async (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    logActivity('AI_ANALYSIS_PERFORMED', `Searched for matching proofs for ${item.itemName}`);

    const proofsToScan = unlinkedProofs.filter(up => 
        !item.suggestedProofs?.some(sp => sp.proofId === up.id)
    );

    if (proofsToScan.length === 0) {
        return;
    }

    const result = await fuzzyMatchProofs(item, proofsToScan);
    
    setInventoryItems(prev =>
        prev.map(i =>
            i.id === itemId
            ? { ...i, suggestedProofs: [...(i.suggestedProofs || []), ...result.suggestions] }
            : i
        )
    );
  };

  const handleApproveProofSuggestion = (itemId: string, suggestion: ProofSuggestion) => {
    const proofToMove = unlinkedProofs.find(p => p.id === suggestion.proofId);
    const item = inventoryItems.find(i => i.id === itemId);
    if (!proofToMove || !item) return;
    
    logActivity('SUGGESTED_PROOF_APPROVED', `Approved and linked proof '${proofToMove.fileName}' to item '${item.itemName}'`);

    setInventoryItems(prev =>
        prev.map(item =>
            item.id === itemId
            ? { 
                ...item, 
                linkedProofs: [...item.linkedProofs, proofToMove],
                suggestedProofs: item.suggestedProofs?.filter(s => s.proofId !== suggestion.proofId)
              }
            : item
        )
    );

    setUnlinkedProofs(prev => prev.filter(p => p.id !== suggestion.proofId));
  };

  const handleRejectProofSuggestion = (itemId: string, suggestion: ProofSuggestion) => {
    const proof = unlinkedProofs.find(p => p.id === suggestion.proofId);
    const item = inventoryItems.find(i => i.id === itemId);
    if (proof && item) {
        logActivity('SUGGESTED_PROOF_REJECTED', `Rejected suggested proof '${proof.fileName}' for item '${item.itemName}'`);
    }

    setInventoryItems(prev =>
        prev.map(item =>
            item.id === itemId
            ? { 
                ...item, 
                suggestedProofs: item.suggestedProofs?.filter(s => s.proofId !== suggestion.proofId)
              }
            : item
        )
    );
  };

  const handleShowLog = () => setIsActivityLogVisible(true);
  const handleCloseLog = () => setIsActivityLogVisible(false);


  const selectedItem = inventoryItems.find(item => item.id === selectedItemId);
  const showDashboard = inventoryItems.length > 0 || parsedPolicy !== null;

  return (
    <div className="bg-light min-h-screen font-sans">
      <Header 
        onReset={handleReset} 
        onShowGuide={handleShowGuide} 
        onShowLog={handleShowLog}
        onSync={handleSync}
        syncStatus={syncStatus}
      />
      <main className="container mx-auto px-4 md:px-8 py-8">
        {!showDashboard ? (
          <UploadPage onFilesSelected={(files) => handleFilesSelected(files)} isLoading={isLoading} />
        ) : (
          <InventoryDashboard
            items={inventoryItems}
            accountHolder={accountHolder}
            policy={parsedPolicy}
            isParsingPolicy={isParsingPolicy}
            onUploadPolicy={handleUploadPolicy}
            onUpdatePolicy={handleUpdateParsedPolicy}
            onVerifyPolicy={handleVerifyPolicy}
            onSelectItem={handleSelectItem}
            onApproveItem={handleApproveItem}
            onRejectItem={handleRejectItem}
            onFilesSelected={(files) => handleFilesSelected(files)}
            onStartRoomScan={handleStartRoomScan}
            isLoading={isLoading}
          />
        )}
      </main>
      {showClaimGuide && <ClaimStrategyGuide onClose={handleCloseGuide} />}
      {isRoomScanning && <RoomScanView onClose={handleCloseRoomScan} onProcessVideo={handleProcessRoomScanVideo} />}
      {isActivityLogVisible && <ActivityLogView log={activityLog} onClose={handleCloseLog} />}
      {selectedItem && (
        <ItemDetailView
          item={selectedItem}
          policy={parsedPolicy}
          unlinkedProofs={unlinkedProofs}
          onClose={handleCloseDetailView}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
          onFindMarketPrice={handleFindMarketPrice}
          onEnrichData={handleEnrichData}
          onIdentifyApparel={handleIdentifyApparel}
          onSelectCoverage={handleSelectCoverage}
          onDraftClaim={handleDraftClaim}
          onFileClaim={handleFileClaim}
          onFindHighestRCV={handleFindHighestRCV}
          onExtractSerialNumber={handleExtractSerialNumber}
          onCalculateProofStrength={handleCalculateProofStrength}
          onCalculateACV={handleCalculateACV}
          onAddProofs={handleAddProofs}
          isUploadingProof={isUploadingProof}
          onFuzzyMatch={handleFuzzyMatch}
          onApproveProofSuggestion={handleApproveProofSuggestion}
          onRejectProofSuggestion={handleRejectProofSuggestion}
        />
      )}
    </div>
  );
}

export default App;
