// Fix: Removed invalid file marker that was causing a parsing error.
import { GoogleGenAI, Type } from "@google/genai";
// Fix: Added .ts extension to file paths
import { fileToBase64 } from '../utils/fileUtils.ts';
import { GeminiResponse, ParsedPolicy, AccountHolder, InventoryItem, DraftClaim, ValuationResponse, WebIntelligenceResponse, ApparelIdentificationResponse, HighestRcvResponse, SerialNumberResponse, ProofStrengthResponse, Proof, ProofSuggestion, ACVResponse, CoverageLimit, PolicyParseResponse, PolicyAnalysisReport } from '../types.ts';
import { CATEGORIES } from '../constants.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- CORE AI SERVICES ---

// New schema for advanced proof analysis
const proofAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    itemName: { type: Type.STRING, description: 'A proper, insurance-style name for the item this proof refers to (e.g., "Apple MacBook Pro 16-inch, 2021"). If no specific item, title the document.' },
    description: { type: Type.STRING, description: 'A detailed summary of the proof\'s content.' },
    category: { type: Type.STRING, description: `The most relevant item category from this list: ${CATEGORIES.join(', ')}` },
    estimatedValue: { type: Type.NUMBER, description: 'If a price/value is stated for one item, extract it. Otherwise, return 0.' },
    brand: { type: Type.STRING },
    model: { type: Type.STRING },
    summary: { type: Type.STRING, description: 'A concise, one-sentence summary of the proof (e.g., "A Best Buy receipt for a Sony Camera dated 03/15/2023.").' },
    purpose: { type: Type.STRING, enum: ['Proof of Purchase', 'Proof of Possession', 'Proof of Value', 'Supporting Document', 'Unknown'], description: "The primary purpose of this file." },
    authenticityScore: { type: Type.INTEGER, description: 'A score (0-100) assessing the authenticity strength. A dated store receipt is very high (95). A clear photo of the item is good (70). A blurry photo is lower (40).' }
  },
  required: ['itemName', 'description', 'category', 'estimatedValue', 'summary', 'purpose', 'authenticityScore'],
};


// New unified function to replace analyzeImageWithGemini and analyzeDocumentWithGemini
export const analyzeProof = async (file: File): Promise<any> => {
  try {
    const base64Data = await fileToBase64(file);
    const filePart = {
      inlineData: {
        mimeType: file.type,
        data: base64Data,
      },
    };

    const prompt = `You are an expert insurance claims analyst. Your task is to analyze a file for an inventory app and extract key information.

    INSTRUCTIONS:
    1.  **Determine Purpose:** Classify the file's primary purpose from this list:
        - 'Proof of Purchase': A receipt, invoice, or bank statement showing a transaction.
        - 'Proof of Possession': A photo of the item, a user manual, or warranty card.
        - 'Proof of Value': An appraisal document.
        - 'Supporting Document': Other relevant but indirect documents.
        - 'Unknown': If purpose is unclear.
    2.  **Assess Authenticity:** Rate the authenticity strength on a scale of 0-100. A clear, dated store receipt is very strong (~95). A clear photo of an item in the user's home is good (~70). A blurry photo or a generic document is weaker.
    3.  **Extract Item Details:**
        -   **Item Name:** Create a proper, descriptive name suitable for an insurance ledger (e.g., "Sony Alpha a7 IV Mirrorless Camera", not just "camera").
        -   **Description:** Summarize the contents of the proof in detail.
        -   **Category:** Choose the most fitting category from the provided list.
        -   **Value:** If a monetary value is clearly stated for a single item, extract it. Otherwise, default to 0.
        -   **Brand/Model:** Extract if identifiable.
        -   **Summary:** A very brief, one-sentence summary of the proof.
    4.  **Respond in JSON:** Return the result in the specified JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [filePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: proofAnalysisSchema,
        systemInstruction: prompt,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    if (!CATEGORIES.includes(result.category)) {
      result.category = file.type.startsWith('image/') ? 'Other' : 'Documents';
    }

    return result;
  } catch (error) {
    console.error(`Error analyzing proof "${file.name}" with Gemini:`, error);
    let errorMessage = "An unknown error occurred while analyzing the proof.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(`Gemini API Error: ${errorMessage}`);
  }
};


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
            contents: { parts: [pdfPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: policyAnalysisSchema,
                systemInstruction: prompt,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PolicyAnalysisReport;
    } catch (error) {
        console.error("Error analyzing policy document:", error);
        throw new Error("Failed to analyze the policy document. Please ensure it's a valid PDF and try again.");
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
          synthesizedItem: {
            type: Type.OBJECT,
            properties: {
              itemName: { type: Type.STRING, description: "A clear, concise name for the item (e.g., 'Apple MacBook Pro 16-inch')." },
              itemDescription: { type: Type.STRING, description: 'A detailed description synthesized from all available proof information.' },
              itemCategory: { type: Type.STRING, enum: CATEGORIES, description: "The best category for the item." },
              originalCost: { type: Type.NUMBER, description: "The purchase price, ideally from a receipt. If not available, use the estimated value from a photo analysis. Default to 0 if no value can be found." },
              purchaseDate: { type: Type.STRING, description: 'The purchase date in YYYY-MM-DD format, if available from a receipt or document.' },
              brand: { type: Type.STRING },
              model: { type: Type.STRING },
              serialNumber: { type: Type.STRING },
              provenance: { type: Type.STRING, description: 'A brief, one-sentence, human-readable explanation of how this item was synthesized from its proofs. For example: "Created from a photo of a laptop and a matching Best Buy receipt from March 2023." ' },
            },
            required: ['itemName', 'itemDescription', 'itemCategory', 'originalCost', 'provenance']
          }
        },
        required: ['proofIds', 'synthesizedItem']
      }
    }
  },
  required: ['clusters']
};

export const clusterAndSynthesizeItems = async (proofs: Proof[], policy: ParsedPolicy): Promise<{ clusters: { proofIds: string[], synthesizedItem: Partial<InventoryItem> }[] }> => {
    try {
        const proofManifest = proofs.map(p => ({
            id: p.id,
            fileName: p.fileName,
            type: p.type,
            summary: p.summary,
            // NEW: Pass richer data to the clustering model
            purpose: p.purpose,
            authenticityScore: p.authenticityScore,
            predictedCategory: p.predictedCategory,
        }));

        const prompt = `
        You are an expert autonomous insurance inventory creation agent. Your task is to analyze a collection of pre-analyzed evidence and group them into logical clusters, where each cluster represents a single real-world item. After clustering, you must synthesize a complete inventory item record from the combined information in each cluster.

        INSURANCE CONTEXT:
        The user's policy has these important coverage categories: ${policy.coverage.map(c => c.category).join(', ')}. Align the synthesized item's category with one of these if possible.
        
        EVIDENCE TO ANALYZE (pre-analyzed by a subordinate AI):
        ${JSON.stringify(proofManifest, null, 2)}

        CRITICAL INSTRUCTIONS:
        1.  **Review the Pre-Analyzed Proofs:** Each proof has an ID, filename, a summary, a predicted purpose, and an authenticity score.
        2.  **Cluster Logically:** Identify groups of proofs referring to the same item. Use matching brand/model names, similar dates, and content summaries.
        3.  **Prioritize High-Quality Evidence:** When synthesizing the item, give strong preference to data from proofs with a 'Proof of Purchase' purpose and a high 'authenticityScore'. Use these for 'originalCost' and 'purchaseDate'.
        4.  **Synthesize the Best Record:**
            -   Create a clean, insurance-practice item name (e.g., 'Apple MacBook Pro 16-inch').
            -   Synthesize a comprehensive 'itemDescription' by combining details from all proofs in the cluster.
            -   Create a 'provenance' sentence explaining your clustering logic.
        5.  **Be Conservative:** If a proof cannot be confidently matched, DO NOT include it in a cluster. It's better to leave a proof unclustered than to make an incorrect association.
        
        Return your response in the specified JSON format.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Use a more powerful model for this complex reasoning task
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: clusterSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error clustering and synthesizing items:", error);
        throw new Error("AI failed to cluster the provided evidence. Please try again.");
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

const valuationSchema = {
    type: Type.OBJECT,
    properties: {
        rcv: { type: Type.NUMBER, description: "Estimated Replacement Cost Value (RCV) in USD for a new version of this item." },
        acv: { type: Type.NUMBER, description: "Estimated Actual Cash Value (ACV) in USD, considering depreciation for a used version." },
        sources: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    url: { type: Type.STRING, description: "The direct URL to the product listing or source page." },
                    price: { type: Type.NUMBER, description: "The price found at the source." },
                    type: { type: Type.STRING, description: "Whether the price is for RCV (new) or ACV (used)." }
                },
                required: ["url", "price", "type"]
            }
        }
    },
    required: ["rcv", "acv", "sources"]
};

