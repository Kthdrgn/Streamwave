
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, Pause, Clock, Podcast as PodcastIcon, Loader2, X } from 'lucide-react';
import { PodcastEpisode } from '@/api/entities';
import { Podcast } from '@/api/entities';
import { User } from '@/api/entities';
import { usePlayer } from '../components/player/PlayerContext';

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseDuration = (durationStr) => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  let seconds = 0;
  if (parts.length === 3) { // HH:MM:SS
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) { // MM:SS
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) { // SS
    seconds = parts[0];
  }
  return seconds;
};

const EpisodeItem = ({ episode, podcastProgress, playEpisode, isCurrentEpisode, isPlaying, togglePlayPause, currentTime, duration, removeEpisode }) => {
    const isCurrentlyPlaying = isCurrentEpisode(episode);
    const currentPosition = isCurrentlyPlaying ? currentTime : (podcastProgress[episode.id]?.saved_position || 0);
    const totalDurationSeconds = isCurrentlyPlaying && duration > 0 ? duration : parseDuration(episode.duration);
    const progressPercentage = currentPosition && totalDurationSeconds > 0 ? Math.min((currentPosition / totalDurationSeconds) * 100, 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => isCurrentEpisode(episode) ? togglePlayPause() : playEpisode(episode)}
            className="flex items-center gap-4 p-4 backdrop-blur-xl rounded-xl border hover:bg-white/5 transition-colors group cursor-pointer relative"
            style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
        >
            <button
                onClick={(e) => { e.stopPropagation(); removeEpisode(episode, e); }}
                className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-500/20"
                title="Remove from Continue Listening"
            >
                <X className="w-4 h-4 text-red-400" />
            </button>

            <div className="relative w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden">
                {episode.podcast_image_url ? ( <img src={episode.podcast_image_url} alt={episode.podcast_name} className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.1)'}}> <PodcastIcon className="w-6 h-6" style={{color: 'var(--text-secondary)'}} /> </div> )}
            </div>
            
            <div className="flex-1 min-w-0 pr-8">
                <h4 className="font-semibold truncate mb-1" style={{color: 'var(--text-primary)'}} title={episode.title || episode.name}>{episode.title || episode.name}</h4>
                <p className="text-sm truncate mb-2" style={{color: 'var(--text-secondary)'}} title={episode.podcast_name}>{episode.podcast_name || 'Unknown Podcast'}</p>
                
                {progressPercentage > 0 && (
                    <div className="mb-2"> <div className="w-full bg-gray-600/50 rounded-full h-1.5"> <div className={`h-1.5 rounded-full transition-all duration-300 ${ isCurrentlyPlaying ? 'bg-green-400' : 'bg-[color:var(--primary-color)]' }`} style={{ width: `${progressPercentage}%` }} /> </div> </div>
                )}
                
                <div className="flex items-center gap-2 text-xs" style={{color: 'var(--text-secondary)'}}>
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(currentPosition)} / { isCurrentlyPlaying && duration > 0 ? formatTime(duration) : (episode.duration || '0:00') }</span>
                    <span>•</span>
                    <span>{Math.round(progressPercentage)}% complete</span>
                    {isCurrentlyPlaying && isPlaying && ( <> <span>•</span> <span className="text-green-400 font-semibold">Playing</span> </> )}
                </div>
            </div>
            
            {/* The original Play/Pause button is removed as the whole div is clickable now */}
            {/* If a separate play/pause button is still desired for visual indication, it can be re-added here,
                but the design implies a tap on the item plays it. */}
        </motion.div>
    );
};

