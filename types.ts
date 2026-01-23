
// Fix: Removed invalid file marker that was causing a parsing error.
export type ItemStatus = 'processing' | 'enriching' | 'clustering' | 'needs-review' | 'active' | 'claimed' | 'archived' | 'error' | 'rejected';
export type ProofStatus = 'unprocessed' | 'categorizing' | 'categorized' | 'error';
export type ProofPurpose = 'Proof of Purchase' | 'Proof of Possession' | 'Proof of Value' | 'Supporting Document' | 'Unknown';
export type ProofType = 'image' | 'document' | 'video' | 'audio' | 'other';
export type CostType = 'Loss of Use' | 'Property Damage & Debris Removal' | 'Identity Fraud Expenses' | 'Other';

export type PipelineStage = 'idle' | 'processing';

export interface PipelineProgress {
    current: number;
    total: number;
    fileName: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  vendor: string;
  totalAmount: number;
  transactionDate: string; // YYYY-MM-DD
  lineItems: LineItem[];
}

export interface Proof {
    id: string;
    type: ProofType;
    fileName: string;
    dataUrl?: string; // Base64 encoded for local files - NOW OPTIONAL
    mimeType: string;
    createdBy: 'User' | 'AI' | 'System';
    createdAt?: string;
    costType?: CostType;
    estimatedValue?: number;
    predictedCategory?: string;
    predictedCategoryReasoning?: string;
    sourceType?: 'local' | 'cloud';
    sourceUrl?: string;
    status?: ProofStatus;
    summary?: string;
    purpose?: ProofPurpose;
    authenticityScore?: number;
    receiptData?: ReceiptData;
    notes?: string;
    owner?: string;
}

// LAYER A: MASTER INVENTORY ITEM
export interface InventoryItem {
    id: string;
    status: ItemStatus;
    itemName: string;
    itemDescription: string;
    itemCategory: string;
    originalCost: number;
    replacementCostValueRCV?: number;
    actualCashValueACV?: number;
    purchaseDate?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    condition?: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
    linkedProofs: Proof[];
    proofStrengthScore?: number;
    createdAt: string;
    createdBy: string;
    lastKnownLocation?: string;
    notes?: string;
    valuationHistory?: ValuationResponse[];
    webIntelligence?: WebIntelligenceResponse[];
    suggestedProofs?: ProofSuggestion[];
    provenance?: string;
    isGift?: boolean;
    giftedBy?: string;
    recategorizationStrategy?: { newCategory: string; reasoning: string; };
}

// LAYER B: CLAIM INVENTORY ITEM
export interface ClaimItem {
    id: string;
    masterItemId: string;
    claimDescription: string;
    category: string;
    claimedValue: number;
    valuationMethod: 'RCV' | 'ACV';
    narrativeTag: 'Packed' | 'Stored' | 'In Transit' | 'In Use' | 'Unknown';
    boxOrGroup?: string;
    status: 'included' | 'excluded' | 'flagged';
    exclusionReason?: string;
    policyNotes?: string;
}

export interface ClaimDetails {
    name: string; // e.g. "Burglary at 56th St"
    dateOfLoss: string;
    incidentType: string;
    location: string;
    policeReport: string;
    propertyDamageDetails: string;
    claimDateRange?: {
        startDate?: string;
        endDate?: string;
    };
    fairRentalValuePerDay?: number;
    aleProofs?: Proof[];
    claimDocuments?: Proof[];
}

// LAYER B: ACTIVE CLAIM CONTAINER
export interface ActiveClaim {
    id: string;
    name: string; // User-friendly name
    claimItems: ClaimItem[];
    generatedAt: string;
    totalClaimValue: number;
    status: 'draft' | 'finalized';
    linkedPolicyId?: string;
    incidentDetails: ClaimDetails; // Snapshot of incident details for this claim
}

export interface AccountHolder {
    id: string;
    name: string;
    address: string;
}

export interface CoverageLimit {
    category: string;
    limit: number;
    type: 'main' | 'sub-limit';
}

