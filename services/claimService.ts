
import { InventoryItem, ParsedPolicy, ClaimDetails, ActiveClaim, ClaimItem } from '../types.ts';

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
    incident: ClaimDetails
): ActiveClaim => {
    if (!incident.dateOfLoss) {
        throw new Error("Date of Loss is required to generate a claim inventory.");
    }

    // Check if Incident Type itself is excluded by policy
    const incidentTypeLower = incident.incidentType.toLowerCase();
    const isIncidentExcluded = policy.exclusions.some(ex => incidentTypeLower.includes(ex.toLowerCase()));

    // Identify active sub-limits from policy
    const subLimits = policy.coverage.filter(c => c.type === 'sub-limit');

    const claimItems: ClaimItem[] = [];
    let totalValue = 0;

    masterInventory.forEach(masterItem => {
        // Apply Filters
        if (!isTemporallyEligible(masterItem, incident.dateOfLoss)) return;
        if (!isPhysicallyPlausible(masterItem)) return;
        
        let status: 'included' | 'excluded' | 'flagged' = 'included';
        let exclusionReason: string | undefined;
        let policyNotes: string | undefined;

        // 1. Check Global Incident Exclusion
        if (isIncidentExcluded) {
            status = 'excluded';
            exclusionReason = `Incident type '${incident.incidentType}' matches policy exclusion.`;
        } else {
            // 2. Check Item Category Exclusion
            const isCategoryExcluded = policy.exclusions.some(ex => masterItem.itemCategory.toLowerCase().includes(ex.toLowerCase()));
            if (isCategoryExcluded) {
                status = 'excluded';
                exclusionReason = `Category '${masterItem.itemCategory}' is listed in policy exclusions.`;
            }
        }

        // 3. Check Sub-Limits (Soft Flag)
        if (status === 'included') {
            const applicableSubLimit = subLimits.find(sl => 
                masterItem.itemCategory.toLowerCase().includes(sl.category.toLowerCase()) || 
                sl.category.toLowerCase().includes(masterItem.itemCategory.toLowerCase())
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
        linkedPolicyId: policy.id,
        incidentDetails: incident
    };
};
