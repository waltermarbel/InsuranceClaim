
import { InventoryItem, ParsedPolicy, ClaimDetails, ActiveClaim, ClaimItem, Task, ClaimStage } from '../types.ts';

/**
 * Filter 1: Temporal
 * Checks if the item was purchased/acquired before the date of loss.
 */
const isTemporallyEligible = (item: InventoryItem, dateOfLoss: string): boolean => {
    if (!item.purchaseDate) return true; // Assume eligible if unknown
    const purchase = new Date(item.purchaseDate);
    const loss = new Date(dateOfLoss);
    return purchase <= loss;
};

/**
 * Filter 3: Physical Plausibility & Narrative (Simplistic version)
 * This would ideally check "last known location" vs incident details.
 * For now, we assume all active items in the Master are physically plausible unless marked archived.
 */
const isPhysicallyPlausible = (item: InventoryItem): boolean => {
    return item.status !== 'archived' && item.status !== 'rejected';
};

/**
 * Creates a clean, adjuster-readable description.
 * Removes internal notes or sensitive data from Master.
 */
const generateClaimDescription = (item: InventoryItem): string => {
    let desc = `${item.brand || ''} ${item.model || ''} ${item.itemName}`.trim();
    if (item.itemDescription) {
        // Take first sentence or up to 100 chars for brevity in claim schedule
        const briefDesc = item.itemDescription.split('.')[0];
        desc += ` - ${briefDesc}`;
    }
    return desc;
};