export default function InProgressEpisodesPage() {
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { playStation, station, isPlaying, togglePlayPause, currentTime, duration, podcastProgress, recentlyPlayedEpisodes, setRecentlyPlayedEpisodes } = usePlayer();

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            if (!recentlyPlayedEpisodes || recentlyPlayedEpisodes.length === 0 || !podcastProgress) {
                setEpisodes([]);
                setLoading(false);
                return;
            }

            try {
                // Get IDs of episodes that have progress and are not complete
                const episodeIds = recentlyPlayedEpisodes
                    .map(ep => ep.id)
                    .filter(id => podcastProgress[id] && !podcastProgress[id].is_completed);

                if (episodeIds.length === 0) {
                    setEpisodes([]);
                    setLoading(false);
                    return;
                }

                // ROBUST FIX: Fetch full episode data from the database
                const fullEpisodesData = await PodcastEpisode.filter({ id: { '$in': episodeIds } });

                // Now that we have fresh, complete data, fetch the parent podcasts
                const podcastIds = [...new Set(fullEpisodesData.map(ep => ep.podcast_id).filter(Boolean))];
                let podcastsMap = {};
                if (podcastIds.length > 0) {
                    const podcastsData = await Podcast.filter({ id: { '$in': podcastIds } });
                    podcastsData.forEach(p => { podcastsMap[p.id] = p; });
                }
                
                // Enhance the complete episode data with parent metadata
                const enhancedEpisodes = fullEpisodesData.map(episode => ({
                    ...episode,
                    podcast_name: podcastsMap[episode.podcast_id]?.name || 'Unknown Podcast',
                    podcast_image_url: podcastsMap[episode.podcast_id]?.image_url,
                }));

                // Sort the final list to match the user's recent history order
                const sortedEpisodes = enhancedEpisodes.sort((a, b) => {
                    return episodeIds.indexOf(a.id) - episodeIds.indexOf(b.id);
                });
                
                setEpisodes(sortedEpisodes);
            } catch (error) {
                console.error("Failed to load in-progress episodes:", error);
                setEpisodes([]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [podcastProgress, recentlyPlayedEpisodes]);

    const playEpisode = (episode) => {
        playStation({
            ...episode,
            name: episode.title || episode.name, // Ensure 'name' is populated for the player
            icon_url: episode.podcast_image_url,
            genres: ['Podcast'],
            call_letters: episode.podcast_name,
            podcast_id: episode.podcast_id
        });
    };
    
    const removeEpisode = async (episodeToRemove, event) => {
        // The event parameter is passed from the EpisodeItem's onClick for the remove button
        // event.stopPropagation() is already called in the EpisodeItem component itself.
        try {
          // Remove from local state for immediate UI update
          setEpisodes(currentEpisodes => currentEpisodes.filter(ep => ep.id !== episodeToRemove.id));
          
          // Remove from player context's recently played list
          const updatedRecentlyPlayed = recentlyPlayedEpisodes.filter(ep => ep.id !== episodeToRemove.id);
          setRecentlyPlayedEpisodes(updatedRecentlyPlayed);
          
          // Persist the change to the user's data in the backend
          await User.updateMyUserData({ recently_played_episodes: updatedRecentlyPlayed });
        } catch (error) {
          console.error('Failed to remove episode from continue listening:', error);
        }
    };

    const isCurrentEpisode = (episode) => station?.id === episode.id;

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="p-4 sm:p-6 h-full">
            {episodes.length === 0 ? (
                <div className="text-center flex flex-col items-center justify-center h-full">
                    <PodcastIcon className="w-12 h-12 mb-4" style={{color: 'var(--text-secondary)'}} />
                    <h3 className="text-xl font-semibold">No In-Progress Episodes</h3>
                    <p style={{color: 'var(--text-secondary)'}}>Start listening to a podcast to see it here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {episodes.map(episode => (
                        <EpisodeItem
                            key={episode.id}
                            episode={episode}
                            podcastProgress={podcastProgress}
                            playEpisode={playEpisode}
                            isCurrentEpisode={isCurrentEpisode}
                            isPlaying={isPlaying}
                            togglePlayPause={togglePlayPause}
                            currentTime={currentTime}
                            duration={duration}
                            removeEpisode={removeEpisode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
