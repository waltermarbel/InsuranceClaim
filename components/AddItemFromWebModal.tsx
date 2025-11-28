import React, { useState } from 'react';
import { useAppDispatch } from '../context/AppContext.tsx';
import { WebScrapeResult, InventoryItem } from '../types.ts';
import * as geminiService from '../services/geminiService.ts';
import { XIcon, SparklesIcon, SpinnerIcon, CheckCircleIcon } from './icons.tsx';
import { CATEGORIES } from '../constants.ts';

interface AddItemFromWebModalProps {
    onClose: () => void;
}

const AddItemFromWebModal: React.FC<AddItemFromWebModalProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scrapedData, setScrapedData] = useState<WebScrapeResult | null>(null);

    const handleScrape = async () => {
        if (!url.trim()) return;
        setIsLoading(true);
        setError(null);
        setScrapedData(null);
        try {
            const result = await geminiService.extractItemDetailsFromUrl(url);
            setScrapedData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to scrape URL.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = () => {
        if (!scrapedData) return;
        const newItem: InventoryItem = {
            id: `item-web-${Date.now()}`,
            status: 'needs-review',
            itemName: scrapedData.itemName,
            itemDescription: scrapedData.itemDescription,
            itemCategory: scrapedData.itemCategory,
            originalCost: scrapedData.originalCost,
            brand: scrapedData.brand,
            model: scrapedData.model,
            linkedProofs: [], // A proof could be created from the image URL if needed
            createdAt: new Date().toISOString(),
            createdBy: 'AI Web Acquirer',
        };
        dispatch({ type: 'ADD_INVENTORY_ITEMS', payload: [newItem] });
        dispatch({ type: 'LOG_ACTIVITY', payload: { action: 'WEB_ASSET_ACQUIRED', details: `Acquired '${newItem.itemName}' from ${scrapedData.sourceUrl}`, app: 'Gemini' } });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading">Add Item from Web</h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-medium">Enter a URL to a product page. The AI will attempt to extract the item's details and create a new inventory asset.</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://example.com/product-page"
                            className="flex-grow p-2 border border-slate-300 rounded-md text-sm"
                            disabled={isLoading}
                        />
                        <button onClick={handleScrape} disabled={isLoading || !url.trim()} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md disabled:opacity-50">
                            {isLoading ? <SpinnerIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5" />}
                            <span>{isLoading ? 'Scraping...' : 'Scrape'}</span>
                        </button>
                    </div>
                    {error && <p className="text-sm text-danger">{error}</p>}
                    
                    {scrapedData && (
                        <div className="pt-4 border-t mt-4 space-y-3">
                            <h3 className="font-semibold text-dark">Scraped Details (Editable)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <img src={scrapedData.imageUrl} alt={scrapedData.itemName} className="w-full aspect-square object-contain rounded-md border bg-slate-100" />
                                <div className="space-y-2">
                                    <input type="text" value={scrapedData.itemName} onChange={e => setScrapedData(d => d ? {...d, itemName: e.target.value} : null)} className="w-full p-2 border rounded-md text-sm" />
                                    <textarea value={scrapedData.itemDescription} onChange={e => setScrapedData(d => d ? {...d, itemDescription: e.target.value} : null)} rows={4} className="w-full p-2 border rounded-md text-sm" />
                                    <input type="number" value={scrapedData.originalCost} onChange={e => setScrapedData(d => d ? {...d, originalCost: parseFloat(e.target.value) || 0} : null)} className="w-full p-2 border rounded-md text-sm" />
                                    <select value={scrapedData.itemCategory} onChange={e => setScrapedData(d => d ? {...d, itemCategory: e.target.value} : null)} className="w-full p-2 border rounded-md text-sm bg-white">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                 <div className="flex justify-end items-center p-4 bg-slate-50 border-t space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">Cancel</button>
                    <button onClick={handleSave} disabled={!scrapedData} className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Add to Vault</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddItemFromWebModal;