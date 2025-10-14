// Fix: Removed invalid file marker that was causing a parsing error.
export type ItemStatus = 'processing' | 'enriching' | 'needs-review' | 'active' | 'claimed' | 'archived' | 'error' | 'rejected';

export type ProofType = 'image' | 'document' | 'video' | 'audio' | 'other';
export type CostType = 'Loss of Use' | 'Property Damage & Debris Removal' | 'Identity Fraud Expenses' | 'Other';

export interface Proof {
    id: string;
    type: ProofType;
    fileName: string;
    dataUrl: string; // Base64 encoded for images, or a URL for other types
    mimeType: string;
    createdBy: 'User' | 'AI' | 'System';
    createdAt?: string;
    costType?: CostType;
    estimatedValue?: number;
    predictedCategory?: string;
    predictedCategoryReasoning?: string;
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
}

export interface PolicyParseResponse extends Omit<ParsedPolicy, 'isVerified'> {}

export interface GeminiResponse {
    itemName: string;
    description: string;
    category: string;
    estimatedValue: number;
    brand?: string;
    model?: string;
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
}

export type AppView = 'upload' | 'processing' | 'bulk-review' | 'dashboard' | 'item-detail' | 'room-scan';

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
  | { type: 'REJECT_SUGGESTION', payload: { proofId: string, itemId: string } };

export type UploadProgress = Record<string, {
    loaded: number;
    total: number;
}>;
