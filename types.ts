

export type AppView = 'dashboard' | 'item-detail' | 'autonomous-processor' | 'autonomous-review' | 'scribe';

export type ItemStatus = 'processing' | 'clustering' | 'enriching' | 'needs-review' | 'active' | 'claimed' | 'archived' | 'error' | 'rejected';

import { ITEM_CONDITIONS } from './constants.ts';

// Rest of types...
export interface Proof {
    id: string;
    type: 'image' | 'document' | 'audio';
    fileName: string;
    mimeType: string;
    dataUrl?: string; // Optional, might be loaded async or blob stored separately
    createdBy: string;
    createdAt?: string;
    extractedData?: {
        vendor?: string;
        date?: string;
        amount?: number;
        itemNames?: string[];
        basicDetails?: string;
        suggestedCategory?: string;
    };
    contradictionFlag?: string;
    exif?: {
        dateTimeOriginal?: string;
        make?: string;
        model?: string;
        latitude?: number;
        longitude?: number;
    };
    purpose?: 'Proof of Purchase' | 'Proof of Possession' | 'Proof of Value' | 'Supporting Document' | 'Unknown';
    notes?: string;
    sourceType?: 'local' | 'cloud' | 'web';
    summary?: string;
    owner?: string;
}

export interface WebIntelligenceFact {
    fact: string;
    source: string;
}

export interface WebIntelligenceResponse {
    facts: WebIntelligenceFact[];
}

export interface ValuationSource {
    vendor: string;
    url: string;
    price: number;
    dateRetrieved: string;
    type?: 'RCV' | 'ACV';
    title?: string;
}

export interface ValuationMetric {
    value: number;
    confidence: number;
    sources: ValuationSource[];
}

export interface ValuationReport {
    rcv: ValuationMetric;
    acv: ValuationMetric;
    currency: string;
    timestamp: string;
    method: string;
}

// Legacy ValuationResponse for compatibility if needed
export interface ValuationResponse {
    rcv: number;
    acv: number;
    sources: { url: string; price: number; type: 'RCV' | 'ACV'; title: string }[];
    isUnderclaiming?: boolean;
    reasoning?: string;
}

/**
 * LAYER 1: Master Inventory Item
 * Represents the Source of Truth.
 * Changes here are permanent and global.
 * Should NOT be modified by temporary claim logic.
 */
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
    suggestedProofs?: ProofSuggestion[];
    webIntelligence?: WebIntelligenceResponse[];
    valuationHistory?: ValuationResponse[];
    valuationReport?: ValuationReport;
    createdAt: string;
    createdBy: string;
    lastKnownLocation?: string;
    proofStrengthScore?: number;
    discoveredFromBackground?: boolean;
    isGift?: boolean;
    giftedBy?: string;
    discoverySource?: 'manual' | 'csv' | 'email_archive' | 'photo_cloud' | 'background_scan';
}

export interface AutonomousInventoryItem {
    category: string;
    description: string;
    brandmodel: string;
    estimatedvaluercv: number;
    quantity: number;
    lastseendate: string;
    inferredowner: string;
    location: string;
    imagesource: string[];
    ainotes: string;
    confidencescore: number;
    sublimit_tag?: string;
    serialnumber?: string;
}

export interface CoverageLimit {
    category: string;
    limit: number;
    type: 'main' | 'sub-limit';
}

export interface PolicyState {
    deductibles: Record<string, number>; // e.g., { 'All Peril': 1000, 'Wind/Hail': 2000 }
    subLimits: Record<string, number>; // e.g., { 'Jewelry': 5000, 'Electronics': 10000 }
    exclusions: string[];
    aggregateLimits: Record<string, number>; // e.g., { 'Personal Property': 100000, 'Liability': 300000 }
}

export interface ParsedPolicy {
    id: string;
    policyName?: string;
    isActive: boolean;
    isVerified?: boolean;
    policyNumber: string;
    provider: string;
    policyHolder: string;
    effectiveDate: string;
    expirationDate: string;
    deductible: number;
    coverageD_limit?: number; // Loss of Use
    lossSettlementMethod: 'ACV' | 'RCV';
    policyType: string;
    coverage: CoverageLimit[];
    exclusions: string[];
    conditions: string[];
    triggers?: string[];
    limits?: string[];
    endorsements?: string[];
    confidenceScore: number;
    state?: PolicyState;
    highValueClaimAvenues?: { title: string; description: string; coverageMatches: string[] }[];
}

