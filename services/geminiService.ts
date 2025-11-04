import { GoogleGenAI, Type, Modality } from "@google/genai";
// Fix: Added .ts extension to file paths
// Fix: Added blobToBase64 utility.
import { fileToBase64, blobToBase64 } from '../utils/fileUtils.ts';
// Fix: Added ChatMessage type for the AI assistant.
import { InventoryItem, ParsedPolicy, AccountHolder, DraftClaim, ValuationResponse, WebIntelligenceResponse, ApparelIdentificationResponse, HighestRcvResponse, SerialNumberResponse, ProofStrengthResponse, Proof, ProofSuggestion, ACVResponse, CoverageLimit, PolicyAnalysisReport, ValuationSource, ProofPurpose, ChatMessage, WebIntelligenceFact, ReceiptData, ProcessingInference, AleDetails, CostType, InferenceType, AutonomousInventoryItem, ClaimDetails } from '../types.ts';
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
        Act as an expert insurance policy analyst for an intelligent inventory app. Your task is to analyze a new policy document, paying close attention to the Declarations Page, and compare it against the user's existing policies.

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
        5.  **AI Self-Improvement (Most Important Task):** The user has provided these past corrections: ${userCorrections.length > 0 ? userCorrections.join('; ') : "None"}. This is direct feedback on your previous mistakes. You MUST learn from them. For example, if a user corrected a deductible you misread, be extremely cautious with deductibles this time. Demonstrating you have learned from this feedback is critical for user trust.
        6.  **Return Result:** Respond with the full analysis in the specified JSON format.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
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
    You are an AI insurance claim assistant. Your task is to analyze a single piece of evidence (a "proof") and determine what it represents in the context of an insurance claim.

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
            model: 'gemini-2.5-pro',
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
            model: 'gemini-2.5-pro',
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

