import { GoogleGenAI, Type, Modality } from "@google/genai";
// Fix: Added .ts extension to file paths
// Fix: Added blobToBase64 utility.
import { fileToBase64, blobToBase64 } from '../utils/fileUtils.ts';
// Fix: Added ChatMessage type for the AI assistant.
import { InventoryItem, ParsedPolicy, AccountHolder, DraftClaim, ValuationResponse, WebIntelligenceResponse, ApparelIdentificationResponse, HighestRcvResponse, SerialNumberResponse, ProofStrengthResponse, Proof, ProofSuggestion, ACVResponse, CoverageLimit, PolicyAnalysisReport, ValuationSource, ProofPurpose, ChatMessage, WebIntelligenceFact, ReceiptData, ProcessingInference, AleDetails, CostType, InferenceType, AutonomousInventoryItem, ClaimDetails, OptimalPolicyResult, WebScrapeResult } from '../types.ts';
import { CATEGORIES } from '../constants.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- CORE AI SERVICES ---

// List of MIME types supported by the Gemini Pro Vision model for clustering.
const SUPPORTED_CLUSTER_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
];


// --- NEW & ENHANCED MODULES ---

const policyAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        analysisType: { type: Type.STRING, enum: ['new', 'update', 'duplicate'], description: "Your analysis of the policy compared to existing ones." },
        targetPolicyId: { type: Type.STRING, description: "If type is 'update' or 'duplicate', this is the ID of the existing policy it relates to." },
        warnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of warnings for the user, such as policyholder mismatch or missing critical details." },
        parsedPolicy: {
            type: Type.OBJECT,
            properties: {
                provider: { type: Type.STRING },
                policyNumber: { type: Type.STRING },
                policyHolder: { type: Type.STRING },
                effectiveDate: { type: Type.STRING, description: "YYYY-MM-DD format." },
                expirationDate: { type: Type.STRING, description: "YYYY-MM-DD format." },
                deductible: { type: Type.NUMBER },
                coverage: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { category: { type: Type.STRING }, limit: { type: Type.NUMBER }, type: { type: Type.STRING, enum: ['main', 'sub-limit'] } },
                        required: ["category", "limit", "type"]
                    }
                },
                coverageD_limit: { type: Type.NUMBER },
                lossSettlementMethod: { type: Type.STRING, enum: ['ACV', 'RCV'] },
                exclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
                confidenceScore: { type: Type.INTEGER, description: "Your confidence (0-100) in the accuracy of the extracted data." },
                policyType: { type: Type.STRING, description: "The specific type of policy, such as 'HO-4', 'Renters Insurance', 'DP-3', etc. If not found, leave blank." },
            },
            required: ["provider", "policyNumber", "policyHolder", "effectiveDate", "expirationDate", "deductible", "coverage", "coverageD_limit", "lossSettlementMethod", "exclusions", "confidenceScore"]
        }
    },
    required: ["analysisType", "warnings", "parsedPolicy"]
};

