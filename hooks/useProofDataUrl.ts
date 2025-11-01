import { useState, useEffect } from 'react';
import { getProofBlob } from '../services/storageService.ts';

export const useProofDataUrl = (proofId: string | undefined) => {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let objectUrl: string | null = null;

        const loadProof = async () => {
            if (!proofId) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            try {
                const blob = await getProofBlob(proofId);
                if (isMounted && blob) {
                    objectUrl = URL.createObjectURL(blob);
                    setDataUrl(objectUrl);
                }
            } catch (error) {
                console.error(`Failed to load proof ${proofId}`, error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadProof();

        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [proofId]);

    return { dataUrl, isLoading };
};
