
import React from 'react';
import { usePlayer } from './PlayerContext';
import { motion } from 'framer-motion';
import { Play, Pause, Radio, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider'; // Added as per outline, though not used in this MiniPlayer component's logic

export default function MiniPlayer() {
    const {
        station,
        isPlaying,
        togglePlayPause,
        openPlayerView,
        metadata,
        isLoadingMetadata, // NEW: Added isLoadingMetadata from usePlayer context
        isResolvingUrl,     // NEW: Added isResolvingUrl from usePlayer context
    } = usePlayer();

    if (!station) return null;

    const artworkUrl = metadata?.artworkUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(metadata.artworkUrl)
        ? metadata.artworkUrl
        : station.icon_url;

    // NEW: Function to determine and render the current status/sub-information
    const renderStatus = () => {
        if (isResolvingUrl) {
            return "Resolving Google Drive link...";
        }
        if (isLoadingMetadata && !metadata?.streamTitle) {
            return "Loading stream info...";
        }
        if (metadata?.streamTitle) {
            return metadata.streamTitle;
        }
        if (station.call_letters && station.frequency) {
            return `${station.call_letters} - ${station.frequency}`;
        }
        if (station.call_letters) {
            return station.call_letters;
        }
        if (station.genres && station.genres.length > 0 && !station.genres.includes('Podcast')) {
            return station.genres.join(', ');
        }
        return "Internet Radio";
    };

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40"
        >
            <div className="h-16 backdrop-blur-xl border-t p-2 shadow-2xl flex items-center gap-3" style={{
                backgroundColor: 'var(--bg-from-color)',
                borderColor: 'var(--border-color)'
            }}>
                <motion.div
                    onClick={openPlayerView}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 cursor-pointer flex items-center justify-center relative" // Added 'relative' for absolute spinner positioning
                    style={{ backgroundColor: 'var(--button-bg)' }}
                >
                    {artworkUrl ? (
                        <img src={artworkUrl} alt={station.name} className="w-full h-full object-cover"/>
                    ) : (
                        <Radio className="w-6 h-6" style={{ color: 'var(--text-secondary)' }}/>
                    )}
                    {/* NEW: Spinner overlay for loading states */}
                    {(isLoadingMetadata || isResolvingUrl) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                            <Loader2 className="w-5 h-5 animate-spin text-white" />
                        </div>
                    )}
                </motion.div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={openPlayerView}>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {station.name} {/* Changed to always display station name as primary */}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--secondary-color)' }}>
                        {renderStatus()} {/* Changed to use the new renderStatus function */}
                    </p>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                    className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
                    style={{
                        backgroundColor: 'var(--button-bg)',
                        color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-color)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--button-bg)'}
                >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
            </div>
        </motion.div>
    );
}
