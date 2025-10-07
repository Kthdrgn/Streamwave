
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { RadioStation } from '@/api/entities';
import { usePlayer } from '../components/player/PlayerContext';
import { motion } from 'framer-motion';
import { Activity, Music, Play, Loader2, Radio, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { fetchMultipleStationsMetadata } from '../components/utils/metadataFetcher';

export default function WhatsPlayingNow() {
    const [myStations, setMyStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const { playStation } = usePlayer();
    const navigate = useNavigate();

    // Memoized function to fetch metadata for a given array of stations
    const fetchStationMetadata = useCallback(async (stationsToFetch) => {
        if (stationsToFetch.length === 0) {
            return {};
        }
        const streamUrls = stationsToFetch.map(s => s.url);
        try {
            // Use new hybrid metadata fetcher
            const results = await fetchMultipleStationsMetadata(streamUrls, false);
            return results;
        } catch (error) {
            console.error("Failed to fetch stream metadata:", error);
        }
        return {};
    }, []);

    // Effect hook to load stations and their initial metadata
    useEffect(() => {
        const loadStationsAndMetadata = async () => {
            setLoading(true);
            try {
                // Helper to validate ObjectId format
                const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
                
                let fetchedStations = [];
                
                const user = await User.me(); // Fetch user data here for play counts
                const playCounts = user.station_play_counts || {};
                fetchedStations = Object.values(playCounts)
                    .filter((station) => station.url && station.id && isValidObjectId(station.id) && (!station.genres || !station.genres.includes('Podcast'))) // Ensure station has a URL, valid ID, and is not a podcast
                    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
                    .slice(0, 10) // Limit to top 10
                    .map((s) => ({
                        id: s.id, // Use the ID from play counts
                        name: s.name,
                        url: s.url,
                        icon_url: s.icon_url,
                        playCount: s.playCount,
                        metadata: undefined,
                        isLoadingMetadata: true, // Mark for initial metadata fetch
                        // Include other fields that might be present in play_counts for display
                        call_letters: s.call_letters,
                        frequency: s.frequency,
                        genres: s.genres,
                    }));

                setMyStations(fetchedStations);

                if (fetchedStations.length > 0) {
                    const metadataResponse = await fetchStationMetadata(fetchedStations);
                    setMyStations(prevStations =>
                        prevStations.map(station => ({
                            ...station,
                            metadata: metadataResponse[station.url]?.success ? metadataResponse[station.url].metadata : undefined,
                            isLoadingMetadata: false, // Metadata fetched
                        }))
                    );
                }
            } catch (error) {
                console.error("Failed to load stations:", error);
            } finally {
                setLoading(false);
            }
        };

        loadStationsAndMetadata();
    }, [fetchStationMetadata]); // Dependency array includes memoized fetchStationMetadata

    // Handler for playing a station, used on card click and play button
    const handleStationSelect = (station) => {
        playStation(station);
    };

    // Handler for refreshing metadata for a single station
    const handleRefreshMetadata = useCallback(async (e, stationId) => {
        e.stopPropagation(); // Prevent the parent card's onClick from firing

        setMyStations(prevStations =>
            prevStations.map(s =>
                s.id === stationId ? { ...s, isLoadingMetadata: true } : s
            )
        );

        const stationToRefresh = myStations.find(s => s.id === stationId);
        if (stationToRefresh) {
            const metadataResponse = await fetchStationMetadata([stationToRefresh]); // Fetch only for this station
            setMyStations(prevStations =>
                prevStations.map(s =>
                    s.id === stationId
                        ? {
                            ...s,
                            metadata: metadataResponse[stationToRefresh.url]?.success ? metadataResponse[stationToRefresh.url].metadata : undefined,
                            isLoadingMetadata: false,
                        }
                        : s
                )
            );
        }
    }, [myStations, fetchStationMetadata]); // Dependencies for useCallback

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Activity className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>What's Playing Now</h1>
                    <p className="text-lg max-w-2xl mx-auto" style={{color: 'var(--text-secondary)'}}>
                        Live view of your top stations and what's currently playing on each.
                    </p>
                </motion.div>

                {/* Main Content Area */}
                {loading ? (
                    // Loading State
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-12 h-12 animate-spin" style={{color: 'var(--text-primary)'}} />
                    </div>
                ) : myStations.length === 0 ? (
                    // No Stations Yet State
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center rounded-2xl p-12 border"
                        style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
                    >
                        <Radio className="w-16 h-16 mx-auto mb-6" style={{color: 'var(--text-secondary)'}} />
                        <h3 className="text-2xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>No Stations Yet</h3>
                        <p className="mb-6" style={{color: 'var(--text-secondary)'}}>
                            Play some stations to see your top ones here.
                        </p>
                        <Button onClick={() => navigate(createPageUrl('Home'))}>
                            Browse Community
                        </Button>
                    </motion.div>
                ) : (
                    // Display Stations Grid
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myStations.map((station, index) => (
                            <motion.div
                                key={station.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className="rounded-2xl border p-6 cursor-pointer hover:shadow-lg transition-all duration-300 group"
                                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
                                onClick={() => handleStationSelect(station)}
                            >
                                {/* Station Header (Icon, Name, Call Letters/Frequency, Refresh Button) */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'rgba(var(--text-primary), 0.05)'}}>
                                        {station.icon_url ? (
                                            <img
                                                src={station.icon_url}
                                                alt={station.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Music className="w-8 h-8" style={{color: 'var(--text-secondary)'}} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg truncate group-hover:text-blue-400 transition-colors" style={{color: 'var(--text-primary)'}}>
                                            {station.name}
                                        </h3>
                                        {(station.call_letters || station.frequency) && (
                                            <p className="text-sm truncate" style={{color: 'var(--text-secondary)'}}>
                                                {station.call_letters}{station.call_letters && station.frequency ? ' - ' : ''}{station.frequency}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <button
                                            onClick={(e) => handleRefreshMetadata(e, station.id)}
                                            disabled={station.isLoadingMetadata}
                                            className="p-2 rounded-full transition-colors hover:bg-blue-500/20"
                                            style={{color: 'var(--text-secondary)'}}
                                            title="Refresh track info"
                                        >
                                            {station.isLoadingMetadata ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Genres Section */}
                                {station.genres && station.genres.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {station.genres.slice(0, 3).map((genre) => (
                                            <span
                                                key={genre}
                                                className="px-2 py-1 bg-blue-500/20 text-blue-200 rounded-full text-xs"
                                            >
                                                {genre}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Now Playing Information Section */}
                                <div className="p-4 rounded-xl border min-h-[120px] flex flex-col justify-center" style={{backgroundColor: 'rgba(var(--text-primary), 0.03)', borderColor: 'var(--border-color)'}}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${station.metadata?.streamTitle ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                            <span className="text-xs font-medium" style={{color: 'var(--text-secondary)'}}>
                                                {station.metadata?.streamTitle ? 'Now Playing' : 'Track Info Not Available'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {station.isLoadingMetadata ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="w-5 h-5 animate-spin" style={{color: 'var(--text-secondary)'}} />
                                        </div>
                                    ) : station.metadata?.streamTitle ? (
                                        <div>
                                            <p className="font-semibold line-clamp-2 mb-1" style={{color: 'var(--text-primary)'}} title={station.metadata.streamTitle}>
                                                {station.metadata.streamTitle}
                                            </p>
                                            {station.metadata.icyName && station.metadata.icyName !== station.name && (
                                                <p className="text-xs opacity-75" style={{color: 'var(--text-secondary)'}}>
                                                    {station.metadata.icyName}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center py-4">
                                            <p className="text-sm italic opacity-60" style={{color: 'var(--text-secondary)'}}>
                                                No track information available
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Button */}
                                <div className="mt-4 flex justify-center">
                                    <Button 
                                        className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white px-6"
                                        onClick={() => handleStationSelect(station)}
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        Play Station
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