export interface PolicyComparison {
    hasDifferences: boolean;
    coverageDifferences: string[];
    limitDifferences: string[];
    exclusionDifferences: string[];
}

export interface PolicyAnalysisReport {
    analysisType: 'new' | 'update' | 'duplicate';
    warnings: string[];
    parsedPolicy: ParsedPolicy;
    targetPolicyId?: string | null;
    comparison?: PolicyComparison;
    highValueClaimAvenues?: { title: string; description: string; coverageMatches: string[] }[];
}

export interface AccountHolder {
    id: string;
    name: string;
    address: string;
}

export interface ClaimDateRange {
    startDate: string;
    endDate: string;
}

export interface TimelineEvent {
    id: string;
    title?: string;
    date: string;
    description: string;
    linkedDocumentIds?: string[]; // references Proof IDs
    linkedItemIds?: string[];     // references ClaimItem IDs
    involvedPersons?: string[];   // names or roles
    type: 'FACT' | 'NARRATIVE_ELEMENT' | 'INFERRED_NARRATIVE';
}

export interface ClaimDetails {
    name: string;
    dateOfLoss: string;
    incidentType: string;
    location: string;
    policeReport: string;
    propertyDamageDetails: string;
    narrative?: string;
    claimDateRange?: ClaimDateRange;
    fairRentalValuePerDay?: number;
    aleProofs: Proof[];
    claimDocuments: Proof[];
    timelineEvents?: TimelineEvent[];
}

/**
 * LAYER 2: Claim Inventory Item (Snapshot)
 * Represents an item specifically within the context of a claim.
 * 'claimedValue' can diverge from Master 'originalCost'/'RCV'.
 * 'claimDescription' is tailored for the adjuster.
 */
export interface ClaimItem {
    id: string;
    masterItemId: string; // Reference to Layer 1
    claimDescription: string; // Mutable snapshot of description
    category: string;
    claimedValue: number; // Mutable snapshot of value
    valuationMethod: 'RCV' | 'ACV';
    narrativeTag: 'Packed' | 'Stored' | 'In Transit' | 'In Use';
    status: 'included' | 'excluded' | 'flagged';
    exclusionReason?: string;
    policyNotes?: string;
}

export type ClaimStage = 'INTAKE' | 'BROKEN_REVIEW' | 'READY_TO_FILE' | 'FILED' | 'CLAIM_BOUND' | 'READY_TO_SUBMIT' | 'UNDER_REVIEW' | 'APPROVED';

export interface ActiveClaim {
    id: string;
    name: string;
    status: 'draft' | 'finalized';
    linkedPolicyId: string;
    generatedAt: string;
    totalClaimValue: number;
    stage: ClaimStage;
    claimItems: ClaimItem[];
    incidentDetails: ClaimDetails;
}

export interface Task {
    id: string;
    description: string;
    isCompleted: boolean;
    priority: 'High' | 'Medium' | 'Low';
    linkedItemId?: string;
    createdAt: string;
}

export interface BatchConflict {
    type: 'DUPLICATE_SERIAL' | 'DATE_OVERLAP' | 'VALUATION_INCONSISTENCY';
    items: string[]; // item IDs
    description: string;
    severity: 'High' | 'Medium' | 'Low';
}

export interface ActivityLogEntry {
    id: string;
    timestamp: string;
    action: string;
    details: string;
    reasonForChange?: string;
    app: 'Assert' | 'Gemini';
}

export interface ProofSuggestion {
    proofId: string;
    confidence: number;
    reason: string;
    sourceUrl?: string;
}

export interface ProcessingInference {
    proof: Proof;
    status: 'pending' | 'processing' | 'complete' | 'error';
    userSelection: 'approved' | 'rejected';
    analysisType?: 'NEW_ITEM' | 'EXISTING_ITEM_MATCH' | 'ALE_EXPENSE' | 'UNCLEAR';
    matchedItemId?: string | null;
    matchConfidence?: number | null;
    synthesizedItem?: Partial<InventoryItem>;
    aleDetails?: {
        vendor: string;
        date: string;
        amount: number;
        costType: string;
    };
    proofSummary?: string;
    errorMessage?: string;
    notes?: string;
    owner?: string;
}