export const findMarketPrice = async (item: InventoryItem): Promise<ValuationResponse> => {
    try {
        const prompt = `Act as a price researcher. For the item "${item.itemName}" (Description: ${item.itemDescription}), find the current market price. Search major online retailers (like Amazon, Best Buy, eBay). Provide the estimated Replacement Cost Value (RCV) for a new item and the Actual Cash Value (ACV) for a used/refurbished item. Provide at least two source URLs with prices to back up your estimates.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: valuationSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ValuationResponse;
    } catch (error) {
        console.error("Error finding market price:", error);
        throw new Error("AI failed to find market price data. The web search may have failed.");
    }
};

const webIntelligenceSchema = {
    type: Type.OBJECT,
    properties: {
        facts: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    fact: { type: Type.STRING, description: "A specific fact about the item (e.g., 'Release Date: 2022', 'Material: Aluminum')." },
                    source: { type: Type.STRING, description: "The source URL where this fact was found." }
                },
                required: ["fact", "source"]
            }
        }
    },
    required: ["facts"]
};

export const enrichAssetFromWeb = async (item: InventoryItem): Promise<WebIntelligenceResponse> => {
    try {
        const prompt = `Act as an intelligence analyst. For the item "${item.itemName}" (${item.itemDescription}), gather key specifications and details from the web. Find at least 3 facts like release date, model number, material, dimensions, or original MSRP. For each fact, you MUST provide the source URL.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: webIntelligenceSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as WebIntelligenceResponse;
    } catch (error) {
        console.error("Error enriching asset data:", error);
        throw new Error("AI failed to enrich data from the web. The search may have timed out.");
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

const acvSchema = {
    type: Type.OBJECT,
    properties: {
        acv: { type: Type.NUMBER, description: "The final calculated Actual Cash Value (ACV) in USD." },
        reasoning: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A step-by-step breakdown of the calculation logic."
        }
    },
    required: ["acv", "reasoning"]
};

export const calculateACV = async (item: InventoryItem): Promise<ACVResponse> => {
    if (!item.purchaseDate) {
        throw new Error("Purchase date is required to calculate ACV.");
    }

    try {
        const purchaseDate = new Date(item.purchaseDate);
        const now = new Date();
        const ageInYears = (now.getTime() - purchaseDate.getTime()) / (1000 * 3600 * 24 * 365.25);
        const rcv = item.replacementCostValueRCV || item.originalCost;

        const prompt = `
        Act as an insurance claims adjuster specializing in depreciation. Calculate the Actual Cash Value (ACV) for the following item.
        - Item: ${item.itemName}
        - Category: ${item.itemCategory}
        - Condition: ${item.condition || 'Good'}
        - Age: ${ageInYears.toFixed(1)} years
        - Replacement Cost Value (RCV): $${rcv.toFixed(2)}

        Use a standard depreciation schedule for the given category. A typical lifespan for electronics is 5-7 years, furniture 10-15 years, etc. Show your work in the reasoning.
        
        The final ACV should not be less than 10% of the RCV unless the item is older than its expected lifespan.
        
        Provide the final ACV and a step-by-step reasoning for the calculation. For example: "1. Started with RCV of $X. 2. Determined an annual depreciation rate of Y% for the category. 3. Calculated total depreciation over Z years. 4. Subtracted total depreciation from RCV to get final ACV."
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: acvSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ACVResponse;
    } catch (error) {
        console.error("Error calculating ACV:", error);
        throw new Error("AI failed to calculate ACV and depreciation.");
    }
};


const fuzzyMatchSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    proofId: { type: Type.STRING, description: "The ID of the suggested proof." },
                    confidence: { type: Type.INTEGER, description: "Confidence score (0-100) of the match." },
                    reason: { type: Type.STRING, description: "A brief reason for the suggestion." }
                },
                required: ["proofId", "confidence", "reason"]
            }
        }
    },
    required: ["suggestions"]
};

export const fuzzyMatchProofs = async (item: InventoryItem, proofsToScan: Proof[]): Promise<{ suggestions: ProofSuggestion[] }> => {
    try {
        const itemDetails = `Item Name: ${item.itemName}, Brand: ${item.brand}, Model: ${item.model}, Description: ${item.itemDescription}, Category: ${item.itemCategory}`;
        const proofDetails = proofsToScan.map(p => `ID: ${p.id}, Filename: ${p.fileName}, Predicted Category: ${p.predictedCategory || 'Uncategorized'}`).join('\n');

        const prompt = `
        Act as a forensic accountant. I have an inventory item and a list of unlinked proofs. Analyze them and determine which proofs likely belong to the item.
        
        INVENTORY ITEM:
        ${itemDetails}

        UNLINKED PROOFS:
        ${proofDetails}

        Based on keywords from the filenames and the Predicted Category of the proof, provide a list of suggestions. A match is much stronger if the item's category ('${item.itemCategory}') is similar to the proof's predicted category. For example, a 'Laptop' item should strongly match a proof categorized as 'Electronics Receipt'.
        
        Only return suggestions with a confidence score of 50 or higher.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: fuzzyMatchSchema,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as { suggestions: ProofSuggestion[] };
    } catch (error) {
        console.error("Error fuzzy matching proofs:", error);
        throw new Error("AI failed to find matching proofs.");
    }
};

const productImageSchema = {
    type: Type.OBJECT,
    properties: {
        imageUrl: { type: Type.STRING, description: "The direct hotlink URL to the highest quality product image file (.jpg, .png, .webp). Must be a direct link to the image itself, not a webpage." },
        source: { type: Type.STRING, description: "The URL of the web page where the image was found." }
    },
    required: ["imageUrl", "source"]
};

export const findProductImageFromWeb = async (item: InventoryItem): Promise<{ imageUrl: string; source: string } | null> => {
    try {
        const prompt = `You are an AI assistant for an insurance inventory app. Your task is to find a high-quality, official-looking product image for a specific item. Search for the item on official brand websites, major retailers, or high-end department stores. Avoid images from auction sites, social media, or user-submitted photos. The best image is typically a clean, high-resolution shot on a white or neutral background.
        
Item to find: "${item.brand || ''} ${item.model || ''} ${item.itemName}"
Description: ${item.itemDescription}

Return the direct URL to the image file (e.g., ending in .jpg, .png, .webp) and the URL of the page where you found it. If you cannot find a suitable image, return null for both fields.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: productImageSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        if (result && result.imageUrl && result.source) {
            return result as { imageUrl: string; source: string };
        }
        return null;

    } catch (error) {
        console.error("Error finding product image from web:", error);
        return null;
    }
};

const proofCategorySchema = {
    type: Type.OBJECT,
    properties: {
        category: { type: Type.STRING, description: `The most relevant category for the item this proof represents, chosen from the list: ${CATEGORIES.join(', ')}` },
        reasoning: { type: Type.STRING, description: "A brief explanation for why this category was chosen based on the filename." }
    },
    required: ["category", "reasoning"]
};

export const categorizeUnlinkedProof = async (proof: Proof): Promise<{ category: string; reasoning: string }> => {
    try {
        const prompt = `Act as an AI inventory assistant. Your task is to predict the item category for a piece of evidence based on its filename.
        
Filename: "${proof.fileName}"

Analyze the filename for keywords (e.g., "receipt", "invoice", "photo", "warranty", brand names, product types like "camera" or "handbag"). Based on these keywords, choose the most fitting category from the provided list. For example, 'receipt_sony_camera_2023.pdf' would be 'Electronics'. 'gucci_handbag_invoice.pdf' would be 'Clothing'. A generic filename like 'IMG_1234.jpg' might be 'Other' unless there are other clues.

Return the category and a brief reasoning.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: proofCategorySchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        // Ensure the category is valid
        if (!CATEGORIES.includes(result.category)) {
            result.category = 'Other';
        }

        return result as { category: string; reasoning: string };
    } catch (error) {
        console.error(`Error categorizing proof "${proof.fileName}":`, error);
        // Fallback on error
        return { category: 'Other', reasoning: 'AI analysis failed.' };
    }
};

const visualSearchSchema = {
    type: Type.OBJECT,
    properties: {
        itemName: { type: Type.STRING, description: "The specific product name identified from the image." },
        description: { type: Type.STRING, description: "A concise, one-sentence description of the identified product." },
        sourceUrl: { type: Type.STRING, description: "The URL of an official product page or major retailer selling this exact item." }
    },
    required: ["itemName", "description", "sourceUrl"]
};

export const findItemWithGoogleLens = async (item: InventoryItem): Promise<{ itemName: string; description: string; sourceUrl: string }> => {
    const primaryProof = item.linkedProofs.find(p => p.type === 'image');
    if (!primaryProof || !primaryProof.dataUrl) {
        throw new Error("No primary image found for visual search.");
    }

    try {
        const base64Image = primaryProof.dataUrl.split(',')[1];
        const imagePart = {
            inlineData: {
                mimeType: primaryProof.mimeType,
                data: base64Image,
            },
        };

        const prompt = `Act like Google Lens. Analyze the provided image to identify the product. Find the specific product name, provide a concise one-sentence description, and locate a URL for the official product page or a major retailer where this item can be viewed or purchased.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: visualSearchSchema,
                systemInstruction: prompt,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as { itemName: string; description: string; sourceUrl: string };

    } catch (error) {
        console.error("Error with Visual Search:", error);
        throw new Error("AI Visual Search failed. The image may be unclear or the product could not be identified.");
    }
};