export const analyzeAndComparePolicy = async (file: File, existingPolicies: ParsedPolicy[], accountHolder: AccountHolder, userCorrections: string[] = []): Promise<PolicyAnalysisReport> => {
    try {
        const base64pdf = await fileToBase64(file);
        const pdfPart = { inlineData: { mimeType: 'application/pdf', data: base64pdf } };

        const prompt = `
        Act as an expert insurance policy analyst for VeritasVault. Your task is to analyze a new policy document, paying close attention to the Declarations Page, and compare it against the user's existing policies.

        CONTEXT:
        - Primary Account Holder: ${accountHolder.name}
        - Existing Policies in Vault: ${existingPolicies.length > 0 ? JSON.stringify(existingPolicies.map(p => ({ id: p.id, policyNumber: p.policyNumber, provider: p.provider, effectiveDate: p.effectiveDate }))) : "None"}
        - Past User Corrections (CRITICAL: Learn from these to improve accuracy): ${userCorrections.length > 0 ? userCorrections.join('\n') : "None"}

        CRITICAL INSTRUCTIONS:
        1.  **MANDATORY: Prioritize the Declarations Page:** Your primary source of truth MUST be the page titled "Declarations". All key data (limits, numbers, dates, policy type) is located there. Do not infer from other sections if the Declarations page is present.
        2.  **Parse Accurately:** Extract all key information, including the specific policy type (e.g., 'HO-4', 'Renters Insurance').
        3.  **Compare and Analyze:**
            - Compare the parsed policy number and dates with the existing policies.
            - If it has the same policy number as an existing one but a newer effectiveDate, classify it as an 'update'. Provide the 'targetPolicyId' of the policy it updates.
            - If it's identical to an existing policy, classify it as a 'duplicate'. Provide the 'targetPolicyId'.
            - Otherwise, classify it as 'new'.
        4.  **Generate Warnings:**
            - If the 'policyHolder' name is significantly different from '${accountHolder.name}', add a warning.
            - If you cannot find critical information like a deductible or main coverage limit, add a warning.
        5.  **Exclusions:** Be extremely thorough in listing exclusions found in the document.
        6.  **AI Self-Improvement (Most Important Task):** The user has provided these past corrections: ${userCorrections.length > 0 ? userCorrections.join('; ') : "None"}. This is direct feedback on your previous mistakes. You MUST learn from them.
        7.  **Return Result:** Respond with the full analysis in the specified JSON format.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{text: prompt}, pdfPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: policyAnalysisSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PolicyAnalysisReport;
    } catch (error) {
        console.error("Error analyzing policy document:", error);
        throw new Error("Failed to analyze the policy document. Please ensure it's a valid PDF and try again.");
    }
};

const proofAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        analysisType: { type: Type.STRING, enum: ['NEW_ITEM', 'EXISTING_ITEM_MATCH', 'ALE_EXPENSE', 'UNCLEAR'], description: "Your classification of this proof." },
        proofSummary: { type: Type.STRING, description: "A brief, one-sentence summary of what the proof shows (e.g., 'A Best Buy receipt for a Sony TV.')." },
        synthesizedItem: {
            type: Type.OBJECT,
            description: "Required if analysisType is NEW_ITEM.",
            properties: {
                itemName: { type: Type.STRING },
                itemDescription: { type: Type.STRING },
                itemCategory: { type: Type.STRING, enum: CATEGORIES },
                originalCost: { type: Type.NUMBER },
                purchaseDate: { type: Type.STRING, description: "The purchase or acquisition date in YYYY-MM-DD format, if available." },
                isGift: { type: Type.BOOLEAN, description: "Set to true if the proof indicates the item was a gift." },
                giftedBy: { type: Type.STRING, description: "If a gift, who it was from, if known." },
            }
        },
        matchedItemId: { type: Type.STRING, description: "Required if analysisType is EXISTING_ITEM_MATCH. The ID of the matched item." },
        matchConfidence: { type: Type.INTEGER, description: "Required if analysisType is EXISTING_ITEM_MATCH. Confidence score (0-100)." },
        aleDetails: {
            type: Type.OBJECT,
            description: "Required if analysisType is ALE_EXPENSE.",
            properties: {
                vendor: { type: Type.STRING },
                date: { type: Type.STRING, description: "YYYY-MM-DD format." },
                amount: { type: Type.NUMBER },
                costType: { type: Type.STRING, enum: ['Loss of Use', 'Property Damage & Debris Removal', 'Identity Fraud Expenses', 'Other'] },
            }
        },
    },
    required: ["analysisType", "proofSummary"]
};

export const analyzeProofForClaimableItem = async (proof: Proof, existingInventory: InventoryItem[]): Promise<Omit<ProcessingInference, 'proof' | 'status' | 'userSelection'>> => {
    const SUPPORTED_ANALYSIS_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
        'application/pdf',
    ];

    if (!SUPPORTED_ANALYSIS_MIME_TYPES.includes(proof.mimeType)) {
        return {
            analysisType: 'UNCLEAR',
            proofSummary: `File type (${proof.mimeType}) is not supported for AI analysis.`,
            errorMessage: `Unsupported file type. Supported types are JPG, PNG, WEBP, HEIC, HEIF, PDF.`,
        };
    }
    
    const filePart = {
        inlineData: {
            mimeType: proof.mimeType,
            data: proof.dataUrl.split(',')[1],
        },
    };

    const prompt = `
    You are VeritasVault's AI Evidence Analyst. Your task is to analyze a single piece of evidence (a "proof") and determine what it represents in the context of an insurance claim.

    CONTEXT:
    - **Existing Inventory Items:** ${existingInventory.length > 0 ? JSON.stringify(existingInventory.map(i => ({ id: i.id, name: i.itemName, category: i.itemCategory, description: i.itemDescription }))) : "None"}
    - **Proof Filename:** ${proof.fileName}

    DECISION TREE:
    1.  **First, decide: Is this proof for a physical item (Personal Property) OR a service/expense (Additional Living Expense - ALE)?**
        - ALE examples: Receipts for hotels, restaurants, transportation, emergency supplies.
        - Physical item examples: Photos of a TV, receipt for a laptop, warranty for a camera.

    2.  **IF IT'S A PHYSICAL ITEM:**
        a.  **Analyze the proof** to understand what item it is. Extract purchase/acquisition date if available.
        b.  **Check for Gifts:** If the proof suggests the item was a gift (e.g., a gift receipt, a note mentioning a birthday/holiday, a "from" field), set 'isGift' to true and 'giftedBy' if the giver is named.
        c.  **Search the existing inventory.** Does this proof strongly match an existing item? A strong match could be based on a matching brand/model in the filename and description, or a photo that clearly matches an existing item.
        d.  If a strong match ( > 75% confidence) is found, classify as **EXISTING_ITEM_MATCH** and provide the ID of the matched item.
        e.  If no strong match is found, classify as **NEW_ITEM** and synthesize the item's details (name, category, cost, dates, gift status). Estimate cost from receipts if possible, otherwise leave as 0.

    3.  **IF IT'S AN ALE EXPENSE:**
        a.  Classify as **ALE_EXPENSE**.
        b.  Extract the vendor name, transaction date, and total amount from the receipt.
        c.  Categorize the expense as 'Loss of Use' (for hotel, temporary rent), 'Property Damage & Debris Removal' (for repairs, cleaning services), 'Identity Fraud Expenses', or 'Other' (for food, transport, etc.).

    4.  **IF UNCLEAR:** If you cannot confidently determine the purpose of the proof, classify as **UNCLEAR**.

    Always provide a concise one-sentence 'proofSummary'. Respond ONLY with the specified JSON format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: prompt }, filePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: proofAnalysisSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);

        // Map parsed data to the return type
        return {
            analysisType: parsed.analysisType,
            proofSummary: parsed.proofSummary,
            synthesizedItem: parsed.synthesizedItem,
            matchedItemId: parsed.matchedItemId,
            matchConfidence: parsed.matchConfidence,
            aleDetails: parsed.aleDetails,
        };

    } catch (error) {
        console.error(`Error analyzing proof ${proof.fileName}:`, error);
        // Fix: Gracefully handle API errors for specific files (e.g., corrupted PDFs)
        // by returning an 'UNCLEAR' status instead of throwing an error.
        if (error instanceof Error && (error.message.includes("invalid argument") || error.message.includes("400"))) {
            return {
                analysisType: 'UNCLEAR',
                proofSummary: `AI analysis failed for this file.`,
                errorMessage: `This file could not be processed. It might be corrupted, password-protected, or in an unsupported format. Please try a different file.`,
            };
        }
        throw new Error(`AI analysis failed for ${proof.fileName}.`);
    }
};


const clusterSchema = {
  type: Type.OBJECT,
  properties: {
    clusters: {
      type: Type.ARRAY,
      description: "An array of item clusters found in the evidence.",
      items: {
        type: Type.OBJECT,
        properties: {
          proofIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'The IDs of the proofs that belong to this synthesized item.'
          },
          proofAnalyses: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    proofId: { type: Type.STRING },
                    purpose: { type: Type.STRING, enum: ['Proof of Purchase', 'Proof of Possession', 'Proof of Value', 'Supporting Document', 'Unknown'] },
                    authenticityScore: { type: Type.INTEGER, description: "A score from 0-100 indicating confidence in the proof's authenticity. A clear, dated receipt is ~95. A blurry photo is ~40." }
                },
                required: ['proofId', 'purpose', 'authenticityScore']
            },
            description: "An analysis of each proof used in this cluster."
          },
          synthesizedItem: {
            type: Type.OBJECT,
            properties: {
              itemName: { type: Type.STRING, description: "A clear, concise name for the item (e.g., 'Apple MacBook Pro 16-inch')." },
              itemDescription: { type: Type.STRING, description: 'A detailed description synthesized from all available proof information.' },
              itemCategory: { type: Type.STRING, enum: CATEGORIES, description: "The best category for the item." },
              originalCost: { type: Type.NUMBER, description: "The purchase price, ideally from a receipt. If not available, use the estimated value from a photo analysis. Default to 0 if no value can be found." },
              purchaseDate: { type: Type.STRING, description: 'The purchase date in YYYY-MM-DD format, if available from a document.' },
              brand: { type: Type.STRING },
              model: { type: Type.STRING },
              serialNumber: { type: Type.STRING },
              provenance: { type: Type.STRING, description: 'A brief, one-sentence, human-readable explanation of how this item was synthesized from its proofs. For example: "Created from a photo of a laptop and a matching Best Buy receipt from March 2023." ' },
            },
            required: ['itemName', 'itemDescription', 'itemCategory', 'originalCost', 'provenance']
          }
        },
        required: ['proofIds', 'synthesizedItem', 'proofAnalyses']
      }
    }
  },
  required: ['clusters']
};

