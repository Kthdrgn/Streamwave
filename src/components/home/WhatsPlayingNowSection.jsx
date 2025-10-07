
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { usePlayer } from '../player/PlayerContext';
import { motion } from 'framer-motion';
import { Play, Radio } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { fetchMultipleStationsMetadata } from '../utils/metadataFetcher'; // Updated import path

export default function WhatsPlayingNowSection({ onViewAll }) {
    const [topStations, setTopStations] = useState([]);
    const [metadata, setMetadata] = useState({});
    const [loadingStations, setLoadingStations] = useState(true);
    const [loadingMetadata, setLoadingMetadata] = useState(false);
    const { playStation } = usePlayer();

    const fetchMetadata = async (stations) => {
        if (stations.length === 0) return;
        
        setLoadingMetadata(true);
        try {
            const streamUrls = stations.map(s => s.url);
            // Use new hybrid metadata fetcher
            const metadataResults = await fetchMultipleStationsMetadata(streamUrls, false);
            setMetadata(metadataResults);
        } catch (error) {
            console.error("Failed to fetch metadata:", error);
        } finally {
            setLoadingMetadata(false);
        }
    };

    useEffect(() => {
        const fetchTopStations = async () => {
            setLoadingStations(true);
            try {
                const user = await User.me();
                const playCounts = user.station_play_counts || {};
                
                const stationsArray = Object.values(playCounts)
                    .filter(station => station.url && (!station.genres || !station.genres.includes('Podcast')))
                    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
                    .slice(0, 6); // Show 6 on homepage, full page shows 10
                
                setTopStations(stationsArray);

                // Initial metadata fetch
                if (stationsArray.length > 0) {
                    await fetchMetadata(stationsArray);
                }
            } catch (error) {
                console.error("Failed to fetch top stations:", error);
            } finally {
                setLoadingStations(false);
            }
        };

        fetchTopStations();
    }, []);

    // Auto-refresh metadata every 30 seconds
    useEffect(() => {
        if (topStations.length === 0) return;

        const interval = setInterval(() => {
            fetchMetadata(topStations);
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [topStations]);

    const handlePlayStation = (station) => {
        playStation(station);
    };

    if (loadingStations || topStations.length === 0) {
        return null; // Don't show section if no data
    }

    return (
        <div className="p-4 sm:p-6 rounded-2xl border" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>What's Playing Now</h2>
                {onViewAll && (
                    <Button variant="link" onClick={onViewAll} className="hover:text-white" style={{color: 'var(--primary-color)'}}>
                        View Full Dashboard
                    </Button>
                )}
            </div>
            
            <div className="space-y-3">
                {topStations.map((station, index) => {
                    const stationMeta = metadata[station.url];
                    const isLoading = loadingMetadata && !stationMeta;
                    
                    return (
                        <motion.div
                            key={station.url}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * index }}
                            onClick={() => handlePlayStation(station)}
                            className="flex items-center gap-3 p-3 backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group cursor-pointer"
                        >
                            <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.05)'}}>
                                {station.icon_url ? (
                                    <img src={station.icon_url} alt={station.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Radio className="w-6 h-6" style={{color: 'var(--text-secondary)'}} />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate" style={{color: 'var(--text-primary)'}} title={station.name}>
                                    {station.name}
                                </p>
                                <p className="text-sm truncate" style={{color: 'var(--text-secondary)'}}>
                                    {isLoading ? (
                                        'Loading...'
                                    ) : (stationMeta?.success && stationMeta.metadata.streamTitle) ? (
                                        stationMeta.metadata.streamTitle
                                    ) : (
                                        <span className="italic">Track info not available</span>
                                    )}
                                </p>
                            </div>
                            {/* Play button removed as the entire card is now clickable for playback */}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
