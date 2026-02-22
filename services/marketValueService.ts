
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, ValuationReport } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMarketValuation = async (item: InventoryItem): Promise<ValuationReport | null> => {
    const prompt = `
    Act as a professional property appraiser performing a market valuation for an insurance claim.
    
    Item: "${item.brand || ''} ${item.model || ''} ${item.itemName}"
    Condition: ${item.condition || 'Good'}
    Description: ${item.itemDescription || ''}
    
    I need two distinct values:
    1. Replacement Cost Value (RCV): The cost to buy this item NEW today from a major retailer (Amazon, Best Buy, Manufacturer).
    2. Actual Cash Value (ACV): The current market value of this item in USED condition (eBay sold listings, Poshmark, Mercari).
    
    Use Google Search to find real, current listings.
    
    Return a JSON object:
    {
        "rcv": { "value": number, "confidence": number (0-100), "sources": [{ "vendor": string, "url": string, "price": number, "dateRetrieved": "YYYY-MM-DD" }] },
        "acv": { "value": number, "confidence": number (0-100), "sources": [{ "vendor": string, "url": string, "price": number, "dateRetrieved": "YYYY-MM-DD" }] },
        "currency": "USD"
    }
    `;

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
                        rcv: {
                            type: Type.OBJECT,
                            properties: {
                                value: { type: Type.NUMBER },
                                confidence: { type: Type.NUMBER },
                                sources: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            vendor: { type: Type.STRING },
                                            url: { type: Type.STRING },
                                            price: { type: Type.NUMBER },
                                            dateRetrieved: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        },
                        acv: {
                            type: Type.OBJECT,
                            properties: {
                                value: { type: Type.NUMBER },
                                confidence: { type: Type.NUMBER },
                                sources: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            vendor: { type: Type.STRING },
                                            url: { type: Type.STRING },
                                            price: { type: Type.NUMBER },
                                            dateRetrieved: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        },
                        currency: { type: Type.STRING }
                    }
                }
            }
        });

        const result = JSON.parse(response.text || 'null');
        if (result) {
            result.timestamp = new Date().toISOString();
            result.method = 'market_api'; // Simulating API response
        }
        return result;
    } catch (e) {
        console.error("Market Valuation Service Failed:", e);
        return null;
    }
};