export interface RiskGap {
    category: string;
    totalValue: number;
    policyLimit: number;
    isAtRisk: boolean;
    missingProofCount: number;
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
    imageUrl: string;
    sourceUrl: string;
}

export interface SimulationGateResult {
    validityGate: boolean;
    causeGate: boolean;
    conditionGate: boolean;
}

export interface SimulationFinancialSummary {
    grossLossTotal: number;
    depreciationApplied: number;
    deductibleApplied: number;
    sublimitReductions: number;
    sublimitGaps?: { category: string; limit: number; assetValue: number; gap: number }[];
    netPayout: number;
}

export interface ScenarioSimulationCard {
    simulationId: string;
    timestamp: string;
    policyContext: {
        policyType: string;
        jurisdiction: string;
        limits: {
            coverageA: number;
            coverageC: number;
            deductible: number;
        };
        endorsements: string[];
    };
    lossScenario: {
        scenarioFamily: string;
        causeOfLoss: string;
        lossDate: string;
        reportDate: string;
        mitigationStatus: boolean;
    };
    claimItems: {
        itemId: string;
        description: string;
        category: string;
        valuationBasis: string;
        grossLossAmount: number;
        proofLevel: number;
    }[];
    coverageDetermination: {
        gateResults: SimulationGateResult;
        financialSummary: SimulationFinancialSummary;
        denialReasons: string[];
    };
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    isLoading?: boolean;
}

export interface ProofStrengthResponse {
    score: number;
    feedback: string;
}

export interface SerialNumberResponse {
    serialNumber: string;
}

export interface PolicyVerificationResult {
    suggestions: string[];
    score: number;
}

export interface ClaimScenario {
    id: string;
    title: string;
    description: string;
    likelihood: 'Low' | 'Medium' | 'High';
    relevantCoverage: string;
    riskLevel: number;
    eventType?: string;
}

export interface ClaimGapAnalysis {
    overallRiskScore: number;
    flaggedItems: any[]; 
    policyWarnings: string[];
    recommendations: string[];
}

export interface BackgroundItemDiscovery {
    itemName: string;
    category: string;
    description: string;
    estimatedValue: number;
    confidence: number;
    locationInImage: string;
}

export type EscalationType = 'No Response (15 Days)' | 'Lowball Offer (<80% RCV)' | 'Partial Denial' | 'Full Denial';

export interface EscalationLetter {
    title: string;
    recipientType: string;
    statutesCited: string[];
    content: string;
}

export interface Correction {
    field: string;
    original: string | number;
    corrected: string | number;
    reason: string;
}

export interface AutoHealResponse {
    correctedAttributes: Partial<InventoryItem>;
    corrections: Correction[];
    confidenceScore: number;
    status: 'HEALED' | 'UNCHANGED' | 'FAIL';
    summary: string;
}

export type UploadProgress = Record<string, { loaded: number, total: number }>;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

// New: Ledger Type for Durable Progress
export interface PipelineItem {
    id: string;
    proofId: string; // References stored blob
    fileName: string;
    mimeType: string;
    status: 'pending' | 'processing' | 'complete' | 'error';
    retries: number;
    error?: string;
    resultItemId?: string; // If successful, ID of created item
}

export type PipelineStage = 'idle' | 'processing';



export interface Collaborator {
    id: string;
    name: string;
    type: 'TRUSTED' | 'THIRD_PARTY';
    script?: string;
    email?: string;
    phone?: string;
    tasks?: { id: string, text: string, completed: boolean }[];
    communicationLog?: { id: string, date: string, type: 'Email'|'Call'|'Meeting', summary: string }[];
    dossier?: {
        roleDescription: string;
        script: string;
        boundaries: string;
        compensationModel: string;
    };
}

export interface StrategicResourcePlan {
    documentationGuidance: {
        title: string;
        instructions: string;
        validityDescription: string;
    }[];
    corroborationNetwork: {
        role: string;
        namePlaceholder: string;
        roleDescription: string;
        script: string;
        boundaries: string;
        suggestedCompensation: string;
    }[];
}

export interface AppState {
    inventory: InventoryItem[]; 
    policies: ParsedPolicy[];
    unlinkedProofs: Proof[];
    accountHolder: AccountHolder;
    
