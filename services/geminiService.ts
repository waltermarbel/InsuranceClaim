import { GoogleGenAI, Type } from "@google/genai";
import { fileToDataUrl, fileToBase64 } from '../utils/fileUtils';
import { GeminiResponse, ParsedPolicy, AccountHolder, InventoryItem, DraftClaim, ValuationResponse, WebIntelligenceResponse, ApparelIdentificationResponse, HighestRcvResponse, SerialNumberResponse, ProofStrengthResponse, Proof, ProofSuggestion, ACVResponse, CoverageLimit, PolicyParseResponse } from '../types';
import { CATEGORIES } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- MOCK DATA & SCENARIO MODULES ---

// --- Roydel Marquez Bello Claim Scenario ---

/**
 * The pre-parsed insurance policy for the active claim scenario.
 */
export const SCENARIO_POLICY: ParsedPolicy = {
  provider: "Assurant",
  policyNumber: "RI8462410",
  policyHolder: "Roydel Marquez Bello & Maleidy Bello Landin",
  effectiveDate: "2024-01-15",
  expirationDate: "2025-01-15",
  deductible: 500,
  coverage: [
    { category: "Personal Property", limit: 80000, type: "main" },
    { category: "Jewelry", limit: 1000, type: "sub-limit" },
    { category: "Personal Records", limit: 1000, type: "sub-limit" },
    { category: "Credit Card / Forgery", limit: 500, type: "sub-limit" },
    { category: "Identity Fraud Expenses", limit: 500, type: "sub-limit" },
  ],
  coverageD_limit: 16000,
  lossSettlementMethod: 'RCV',
  exclusions: ["Flood Damage", "Earthquake", "Intentional Acts"],
  confidenceScore: 100,
  isVerified: true,
};

/**
 * The account holder for the active claim scenario.
 */
export const SCENARIO_ACCOUNT_HOLDER: AccountHolder = {
  id: 'ah-roydel-bello',
  name: 'Roydel Marquez Bello',
  address: '312 W 43rd Street, Apt 14J, New York, NY 10036'
};

const placeholderProof: Proof = {
    id: `proof-${Date.now()}`,
    type: 'image',
    fileName: 'item-photo.jpg',
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // 1x1 gray pixel
};

/**
 * The inventory of stolen items for the active claim scenario.
 */
export const SCENARIO_INVENTORY_ITEMS: InventoryItem[] = [
    {
        id: 'item-macbook-pro',
        status: 'active',
        itemName: 'Apple MacBook Pro 16"',
        itemDescription: 'Apple MacBook Pro 16", M2 Max, 64GB RAM, 2TB SSD. Stolen during burglary.',
        itemCategory: 'Electronics',
        originalCost: 4200,
        replacementCostValueRCV: 4200,
        purchaseDate: '2023-03-20',
        brand: 'Apple',
        model: 'MacBook Pro 16"',
        serialNumber: 'C02F9ABCDEFG',
        condition: 'Like New',
        linkedProofs: [placeholderProof],
        proofStrengthScore: 85,
        createdAt: new Date('2023-03-21T10:00:00Z').toISOString(),
        createdBy: 'User - Manual',
        lastKnownLocation: 'Office',
        isClaimed: true,
    },
    {
        id: 'item-iphone-15',
        status: 'active',
        itemName: 'Apple iPhone 15 Pro',
        itemDescription: 'Apple iPhone 15 Pro, 512GB, Natural Titanium. Stolen during burglary.',
        itemCategory: 'Electronics',
        originalCost: 1199,
        replacementCostValueRCV: 1199,
        purchaseDate: '2023-09-25',
        brand: 'Apple',
        model: 'iPhone 15 Pro',
        condition: 'Like New',
        linkedProofs: [placeholderProof],
        proofStrengthScore: 70,
        createdAt: new Date('2023-09-26T11:00:00Z').toISOString(),
        createdBy: 'User - Manual',
        lastKnownLocation: 'Living Room',
        isClaimed: true,
    },
    {
        id: 'item-watch-high-value',
        status: 'active',
        itemName: 'Luxury Watch',
        itemDescription: 'Luxury brand watch, stainless steel case and bracelet. Stolen during burglary. Value exceeds standard sub-limit.',
        itemCategory: 'Jewelry',
        originalCost: 5500,
        replacementCostValueRCV: 5500,
        purchaseDate: '2021-06-10',
        brand: 'Luxury Brand',
        condition: 'Good',
        linkedProofs: [placeholderProof],
        proofStrengthScore: 60,
        createdAt: new Date('2021-06-11T12:00:00Z').toISOString(),
        createdBy: 'User - Manual',
        lastKnownLocation: 'Master Bedroom',
        isClaimed: true,
    },
    {
        id: 'item-handbag-luxury',
        status: 'active',
        itemName: 'Luxury Handbag',
        itemDescription: 'Luxury designer handbag, black leather with gold hardware. Stolen during burglary.',
        itemCategory: 'Clothing',
        originalCost: 2800,
        replacementCostValueRCV: 2800,
        purchaseDate: '2022-11-01',
        brand: 'Designer Brand',
        condition: 'Good',
        linkedProofs: [placeholderProof],
        proofStrengthScore: 65,
        createdAt: new Date('2022-11-02T13:00:00Z').toISOString(),
        createdBy: 'User - Manual',
        lastKnownLocation: 'Master Bedroom',
        isClaimed: true,
    }
];

