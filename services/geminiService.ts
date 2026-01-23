
import { GoogleGenAI, Type, FunctionDeclaration, Schema, GenerateContentResponse } from "@google/genai";
import { 
    InventoryItem, 
    Proof, 
    WebIntelligenceResponse, 
    ValuationResponse, 
    ProofSuggestion, 
    AutonomousInventoryItem, 
    ParsedPolicy, 
    PolicyAnalysisReport, 
    RiskGap, 
    ProcessingInference, 
    ClaimDetails, 
    AccountHolder, 
    OptimalPolicyResult, 
    WebScrapeResult, 
    ScenarioAnalysis, 
    ChatMessage,
    ProofStrengthResponse,
    SerialNumberResponse,
    ClaimItem,
    PolicyVerificationResult,
    ClaimScenario,
    ClaimGapAnalysis,
    ActiveClaim
} from "../types.ts";
import { CATEGORIES } from "../constants.ts";
import { blobToBase64 } from "../utils/fileUtils.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper: File to Base64 (if not using utils directly in some contexts) ---
const fileToPart = async (file: File) => {
    const base64 = await blobToBase64(file);
    return {
        inlineData: {
            data: base64,
            mimeType: file.type
        }
    };
};

// --- 1. Autocomplete / Enrichment ---

export const autocompleteItemDetails = async (item: InventoryItem): Promise<Partial<InventoryItem>> => {
    try {
        const prompt = `
        Act as a forensic product researcher. Your goal is to find the exact specifications and current market details for the following item to automatically populate an insurance inventory form.
        
        Item Details:
        - Name: ${item.itemName}
        - Description: ${item.itemDescription}
        - Category: ${item.itemCategory}
        - Brand: ${item.brand || 'Unknown'}
        - Model: ${item.model || 'Unknown'}

        Task:
        1. Use Google Search to identify the specific product.
        2. Extract the full Brand Name, exact Model Number/Name, and a detailed professional description of the item (specs, features, year).
        3. Find the original MSRP or current estimated purchase price.
        4. Determine the best matching category from this list: ${CATEGORIES.join(', ')}.

        Return a JSON object with the following fields:
        {
            "brand": "string",
            "model": "string",
            "itemDescription": "string (detailed description)",
            "originalCost": number,
            "itemCategory": "string"
        }
        If you cannot find a specific field, leave it as null or the original value. Do not guess.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        brand: { type: Type.STRING },
                        model: { type: Type.STRING },
                        itemDescription: { type: Type.STRING },
                        originalCost: { type: Type.NUMBER },
                        itemCategory: { type: Type.STRING, enum: CATEGORIES }
                    },
                    required: ["brand", "model", "itemDescription", "originalCost", "itemCategory"]
                }
            },
        });

        // Ensure robust parsing by stripping potential markdown code blocks
        const jsonStr = response.text?.replace(/```json|```/g, '').trim() || "{}";
        return JSON.parse(jsonStr);

    } catch (error) {
        console.error("Error autocompleting item details:", error);
        throw new Error("AI failed to autocomplete details from the web.");
    }
};

export const enrichAssetFromWeb = async (item: InventoryItem): Promise<WebIntelligenceResponse> => {
    const prompt = `Find 3-5 interesting or valuable facts about the "${item.brand} ${item.model} ${item.itemName}" that would be relevant for an insurance claim (e.g., discontinuation status, collectibility, unique features). Return as a list of facts with source URLs.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    facts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                fact: { type: Type.STRING },
                                source: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || '{ "facts": [] }');
};

export const findMarketPrice = async (item: InventoryItem): Promise<ValuationResponse | null> => {
    const prompt = `Find the current Replacement Cost Value (RCV) for a new "${item.brand} ${item.model} ${item.itemName}" and the Actual Cash Value (ACV) for a used one in ${item.condition || 'Good'} condition. Provide 2-3 sources.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        rcv: { type: Type.NUMBER },
                        acv: { type: Type.NUMBER },
                        sources: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    url: { type: Type.STRING },
                                    price: { type: Type.NUMBER },
                                    type: { type: Type.STRING, enum: ["RCV", "ACV"] }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || 'null');
    } catch (e) {
        console.error("Market price lookup failed", e);
        return null;
    }
};

export const findProductImageFromWeb = async (item: InventoryItem): Promise<{ imageUrl: string, source: string } | null> => {
    const prompt = `Find a clear product image URL for "${item.brand} ${item.model} ${item.itemName}". Prefer white background or official product shots.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        imageUrl: { type: Type.STRING },
                        source: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || 'null');
    } catch (e) {
        return null;
    }
};

