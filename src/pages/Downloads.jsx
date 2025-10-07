
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download, Play, Pause, Trash2, Loader2, Podcast as PodcastIcon } from 'lucide-react';
import { DownloadedEpisode } from '@/api/entities';
import { usePlayer } from '../components/player/PlayerContext';
import { offlineDb } from '../components/offlineDb'; // Changed path from ../utils/offlineDb to ../components/offlineDb

export default function DownloadsPage() {
    const [downloadedEpisodes, setDownloadedEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    const { station, isPlaying, playEpisode, togglePlayPause } = usePlayer();

    const loadDownloadedEpisodes = useCallback(async () => {
        setLoading(true);
        try {
            const records = await DownloadedEpisode.list('-created_date');
            setDownloadedEpisodes(records);
        } catch (error) {
            console.error("Failed to load downloaded episodes:", error);
            // Here you could add a fallback to load from IndexedDB if offline
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDownloadedEpisodes();
    }, [loadDownloadedEpisodes]);

    const handlePlayOffline = async (episodeRecord) => {
        try {
            const audioBlob = await offlineDb.getEpisode(episodeRecord.episode_id);
            if (!audioBlob) {
                alert("Downloaded file not found. It might have been cleared from your browser's storage. Please re-download.");
                return;
            }
            const blobUrl = URL.createObjectURL(audioBlob);

            // Create a station-like object for the player
            const episodeForPlayer = {
                id: episodeRecord.episode_id,
                name: episodeRecord.title,
                url: blobUrl, // Use the blob URL
                icon_url: episodeRecord.image_url,
                genres: ['Podcast', 'Offline'],
                call_letters: episodeRecord.podcast_name,
                duration: episodeRecord.duration,
            };
            playEpisode(episodeForPlayer);

        } catch (error) {
            console.error("Error playing offline episode:", error);
            alert("Could not play the downloaded file.");
        }
    };

    const handleDelete = async (episodeRecord) => {
        if (!window.confirm(`Are you sure you want to delete "${episodeRecord.title}" from your downloads?`)) {
            return;
        }
        setDeletingId(episodeRecord.id);
        try {
            // Delete from IndexedDB first
            await offlineDb.deleteEpisode(episodeRecord.episode_id);
            // Then delete the record from the main DB
            await DownloadedEpisode.delete(episodeRecord.id);
            // Refresh the list
            setDownloadedEpisodes(prev => prev.filter(ep => ep.id !== episodeRecord.id));
        } catch (error)
        {
            console.error("Failed to delete download:", error);
            alert("Failed to delete the downloaded episode. Please try again.");
        } finally {
            setDeletingId(null);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
        exit: { x: -300, opacity: 0 }
    };
    
    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="p-4 sm:p-6 h-full">
            {downloadedEpisodes.length === 0 ? (
                <div className="text-center flex flex-col items-center justify-center h-full">
                    <Download className="w-12 h-12 mb-4" style={{color: 'var(--text-secondary)'}} />
                    <h3 className="text-xl font-semibold">No Downloaded Episodes</h3>
                    <p style={{color: 'var(--text-secondary)'}}>Find a podcast and tap the download icon to listen offline.</p>
                </div>
            ) : (
                <motion.div 
                    className="space-y-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <AnimatePresence>
                    {downloadedEpisodes.map(episode => {
                        const isCurrentlyPlaying = station?.id === episode.episode_id;
                        return (
                            <motion.div
                                key={episode.id}
                                layout
                                variants={itemVariants}
                                exit="exit"
                                className="flex items-center gap-4 p-3 pr-4 rounded-xl"
                                style={{backgroundColor: isCurrentlyPlaying ? 'rgba(var(--text-primary-rgb), 0.08)' : 'var(--button-bg)', borderColor: 'var(--border-color)', border: '1px solid'}}
                            >
                                <div className="relative w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden">
                                  {episode.image_url ? ( <img src={episode.image_url} alt={episode.podcast_name} className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.1)'}}> <PodcastIcon className="w-8 h-8" style={{color: 'var(--text-secondary)'}} /> </div> )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold truncate" style={{color: 'var(--text-primary)'}} title={episode.title}>
                                        {episode.title}
                                    </h4>
                                    <p className="text-sm truncate" style={{color: 'var(--text-secondary)'}} title={episode.podcast_name}>
                                        {episode.podcast_name}
                                    </p>
                                    <p className="text-xs mt-1" style={{color: 'var(--text-secondary)'}}>
                                        Duration: {episode.duration || 'N/A'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => isCurrentlyPlaying ? togglePlayPause() : handlePlayOffline(episode)} size="icon" variant="ghost">
                                        {isCurrentlyPlaying && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-s" />}
                                    </Button>
                                    <Button onClick={() => handleDelete(episode)} size="icon" variant="ghost" disabled={deletingId === episode.id} className="text-red-500 hover:text-red-400">
                                        {deletingId === episode.id ? <Loader2 className="w-5 h-5 animate-spin"/> : <Trash2 className="w-5 h-5"/>}
                                    </Button>
                                </div>
                            </motion.div>
                        )
                    })}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}