export const clusterAndSynthesizeItems = async (
    proofs: Proof[], 
    policy: ParsedPolicy
): Promise<{ 
    clusters: { 
        proofIds: string[], 
        proofAnalyses: { proofId: string, purpose: ProofPurpose, authenticityScore: number }[],
        synthesizedItem: Partial<InventoryItem> 
    }[] 
}> => {
    try {
        const fileParts: any[] = [];
        const proofManifest: any[] = [];

        // Filter out unsupported MIME types before sending to the API
        const processableProofs = proofs.filter(p => SUPPORTED_CLUSTER_MIME_TYPES.includes(p.mimeType));

        processableProofs.forEach(p => {
             if (p.dataUrl && p.dataUrl.includes(',')) {
                fileParts.push({ text: `--- START OF FILE ---\nID: ${p.id}\nFILENAME: ${p.fileName}` });
                fileParts.push({
                    inlineData: {
                        mimeType: p.mimeType,
                        data: p.dataUrl.split(',')[1],
                    },
                });
                proofManifest.push({
                    id: p.id,
                    fileName: p.fileName,
                });
            }
        });

        if (fileParts.length === 0) {
            return { clusters: [] };
        }

        const prompt = `
        You are an expert autonomous insurance inventory creation agent. Your task is to analyze a batch of evidence files, group them into logical clusters representing single real-world items, and synthesize a complete inventory item record for each cluster.

        INSURANCE CONTEXT:
        The user's policy has these important coverage categories: ${policy.coverage.map(c => c.category).join(', ')}. Align the synthesized item's category with one of these if possible. For example, if you see a camera receipt, categorize it as 'Electronics'.

        EVIDENCE BATCH MANIFEST:
        ${JSON.stringify(proofManifest, null, 2)}
        (The full file data is provided in subsequent parts of this prompt.)

        CRITICAL INSTRUCTIONS:
        1.  **Analyze and Cluster:** Review all provided files. Identify groups of files that refer to the same physical item. For example, a photo of a laptop, its receipt, and its warranty card should all be in one cluster.
        2.  **Synthesize One Item Per Cluster:** For each cluster, create a single, comprehensive inventory item record.
        3.  **Prioritize Evidence:** Use 'Proof of Purchase' (like receipts) to determine 'originalCost' and 'purchaseDate'. Use photos of serial numbers for the 'serialNumber' field. Synthesize the best possible 'itemName' and 'itemDescription' from all available information.
        4.  **Analyze Each Proof:** For every proof you use in a cluster, determine its 'purpose' and assign an 'authenticityScore' (0-100).
            -   'purpose': Is it 'Proof of Purchase' (receipts), 'Proof of Possession' (photos of the item), 'Proof of Value' (appraisals), or a 'Supporting Document' (manuals)?
            -   'authenticityScore': Score based on clarity and reliability. A crisp, dated Best Buy receipt is high (95). A blurry photo of a TV in a room is medium (60). A handwritten note is low (10).
        5.  **Create Provenance:** For each synthesized item, write a brief, one-sentence 'provenance' explaining your logic (e.g., "Created from a photo of a laptop and a matching Best Buy receipt from March 2023.").
        6.  **Be Conservative:** If a proof cannot be confidently matched to any cluster, DO NOT include it in your response.
        7.  **Assign Proof IDs:** In your response, correctly list the 'proofIds' from the manifest that you used for each cluster.
        8.  **Return Analysis:** Include the proof analysis in the 'proofAnalyses' array for each cluster.

        Return your response in the specified JSON format.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [{ parts: [{ text: prompt }, ...fileParts] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: clusterSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error clustering and synthesizing items:", error);
        throw new Error("AI failed to process the provided evidence batch. Please try again.");
    }
};

const autonomousProcessorSystemPrompt = `System Prompt: VeritasVault Autonomous Inventory Processor

ROLE:
You are VeritasVault, an evidence-bound AI system built to support a specific insurance claim. Your sole function is to analyze a batch of provided media (images, receipts, invoices, CSVs, text files) to reconstruct a single, comprehensive, and claim-ready inventory of tangible personal property.

CONTEXT:
- Claim #: 00104761115
- Policyholder: Roydel Marquez Bello
- Incident: Burglary on Nov 27, 2024
- Loss Location: 312 W 43rd St Apt 14J, New York, NY 10036
- Policy Limits: Personal Property $95,000 (RCV), Jewelry Sub-limit $1,000.

🎯 OBJECTIVE:
Generate a single, structured JSON array of pre-loss personal property items. You must identify items in media dated on or before the date of loss. The final output must be policy-compliant and strategically framed, maximizing eligible reimbursement by clearly linking items to the insured parties, citing all proofs, and flagging ownership gaps.

Phase 1: Media Ingestion & Validation
	1	Extract All Metadata: From images, pull DateTimeOriginal and GPS data. From documents (PDFs, CSVs, text), pull CreationDate and perform OCR on all text to find dates, items, purchasers, and serial numbers.
	2	Pre-Loss Confirmation: An item is only valid if it is visible or documented in media dated on or before the Loss Date. Media dated after the loss cannot prove pre-loss ownership but may be used to establish value (note this in ainotes).
	3	Location Verification: The item must be plausibly located at the Loss Location. Use GPS data or infer from visual context (e.g., indoor apartment setting).

Phase 2: Item & Entity Identification
	1	Identify Tangible Personal Property: Scan all validated media for distinct, claimable items.
	2	Deduplicate: A single physical item appearing in multiple files must result in only ONE entry in the final JSON. Compile all source filenames into the imagesource array for that single entry.
	3	Assign Categories: Assign each item to one of the following: Electronics, Furniture, Appliances, Clothing & Accessories, Jewelry, Business Property, Art & Collectibles, Home Goods, Sports & Hobbies, Medical Equipment, Travel Gear, Other.
	4	Describe & Infer Brand/Model: Include visible features (color, size, material). Infer brand/model only if visually confirmed (logo, text) or strongly inferred by distinctive design. Otherwise, use "Unbranded/Generic".
	5	Extract Serial Number: If a serial number is identified via OCR on a receipt, box, or the item itself, capture it.
	6	Quantity: Assume 1 unless multiple identical items are clearly visible or listed on a receipt.

Phase 3: Value Estimation & Strategic Flagging
	1	Estimate Replacement Cost Value (RCV):
	◦	From Receipts/Invoices: Use the exact price. If the receipt is old, adjust to a plausible current RCV, but note the original price in ainotes.
	◦	From Images (No Receipt): Estimate the RCV for a new, equivalent item in the current market.
	◦	Use realistic, non-round pricing (e.g., $1349.99).
	2	Confidence Score: Assign a float (0.0-1.0) indicating certainty. (1.0 = receipt with serial#; 0.9 = clear photo with brand; 0.5 = item clear, brand is a guess).
    3   Sub-Limit Tags: IF an item falls into 'Jewelry' and value > $1000, mark sublimit_tag as 'Jewelry Limit'.

🚫 AUTO-REJECTION RULES (DO NOT INCLUDE IF…):
You MUST REJECT and exclude any item from the final inventory if it is:
	•	Not tangible personal property (e.g., building fixtures, data, services, software).
	•	Indiscernible (too blurry, obscured, or generic to identify).
	•	Lacking any proof of pre-loss existence.

✅ FINAL OUTPUT FORMAT (Strict JSON Array Only)
Your final and only response must be a single, raw JSON array of objects. Each object represents one inventoried item.
`;

const autonomousProcessorSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            brandmodel: { type: Type.STRING },
            serialnumber: { type: Type.STRING },
            estimatedvaluercv: { type: Type.NUMBER },
            quantity: { type: Type.INTEGER },
            lastseendate: { type: Type.STRING },
            inferredowner: { type: Type.STRING },
            location: { type: Type.STRING },
            imagesource: { type: Type.ARRAY, items: { type: Type.STRING } },
            ainotes: { type: Type.STRING },
            confidencescore: { type: Type.NUMBER },
            sublimit_tag: { type: Type.STRING },
        },
        required: ["category", "description", "brandmodel", "estimatedvaluercv", "quantity", "lastseendate", "inferredowner", "location", "imagesource", "ainotes", "confidencescore"],
    }
};

export const runAutonomousProcessor = async (files: File[]): Promise<AutonomousInventoryItem[]> => {
    try {
        const fileParts = await Promise.all(files.map(async (file) => {
            const base64Data = await fileToBase64(file);
            let mimeType = file.type;
            if (!mimeType || mimeType === 'application/octet-stream') {
                if (file.name.endsWith('.csv')) mimeType = 'text/csv';
                else if (file.name.endsWith('.txt')) mimeType = 'text/plain';
                else mimeType = 'application/octet-stream';
            }

            return {
                inlineData: {
                    mimeType,
                    data: base64Data,
                },
            };
        }));
        
        const prompt = `Process the attached files and produce the JSON output as instructed in your system prompt. The files are: ${files.map(f => f.name).join(', ')}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: prompt }, ...fileParts] },
            config: {
                systemInstruction: autonomousProcessorSystemPrompt,
                responseMimeType: "application/json",
                responseSchema: autonomousProcessorSchema,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AutonomousInventoryItem[];

    } catch (error) {
        console.error("Error in autonomous processor:", error);
        throw new Error(`AI analysis failed. ${error instanceof Error ? error.message : "The model may have returned an invalid response or an error occurred."}`);
    }
};

