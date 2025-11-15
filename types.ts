// Fix: Removed invalid file marker that was causing a parsing error.
export type ItemStatus = 'processing' | 'enriching' | 'clustering' | 'needs-review' | 'active' | 'claimed' | 'archived' | 'error' | 'rejected';
export type ProofStatus = 'unprocessed' | 'categorizing' | 'categorized' | 'error';
// New: Define the purpose of a piece of evidence.
export type ProofPurpose = 'Proof of Purchase' | 'Proof of Possession' | 'Proof of Value' | 'Supporting Document' | 'Unknown';
export type ProofType = 'image' | 'document' | 'video' | 'audio' | 'other';
export type CostType = 'Loss of Use' | 'Property Damage & Debris Removal' | 'Identity Fraud Expenses' | 'Other';

// New: Type to represent the stages of the autonomous AI pipeline.
export type PipelineStage = 'idle' | 'processing';

// New: Interface to track the progress within a pipeline stage.
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
    sourceType?: 'local' | 'cloud'; // New: To distinguish local uploads from cloud links
    sourceUrl?: string; // New: To store the URL for cloud-based proofs
    status?: ProofStatus;
    summary?: string;
    
    // New: Rich analysis fields for each proof.
    purpose?: ProofPurpose;
    authenticityScore?: number;
    receiptData?: ReceiptData;
    notes?: string;
    owner?: string;
}

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
    confidenceScore: number;
    isVerified: boolean;
    policyType?: string;
}

// New: Represents the AI's full analysis of a new policy document, including comparisons.
export interface PolicyAnalysisReport {
    analysisType: 'new' | 'update' | 'duplicate';
    targetPolicyId?: string; // ID of the policy this is an update/duplicate of
    warnings: string[];
    parsedPolicy: Omit<ParsedPolicy, 'id' | 'isActive' | 'isVerified' | 'policyName'>;
}


export interface PolicyParseResponse extends Omit<ParsedPolicy, 'isVerified' | 'id' | 'isActive' | 'policyName'> {}

export interface GeminiResponse {
    itemName: string;
    description: string;
    category: string;
    estimatedValue: number;
    brand?: string;
    model?: string;
    summary: string;
}

export interface DraftClaim {
    id: string;
    assetId: string;
    policyNumber: string;
    accountHolderId: string;
    status: 'system_ready_to_file' | 'filed' | 'closed';
    failureDescription: string;
    createdAt: string;
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

export interface ApparelIdentificationResponse {
    brand: string;
    model: string;
    msrp: number;
}

export interface HighestRcvResponse {
    price: number;
    source: string;
}

export interface SerialNumberResponse {
    serialNumber: string;
}

export interface ProofStrengthResponse {
    score: number;
    feedback: string;
}

export interface ACVResponse {
    acv: number;
    reasoning: string[];
}

export interface ProofSuggestion {
    proofId: string;
    confidence: number;
    reason: string;
    sourceUrl?: string;
}

export interface OtherCosts {
    lossOfUse: number;
    propertyDamage: number;
    identityFraud: number;
}

export interface ClaimDetails {
    name: string;
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

export type AppView = 'upload' | 'dashboard' | 'item-detail' | 'room-scan' | 'processing-preview' | 'autonomous-processor' | 'autonomous-review';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  app: 'VeritasVault' | 'Gemini';
  action: string; // e.g., 'ITEM_CREATED', 'POLICY_PARSED'
  details: string; // e.g., 'Created item: MacBook Pro 16"'
}

export type UndoableAction = 
  | { type: 'DELETE_ITEM', payload: { item: InventoryItem } }
  | { type: 'REJECT_SUGGESTION', payload: { suggestion: ProofSuggestion, itemId: string } };

export type UploadProgress = Record<string, {
    loaded: number;
    total: number;
}>;

// Represents an item currently in the background processing queue.
export interface ProcessingQueueItem {
    file: File;
    dataUrl: string;
    placeholderId: string;
}

// New: Type for chat messages in the AI Assistant
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
}

// --- NEW: Types for Interactive Processing Queue ---
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

// New: Type for the output of the Autonomous Inventory Processor AI
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