export const extractItemDetailsFromUrl = async (url: string): Promise<WebScrapeResult> => {
    const prompt = `Extract product details from this URL: ${url}. I need the Item Name, Description, Category, Cost, Brand, Model, and a main image URL.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    itemName: { type: Type.STRING },
                    itemDescription: { type: Type.STRING },
                    itemCategory: { type: Type.STRING, enum: CATEGORIES },
                    originalCost: { type: Type.NUMBER },
                    brand: { type: Type.STRING },
                    model: { type: Type.STRING },
                    imageUrl: { type: Type.STRING },
                    sourceUrl: { type: Type.STRING }
                },
                required: ["itemName", "itemCategory", "originalCost"]
            }
        }
    });
    const result = JSON.parse(response.text || '{}');
    result.sourceUrl = url;
    return result;
};


// --- 2. Vision & Proof Analysis ---

export const analyzeImageForItemDetails = async (proof: Proof, currentItem: InventoryItem): Promise<Partial<InventoryItem>> => {
    if (!proof.dataUrl) throw new Error("No image data");
    
    // Extract base64
    const base64Data = proof.dataUrl.split(',')[1];
    
    const prompt = `Analyze this image of a ${currentItem.itemName}. Extract the Brand, Model, Serial Number (if visible), Condition, and a detailed visual description.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', // Good for general image analysis
        contents: {
            parts: [
                { inlineData: { mimeType: proof.mimeType, data: base64Data } },
                { text: prompt }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    brand: { type: Type.STRING },
                    model: { type: Type.STRING },
                    serialNumber: { type: Type.STRING },
                    condition: { type: Type.STRING, enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'] },
                    itemDescription: { type: Type.STRING }
                }
            }
        }
    });
    
    return JSON.parse(response.text || '{}');
};

export const extractSerialNumber = async (dataUrl: string): Promise<SerialNumberResponse> => {
    const base64Data = dataUrl.split(',')[1];
    const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: "Find and extract the serial number from this image. Return just the serial number." }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    serialNumber: { type: Type.STRING }
                }
            }
        }
    });
    
    return JSON.parse(response.text || '{"serialNumber": ""}');
};

export const fuzzyMatchProofs = async (item: InventoryItem, proofs: Proof[]): Promise<{ suggestions: ProofSuggestion[] }> => {
    // This is a text-based matching. Real implementation might need image embeddings for better results.
    // For now, we ask LLM to match filenames/notes to the item.
    
    const proofsMetadata = proofs.map(p => ({ id: p.id, fileName: p.fileName, notes: p.notes, type: p.type }));
    const prompt = `Match the following proofs to this item: "${item.itemName} (${item.brand} ${item.model})". Return a list of matches with confidence score (0-100) and reasoning. Only return matches with >50 confidence.
    
    Proofs: ${JSON.stringify(proofsMetadata)}`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                proofId: { type: Type.STRING },
                                confidence: { type: Type.NUMBER },
                                reason: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    });

    return JSON.parse(response.text || '{ "suggestions": [] }');
};