export const selectBestCoverage = (category: string, policy: ParsedPolicy): CoverageLimit | null => {
    // Prioritize specific sub-limits
    const subLimit = policy.coverage.find(c => c.type === 'sub-limit' && c.category.toLowerCase() === category.toLowerCase());
    if (subLimit) {
        return subLimit;
    }

    // Fallback to main coverage
    const mainCoverage = policy.coverage.find(c => c.type === 'main');
    if (mainCoverage) {
        return mainCoverage;
    }
    
    return null;
};

export const assembleDraftClaim = async (item: InventoryItem, policy: ParsedPolicy, accountHolder: AccountHolder): Promise<DraftClaim> => {
    try {
        const prompt = `Generate a concise, plausible, and strategically neutral failure description for an insurance claim for the following item: ${item.itemName} (${item.itemDescription}). The item's category is ${item.itemCategory}. The failure should be a common issue for this type of item (e.g., accidental damage, malfunction) that is typically covered by insurance. Do not mention the policy or owner. Keep it brief and factual.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const failureDescription = response.text.trim();
        
        return {
            id: `claim-${Date.now()}`,
            assetId: item.id,
            policyNumber: policy.policyNumber,
            accountHolderId: accountHolder.id,
            status: 'system_ready_to_file',
            failureDescription,
            createdAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Error assembling draft claim:", error);
        throw new Error("AI failed to generate a claim description. Please try again.");
    }
};

export const findMarketPrice = async (item: InventoryItem): Promise<ValuationResponse> => {
    try {
        const prompt = `Act as a price researcher. For the item "${item.itemName}" (Description: ${item.itemDescription}), find the current market price using Google Search. Provide the estimated Replacement Cost Value (RCV) for a new item and the Actual Cash Value (ACV) for a used/refurbished item. Structure your response clearly with each value on a new line, like this:
RCV: $1200.00
ACV: $850.00
If you cannot find a price, state that. Do not add any other text before or after the values.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const text = response.text;
        const rcvMatch = text.match(/RCV:\s*\$?([\d,]+\.?\d*)/i);
        const acvMatch = text.match(/ACV:\s*\$?([\d,]+\.?\d*)/i);

        const rcv = rcvMatch ? parseFloat(rcvMatch[1].replace(/,/g, '')) : 0;
        const acv = acvMatch ? parseFloat(acvMatch[1].replace(/,/g, '')) : 0;

        if (rcv === 0 && acv === 0 && !text.toLowerCase().includes('not found')) {
            // If we didn't find values and the model didn't explicitly say it couldn't find them, it's likely a parsing failure.
             throw new Error("AI response did not contain the expected RCV or ACV values.");
        }

        const result: ValuationResponse = { rcv, acv, sources: [] };

        // Add grounding metadata as sources
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            const webSources: ValuationSource[] = groundingChunks
                .filter(chunk => chunk.web && chunk.web.uri)
                .map(chunk => ({
                    url: chunk.web!.uri,
                    price: 0, // We don't get price from grounding metadata
                    type: 'RCV', // Default to RCV, it's just a reference
                    title: chunk.web!.title || 'Web Source',
                }));
            
            result.sources.push(...webSources);
        }

        return result;

    } catch (error) {
        console.error("Error finding market price:", error);
        throw new Error(`AI failed to find market price data. ${error instanceof Error ? error.message : "The web search may have failed or the response was not valid."}`);
    }
};

