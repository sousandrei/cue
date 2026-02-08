import { useState } from 'react';
import { getMetadata, MetadataPayload } from '@/lib/tauri-commands';

export function useMetadata() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<MetadataPayload | null>(null);

    const fetchMetadata = async (url: string) => {
        if (!url.trim()) return;

        setLoading(true);
        setError(null);
        setMetadata(null);

        try {
            const data = await getMetadata(url);
            setMetadata(data);
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            console.error('Failed to fetch metadata:', err);
        } finally {
            setLoading(false);
        }
    };

    return {
        fetchMetadata,
        loading,
        error,
        metadata,
    };
}