export const calculateProofStrength = async (item: InventoryItem): Promise<ProofStrengthResponse> => {
    const hasImage = item.linkedProofs.some(p => p.type === 'image');
    const hasReceipt = item.linkedProofs.some(p => p.type === 'document' || p.purpose === 'Proof of Purchase');
    const detailsPopulated = !!(item.brand && item.model && item.originalCost);
    
    // We can use a small prompt to weigh these factors or just simple logic. 
    // Let's use AI for a nuanced "Audit Score".
    
    const prompt = `Evaluate the proof strength for this insurance item on a scale of 0-100.
    Item: ${item.itemName}
    Has Photo: ${hasImage}
    Has Receipt: ${hasReceipt}
    Details: Brand=${item.brand}, Model=${item.model}, Cost=${item.originalCost}, Serial=${item.serialNumber}.
    Provide a score and brief feedback.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER },
                    feedback: { type: Type.STRING }
                }
            }
        }
    });
    
    return JSON.parse(response.text || '{"score": 0, "feedback": "Error"}');
};

export const runAutonomousProcessor = async (files: File[]): Promise<{ file: File, result: AutonomousInventoryItem | null }[]> => {
    const results: { file: File, result: AutonomousInventoryItem | null }[] = [];
    
    // Process in parallel or serial depending on limits. For simplicity, serial or small batches.
    for (const file of files) {
        const base64 = await blobToBase64(file);
        
        const prompt = `Analyze this file (image or document). Identify the primary item it represents (or list of items if a receipt). 
        Extract: Category, Description, Brand/Model, Estimated Value (RCV), Quantity, Date Seen/Purchased, Location, and generate AI notes.`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview', // More capability for document OCR/Reasoning
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64 } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                           category: { type: Type.STRING, enum: CATEGORIES },
                           description: { type: Type.STRING },
                           brandmodel: { type: Type.STRING },
                           estimatedvaluercv: { type: Type.NUMBER },
                           quantity: { type: Type.NUMBER },
                           lastseendate: { type: Type.STRING },
                           inferredowner: { type: Type.STRING },
                           location: { type: Type.STRING },
                           imagesource: { type: Type.ARRAY, items: { type: Type.STRING } },
                           ainotes: { type: Type.STRING },
                           confidencescore: { type: Type.NUMBER },
                           sublimit_tag: { type: Type.STRING, nullable: true },
                           serialnumber: { type: Type.STRING, nullable: true }
                        }
                    }
                }
            });
            const item = JSON.parse(response.text || '{}');
            // Basic mapping fixes
            item.imagesource = [file.name];
            results.push({ file, result: item });
        } catch (e) {
            console.error("Failed to process file", file.name, e);
            results.push({ file, result: null });
        }
    }
    return results;
};

// --- 3. Policy Analysis ---

export const analyzeAndComparePolicy = async (file: File, existingPolicies: ParsedPolicy[], accountHolder: AccountHolder): Promise<PolicyAnalysisReport> => {
    const base64 = await blobToBase64(file);
    
    const prompt = `Analyze this insurance policy document. Extract all coverage limits, deductibles, exclusions, and conditions.
    Compare it with the existing policies (if any provided in context, assume none for now).
    Determine if this is a NEW policy, an UPDATE, or a DUPLICATE.
    Provide warnings for any unusual exclusions or low sub-limits.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // High reasoning needed for policy docs
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: base64 } },
                { text: prompt }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analysisType: { type: Type.STRING, enum: ['new', 'update', 'duplicate'] },
                    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                    parsedPolicy: {
                        type: Type.OBJECT,
                        properties: {
                            policyNumber: { type: Type.STRING },
                            provider: { type: Type.STRING },
                            policyHolder: { type: Type.STRING },
                            effectiveDate: { type: Type.STRING },
                            expirationDate: { type: Type.STRING },
                            deductible: { type: Type.NUMBER },
                            coverageD_limit: { type: Type.NUMBER },
                            lossSettlementMethod: { type: Type.STRING, enum: ['ACV', 'RCV'] },
                            policyType: { type: Type.STRING },
                            coverage: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        category: { type: Type.STRING },
                                        limit: { type: Type.NUMBER },
                                        type: { type: Type.STRING, enum: ['main', 'sub-limit'] }
                                    }
                                }
                            },
                            exclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            conditions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            confidenceScore: { type: Type.NUMBER }
                        }
                    },
                    targetPolicyId: { type: Type.STRING, nullable: true }
                }
            }
        }
    });

    return JSON.parse(response.text || '{}');
};