export const enrichAssetFromWeb = async (item: InventoryItem): Promise<WebIntelligenceResponse> => {
    try {
        const prompt = `Act as an intelligence analyst. For the item "${item.itemName}" (${item.itemDescription}), use Google Search to gather key specifications and interesting details. Find information like release date, model number, materials, dimensions, or original MSRP. Summarize your findings in a brief paragraph.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const summaryText = response.text.trim();
        if (!summaryText) {
             throw new Error("AI returned an empty summary from the web search.");
        }
        
        const facts: WebIntelligenceFact[] = [{ fact: summaryText, source: '' }];

        // Add grounding metadata as primary sources, as we can't link them to specific facts
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            const webSources = groundingChunks
                .filter(chunk => chunk.web && chunk.web.uri)
                .map(chunk => ({
                    fact: `Source: ${chunk.web!.title || 'Web Page'}`,
                    source: chunk.web!.uri,
                }));
            
            facts.push(...webSources);
        }
        
        return { facts };
    } catch (error) {
        console.error("Error enriching asset data:", error);
        throw new Error(`AI failed to enrich data from the web. ${error instanceof Error ? error.message : "The search may have timed out or returned invalid data."}`);
    }
};


const apparelSchema = {
    type: Type.OBJECT,
    properties: {
      brand: { type: Type.STRING, description: "The brand name of the apparel item (e.g., Gucci, Louis Vuitton)." },
      model: { type: Type.STRING, description: "The specific model or style name of the item (e.g., Marmont Matelassé Shoulder Bag)." },
      msrp: { type: Type.NUMBER, description: "The manufacturer's suggested retail price (MSRP) in USD." },
    },
    required: ['brand', 'model', 'msrp'],
};

export const identifyApparel = async (imageDataUrl: string): Promise<ApparelIdentificationResponse> => {
    try {
        const base64Image = imageDataUrl.split(',')[1];
        const imagePart = {
            inlineData: {
              mimeType: 'image/jpeg', // Assume jpeg for simplicity, could be derived from data URL
              data: base64Image,
            },
        };
        const textPart = {
            text: "Analyze this image of a designer clothing or accessory item. Identify the brand, the specific model name, and its estimated MSRP in USD. If you cannot identify it, make a best guess."
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: apparelSchema,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ApparelIdentificationResponse;
    } catch (error) {
        console.error("Error identifying apparel:", error);
        throw new Error("AI visual search failed to identify the apparel item.");
    }
};

export const findHighestRCV = async (item: InventoryItem): Promise<HighestRcvResponse> => {
    try {
        const prompt = `Act as an expert price researcher for insurance claims. For the item "${item.itemName}" (Description: ${item.itemDescription}), find the absolute highest retail price for a brand new equivalent model. Search official brand websites, high-end retailers (like Neiman Marcus, B&H Photo), and avoid marketplaces like eBay or Amazon unless it's a direct listing from the manufacturer. The goal is to establish the maximum possible Replacement Cost Value (RCV). 
        
        Return ONLY a valid JSON object with the following structure:
        {
          "price": number,
          "source": "string URL"
        }
        Do not use markdown formatting.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const text = response.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
             return JSON.parse(jsonMatch[0]) as HighestRcvResponse;
        }
        throw new Error("AI did not return valid JSON.");
    } catch (error) {
        console.error("Error finding highest RCV:", error);
        throw new Error("AI failed to find the highest RCV. The web search may have been unsuccessful.");
    }
};

const serialNumberSchema = {
    type: Type.OBJECT,
    properties: {
        serialNumber: { type: Type.STRING, description: "The extracted serial number. If no serial number is found, return an empty string." }
    },
    required: ["serialNumber"]
};

export const extractSerialNumber = async (imageDataUrl: string): Promise<SerialNumberResponse> => {
    try {
        const base64Image = imageDataUrl.split(',')[1];
        const imagePart = {
            inlineData: {
              mimeType: 'image/jpeg', // Assume jpeg for simplicity
              data: base64Image,
            },
        };
        const textPart = {
            text: "Analyze this image using Optical Character Recognition (OCR). Find and extract any serial numbers, model numbers, or other unique identifiers. Return only the most likely serial number."
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: serialNumberSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as SerialNumberResponse;
    } catch (error) {
        console.error("Error extracting serial number:", error);
        throw new Error("AI failed to extract the serial number from the image.");
    }
};

const proofStrengthSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.INTEGER, description: "A score from 0 to 100 representing the strength of the proof. 100 is indisputable." },
        feedback: { type: Type.STRING, description: "A concise, one-sentence feedback explaining the score and suggesting improvements." }
    },
    required: ["score", "feedback"]
};

// Fix: Completed the function which was previously cut off.
export const calculateProofStrength = async (item: InventoryItem): Promise<ProofStrengthResponse> => {
    try {
        const proofSummary = item.linkedProofs.map(p => `- ${p.type} named '${p.fileName}'`).join('\n');
        const prompt = `
        Act as an insurance claim adjuster. Evaluate the proof strength for the following inventory item on a scale of 0-100.
        Item: ${item.itemName}
        Category: ${item.itemCategory}
        Description: ${item.itemDescription}
        Has Serial Number: ${item.serialNumber ? 'Yes' : 'No'}
        Has Purchase Date: ${item.purchaseDate ? 'Yes' : 'No'}
        
        Linked Proofs:
        ${proofSummary || 'No proofs linked.'}

        Criteria:
        - Receipts and invoices are the strongest proof.
        - Photos/videos are good but less strong than receipts.
        - Having a serial number is a major strength for electronics.
        - A recent purchase date is better.
        - The more high-quality proofs, the better.

        Provide a score and a concise one-sentence feedback on how to improve the score.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: proofStrengthSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ProofStrengthResponse;
    } catch (error) {
        console.error("Error calculating proof strength:", error);
        throw new Error("AI failed to calculate proof strength.");
    }
};

export const findProductImageFromWeb = async (item: InventoryItem): Promise<{ imageUrl: string, source: string } | null> => {
    try {
        const prompt = `Find a high-quality product image from the web for the following item: ${item.itemName} (${item.brand} ${item.model}). 
        
        Return ONLY a valid JSON object with the following structure:
        {
            "imageUrl": "Direct URL to the image file",
            "source": "URL of the page where the image was found"
        }
        Do not use markdown formatting. Do not include introductory text.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const text = response.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
             const result = JSON.parse(jsonMatch[0]);
             return result.imageUrl ? result : null;
        }
        
        return null;

    } catch (error) {
        console.error("Error finding product image from web:", error);
        return null;
    }
};

