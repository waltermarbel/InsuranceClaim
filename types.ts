import { fileURLToPath } from "url";

export type ItemStatus = 'processing' | 'needs-review' | 'active' | 'claimed' | 'archived' | 'error' | 'rejected';

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

export interface AccountHolder {
  id: string;
  name: string;
  address: string;
}

export type ClaimStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'system_ready_to_file';

export interface DraftClaim {
    id: string;
    assetId: string;
    policyNumber: string;
    accountHolderId: string;
    status: ClaimStatus;
    failureDescription: string;
    createdAt: string;
}

export interface Proof {
    id: string;
    type: 'image' | 'document';
    fileName: string;
    dataUrl: string;
}

export interface ProofSuggestion {
    proofId: string;
    confidence: number;
    reason: string;
}

export type ItemCondition = 'New' | 'Like New' | 'Good' | 'Fair' | 'Damaged';
export type CreatedBy = 'User - Manual' | 'AI - Room Scan' | 'AI - Document Scan';

export interface InventoryItem {
  id: string;
  status: ItemStatus;
  itemName: string;
  itemCategory: string;
  itemDescription: string;
  originalCost: number;
  replacementCostValueRCV?: number;
  purchaseDate?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  condition?: ItemCondition;
  linkedProofs: Proof[];
  
  // AI & System managed fields
  aiNotes?: string[];
  proofStrengthScore?: number;
  proofStrengthFeedback?: string;
  lastKnownLocation?: string;
  isClaimed?: boolean;
  claimID?: string;
  damagedConditionPostLoss?: string;
  createdBy?: CreatedBy;
  createdAt?: string;
  lastModifiedAt?: string;
  
  // Claim related fields
  acvDepreciation?: { acv: number; reasoning: string[] };
  recommendedCoverage?: CoverageLimit;
  claims?: DraftClaim[];
  suggestedProofs?: ProofSuggestion[];
  error?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export type ActivityLogAction = 
    | 'ITEM_ADDED'
    | 'ITEM_UPDATED'
    | 'ITEM_DELETED'
    | 'PROOF_LINKED'
    | 'SUGGESTED_PROOF_APPROVED'
    | 'SUGGESTED_PROOF_REJECTED'
    | 'POLICY_UPLOADED'
    | 'POLICY_PARSED'
    | 'POLICY_VERIFIED'
    | 'AI_ANALYSIS_PERFORMED'
    | 'CLAIM_DRAFTED';

export interface ActivityLogEntry {
    id: string;
    timestamp: string;
    app: 'VeritasVault';
    action: ActivityLogAction;
    details: string; // e.g., "Updated item: Apple MacBook Pro" or "Performed: Market Valuation"
}


export interface GeminiResponse {
  itemName: string;
  description: string;
  category: string;
  estimatedValue: number;
  brand?: string;
  model?: string;
}

export interface ValuationResponse {
    rcv: number;
    acv: number;
    sources: { url: string; price: number; type: 'RCV' | 'ACV' }[];
}

export interface WebIntelligenceResponse {
    facts: { fact: string; source: string }[];
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

export interface PolicyParseResponse extends Omit<ParsedPolicy, 'isVerified'> {}