/**
 * Other non-inventory costs associated with the claim scenario.
 */
export const SCENARIO_OTHER_COSTS = {
    lossOfUse: 8400,
    propertyDamage: 1400,
    identityFraud: 3175,
};


/**
 * Mock Unlinked Proofs
 *
 * Simulates a pool of proofs discovered from synced accounts (e.g., email, cloud storage)
 * that have not yet been linked to an inventory item.
 */
export const UNLINKED_PROOFS: Proof[] = [
    { id: 'proof-ext-1', type: 'document', fileName: 'receipt_sony_camera_2023.pdf', dataUrl: '' },
    { id: 'proof-ext-2', type: 'image', fileName: 'photo_of_new_macbook.jpg', dataUrl: '' },
    { id: 'proof-ext-3', type: 'document', fileName: 'gucci_handbag_invoice_11-2022.pdf', dataUrl: '' },
    { id: 'proof-ext-4', type: 'image', fileName: 'IMG_20230510_1430.jpg', dataUrl: '' }, // A generic name to test matching
    { id: 'proof-ext-5', type: 'document', fileName: 'warranty_appliance_kitchen.pdf', dataUrl: '' },
];


// --- CORE AI SERVICES ---

const analyzeSchema = {
  type: Type.OBJECT,
  properties: {
    itemName: { type: Type.STRING, description: 'A short, descriptive name for the item in the image.' },
    description: { type: Type.STRING, description: 'A detailed description of the item, including its condition, material, and any notable features.' },
    category: { type: Type.STRING, description: `The most relevant category for the item from the following list: ${CATEGORIES.join(', ')}` },
    estimatedValue: { type: Type.NUMBER, description: 'An estimated monetary value of the item in USD. Provide just a number, without currency symbols.' },
    brand: { type: Type.STRING, description: 'The brand name of the item, if identifiable.' },
    model: { type: Type.STRING, description: 'The model name or number of the item, if identifiable.' },
  },
  required: ['itemName', 'description', 'category', 'estimatedValue'],
};


export const analyzeImageWithGemini = async (file: File): Promise<GeminiResponse> => {
  try {
    const base64Image = await fileToBase64(file);
    const imagePart = {
      inlineData: {
        mimeType: file.type,
        data: base64Image,
      },
    };
    const textPart = {
      text: "Analyze the image of this household item for an inventory app. If the image shows the item's packaging (e.g., a box), infer the product itself, not the packaging. Provide a short name, detailed description, category, estimated value (USD), brand, and model."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: analyzeSchema,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    
    if (!CATEGORIES.includes(result.category)) {
        result.category = 'Other';
    }

    return result as GeminiResponse;
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    let errorMessage = "An unknown error occurred while analyzing the image.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(`Gemini API Error: ${errorMessage}`);
  }
};

// --- NEW & ENHANCED MODULES ---

const policySchema = {
    type: Type.OBJECT,
    properties: {
        provider: { type: Type.STRING, description: "The name of the insurance provider (e.g., 'GEICO', 'Assurant')." },
        policyNumber: { type: Type.STRING, description: "The policy number." },
        policyHolder: { type: Type.STRING, description: "The primary name of the policyholder." },
        effectiveDate: { type: Type.STRING, description: "The policy effective date in YYYY-MM-DD format." },
        expirationDate: { type: Type.STRING, description: "The policy expiration date in YYYY-MM-DD format." },
        deductible: { type: Type.NUMBER, description: "The primary deductible amount for a personal property claim." },
        coverage: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING, description: "The name of the coverage or sub-limit (e.g., 'Personal Property', 'Jewelry')." },
                    limit: { type: Type.NUMBER, description: "The maximum coverage amount in USD for this category." },
                    type: { type: Type.STRING, description: "The type of coverage, either 'main' for Coverage C or 'sub-limit'." }
                },
                required: ["category", "limit", "type"]
            }
        },
        coverageD_limit: { type: Type.NUMBER, description: "The Coverage D limit for Loss of Use or Additional Living Expenses." },
        lossSettlementMethod: { type: Type.STRING, description: "The loss settlement method, either 'ACV' (Actual Cash Value) or 'RCV' (Replacement Cost Value)." },
        exclusions: {
            type: Type.ARRAY,
            items: { type: Type.STRING, description: "A key exclusion from the policy (e.g., 'Flood Damage', 'Earthquake')." }
        },
        confidenceScore: { type: Type.INTEGER, description: "Your confidence score (0-100) in the accuracy of the extracted data. Be critical; lower the score if the document is blurry, oddly formatted, or information is ambiguous." }
    },
    required: ["provider", "policyNumber", "policyHolder", "effectiveDate", "expirationDate", "deductible", "coverage", "coverageD_limit", "lossSettlementMethod", "exclusions", "confidenceScore"]
};

export const parsePolicyDocument = async (file: File): Promise<PolicyParseResponse> => {
    const base64pdf = await fileToBase64(file);
    const pdfPart = {
        inlineData: {
            mimeType: 'application/pdf',
            data: base64pdf,
        },
    };

    const prompt = `
    Act as an expert insurance policy analyst. Carefully read the provided renters or homeowners insurance policy document and extract the following key information:
    1.  **Provider:** The name of the insurance company.
    2.  **Policy Number:** The unique identifier for the policy.
    3.  **PolicyHolder:** The name of the primary insured person.
    4.  **Effective & Expiration Dates:** The start and end dates of the policy period.
    5.  **Deductible:** The main deductible for personal property claims.
    6.  **Coverage C (Personal Property):** The main limit for personal property. This should have type 'main'.
    7.  **Special Limits (Sub-limits):** All special limits for specific categories like Jewelry, Cash, Firearms, Business Property, etc. These should have type 'sub-limit'.
    8.  **Coverage D (Loss of Use):** The limit for Additional Living Expenses.
    9.  **Loss Settlement Method:** Determine if the policy pays out at 'ACV' or 'RCV'.
    10. **Exclusions:** List up to 3 key exclusions (e.g., 'Flood', 'Earthquake', 'Intentional Acts').
    11. **Confidence Score:** Provide a confidence score from 0 to 100 on how certain you are about the accuracy of the extracted data.

    Return the data in the specified JSON format.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [pdfPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: policySchema,
            systemInstruction: prompt,
        },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as PolicyParseResponse;
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
};

const serialNumberSchema = {
    type: Type.OBJECT,
    properties: {
        serialNumber: { type: Type.STRING, description: "The extracted serial number. If no serial number is found, return an empty string." }
    },
    required: ["serialNumber"]
};

export const extractSerialNumber = async (imageDataUrl: string): Promise<SerialNumberResponse> => {
    const base64Image = imageDataUrl.split(',')[1];
    const imagePart = {
        inlineData: {
          mimeType: 'image/jpeg', // Assume jpeg for simplicity
          data: base64Image,
        },
    };
    const textPart = {
        text: "Carefully analyze this image of an electronic device. Look for any labels, stickers, or engravings that might contain a serial number (often labeled 'Serial No.', 'S/N', 'SN', or just a long alphanumeric code). Extract and return only the serial number. If you can't find one, return an empty string."
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
};

const proofStrengthSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.INTEGER, description: "A score from 0 to 100 representing the strength of the proof for an insurance claim." },
        feedback: { type: Type.STRING, description: "A brief, actionable suggestion for how to improve the proof strength. For example, 'Add a receipt for proof of purchase.' or 'Photograph the serial number.'." }
    },
    required: ["score", "feedback"]
};

export const calculateProofStrength = async (item: InventoryItem): Promise<ProofStrengthResponse> => {
    const proofSummary = `
- Number of proofs: ${item.linkedProofs.length}
- Proof types: ${item.linkedProofs.map(p => p.type).join(', ')}
- Serial number available: ${item.serialNumber ? 'Yes' : 'No'}
- Item Category: ${item.itemCategory}
- Item Description: ${item.itemDescription}
`;

    const prompt = `
Act as a senior insurance claims adjuster. Your task is to evaluate the "proof strength" for an inventory item. A high score means the user has provided strong, undeniable evidence of ownership, value, and condition, making a claim easy to approve.

**Scoring Guidelines:**
- **Photos (Base):** A single photo is basic proof of existence. Start score around 30-40.
- **Documents (Major Boost):** A document (like a PDF receipt or invoice) is very strong proof of purchase and value. Add 30-50 points.
- **Serial Number (Critical for Electronics):** A serial number is extremely strong proof. Add 20-30 points, especially for Electronics.
- **Multiple Proofs:** Having multiple angles (photos) or different types of proof (photo + receipt) significantly strengthens the claim. Add 10-20 points for multiple proofs.
- **High-Value Items:** Jewelry, Art, and high-end Electronics need stronger proof. Be more critical of their scores if they only have a single photo.

**Context for this item:**
${proofSummary}

Based on the scoring guidelines and the item's context, provide a proof strength score from 0-100 and one brief, actionable sentence of feedback to help the user improve their documentation for this specific item. If the score is already high, the feedback can be a confirmation like "Excellent documentation."
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
};