export const fuzzyMatchProofs = async (item: InventoryItem, unlinkedProofs: Proof[]): Promise<{ suggestions: ProofSuggestion[] }> => {
    if (unlinkedProofs.length === 0) {
        return { suggestions: [] };
    }
    try {
        const prompt = `
        You are an AI assistant for an insurance app. Analyze the following inventory item and a list of unlinked proofs.
        Your task is to identify which proofs likely belong to the item.
        
        CRITICAL CONTEXT:
        If a proof's filename suggests it is a police report (e.g., contains 'police', 'report', 'nypd', 'complaint'), it is very strong 'Proof of Possession' for any item that would be listed in a report for a burglary (e.g., electronics, jewelry, valuables). Give it a high confidence score (90+) for such items and cite the police report as the reason.

        Inventory Item:
        - Name: ${item.itemName}
        - Description: ${item.itemDescription}
        - Category: ${item.itemCategory}
        
        Unlinked Proofs (with their IDs and filenames):
        ${unlinkedProofs.map(p => `- ID: ${p.id}, Filename: ${p.fileName}`).join('\n')}
        
        For each proof that is a plausible match, provide a suggestion with its proofId, a confidence score (0-100), and a brief reason.
        Base your reasoning on keywords in filenames, dates, and common sense associations, paying special attention to the CRITICAL CONTEXT rule.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
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
                                    confidence: { type: Type.INTEGER },
                                    reason: { type: Type.STRING }
                                },
                                required: ["proofId", "confidence", "reason"]
                            }
                        }
                    },
                    required: ["suggestions"]
                }
            }
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error fuzzy matching proofs:", error);
        throw new Error("AI failed to perform fuzzy matching.");
    }
};

export const calculateACV = async (item: InventoryItem): Promise<ACVResponse> => {
    try {
        const prompt = `
        Calculate the Actual Cash Value (ACV) for the following item.
        ACV is typically Replacement Cost Value (RCV) minus depreciation.
        
        Item: ${item.itemName}
        Category: ${item.itemCategory}
        Original Cost: $${item.originalCost}
        Purchase Date: ${item.purchaseDate || 'Unknown'}
        RCV: $${item.replacementCostValueRCV || item.originalCost}
        Condition: ${item.condition || 'Good'}
        
        Consider the item's category, age, and condition to determine a reasonable depreciation.
        Provide the final ACV and a brief reasoning for your calculation.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        acv: { type: Type.NUMBER },
                        reasoning: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["acv", "reasoning"]
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ACVResponse;
    } catch (error) {
        console.error("Error calculating ACV:", error);
        throw new Error("AI failed to calculate ACV.");
    }
};

interface VisualSearchResult {
    itemName: string;
    sourceUrl: string;
}

export const findItemWithGoogleLens = async (item: InventoryItem): Promise<VisualSearchResult> => {
    const imageProof = item.linkedProofs.find(p => p.type === 'image');
    if (!imageProof || !imageProof.dataUrl) {
        throw new Error("Visual search requires an image proof.");
    }

    try {
        const base64Image = imageProof.dataUrl.split(',')[1];
        const imagePart = { inlineData: { mimeType: imageProof.mimeType, data: base64Image } };
        
        const prompt = `
        Analyze this image to identify the specific make, model, and estimated retail value of the item shown.
        Provide the most likely product name and a source URL (like a shopping or review page) where this exact product or its nearest equivalent can be found.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        itemName: { type: Type.STRING, description: "The identified name of the item." },
                        sourceUrl: { type: Type.STRING, description: "A relevant URL for the item." }
                    },
                    required: ["itemName", "sourceUrl"]
                }
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as VisualSearchResult;
    } catch (error) {
        console.error("Error with visual search:", error);
        throw new Error("AI visual search failed.");
    }
};

export const extractReceiptInfo = async (imageDataUrl: string): Promise<ReceiptData> => {
    try {
        const base64Image = imageDataUrl.split(',')[1];
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
        const prompt = `
        Analyze this receipt image. Extract the following information:
        - Vendor name
        - Total amount
        - Transaction date (in YYYY-MM-DD format)
        - A list of line items with description, quantity, and price.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: prompt }, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        vendor: { type: Type.STRING },
                        totalAmount: { type: Type.NUMBER },
                        transactionDate: { type: Type.STRING },
                        lineItems: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    description: { type: Type.STRING },
                                    quantity: { type: Type.INTEGER },
                                    price: { type: Type.NUMBER }
                                },
                                required: ["description", "quantity", "price"]
                            }
                        }
                    },
                    required: ["vendor", "totalAmount", "transactionDate", "lineItems"]
                }
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ReceiptData;
    } catch (error) {
        console.error("Error extracting receipt info:", error);
        throw new Error("AI failed to extract receipt information.");
    }
};

export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A high-quality, realistic product photo of: ${prompt}`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("AI failed to generate an image.");
    }
};

export const editImageWithPrompt = async (imageDataUrl: string, prompt: string): Promise<string> => {
    try {
        const [meta, base64Data] = imageDataUrl.split(',');
        const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }

        throw new Error("AI did not return an edited image.");

    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("AI failed to edit the image.");
    }
};

export const analyzeVideoForItems = async (videoBlob: Blob): Promise<{ items: { name: string, description: string, category: string, estimatedValue: number }[] }> => {
    try {
        const base64Video = await blobToBase64(videoBlob);
        const videoPart = { inlineData: { mimeType: videoBlob.type, data: base64Video } };
        
        const prompt = `
        Analyze this video of a room scan. Identify all valuable personal property items visible.
        For each item, provide a name, description, category from the list, and an estimated value.
        Categories: ${CATEGORIES.join(', ')}.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: prompt }, videoPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    category: { type: Type.STRING, enum: CATEGORIES },
                                    estimatedValue: { type: Type.NUMBER }
                                },
                                required: ["name", "description", "category", "estimatedValue"]
                            }
                        }
                    },
                    required: ["items"]
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
        
    } catch(error) {
        console.error("Error analyzing video:", error);
        throw new Error("AI failed to analyze the video. The format may be unsupported.");
    }
};

export const analyzeImages = async (images: { data: string, mimeType: string }[], prompt: string): Promise<string> => {
    try {
        const imageParts = images.map(img => ({ inlineData: { data: img.data, mimeType: img.mimeType } }));
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [textPart, ...imageParts] },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error analyzing images:", error);
        throw new Error("AI failed to analyze the images.");
    }
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
        const base64Audio = await blobToBase64(audioBlob);
        const audioPart = { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } };
        const prompt = "Transcribe the following audio recording.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, audioPart] },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw new Error("AI failed to transcribe the audio.");
    }
};

