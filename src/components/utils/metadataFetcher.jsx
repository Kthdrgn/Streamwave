import { getStreamMetadata } from '@/api/functions';
import { getMultipleStreamMetadata } from '@/api/functions';

// Single station metadata fetching using backend only
export async function fetchStationMetadata(streamUrl) {
    if (!streamUrl) return null;

    try {
        console.log('🔄 Fetching metadata for:', streamUrl);
        const response = await getStreamMetadata({ streamUrl });
        console.log('✅ Metadata fetch successful:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Metadata fetch failed:', error);
        return {
            success: false,
            error: 'Failed to fetch metadata',
            metadata: null,
            streamInfo: null
        };
    }
}

// Multiple stations metadata fetching using backend
export async function fetchMultipleStationsMetadata(streamUrls) {
    if (!streamUrls || streamUrls.length === 0) return {};

    try {
        console.log('🔄 Fetching metadata for multiple stations:', streamUrls.length);
        const response = await getMultipleStreamMetadata({ streamUrls });
        console.log('✅ Multiple metadata fetch successful');
        return response.data || {};
    } catch (error) {
        console.error('❌ Multiple metadata fetch failed:', error);
        return {};
    }
}