export const verifyPolicyDetails = async (policy: ParsedPolicy): Promise<PolicyVerificationResult> => {
    const prompt = `Review the following insurance policy details extracted from a document.
    Policy: ${JSON.stringify(policy)}
    
    Task:
    1. Cross-reference against common insurance terms (e.g. HO-4, HO-3, endorsements).
    2. Check for potential OCR errors or logical inconsistencies (e.g. coverage limits that don't make sense, missing standard exclusions).
    3. Suggest any corrections or things the user should double check.
    
    Return a JSON object with a 'suggestions' array of strings and a 'score' (0-100) representing data quality/completeness.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    score: { type: Type.NUMBER }
                }
            }
        }
    });

    return JSON.parse(response.text || '{ "suggestions": [], "score": 0 }');
};

export const suggestClaimScenarios = async (inventory: InventoryItem[], policy: ParsedPolicy): Promise<ClaimScenario[]> => {
    const inventorySummary = inventory
        .filter(i => (i.replacementCostValueRCV || 0) > 500) // Focus on high value items
        .map(i => `${i.itemName} ($${i.replacementCostValueRCV}, ${i.itemCategory})`)
        .slice(0, 20) // Limit to top items
        .join(', ');

    const prompt = `Based on this high-value inventory (${inventorySummary}) and this policy (Coverages: ${JSON.stringify(policy.coverage)}, Exclusions: ${JSON.stringify(policy.exclusions)}), suggest 3 proactive potential claim scenarios that the user should be prepared for.
    Consider common perils like Theft, Fire, or Water Damage given the item types.
    For each scenario, estimate a 'riskLevel' (0-100) based on item vulnerability and 'likelihood' (Low/Medium/High).
    Identify the relevant coverage section.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    scenarios: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                likelihood: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                                relevantCoverage: { type: Type.STRING },
                                riskLevel: { type: Type.NUMBER }
                            }
                        }
                    }
                }
            }
        }
    });

    const result = JSON.parse(response.text || '{ "scenarios": [] }');
    return result.scenarios;
};

export const auditCoverageGaps = async (inventory: InventoryItem[], policy: ParsedPolicy): Promise<RiskGap[]> => {
    // Calculate totals per category from inventory
    const totals: Record<string, number> = {};
    inventory.forEach(i => {
        const cat = i.itemCategory;
        const val = i.replacementCostValueRCV || i.originalCost || 0;
        totals[cat] = (totals[cat] || 0) + val;
    });

    const gaps: RiskGap[] = [];

    // Check main Personal Property limit
    const ppLimit = policy.coverage.find(c => c.category === 'Personal Property' && c.type === 'main');
    if (ppLimit) {
        const totalValue = Object.values(totals).reduce((a, b) => a + b, 0);
        gaps.push({
            category: 'Total Personal Property',
            totalValue,
            policyLimit: ppLimit.limit,
            isAtRisk: totalValue > ppLimit.limit,
            missingProofCount: 0 // Simplification
        });
    }

    // Check sub-limits
    policy.coverage.filter(c => c.type === 'sub-limit').forEach(sub => {
        // Map policy category names to inventory categories approximately
        // In a real app, AI could map these. We'll do simple string matching.
        let catTotal = 0;
        Object.keys(totals).forEach(invCat => {
            if (sub.category.includes(invCat) || invCat.includes(sub.category)) {
                catTotal += totals[invCat];
            }
        });

        gaps.push({
            category: sub.category,
            totalValue: catTotal,
            policyLimit: sub.limit,
            isAtRisk: catTotal > sub.limit,
            missingProofCount: 0
        });
    });

    return gaps;
};

export const analyzeClaimCoverageGaps = async (claim: ActiveClaim, policy: ParsedPolicy): Promise<ClaimGapAnalysis> => {
    const claimSummary = claim.claimItems
        .filter(i => i.status === 'included' || i.status === 'flagged')
        .map(i => `${i.claimDescription} (${i.category}, $${i.claimedValue})`)
        .join(', ');

    const prompt = `Analyze this active insurance claim against the policy limits.
    
    Policy Limits: ${JSON.stringify(policy.coverage)}
    Exclusions: ${JSON.stringify(policy.exclusions)}
    
    Claimed Items: ${claimSummary}
    
    Identify:
    1. Items that might be under-insured due to sub-limits (e.g. jewelry, electronics).
    2. Items potentially excluded based on description vs policy exclusions.
    3. Weak documentation risks (general assessment).
    
    Return a structured analysis.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    overallRiskScore: { type: Type.NUMBER },
                    flaggedItems: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                itemName: { type: Type.STRING },
                                issueType: { type: Type.STRING, enum: ['Under-Insured', 'Potential Exclusion', 'Documentation Weak'] },
                                description: { type: Type.STRING },
                                financialImpact: { type: Type.NUMBER }
                            }
                        }
                    },
                    policyWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });

    return JSON.parse(response.text || '{}');
};

export const findOptimalPolicyForItem = async (item: InventoryItem, policies: ParsedPolicy[]): Promise<OptimalPolicyResult> => {
    // Just a placeholder simulation using AI reasoning
    const prompt = `Given the item "${item.itemName}" (${item.itemCategory}, Value: $${item.replacementCostValueRCV}) and these policies: ${JSON.stringify(policies.map(p => ({id: p.id, name: p.policyName, limits: p.coverage})))}. 
    Which policy provides the best coverage? Calculate financial advantage.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    bestPolicyId: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                    financialAdvantage: { type: Type.NUMBER },
                    originalPolicyId: { type: Type.STRING }
                }
            }
        }
    });

    return JSON.parse(response.text || '{}');
};