export const getAssistantContext = (inventory: InventoryItem[], policy?: ParsedPolicy): string => {
    const inventorySummary = inventory.slice(0, 20).map(i => `- ${i.itemName} (Valued at $${i.replacementCostValueRCV || i.originalCost})`).join('\n');
    const policySummary = policy ? `Policy #${policy.policyNumber} with ${policy.provider}. Coverage limit: $${policy.coverage.find(c => c.type === 'main')?.limit}.` : 'No active policy.';

    return `You are VeritasVault's dedicated Claims Specialist AI. Your role is to assist the policyholder in managing their inventory and preparing for an insurance claim, specifically for a recent burglary.
    
    TONE & PERSONA:
    - Professional, empathetic, and forensic.
    - You are thorough and detail-oriented.
    - You provide actionable advice based on insurance industry standards.

    CONTEXT:
    The user's current vault contains ${inventory.length} items.
    Here is a summary of their high-value items:
    ${inventorySummary}
    
    Active Policy Details: ${policySummary}
    
    INSTRUCTIONS:
    - Answer questions about the user's inventory, policy coverage, and claim strategy.
    - If the user asks about missing items, refer to the police report or suggest looking for receipts.
    - Always format your responses with clear Markdown.
    `;
};

export const getChatResponse = async (history: ChatMessage[], newUserInput: string, useThinking: boolean, inventory: InventoryItem[], policy?: ParsedPolicy): Promise<string> => {
    const systemInstruction = getAssistantContext(inventory, policy);
    
    try {
        // Convert history to Content objects. Note: history passed from component is previous state.
        const contents = history
            .filter(msg => !msg.isLoading) // Filter out loading messages
            .map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }));
            
        contents.push({ role: 'user', parts: [{ text: newUserInput }] });

        const config: any = {
            systemInstruction: systemInstruction,
        };

        if (useThinking) {
            config.thinkingConfig = { thinkingBudget: 2048 };
        }

        const response = await ai.models.generateContent({
            model: useThinking ? 'gemini-3-pro-preview' : 'gemini-2.5-flash',
            contents: contents,
            config: config,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error getting chat response:", error);
        throw new Error("The AI assistant could not respond.");
    }
};

export const calculateFairRentalValue = async (location: string, propertyType: string): Promise<{ dailyRate: number, sources: { url: string, title: string }[] }> => {
    try {
        const prompt = `
        Act as a real estate market analyst for an insurance claim. The user's loss location is "${location}". The property is a "${propertyType}".
        Your task is to determine the Fair Rental Value (FRV) per day for a comparable property in that immediate area.
        Use Google Search to find current rental listings (e.g., on Zillow, StreetEasy, apartments.com) for similar properties.
        Calculate an average daily rate from your findings. 
        
        Return ONLY a valid JSON object with the following structure:
        {
            "dailyRate": number,
            "sources": [
                { "url": "string", "title": "string" }
            ]
        }
        Do not use markdown formatting.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        const text = response.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
             return JSON.parse(jsonMatch[0]);
        }
        throw new Error("AI did not return valid JSON.");
    } catch (error) {
        console.error("Error calculating Fair Rental Value:", error);
        throw new Error("AI failed to calculate Fair Rental Value from web search.");
    }
};

export const getRecategorizationStrategy = async (item: InventoryItem, policy: ParsedPolicy): Promise<{ newCategory: string; reasoning: string; }> => {
    const sublimit = policy.coverage.find(c => c.category === item.itemCategory);
    try {
        const prompt = `
        Act as a strategic insurance claim advisor for policy RI8462410. An item is categorized under a policy sub-limit which restricts its claimable value.
        Your task is to find a legally permissible and strategically sound alternative category for the item based on its description and available proofs, referencing specific policy terms.

        POLICY-SPECIFIC SUB-LIMITS (Theft):
        - Jewelry/Watches: $1,000
        - Business Property (On-Premises): $2,500
        - Money/Gold: $200

        ITEM DETAILS:
        - Name: "${item.itemName}"
        - Current Category: "${item.itemCategory}"
        - Applicable Sub-limit: $${sublimit?.limit || 'N/A'}
        - Description: "${item.itemDescription}"
        - Proofs Summary: ${item.linkedProofs.map(p => p.fileName).join(', ') || 'No proofs available.'}

        INSTRUCTIONS:
        Analyze the item's proofs to find a compliant alternative category that maximizes the claim value.
        Example Logic for this policy:
        - A "$8,000 Gold Chain" is categorized as 'Jewelry,' which has a $1,000 theft limit. Analyze its proofs. If a proof shows it was a 'company service award,' it can be re-categorized as 'Business Property' ($2,500 limit). If it is a '17th Century Spanish Doubloon,' it is 'Art & Collectibles' (no sub-limit) and covered under the full $95,000 Coverage C.

        Provide the best alternative category and a concise, compelling reasoning for the change. If no logical or defensible alternative exists, state that the current category is the most appropriate.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        newCategory: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["newCategory", "reasoning"]
                }
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error getting recategorization strategy:", error);
        throw new Error("AI failed to find a recategorization strategy.");
    }
};