export const generateClaimInventory = (
    masterInventory: InventoryItem[],
    policy: ParsedPolicy,
    incident: ClaimDetails,
    inferredItemCategories?: string[]
): ActiveClaim => {
    if (!incident.dateOfLoss) {
        throw new Error("Date of Loss is required to generate a claim inventory.");
    }

    // Check if Incident Type itself is excluded by policy
    const incidentTypeLower = incident.incidentType.toLowerCase();
    const lowerCaseExclusions = policy.exclusions.map(ex => ex.toLowerCase());
    const isIncidentExcluded = lowerCaseExclusions.some(ex => incidentTypeLower.includes(ex));

    // Identify active sub-limits from policy
    const subLimits = policy.coverage.filter(c => c.type === 'sub-limit');
    const lowerCaseSubLimits = subLimits.map(sl => ({ ...sl, categoryLower: sl.category.toLowerCase() }));

    const lowerCaseInferredCategories = inferredItemCategories?.map(cat => cat.toLowerCase()) || [];

    const claimItems: ClaimItem[] = [];
    let totalValue = 0;

    masterInventory.forEach(masterItem => {
        // Apply Filters
        if (!isTemporallyEligible(masterItem, incident.dateOfLoss)) return;
        if (!isPhysicallyPlausible(masterItem)) return;
        
        const masterItemCategoryLower = masterItem.itemCategory.toLowerCase();

        // Use inferred categories to pre-filter items to include. If inferredCategories array is provided and not empty, include only those items.
        // Also include items with 'unknown' category just in case.
        if (lowerCaseInferredCategories.length > 0) {
            const isCategoryMatching = lowerCaseInferredCategories.some(catLower =>
                masterItemCategoryLower.includes(catLower) ||
                catLower.includes(masterItemCategoryLower)
            );
            if (!isCategoryMatching && masterItemCategoryLower !== 'unknown') {
                return; // skip if doesn't match inferred category
            }
        }
        
        let status: 'included' | 'excluded' | 'flagged' = 'included';
        let exclusionReason: string | undefined;
        let policyNotes: string | undefined;

        // 1. Check Global Incident Exclusion
        if (isIncidentExcluded) {
            status = 'excluded';
            exclusionReason = `Incident type '${incident.incidentType}' matches policy exclusion.`;
        } else {
            // 2. Check Item Category Exclusion
            const isCategoryExcluded = lowerCaseExclusions.some(ex => masterItemCategoryLower.includes(ex));
            if (isCategoryExcluded) {
                status = 'excluded';
                exclusionReason = `Category '${masterItem.itemCategory}' is listed in policy exclusions.`;
            }
        }

        // 3. Check Sub-Limits (Soft Flag)
        if (status === 'included') {
            const applicableSubLimit = lowerCaseSubLimits.find(sl =>
                masterItemCategoryLower.includes(sl.categoryLower) ||
                sl.categoryLower.includes(masterItemCategoryLower)
            );
            
            if (applicableSubLimit) {
                policyNotes = `Policy Sub-Limit: ${applicableSubLimit.category} is capped at $${applicableSubLimit.limit.toLocaleString()}.`;
                // If item value itself exceeds the limit, hard flag it
                const itemVal = masterItem.replacementCostValueRCV || masterItem.originalCost || 0;
                if (itemVal > applicableSubLimit.limit) {
                    status = 'flagged';
                    policyNotes += ` Item value ($${itemVal}) exceeds category cap.`;
                }
            }
        }

        // Valuation Logic: Use RCV if available, else Original Cost. Prefer RCV for claims usually.
        const val = masterItem.replacementCostValueRCV || masterItem.originalCost || 0;

        const claimItem: ClaimItem = {
            id: `claim-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            masterItemId: masterItem.id,
            claimDescription: generateClaimDescription(masterItem),
            category: masterItem.itemCategory,
            claimedValue: val,
            valuationMethod: masterItem.replacementCostValueRCV ? 'RCV' : 'ACV',
            narrativeTag: 'Packed', // Default assumption
            status: status,
            exclusionReason: exclusionReason,
            policyNotes: policyNotes
        };

        if (status === 'included' || status === 'flagged') {
            totalValue += val;
        }

        claimItems.push(claimItem);
    });

    return {
        id: `claim-${Date.now()}`,
        name: `${incident.incidentType} Claim - ${new Date().toLocaleDateString()}`,
        claimItems,
        generatedAt: new Date().toISOString(),
        totalClaimValue: totalValue,
        status: 'draft',
        stage: 'INTAKE',
        linkedPolicyId: policy.id,
        incidentDetails: incident
    };
};

export interface IncidentRequirements {
    requiredDocuments: string[];
    recommendedTasks: string[];
}

export const getIncidentRequirements = (incidentType: string): IncidentRequirements => {
    const type = incidentType.toLowerCase();
    
    if (type.includes('theft') || type.includes('burglary')) {
        return {
            requiredDocuments: [
                'Prompt Notice of Loss to the insurer or agent.',
                'Official Police Report detailing the break-in and list of stolen items.',
                'Detailed Inventory of Stolen Property (quantity, description, ACV, amount of loss for each item).',
                'Sworn Proof of Loss (signed/sworn statement within 60 days).',
                'Replacement Receipts/Invoices showing completion of replacement.'
            ],
            recommendedTasks: [
                'Obtain Proof of Theft Incident: using the official police report as primary proof.',
                'Obtain Proof of Ownership and Value: Original purchase receipts, credit card statements, photographs, gift receipts, or professional appraisals.',
                'Obtain Proof of Replacement: Receipts or invoices for replacement items.',
            ]
        };
    }
    
    if (type.includes('fire') || type.includes('smoke')) {
        return {
            requiredDocuments: ['Fire Marshal Report', 'Photos of Damage', 'Repair Estimates'],
            recommendedTasks: [
                'Contact Fire Department for report number',
                'Do not clean up until adjuster inspects',
                'Keep receipts for temporary housing (ALE)',
                'Take inventory of food loss in refrigerator'
            ]
        };
    }

    if (type.includes('water') || type.includes('leak') || type.includes('flood')) {
        return {
            requiredDocuments: ['Plumber Invoice', 'Moisture Mapping Report', 'Photos of Source'],
            recommendedTasks: [
                'Stop the water source immediately',
                'Keep the failed part (pipe/valve) for evidence',
                'Hire water mitigation company to dry out area',
                'Document damaged items before discarding'
            ]
        };
    }

    // Default
    return {
        requiredDocuments: ['Proof of Loss Form', 'Photos of Damage/Loss'],
        recommendedTasks: [
            'Write down a detailed timeline of the event',
            'Locate purchase receipts for high value items',
            'Review policy "Duties after Loss" section'
        ]
    };
};

export interface ClaimMetrics {
    grossLoss: number;
    deductible: number;
    netPayout: number;
    strategyScore: number;
    proofCompleteness: number; // 0-100
    coverageHealth: number; // 0-100
    actionItems: {
        itemId: string; // 'ALE' for ale alerts
        itemName: string;
        issue: 'Missing Proof' | 'Value Check Needed' | 'Sub-Limit Risk' | 'Coverage Limit Exceeded';
        severity: 'high' | 'medium';
    }[];
}

export const calculateClaimMetrics = (claim: ActiveClaim, policy: ParsedPolicy, inventory: InventoryItem[]): ClaimMetrics => {
    const includedItems = claim.claimItems.filter(i => i.status === 'included' || i.status === 'flagged');
    
    // 1. Financials (Personal Property)
    const grossLoss = includedItems.reduce((sum, item) => sum + item.claimedValue, 0);
    const deductible = policy.deductible || 0;
    
    // 2. ALE Financials (Loss of Use)
    let aleTotal = 0;
    if (claim.incidentDetails.claimDateRange && claim.incidentDetails.fairRentalValuePerDay) {
        const start = new Date(claim.incidentDetails.claimDateRange.startDate);
        const end = new Date(claim.incidentDetails.claimDateRange.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
        if (days > 0) {
            aleTotal = days * claim.incidentDetails.fairRentalValuePerDay;
        }
    }

    const netPayout = Math.max(0, grossLoss - deductible) + aleTotal; // Deductible usually applies once per occurrence

    // 3. Proof Health (Are there enough proofs?)
    let itemsWithProofs = 0;
    const actionItems: ClaimMetrics['actionItems'] = [];

    includedItems.forEach(cItem => {
        const masterItem = inventory.find(i => i.id === cItem.masterItemId);
        if (masterItem) {
            const hasPhoto = masterItem.linkedProofs.some(p => p.type === 'image');
            const hasReceipt = masterItem.linkedProofs.some(p => p.type === 'document' || p.purpose === 'Proof of Purchase');
            
            if (hasPhoto && hasReceipt) {
                itemsWithProofs++;
            } else {
                if (!hasPhoto) actionItems.push({ itemId: masterItem.id, itemName: masterItem.itemName, issue: 'Missing Proof', severity: 'high' });
                else if (!hasReceipt && cItem.claimedValue > 200) actionItems.push({ itemId: masterItem.id, itemName: masterItem.itemName, issue: 'Missing Proof', severity: 'medium' });
            }

            if (cItem.status === 'flagged') {
                actionItems.push({ itemId: masterItem.id, itemName: masterItem.itemName, issue: 'Sub-Limit Risk', severity: 'high' });
            }
        }
    });

    const proofCompleteness = includedItems.length > 0 ? (itemsWithProofs / includedItems.length) * 100 : 100;

    // 4. Coverage Health (Is the claim within limits?)
    const coverageLimit = policy.state?.aggregateLimits?.['Personal Property'] ?? (policy.coverage.find(c => c.type === 'main' && c.category === 'Personal Property')?.limit || 0);
    const coverageDLimit = policy.state?.aggregateLimits?.['Loss of Use'] ?? (policy.coverageD_limit || 0);

    // Check Property Limit
    if (grossLoss > coverageLimit) {
        actionItems.push({ itemId: 'policy-limit', itemName: 'Total Personal Property', issue: 'Coverage Limit Exceeded', severity: 'high' });
    }

    // Check ALE Limit
    if (aleTotal > coverageDLimit) {
        actionItems.push({ itemId: 'ale-limit', itemName: 'Additional Living Expenses', issue: 'Coverage Limit Exceeded', severity: 'high' });
    }

    const coverageHealth = coverageLimit > 0 ? Math.min(100, Math.max(0, 100 - ((grossLoss / coverageLimit) * 100))) : 0; 
    
    // 5. Strategy Score (Weighted Average)
    // Proofs: 50%, Financial Validity: 30%, Policy Check: 20%
    const strategyScore = Math.round((proofCompleteness * 0.5) + (Math.min(100, (netPayout > 0 ? 100 : 0)) * 0.3) + (80 * 0.2)); 

    return {
        grossLoss: grossLoss + aleTotal, // Total claim value
        deductible,
        netPayout,
        strategyScore,
        proofCompleteness,
        coverageHealth,
        actionItems
    };
};

export const determineNextAction = (claim: ActiveClaim, metrics: ClaimMetrics): { action: string, stage: ClaimStage, reason: string } => {
    if (claim.status === 'finalized') {
        return { action: 'Monitor Carrier Response', stage: 'UNDER_REVIEW', reason: 'Claim package has been generated and sealed.' };
    }

    // 1. Incident Details
    if (!claim.incidentDetails.policeReport && claim.incidentDetails.incidentType.includes('Theft')) {
        return { action: 'Upload Police Report', stage: 'INTAKE', reason: 'Theft claims require a police report number.' };
    }

    // 2. Inventory Selection
    if (claim.claimItems.length === 0) {
        return { action: 'Add Items to Claim', stage: 'BROKEN_REVIEW', reason: 'No items have been added to the schedule of loss.' };
    }

    // 3. Valuation (Look for $0 items or ACV only where RCV is possible)
    const zeroValueItems = claim.claimItems.filter(i => i.claimedValue === 0 && i.status === 'included');
    if (zeroValueItems.length > 0) {
        return { action: 'Set Item Values', stage: 'BROKEN_REVIEW', reason: `${zeroValueItems.length} items have $0 value.` };
    }

    // 4. Evidence (Look for missing proofs)
    if (metrics.proofCompleteness < 80) {
        return { action: 'Upload Missing Evidence', stage: 'READY_TO_FILE', reason: 'Proof score is below 80%. Photos/Receipts missing.' };
    }

    // 5. Review (Look for Sub-Limit Warnings)
    const flaggedItems = claim.claimItems.filter(i => i.status === 'flagged');
    const aleIssues = metrics.actionItems.filter(i => i.itemId === 'ale-limit');
    
    if (aleIssues.length > 0) {
        return { action: 'Review ALE Costs', stage: 'READY_TO_SUBMIT', reason: 'Loss of Use expenses exceed policy limits.' };
    }

    if (flaggedItems.length > 0) {
        return { action: 'Review Sub-Limits', stage: 'READY_TO_SUBMIT', reason: `${flaggedItems.length} items exceed policy sub-limits.` };
    }

    // Ready
    return { action: 'Generate Claim Package', stage: 'READY_TO_SUBMIT', reason: 'Claim is healthy and ready for final review.' };
};