export interface ParsedPolicy {
    id: string;
    policyName: string;
    isActive: boolean;
    provider: string;
    policyNumber: string;
    policyHolder: string;
    effectiveDate: string;
    expirationDate: string;
    deductible: number;
    coverage: CoverageLimit[];
    coverageD_limit: number; // Loss of Use
    lossSettlementMethod: 'ACV' | 'RCV';
    exclusions: string[];
    conditions: string[];
    confidenceScore: number;
    isVerified: boolean;
    policyType?: string;
}

export interface PolicyAnalysisReport {
    analysisType: 'new' | 'update' | 'duplicate';
    targetPolicyId?: string;
    warnings: string[];
    parsedPolicy: Omit<ParsedPolicy, 'id' | 'isActive' | 'isVerified' | 'policyName'>;
}

export interface PolicyParseResponse extends Omit<ParsedPolicy, 'isVerified' | 'id' | 'isActive' | 'policyName'> {}

export interface PolicyVerificationResult {
    suggestions: string[];
    score: number;
}

export interface ClaimGapAnalysis {
    overallRiskScore: number; // 0-100
    flaggedItems: {
        itemName: string;
        issueType: 'Under-Insured' | 'Potential Exclusion' | 'Documentation Weak';
        description: string;
        financialImpact: number;
    }[];
    policyWarnings: string[];
    recommendations: string[];
}

export interface ClaimScenario {
    id: string;
    title: string;
    description: string;
    likelihood: 'Low' | 'Medium' | 'High';
    relevantCoverage: string;
    riskLevel: number; // 0-100
}

export interface ValuationSource {
    url: string;
    price: number;
    type: 'RCV' | 'ACV';
    title?: string;
}

export interface ValuationResponse {
    rcv: number;
    acv: number;
    sources: ValuationSource[];
}

export interface WebIntelligenceFact {
    fact: string;
    source: string;
}

export interface WebIntelligenceResponse {
    facts: WebIntelligenceFact[];
}

export interface SerialNumberResponse {
    serialNumber: string;
}

export interface ProofStrengthResponse {
    score: number;
    feedback: string;
}

export interface ProofSuggestion {
    proofId: string;
    confidence: number;
    reason: string;
    sourceUrl?: string;
}

export type AppView = 'upload' | 'dashboard' | 'item-detail' | 'room-scan' | 'processing-preview' | 'autonomous-processor' | 'autonomous-review' | 'strategic-dashboard';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  app: 'VeritasVault' | 'Gemini';
  action: string;
  details: string;
}

export type UndoableAction = 
  | { type: 'DELETE_ITEM', payload: { item: InventoryItem } }
  | { type: 'REJECT_SUGGESTION', payload: { suggestion: ProofSuggestion, itemId: string } };

export type UploadProgress = Record<string, {
    loaded: number;
    total: number;
}>;

export interface ProcessingQueueItem {
    file: File;
    dataUrl: string;
    placeholderId: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
}

export interface AleDetails {
    vendor: string;
    date: string;
    amount: number;
    costType: CostType;
}

export type InferenceType = 'NEW_ITEM' | 'EXISTING_ITEM_MATCH' | 'ALE_EXPENSE' | 'UNCLEAR';

export interface ProcessingInference {
    proof: Proof;
    status: 'pending' | 'processing' | 'complete' | 'error';
    analysisType?: InferenceType;
    synthesizedItem?: Partial<Omit<InventoryItem, 'linkedProofs' | 'suggestedProofs'>>;
    matchedItemId?: string;
    matchConfidence?: number;
    aleDetails?: AleDetails;
    proofSummary?: string;
    errorMessage?: string;
    userSelection: 'approved' | 'rejected';
    notes?: string;
    owner?: string;
}

export interface AutonomousInventoryItem {
    category: string;
    description: string;
    brandmodel: string;
    serialnumber?: string;
    estimatedvaluercv: number;
    quantity: number;
    lastseendate: string;
    inferredowner: string;
    location: string;
    imagesource: string[];
    ainotes: string;
    confidencescore: number;
    sublimit_tag: string | null;
}