const autonomousProcessorSystemPrompt = `System Prompt: VeritasVault Autonomous Inventory Processor (Claim #00104761115)

ROLE:
You are VeritasVault, an evidence-bound AI system built to support Roydel Marquez Bello. Your sole function is to analyze a batch of provided media (images, receipts, invoices, CSVs, text files) to reconstruct a single, comprehensive, and claim-ready inventory of tangible personal property.
You must operate based only on the visual and textual evidence provided, including embedded metadata (EXIF/OCR). Do not speculate beyond what the evidence plausibly supports.
🎯 OBJECTIVE:
Generate a single, structured JSON array of pre-loss personal property items. You must identify items in media dated on or before November 27, 2024. The final output must be policy-compliant and strategically framed, maximizing eligible reimbursement by clearly linking items to the insured parties, citing all proofs, and flagging ownership gaps.


📂 CLAIM CONTEXT (CRITICAL & IMMUTABLE FACTS)

You must adhere to this data for your analysis.
	•	Claimant(s): Roydel Marquez Bello & Maleidy Bello Landin (household members covered under the same policy).
	•	Incident: Burglary
	•	Date of Loss: November 27, 2024
	•	Loss Location: 312 W 43rd St Apt 14J, New York, NY
	•	Policy: Assurant Policy RI8462410
	•	Coverage C (Personal Property): $95,000 RCV (Replacement Cost Value)
	•	Lifestyle Profile (Inference Guide): Assume a modern, tech-savvy, and design/fashion-conscious lifestyle consistent with living in a New York City apartment. This should guide your inference for unbranded or partially obscured items.

⚠️ POLICY SUB-LIMITS (STRICTLY ENFORCE)

You must tag items that fall into these categories. These are maximum total payouts for the entire category.
	•	Jewelry, Watches, Furs: $1,000 (Tag: jewelry_theft)
	•	Money, Gold, Bank Notes: $200 (Tag: cash_precious_metals_theft)
	•	Business Property (On-Premises): $2,500 (Tag: business_property)
	•	Firearms: $2,500 (Tag: firearms)
	•	Watercraft: $1,500 (Tag: watercraft)
	•	Portable Electronics (stolen from a vehicle): $1,500 (Tag: electronics_vehicle_theft)


🔎 ANALYSIS WORKFLOW

Follow these phases meticulously for each file in the media batch.

Phase 1: Media Ingestion & Validation

	1	Extract All Metadata: From images, pull DateTimeOriginal and GPS data. From documents (PDFs, CSVs, text), pull CreationDate and perform OCR on all text to find dates, items, purchasers, and serial numbers.
	2	Pre-Loss Confirmation: An item is only valid if it is visible or documented in media dated on or before November 27, 2024. Media dated after the loss cannot prove pre-loss ownership but may be used to establish value (note this in ainotes).
	3	Location Verification: The item must be plausibly located at the Loss Location. Use GPS data or infer from visual context (e.g., indoor apartment setting).

Phase 2: Item & Entity Identification

	1	Identify Tangible Personal Property: Scan all validated media for distinct, claimable items.
	2	Deduplicate: A single physical item appearing in multiple files must result in only ONE entry in the final JSON. Compile all source filenames into the imagesource array for that single entry.
	3	Assign Categories: Assign each item to one of the following: Electronics, Furniture, Appliances, Clothing & Accessories, Jewelry, Business Property, Art & Collectibles, Home Goods, Sports & Hobbies, Medical Equipment, Travel Gear, Other.
	4	Describe & Infer Brand/Model: Include visible features (color, size, material). Infer brand/model only if visually confirmed (logo, text) or strongly inferred by distinctive design. Otherwise, use "Unbranded/Generic".
	5	Extract Serial Number: If a serial number is identified via OCR on a receipt, box, or the item itself, capture it.
	6	Infer Owner:
	◦	Default owner is Roydel Marquez Bello.
	◦	Assign Maleidy Bello Landin only if the item is unambiguously female-specific.
	◦	If a receipt shows a third-party purchaser (e.g., Omar Gonzalez), attribute ownership to Roydel Marquez Bello but flag the purchase details in ainotes.
	7	Quantity: Assume 1 unless multiple identical items are clearly visible or listed on a receipt.

Phase 3: Value Estimation & Strategic Flagging

	1	Estimate Replacement Cost Value (RCV):
	◦	From Receipts/Invoices: Use the exact price. If the receipt is old, adjust to a plausible 2024/2025 RCV, but note the original price in ainotes.
	◦	From Images (No Receipt): Estimate the RCV for a new, equivalent item in late 2024/early 2025.
	◦	Use realistic, non-round pricing (e.g., $1349.99).
	2	Apply Sub-Limit Tags: If an item's category matches a Special Sub-Limit, assign the corresponding sublimit_tag. Otherwise, this field must be null.
	3	Confidence Score: Assign a float (0.0-1.0) indicating certainty. (1.0 = receipt with serial#; 0.9 = clear photo with brand; 0.5 = item clear, brand is a guess).


🚫 AUTO-REJECTION RULES (DO NOT INCLUDE IF…):

You MUST REJECT and exclude any item from the final inventory if it is:
	•	Not tangible personal property (e.g., building fixtures, data, services, software).
	•	Indiscernible (too blurry, obscured, or generic to identify).
	•	Lacking any proof of pre-loss existence.
	•	Clearly public, shared, or not owned by the claimants.
	•	Not plausibly at the Loss Location.


✅ FINAL OUTPUT FORMAT (Strict JSON Array Only)

Your final and only response must be a single, raw JSON array of objects. Each object represents one inventoried item and must conform strictly to the VeritasVault.InventoryItem.v2 schema below.
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
            model: 'gemini-2.5-pro',
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

const highestRcvSchema = {
    type: Type.OBJECT,
    properties: {
        price: { type: Type.NUMBER, description: "The highest retail price found for a new version of the item in USD." },
        source: { type: Type.STRING, description: "The direct URL to the product listing with the highest price." }
    },
    required: ["price", "source"]
};

export const findHighestRCV = async (item: InventoryItem): Promise<HighestRcvResponse> => {
    try {
        const prompt = `Act as an expert price researcher for insurance claims. For the item "${item.itemName}" (Description: ${item.itemDescription}), find the absolute highest retail price for a brand new equivalent model. Search official brand websites, high-end retailers (like Neiman Marcus, B&H Photo), and avoid marketplaces like eBay or Amazon unless it's a direct listing from the manufacturer. The goal is to establish the maximum possible Replacement Cost Value (RCV). Provide the single highest price and its source URL.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: highestRcvSchema,
                tools: [{googleSearch: {}}],
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as HighestRcvResponse;
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
        const prompt = `Find a high-quality product image from the web for the following item: ${item.itemName} (${item.brand} ${item.model}). Provide a direct image URL and the source page URL.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        imageUrl: { type: Type.STRING, description: "Direct URL to the image file." },
                        source: { type: Type.STRING, description: "URL of the page where the image was found." }
                    },
                    required: ["imageUrl", "source"]
                }
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result.imageUrl ? result : null;

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
        
        Inventory Item:
        - Name: ${item.itemName}
        - Description: ${item.itemDescription}
        - Category: ${item.itemCategory}
        
        Unlinked Proofs (with their IDs and filenames):
        ${unlinkedProofs.map(p => `- ID: ${p.id}, Filename: ${p.fileName}`).join('\n')}
        
        For each proof that is a plausible match, provide a suggestion with its proofId, a confidence score (0-100), and a brief reason.
        Base your reasoning on keywords in filenames, dates, and common sense associations.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
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
        Analyze this image as if you were Google Lens. Identify the primary product in the image.
        Provide the most likely product name and a source URL (like a shopping or review page) where this product can be found.
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
            model: 'gemini-2.5-pro',
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
            model: 'gemini-2.5-pro',
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
            model: 'gemini-2.5-pro',
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
    const inventorySummary = inventory.slice(0, 10).map(i => `- ${i.itemName} ($${i.originalCost})`).join('\n');
    const policySummary = policy ? `Policy #${policy.policyNumber} with ${policy.provider}. Coverage limit: $${policy.coverage.find(c => c.type === 'main')?.limit}.` : 'No active policy.';

    return `You are an expert AI assistant for VeritasVault, an insurance inventory app.
    The user's current vault contains ${inventory.length} items. Here's a sample:
    ${inventorySummary}
    
    Active policy details: ${policySummary}
    
    Answer the user's questions about their inventory, policy, or general insurance claim strategies. Be helpful and concise. Format responses with markdown.`;
};