export const generateSubmissionLetter = async (
    item: InventoryItem,
    policy: ParsedPolicy,
    accountHolder: AccountHolder,
    claimDetails: ClaimDetails
): Promise<string> => {
    try {
        const prompt = `
        You are an expert insurance claim assistant. Your task is to draft a formal and comprehensive submission letter for a single claimed item on behalf of the policyholder.

        **POLICYHOLDER INFORMATION:**
        - Name: ${accountHolder.name}
        - Address: ${accountHolder.address}

        **POLICY DETAILS:**
        - Provider: ${policy.provider}
        - Policy Number: ${policy.policyNumber}
        - Settlement Method: ${policy.lossSettlementMethod}

        **CLAIM DETAILS:**
        - Date of Loss: ${claimDetails.dateOfLoss}
        - Incident Type: ${claimDetails.incidentType}
        - Police Report #: ${claimDetails.policeReport}
        - Incident Summary: ${claimDetails.propertyDamageDetails}

        **ITEM BEING CLAIMED:**
        - Item Name: ${item.itemName}
        - Brand/Model: ${item.brand || ''} ${item.model || ''}
        - Serial Number: ${item.serialNumber || 'N/A'}
        - Category: ${item.itemCategory}
        - Description: ${item.itemDescription}
        - Purchase Date: ${item.purchaseDate || 'N/A'}
        - Original Cost: $${item.originalCost.toFixed(2)}
        - Replacement Cost Value (RCV): $${(item.replacementCostValueRCV || item.originalCost).toFixed(2)}

        **INSTRUCTIONS:**
        1.  **Format as a formal letter.** Include today's date, the insurance provider's details (use a placeholder if unknown), a clear subject line (e.g., "Re: Claim for Stolen Property - [Item Name]"), a professional salutation, body paragraphs, and a closing.
        2.  **State the purpose clearly.** The letter should state that it is a formal claim for the replacement cost of the specified item, lost as part of the burglary on ${claimDetails.dateOfLoss}.
        3.  **Reference the item and proofs.** Clearly identify the item and mention that supporting documentation (receipts, photos, etc.) is attached in the package.
        4.  **Request action.** Conclude by formally requesting reimbursement for the item's Replacement Cost Value ($${(item.replacementCostValueRCV || item.originalCost).toFixed(2)}) as per the terms of the policy.
        5.  **Maintain a professional, assertive, and factual tone.** Do not use emotional language. Stick to the facts provided.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating submission letter:", error);
        throw new Error("AI failed to generate the submission letter.");
    }
};

export const generateClaimNarrative = async (
    claimDetails: ClaimDetails,
    accountHolder: AccountHolder,
    claimedItems: InventoryItem[],
    policy: ParsedPolicy
): Promise<string> => {
    const totalClaimValue = claimedItems.reduce((acc, item) => acc + (item.replacementCostValueRCV || item.originalCost || 0), 0);
    const itemSummary = claimedItems.map(item => `- ${item.itemName} (RCV: $${(item.replacementCostValueRCV || item.originalCost).toFixed(2)})`).join('\n');

    try {
        const prompt = `
        Act as a professional public adjuster drafting a formal claim summary and narrative on behalf of your client, ${accountHolder.name}.
        The summary is for a claim under policy #${policy.policyNumber} with ${policy.provider}.

        **Incident Details:**
        - Type: ${claimDetails.incidentType}
        - Date of Loss: ${claimDetails.dateOfLoss}
        - Location: ${claimDetails.location}
        - Police Report: ${claimDetails.policeReport}
        - Summary: ${claimDetails.propertyDamageDetails}

        **Claim Summary:**
        - Total Claimed Items: ${claimedItems.length}
        - Total Claimed RCV: $${totalClaimValue.toFixed(2)}
        - Itemization Summary:
        ${itemSummary}

        **Instructions:**
        Draft a comprehensive, professional, and respectful narrative for the insurance adjuster.
        1.  Start with a clear subject line referencing the policy number and claim.
        2.  In the first paragraph, clearly state the purpose of the communication: to formally submit the enclosed claim for personal property lost during the specified incident.
        3.  In the following paragraphs, provide a narrative of the loss event based on the incident summary. Be factual and objective.
        4.  Summarize the scope of the loss, mentioning the total number of items and the total replacement cost value being claimed.
        5.  Conclude by stating that a detailed inventory and all supporting proofs are attached for their review, and express willingness to provide any further information required.
        6.  Do not invent any facts. Base the entire narrative on the information provided.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating claim narrative:", error);
        throw new Error("AI failed to generate the claim narrative.");
    }
};

// --- NEW STRATEGIC OPTIMIZATION FUNCTIONS ---

export const findOptimalPolicyForItem = async (item: InventoryItem, policies: ParsedPolicy[]): Promise<OptimalPolicyResult> => {
    try {
        const prompt = `
        Act as a claims optimization expert. Your goal is to find the absolute best policy to file a claim for a specific item to maximize the user's payout.
        
        ITEM TO CLAIM:
        - Name: ${item.itemName}
        - Category: ${item.itemCategory}
        - RCV: $${item.replacementCostValueRCV || item.originalCost}

        AVAILABLE POLICIES:
        ${JSON.stringify(policies.map(p => ({id: p.id, name: p.policyName, deductible: p.deductible, sublimits: p.coverage.filter(c => c.type === 'sub-limit')}))) }

        ANALYSIS CRITERIA:
        1.  **Deductible:** The primary factor. A lower deductible means a higher payout.
        2.  **Sub-limits:** Check if the item's category falls under a sub-limit for each policy. A policy with no sub-limit for the category is strongly preferred. If all have sub-limits, choose the one with the highest limit.
        3.  **Calculation:** Payout = MIN(Item RCV, Sub-limit) - Deductible.
        
        TASK:
        - Analyze all policies.
        - Identify the policy that results in the highest net payout for this specific item.
        - Calculate the financial advantage of using the best policy over the currently active one.
        - Provide a concise reasoning for your choice.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
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
                    },
                    required: ["bestPolicyId", "reasoning", "financialAdvantage", "originalPolicyId"]
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as OptimalPolicyResult;

    } catch (error) {
        console.error("Error finding optimal policy:", error);
        throw new Error("AI failed to determine the optimal policy for this item.");
    }
};

export const generateOptimizedNarrative = async (item: InventoryItem, policy: ParsedPolicy, claimDetails: ClaimDetails): Promise<string> => {
    try {
        const prompt = `
        Act as a professional claims writer. Your task is to refine an incident description for an insurance claim to align it with covered perils under the specified policy, while remaining strictly factual.

        BASE INCIDENT DETAILS:
        - Incident Type: ${claimDetails.incidentType}
        - User's Description: "${claimDetails.propertyDamageDetails}"

        ITEM INVOLVED:
        - Name: ${item.itemName}
        - Category: ${item.itemCategory}

        POLICY CONTEXT:
        - Provider: ${policy.provider}
        - Policy Type: ${policy.policyType}
        - Known Exclusions: ${policy.exclusions.join(', ')}

        INSTRUCTIONS:
        Rewrite the user's description. The new narrative must:
        1. Be factually consistent with the original description. Do not invent events.
        2. Use precise, unambiguous language that is common in insurance claims.
        3. Frame the event in a way that clearly points towards a covered peril (e.g., for a burglary, focus on forced entry and theft). For accidental damage, use neutral language describing a sudden and unforeseen event.
        4. Be concise and professional.
        
        Return only the refined narrative text.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
        });

        return response.text.trim();

    } catch(error) {
        console.error("Error generating optimized narrative:", error);
        throw new Error("AI failed to generate the optimized narrative.");
    }
};

export const extractItemDetailsFromUrl = async (url: string): Promise<WebScrapeResult> => {
    try {
        const prompt = `
        Act as a web scraping agent. Analyze the content of the provided URL: ${url}.
        Your goal is to extract key details about the product on the page to create a new inventory item.
        
        Find and extract the following information:
        - Item Name (the product title)
        - Item Description (a summary or key features)
        - Item Category (select the best fit from: ${CATEGORIES.join(', ')})
        - Price (extract the primary price listed on the page as a number)
        - Brand
        - Model
        - A direct URL to a high-quality product image.
        
        Return ONLY a valid JSON object with the following fields:
        {
            "itemName": "string",
            "itemDescription": "string",
            "itemCategory": "string",
            "originalCost": number,
            "brand": "string",
            "model": "string",
            "imageUrl": "string",
            "sourceUrl": "${url}"
        }
        If you cannot find a piece of information, leave it blank or 0.
        Do not use markdown formatting.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });
        
        const text = response.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
             return JSON.parse(jsonMatch[0]);
        }
        throw new Error("AI did not return valid JSON.");

    } catch (error) {
        console.error("Error extracting item details from URL:", error);
        throw new Error("AI failed to extract details from the provided URL.");
    }
};