// --- 4. Interactive & Processing Preview ---

export const analyzeProofForClaimableItem = async (proof: Proof, existingInventory: InventoryItem[]): Promise<ProcessingInference> => {
    // Decide if this proof represents a new item, matches an existing one, or is an expense receipt.
    const inventorySummary = existingInventory.map(i => ({ id: i.id, name: i.itemName, brand: i.brand, model: i.model }));
    
    let base64 = "";
    if (proof.dataUrl) {
         base64 = proof.dataUrl.split(',')[1];
    } else {
        // In real app, might need to fetch blob if dataUrl is missing
        return { proof, status: 'error', errorMessage: 'No data', userSelection: 'rejected' };
    }

    const prompt = `Analyze this proof (image/doc). 
    1. Does it match any item in the provided inventory list?
    2. Is it a receipt for Additional Living Expense (ALE) like hotel or food?
    3. Or is it a new item not in the list?
    
    Inventory: ${JSON.stringify(inventorySummary)}
    
    Return JSON with analysisType (NEW_ITEM, EXISTING_ITEM_MATCH, ALE_EXPENSE, UNCLEAR).
    Populate corresponding fields.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: proof.mimeType, data: base64 } },
                { text: prompt }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analysisType: { type: Type.STRING, enum: ['NEW_ITEM', 'EXISTING_ITEM_MATCH', 'ALE_EXPENSE', 'UNCLEAR'] },
                    matchedItemId: { type: Type.STRING, nullable: true },
                    matchConfidence: { type: Type.NUMBER, nullable: true },
                    synthesizedItem: { 
                        type: Type.OBJECT, 
                        nullable: true,
                        properties: {
                            itemName: { type: Type.STRING },
                            itemCategory: { type: Type.STRING },
                            originalCost: { type: Type.NUMBER },
                            purchaseDate: { type: Type.STRING },
                            isGift: { type: Type.BOOLEAN },
                            giftedBy: { type: Type.STRING }
                        }
                    },
                    aleDetails: {
                        type: Type.OBJECT, 
                        nullable: true,
                        properties: {
                            vendor: { type: Type.STRING },
                            date: { type: Type.STRING },
                            amount: { type: Type.NUMBER },
                            costType: { type: Type.STRING }
                        }
                    },
                    proofSummary: { type: Type.STRING }
                }
            }
        }
    });

    const result = JSON.parse(response.text || '{}');
    return { ...result, proof, status: 'complete', userSelection: 'approved' };
};

// --- 5. Media Generation & Editing ---

export const editImageWithPrompt = async (dataUrl: string, prompt: string): Promise<string> => {
    const base64Data = dataUrl.split(',')[1];
    const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: prompt }
            ]
        }
    });

    // The model returns an image part
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image returned");
};

export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    // Using flash-image for general generation as per guidelines for general tasks, 
    // or pro-image-preview for high quality. Let's use pro-image-preview for quality.
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [{ text: prompt }]
        },
        config: {
            imageConfig: {
                aspectRatio: aspectRatio as any || "1:1",
                imageSize: "1K"
            }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated");
};

// --- 6. Audio & Chat ---

export const transcribeAudio = async (blob: Blob): Promise<string> => {
    const base64 = await blobToBase64(blob);
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025', // Specialized audio model
        contents: {
            parts: [
                { inlineData: { mimeType: blob.type, data: base64 } },
                { text: "Transcribe this audio." }
            ]
        }
    });
    return response.text || "";
};

export const getAssistantContext = (inventory: InventoryItem[], policy?: ParsedPolicy): string => {
    const inventorySummary = inventory.map(i => `${i.itemName} ($${i.replacementCostValueRCV || i.originalCost})`).join(', ');
    const policySummary = policy ? `Policy: ${policy.provider} #${policy.policyNumber}, Coverage A: $${policy.coverage.find(c => c.type === 'main')?.limit}` : "No active policy.";
    
    return `You are the VeritasVault AI Assistant. You help users manage their home inventory for insurance purposes.
    
    Current Inventory: ${inventorySummary}
    Current Policy: ${policySummary}
    
    Help the user finding items, understanding their coverage, or navigating the app.
    You can use the 'navigate' tool to change views or 'searchVault' to filter items.
    `;
};