    claims: ActiveClaim[];
    currentClaimId: string | null;

    timeline: TimelineEvent[];
    collaborators: Collaborator[];

    tasks: Task[];

    // Durable Processing Ledger
    processingQueue: PipelineItem[];

    activityLog: ActivityLogEntry[];
    currentView: AppView;
    selectedItemId: string | null;
    isInitialized: boolean;
    lastScrollPosition?: number;
}

export type Action =
  | { type: 'INITIALIZE_STATE'; payload: AppState }
  | { type: 'RESET_STATE' }
  | { type: 'LOAD_FROM_FILE'; payload: Omit<AppState, 'isInitialized' | 'currentView' | 'selectedItemId'> }
  | { type: 'UPDATE_ITEM'; payload: InventoryItem }
  | { type: 'ADD_INVENTORY_ITEMS'; payload: InventoryItem[] }
  | { type: 'BULK_UPDATE_ITEM_STATUS'; payload: { ids: string[], status: ItemStatus } }
  | { type: 'BULK_EDIT_ITEMS'; payload: { ids: string[], updates: Partial<InventoryItem> } }
  | { type: 'BULK_DELETE_ITEMS'; payload: { ids: string[] } }
  | { type: 'DELETE_ITEM'; payload: { itemId: string } }
  | { type: 'LOG_ACTIVITY'; payload: { action: string; details: string; reasonForChange?: string; app?: 'Assert' | 'Gemini' } }
  | { type: 'SAVE_POLICY_FROM_REPORT'; payload: PolicyAnalysisReport }
  | { type: 'UPDATE_POLICY'; payload: ParsedPolicy }
  | { type: 'SET_ACTIVE_POLICY'; payload: string }
  | { type: 'ADD_PROOFS_TO_ITEM'; payload: { itemId: string; proofs: Proof[] } }
  | { type: 'SET_VIEW'; payload: AppView }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'UNSELECT_ITEM' }
  | { type: 'UPDATE_SCROLL'; payload: number }
  | { type: 'FINALIZE_INTERACTIVE_PROCESSING', payload: ProcessingInference[] }
  | { type: 'SUGGEST_PROOF_FOR_ITEM', payload: { itemId: string; proof: Proof, suggestion: Omit<ProofSuggestion, 'sourceUrl'> & { sourceUrl?: string } } }
  | { type: 'ADD_SUGGESTIONS_TO_ITEM', payload: { itemId: string; suggestions: ProofSuggestion[] } }
  | { type: 'ACCEPT_SUGGESTION', payload: { itemId: string; proofId: string } }
  | { type: 'REJECT_SUGGESTION_PERMANENT', payload: { itemId: string; proofId: string } }
  | { type: 'REMOVE_UNLINKED_PROOF', payload: string }
  | { type: 'ADD_UNLINKED_PROOFS', payload: Proof[] }
  | { type: 'CREATE_CLAIM', payload: ActiveClaim }
  | { type: 'UPDATE_CLAIM_ITEM', payload: { claimId: string, item: ClaimItem } }
  | { type: 'UPDATE_CLAIM_DETAILS', payload: { claimId: string, details: Partial<ClaimDetails> } }
  | { type: 'UPDATE_CLAIM_STAGE', payload: { claimId: string, stage: ClaimStage } }
  | { type: 'SET_CURRENT_CLAIM', payload: string }
  | { type: 'DELETE_CLAIM', payload: string }
  | { type: 'ADD_TASK', payload: Task }
  | { type: 'TOGGLE_TASK', payload: string }
  | { type: 'DELETE_TASK', payload: string }
  | { type: 'UPDATE_TIMELINE', payload: TimelineEvent[] }
  | { type: 'UPDATE_COLLABORATORS', payload: Collaborator[] }
  // Pipeline Actions
  | { type: 'ENQUEUE_PIPELINE_ITEMS'; payload: PipelineItem[] }
  | { type: 'UPDATE_PIPELINE_ITEM_STATUS'; payload: { id: string; status: PipelineItem['status']; error?: string; resultItemId?: string } }
  | { type: 'CLEAR_PROCESSED_PIPELINE_ITEMS' }
  | { type: 'GLOBAL_UNDO' }
  | { type: 'GLOBAL_REDO' };
