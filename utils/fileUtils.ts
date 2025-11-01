import JSZip from 'jszip';
import { InventoryItem, Proof } from './types.ts';
// Fix: Removed self-import of `sanitizeFileName` which was causing a conflict.


export const fileToDataUrl = (
    file: File,
    onProgress?: (event: ProgressEvent<FileReader>) => void
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        if (onProgress) {
            reader.onprogress = onProgress;
        }
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error("Failed to read file as a data URL."));
            }
        };
        reader.onerror = error => reject(error);
    });
};


export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                // Return only the base64 part, without the data URI prefix
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read file as base64 string."));
            }
        };
        reader.onerror = error => reject(error);
    });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read blob as base64 string."));
            }
        };
        reader.onerror = error => reject(error);
    });
};

export const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

export const urlToDataUrl = (url: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Use a reliable CORS proxy to fetch cross-origin images client-side.
            // Switched from corsproxy.io to allorigins.win to resolve 404 errors.
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch image via proxy: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const reader = new FileReader();
            
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert blob to data URL.'));
                }
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error(`Original fetch URL: ${url}`, error);
            reject(new Error(`Failed to fetch or process image from URL. This may be a CORS or network issue. Error: ${error instanceof Error ? error.message : String(error)}`));
        }
    });
};


export const sanitizeFileName = (name: string): string => {
  return name.replace(/[^a-z0-9_.\-]/gi, '_').toLowerCase();
};


export const exportToCSV = (items: InventoryItem[], filename: string) => {
    const headers = [
        "Item Name", "Description", "Category", "Original Cost", "RCV", "ACV",
        "Purchase Date", "Brand", "Model", "Serial Number", "Condition", "Proof Strength", "Is Claimed", "Primary Proof Note"
    ];
    const rows = items.map(item => [
        `"${item.itemName.replace(/"/g, '""')}"`,
        `"${item.itemDescription.replace(/"/g, '""')}"`,
        item.itemCategory,
        item.originalCost,
        item.replacementCostValueRCV || '',
        item.actualCashValueACV || '',
        item.purchaseDate || '',
        item.brand || '',
        item.model || '',
        item.serialNumber || '',
        item.condition || '',
        item.proofStrengthScore || '',
        item.status === 'claimed' ? 'Yes' : 'No',
        `"${item.linkedProofs[0]?.notes?.replace(/"/g, '""') || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToZip = async (inventory: InventoryItem[], unlinkedProofs: Proof[]) => {
    const zip = new JSZip();

    // Create a proofs folder
    const proofsFolder = zip.folder("proofs");
    if (!proofsFolder) {
        throw new Error("Could not create proofs folder in zip.");
    }

    const inventoryForExport = JSON.parse(JSON.stringify(inventory)); // Deep copy to modify

    // Process linked proofs
    for (const item of inventoryForExport) {
        for (const proof of item.linkedProofs) {
            const blob = dataUrlToBlob(proof.dataUrl);
            const newFileName = sanitizeFileName(`${item.itemName}_${item.itemCategory}_${proof.fileName}`);
            proofsFolder.file(newFileName, blob);
            proof.dataUrl = `proofs/${newFileName}`; // Update path in JSON
        }
    }

    // Process unlinked proofs
    const unlinkedForExport = JSON.parse(JSON.stringify(unlinkedProofs));
    for (const proof of unlinkedForExport) {
        const blob = dataUrlToBlob(proof.dataUrl);
        const newFileName = sanitizeFileName(`unlinked_${proof.fileName}`);
        proofsFolder.file(newFileName, blob);
        proof.dataUrl = `proofs/${newFileName}`;
    }
    
    // Create the main JSON manifest
    const manifest = {
        exportedAt: new Date().toISOString(),
        inventory: inventoryForExport,
        unlinkedProofs: unlinkedForExport,
    };
    zip.file("inventory.json", JSON.stringify(manifest, null, 2));

    // Generate and download the ZIP file
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `VeritasVault_Forensic_Export_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};