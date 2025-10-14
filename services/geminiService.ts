// Fix: Removed invalid file marker that was causing a parsing error.
import { GoogleGenAI, Type } from "@google/genai";
// Fix: Added .ts extension to file paths
import { fileToBase64 } from '../utils/fileUtils.ts';
import { GeminiResponse, ParsedPolicy, AccountHolder, InventoryItem, DraftClaim, ValuationResponse, WebIntelligenceResponse, ApparelIdentificationResponse, HighestRcvResponse, SerialNumberResponse, ProofStrengthResponse, Proof, ProofSuggestion, ACVResponse, CoverageLimit, PolicyParseResponse } from '../types.ts';
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
    mimeType: 'image/png',
    createdBy: 'User',
};

/**
 * The inventory of stolen items for the active claim scenario.
 */
export const SCENARIO_INVENTORY_ITEMS: InventoryItem[] = [
    {
        id: 'item-macbook-pro',
        status: 'claimed',
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
    },
    {
        id: 'item-iphone-15',
        status: 'claimed',
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
    },
    {
        id: 'item-watch-high-value',
        status: 'claimed',
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
    },
    {
        id: 'item-handbag-luxury',
        status: 'claimed',
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
    }
];

/**
 * Mock Unlinked Proofs
 *
 * Simulates a pool of proofs discovered from synced accounts (e.g., email, cloud storage)
 * that have not yet been linked to an inventory item.
 */
export const UNLINKED_PROOFS: Proof[] = [
    { id: 'proof-ext-1', type: 'document', fileName: 'receipt_sony_camera_2023.pdf', dataUrl: '', mimeType: 'application/pdf', createdBy: 'User' },
    { id: 'proof-ext-2', type: 'image', fileName: 'photo_of_new_macbook.jpg', dataUrl: '', mimeType: 'image/jpeg', createdBy: 'User' },
    { id: 'proof-ext-3', type: 'document', fileName: 'gucci_handbag_invoice_11-2022.pdf', dataUrl: '', mimeType: 'application/pdf', createdBy: 'User' },
    { id: 'proof-ext-4', type: 'image', fileName: 'IMG_20230510_1430.jpg', dataUrl: '', mimeType: 'image/jpeg', createdBy: 'User' }, // A generic name to test matching
    { id: 'proof-ext-5', type: 'document', fileName: 'warranty_appliance_kitchen.pdf', dataUrl: '', mimeType: 'application/pdf', createdBy: 'User' },
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

const analyzeDocumentSchema = {
  type: Type.OBJECT,
  properties: {
    itemName: { type: Type.STRING, description: 'If this document refers to a specific product, what is its name? Otherwise, provide a title for the document.' },
    description: { type: Type.STRING, description: 'A summary of the document contents, including any key entities, dates, or amounts.' },
    category: { type: Type.STRING, description: `Based on the content, what is the most relevant item category from this list: ${CATEGORIES.join(', ')}` },
    estimatedValue: { type: Type.NUMBER, description: 'If a price or value is clearly stated for a single item, extract it. Otherwise, return 0.' },
    brand: { type: Type.STRING, description: 'The brand name of any product mentioned, if identifiable.' },
    model: { type: Type.STRING, description: 'The model name or number of any product mentioned, if identifiable.' },
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

export const analyzeProofImageWithGemini = async (file: File): Promise<GeminiResponse> => {
    try {
        const base64Image = await fileToBase64(file);
        const imagePart = {
            inlineData: {
                mimeType: file.type,
                data: base64Image,
            },
        };
        const textPart = {
            text: "This is an image of a document (like a receipt, invoice, or manual). Analyze it for an inventory app. Extract the most likely item name, a description of the document's content, a relevant category, any monetary value or date mentioned, and the item's brand and model if available. The goal is to create a 'proof' record, so focus on the document's content."
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: analyzeDocumentSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (!CATEGORIES.includes(result.category)) {
            result.category = 'Documents';
        }

        return result as GeminiResponse;
    } catch (error) {
        console.error("Error analyzing proof image with Gemini:", error);
        let errorMessage = "An unknown error occurred while analyzing the proof image.";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        throw new Error(`Gemini API Error: ${errorMessage}`);
    }
};

export const analyzeDocumentWithGemini = async (file: File): Promise<GeminiResponse> => {
  try {
    const base64Document = await fileToBase64(file);
    const documentPart = {
      inlineData: {
        mimeType: file.type,
        data: base64Document,
      },
    };
    const textPart = {
      text: "Analyze this document (which could be a receipt, statement, or manual) for an inventory app. Extract the most likely item name, a description of the document's content, a relevant category, any monetary value or date mentioned, and the item's brand and model if available."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [documentPart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: analyzeDocumentSchema,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    
    if (!CATEGORIES.includes(result.category)) {
        result.category = 'Documents'; // Default to Documents for PDFs
    }

    return result as GeminiResponse;
  } catch (error) {
    console.error("Error analyzing document with Gemini:", error);
    let errorMessage = "An unknown error occurred while analyzing the document.";
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
    try {
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
    } catch (error) {
        console.error("Error parsing policy document:", error);
        throw new Error("Failed to parse the policy document. Please ensure it's a valid PDF and try again.");
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