export interface OptimalPolicyResult {
    bestPolicyId: string;
    reasoning: string;
    financialAdvantage: number;
    originalPolicyId: string;
}

export interface WebScrapeResult {
    itemName: string;
    itemDescription: string;
    itemCategory: string;
    originalCost: number;
    brand?: string;
    model?: string;
    imageUrl?: string;
    sourceUrl: string;
}

export interface ScenarioAnalysis {
    scenarioTitle: string;
    grossLoss: number;
    appliedDeductible: number;
    netPayout: number;
    deniedItems: { itemName: string, reason: string, value: number }[];
    subLimitHits: { category: string, totalValue: number, limit: number }[];
    warnings: string[];
    actionPlan: string[];
}

export interface RiskGap {
    category: string;
    totalValue: number;
    policyLimit: number;
    isAtRisk: boolean;
    missingProofCount: number;
}

// --- APP STATE ---
export interface AppState {
    inventory: InventoryItem[]; // LAYER A: Master Inventory
    policies: ParsedPolicy[];
    unlinkedProofs: Proof[];
    accountHolder: AccountHolder;
    
    // Multiple Claims Support
    claims: ActiveClaim[];
    currentClaimId: string | null;

    activityLog: ActivityLogEntry[];
    undoAction: UndoableAction | null;
    currentView: AppView;
    selectedItemId: string | null;
    isInitialized: boolean;
}

export type Action =
  | { type: 'INITIALIZE_STATE'; payload: AppState }
  | { type: 'RESET_STATE' }
  | { type: 'LOAD_FROM_FILE'; payload: Omit<AppState, 'isInitialized' | 'currentView' | 'selectedItemId'> }
  | { type: 'UPDATE_ITEM'; payload: InventoryItem }
  | { type: 'ADD_INVENTORY_ITEMS'; payload: InventoryItem[] }
  | { type: 'BULK_UPDATE_ITEM_STATUS'; payload: { ids: string[], status: ItemStatus } }
  | { type: 'BULK_EDIT_ITEMS'; payload: { ids: string[], updates: Partial<InventoryItem> } }
  | { type: 'DELETE_ITEM'; payload: { itemId: string } }
  | { type: 'LOG_ACTIVITY'; payload: { action: string; details: string; app?: 'VeritasVault' | 'Gemini' } }
  | { type: 'CLEAR_UNDO_ACTION' }
  | { type: 'UNDO_ACTION'; payload: UndoableAction }
  | { type: 'SAVE_POLICY_FROM_REPORT'; payload: PolicyAnalysisReport }
  | { type: 'SET_ACTIVE_POLICY'; payload: string }
  | { type: 'ADD_PROOFS_TO_ITEM'; payload: { itemId: string; proofs: Proof[] } }
  | { type: 'SET_VIEW'; payload: AppView }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'UNSELECT_ITEM' }
  | { type: 'FINALIZE_INTERACTIVE_PROCESSING', payload: ProcessingInference[] }
  | { type: 'SUGGEST_PROOF_FOR_ITEM', payload: { itemId: string; proof: Proof, suggestion: Omit<ProofSuggestion, 'sourceUrl'> & { sourceUrl?: string } } }
  | { type: 'ADD_SUGGESTIONS_TO_ITEM', payload: { itemId: string; suggestions: ProofSuggestion[] } }
  | { type: 'ACCEPT_SUGGESTION', payload: { itemId: string; proofId: string } }
  | { type: 'REJECT_SUGGESTION_PERMANENT', payload: { itemId: string; proofId: string } }
  | { type: 'REMOVE_UNLINKED_PROOF', payload: string }
  // Claims Management Actions
  | { type: 'CREATE_CLAIM', payload: ActiveClaim }
  | { type: 'UPDATE_CLAIM_ITEM', payload: { claimId: string, item: ClaimItem } }
  | { type: 'UPDATE_CLAIM_DETAILS', payload: { claimId: string, details: Partial<ClaimDetails> } }
  | { type: 'SET_CURRENT_CLAIM', payload: string }
  | { type: 'DELETE_CLAIM', payload: string };