export const getChatResponse = async (
    history: ChatMessage[], 
    newMessage: string, 
    thinking: boolean, 
    inventory: InventoryItem[], 
    policy?: ParsedPolicy
): Promise<GenerateContentResponse> => {
    
    const systemInstruction = getAssistantContext(inventory, policy);
    
    // Convert history to Gemini format (simplification)
    const contents = history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: newMessage }] });

    const modelName = thinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    const config: any = {
        systemInstruction,
        tools: [{
            functionDeclarations: [
                {
                    name: 'navigate',
                    description: 'Navigate to a specific section of the app.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            view: { type: Type.STRING, enum: ['evidence', 'inventory', 'claim', 'dashboard'] }
                        },
                        required: ['view']
                    }
                },
                {
                    name: 'searchVault',
                    description: 'Search the inventory for a specific item.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            query: { type: Type.STRING }
                        },
                        required: ['query']
                    }
                }
            ]
        }]
    };
    
    if (thinking) {
        config.thinkingConfig = { thinkingBudget: 1024 }; 
    }

    const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
    });
    
    return response;
};

// --- 7. Narrative Generation ---

export const generateClaimNarrative = async (claimDetails: ClaimDetails, accountHolder: AccountHolder, items: InventoryItem[], policy: ParsedPolicy): Promise<string> => {
    const prompt = `Write a formal insurance claim narrative for the following loss.
    
    Policyholder: ${accountHolder.name}, ${accountHolder.address}
    Policy: ${policy.provider} #${policy.policyNumber}
    
    Incident: ${claimDetails.incidentType} on ${claimDetails.dateOfLoss}
    Description: ${claimDetails.propertyDamageDetails}
    
    Items Claimed: ${items.map(i => `${i.itemName} (${i.brand}, $${i.replacementCostValueRCV})`).join(', ')}
    
    The narrative should be professional, concise, and emphasize that the items were owned and damaged/stolen as part of the covered event.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });
    
    return response.text || "";
};

export const generateOptimizedNarrative = async (item: InventoryItem, policy: ParsedPolicy, incident: ClaimDetails): Promise<string> => {
    const prompt = `Re-write the incident description specifically for the claim of this single item: "${item.itemName}".
    Ensure the description aligns with the policy coverage for "Personal Property" and the incident type "${incident.incidentType}".
    Avoid ambiguous language that could lead to denial (e.g., avoid "mysterious disappearance" if only theft is covered).
    
    Incident Context: ${incident.propertyDamageDetails}`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt
    });

    return response.text || "";
};

// --- 8. Simulation ---

export const runScenarioSimulation = async (inventory: InventoryItem[], policy: ParsedPolicy, description: string, type: string): Promise<ScenarioAnalysis> => {
    const prompt = `Simulate an insurance claim scenario.
    Event Type: ${type}
    Description: ${description}
    Policy Limits: ${JSON.stringify(policy.coverage)}
    Deductible: ${policy.deductible}
    Exclusions: ${JSON.stringify(policy.exclusions)}
    
    Inventory Value: ${inventory.reduce((sum, i) => sum + (i.replacementCostValueRCV || 0), 0)}
    
    Calculate:
    1. Gross Loss (estimated based on description severity vs inventory)
    2. Applied Deductible
    3. Net Payout
    4. Denied Items (if any, based on exclusions)
    5. Sub-limit hits
    6. Action Plan (3-5 steps)
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    scenarioTitle: { type: Type.STRING },
                    grossLoss: { type: Type.NUMBER },
                    appliedDeductible: { type: Type.NUMBER },
                    netPayout: { type: Type.NUMBER },
                    deniedItems: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT,
                            properties: {
                                itemName: { type: Type.STRING },
                                reason: { type: Type.STRING },
                                value: { type: Type.NUMBER }
                            }
                        }
                    },
                    subLimitHits: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                category: { type: Type.STRING },
                                totalValue: { type: Type.NUMBER },
                                limit: { type: Type.NUMBER }
                            }
                        }
                    },
                    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                    actionPlan: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });

    return JSON.parse(response.text || '{}');
};