const acvSchema = {
    type: Type.OBJECT,
    properties: {
        acv: { type: Type.NUMBER, description: "The calculated Actual Cash Value (ACV) in USD after applying depreciation." },
        reasoning: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
                description: "A step-in-the-process explanation for the calculation. E.g., 'Item is 3 years old.', 'Standard depreciation for Electronics is 20% per year.', 'Final ACV is Original Value - Depreciation.'"
            }
        }
    },
    required: ["acv", "reasoning"]
};

export const calculateACV = async (item: InventoryItem): Promise<ACVResponse> => {
    if (!item.purchaseDate) {
        throw new Error("Purchase date is required to calculate ACV.");
    }
    const originalValue = item.replacementCostValueRCV || item.originalCost;
    if (originalValue <= 0) {
        throw new Error("An original value (RCV or manual value) is required to calculate ACV.");
    }

    const prompt = `
    Act as an insurance asset valuator. Your task is to calculate the Actual Cash Value (ACV) for an inventory item by applying a standard depreciation schedule.

    **Item Details:**
    - Item Name: "${item.itemName}"
    - Category: "${item.itemCategory}"
    - Original Value (RCV or purchase price): $${originalValue.toFixed(2)}
    - Purchase Date: ${item.purchaseDate}
    - Current Date: ${new Date().toISOString().split('T')[0]}

    **Depreciation Guidelines:**
    - **Electronics & Appliances:** Typically depreciate over 5-7 years (around 15-20% per year).
    - **Furniture:** Depreciates over 7-10 years (around 10-15% per year).
    - **Clothing:** Depreciates quickly, often over 3-5 years (20-30% per year), unless it's a luxury item.
    - **Jewelry & Art:** Generally do not depreciate and may appreciate. ACV is often close to RCV unless damaged. For this task, assume 0% depreciation unless there's a compelling reason.
    - **Tools:** Depreciate over 5-10 years (10-20% per year).

    Calculate the item's age in years from the purchase date. Apply a reasonable annual depreciation percentage based on its category. Calculate the total depreciation and subtract it from the original value to find the ACV. The ACV should not be less than 10% of the original value (salvage value).

    Provide the final ACV and a step-by-step reasoning for your calculation.
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
};

const proofMatchingSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    proofId: { type: Type.STRING, description: "The ID of the proof file that is a potential match." },
                    confidence: { type: Type.INTEGER, description: "A confidence score from 0 to 100 on how likely this is a correct match." },
                    reason: { type: Type.STRING, description: "A brief explanation for why this proof might match the item." }
                },
                required: ["proofId", "confidence", "reason"]
            }
        }
    },
    required: ["suggestions"]
};

export const fuzzyMatchProofs = async (item: InventoryItem, potentialProofs: Proof[]): Promise<{ suggestions: ProofSuggestion[] }> => {
    const potentialProofSummary = potentialProofs.map(p => `ID: ${p.id}, Filename: ${p.fileName}`).join('\n');

    const prompt = `
    Act as an intelligent data linker for an inventory management system. Your task is to find relevant proofs for a specific inventory item from a list of unlinked files. Use fuzzy string matching, semantic analysis, and context to make your suggestions.

    **Inventory Item Details:**
    - Item Name: "${item.itemName}"
    - Item Description: "${item.itemDescription}"
    - Item Category: "${item.itemCategory}"

    **List of Potential Proof Files (with their IDs):**
    ${potentialProofSummary}

    Analyze the list of potential proofs and identify which ones are likely associated with the inventory item. A file might be a match if its name contains the brand, model, item type, or a related keyword. A generic filename like an image timestamp is less likely to be a strong match unless the item description is very generic.

    Return a list of suggestions with a confidence score and a reason for each match. Only return suggestions with a confidence score of 50 or higher.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: proofMatchingSchema,
        },
    });

    const jsonText = response.text.trim();
    try {
        const parsed = JSON.parse(jsonText);
        return parsed as { suggestions: ProofSuggestion[] };
    } catch (e) {
        console.error("Failed to parse fuzzy match response:", e, jsonText);
        return { suggestions: [] };
    }
};