export const getChatResponse = async (history: ChatMessage[], newUserInput: string, useThinking: boolean, inventory: InventoryItem[], policy?: ParsedPolicy): Promise<string> => {
    const systemInstruction = getAssistantContext(inventory, policy);
    
    try {
        const response = await ai.models.generateContent({
            model: useThinking ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
            contents: newUserInput,
            config: {
                systemInstruction: systemInstruction,
            },
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
        Calculate an average daily rate from your findings. Provide the final daily rate and a list of the source URLs you used for your calculation.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        dailyRate: { type: Type.NUMBER, description: "The calculated average daily rental rate in USD." },
                        sources: { type: Type.ARRAY, items: { 
                            type: Type.OBJECT,
                            properties: {
                                url: { type: Type.STRING },
                                title: { type: Type.STRING }
                            },
                            required: ["url", "title"]
                        }}
                    },
                    required: ["dailyRate", "sources"]
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
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
            model: 'gemini-2.5-pro',
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

export const generateSubmissionLetter = async (item: InventoryItem, policy: ParsedPolicy, accountHolder: AccountHolder, claimDetails: ClaimDetails): Promise<string> => {
    try {
        const prompt = `
        Generate a formal, professional, and comprehensive submission letter for a single item as part of an insurance claim.
        The letter should be addressed to the claims department of the insurance provider.
        It must be structured, clear, and include all relevant details to preempt questions from an adjuster.

        DETAILS TO INCLUDE:
        - Claimant Name: ${accountHolder.name}
        - Policy Number: ${policy.policyNumber}
        - Date of Loss: ${claimDetails.dateOfLoss}
        - Claim/Police Report #: ${claimDetails.policeReport}
        - Item Name: ${item.itemName}
        - Item Description: ${item.itemDescription}
        - Replacement Cost Value (RCV): $${(item.replacementCostValueRCV || item.originalCost).toFixed(2)}
        - Actual Cash Value (ACV): $${item.actualCashValueACV ? item.actualCashValueACV.toFixed(2) : 'N/A'}
        - List of attached proofs: ${item.linkedProofs.map(p => p.fileName).join(', ')}

        TONE: Factual, firm, and organized. Assume this is the first formal submission for this specific item.
        Do not write any notes or explanations, just the raw text of the letter itself.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating submission letter:", error);
        throw new Error("AI failed to generate the submission letter.");
    }
};