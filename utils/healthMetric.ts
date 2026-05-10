import { InventoryItem } from '../types.ts';

export const calculateHealthMetric = (item: InventoryItem): number => {
    let score = 0;
    
    // 1. Photo 
    const hasPhoto = item.linkedProofs?.some(p => p.type === 'image' || p.mimeType?.startsWith('image/'));
    if (hasPhoto) score += 25;

    // 2. Receipt / Document
    const hasReceipt = item.linkedProofs?.some(p => 
        p.type === 'document' || 
        p.fileName?.toLowerCase().includes('receipt') || 
        p.notes?.toLowerCase().includes('receipt')
    );
    if (hasReceipt) score += 25;

    // 3. Serial Number
    const hasSerialNumber = !!item.serialNumber && item.serialNumber.trim() !== '' && item.serialNumber !== 'Unknown';
    if (hasSerialNumber) score += 25;

    // 4. Verified Valuation
    const hasValuation = (item.replacementCostValueRCV ?? 0) > 0 || (item.originalCost ?? 0) > 0;
    if (hasValuation) score += 25;

    return Math.min(100, score);
};

export const isHighRiskOfDenial = (score: number): boolean => {
    return score < 50;
};
