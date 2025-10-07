
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, Pause, Clock, Podcast as PodcastIcon, X } from 'lucide-react';
import { Podcast } from '@/api/entities';
import { PodcastEpisode } from '@/api/entities';
import { User } from '@/api/entities'; // Import User for updating data
import { usePlayer } from '../player/PlayerContext';

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

export default function ContinueListeningSection({ onViewAll }) {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enhancedRawEpisodes, setEnhancedRawEpisodes] = useState([]);

  const {
    playStation,
    station,
    isPlaying,
    togglePlayPause,
    currentTime,
    duration,
    podcastProgress,
    recentlyPlayedEpisodes,
    setRecentlyPlayedEpisodes // Add this to access the setter
  } = usePlayer();

  useEffect(() => {
    const loadRawEpisodeData = async () => {
      setLoading(true);
      if (!recentlyPlayedEpisodes || recentlyPlayedEpisodes.length === 0) {
        setEnhancedRawEpisodes([]);
        setLoading(false);
        return;
      }

      try {
        // Filter out audiobooks - only show podcast episodes
        const podcastEpisodesOnly = recentlyPlayedEpisodes.filter(ep => {
          // Check if it's an audiobook by checking if podcast_id exists
          // Audiobooks won't have a podcast_id
          return ep.podcast_id && ep.podcast_id.length > 0;
        });

        const podcastIds = [...new Set(podcastEpisodesOnly.map(ep => ep.podcast_id).filter(Boolean))];
        
        let podcastsMap = {};
        if (podcastIds.length > 0) {
            const podcastsData = await Podcast.filter({ id: { '$in': podcastIds } });
            podcastsData.forEach(p => {
                podcastsMap[p.id] = p;
            });
        }
        
        const newEnhancedRawEpisodes = podcastEpisodesOnly.map(episode => ({
            ...episode,
            podcast_name: podcastsMap[episode.podcast_id]?.name || episode.podcast_name || 'Unknown Podcast',
            podcast_image_url: podcastsMap[episode.podcast_id]?.image_url || episode.podcast_image_url || null,
        }));
        
        setEnhancedRawEpisodes(newEnhancedRawEpisodes);

      } catch (error) {
        console.error("Failed to load raw continue listening data:", error);
        setEnhancedRawEpisodes([]);
      } finally {
        setLoading(false);
      }
    };

    loadRawEpisodeData();
  }, [recentlyPlayedEpisodes]);

  useEffect(() => {
    if (loading || !enhancedRawEpisodes || enhancedRawEpisodes.length === 0) {
      setEpisodes([]);
      return;
    }

    const filteredEpisodes = enhancedRawEpisodes.filter(ep => {
      const progress = podcastProgress[ep.id];
      return progress && progress.saved_position > 0 && !progress.is_completed;
    });

    setEpisodes(filteredEpisodes);

  }, [enhancedRawEpisodes, podcastProgress, loading]);

  const playEpisode = (episode) => {
    const episodeProgress = podcastProgress[episode.id];
    
    const episodeAsStation = {
      name: episode.title, // FIX: The episode title is in `episode.title`, not `episode.name`
      url: episode.audio_url,
      description: episode.description,
      icon_url: episode.podcast_image_url,
      genres: ['Podcast'],
      call_letters: episode.podcast_name,
      id: episode.id,
      saved_position: episodeProgress?.saved_position || 0,
      is_completed: false,
      duration: episode.duration,
      podcast_image_url: episode.podcast_image_url,
      podcast_name: episode.podcast_name,
      podcast_id: episode.podcast_id
    };

    playStation(episodeAsStation);
  };

  const removeEpisode = async (episodeToRemove, event) => {
    // Prevent the click from bubbling up to the parent div
    event.stopPropagation();
    
    try {
      // Remove from local state immediately for optimistic UI
      // Use a functional update to ensure we're working with the latest state
      setEpisodes(currentEpisodes => currentEpisodes.filter(ep => ep.id !== episodeToRemove.id));
      
      // Remove from the recently played episodes list in user context
      const updatedRecentlyPlayed = recentlyPlayedEpisodes.filter(ep => ep.id !== episodeToRemove.id);
      setRecentlyPlayedEpisodes(updatedRecentlyPlayed);
      
      // Update user data in database
      await User.updateMyUserData({ recently_played_episodes: updatedRecentlyPlayed });
      
    } catch (error) {
      console.error('Failed to remove episode from continue listening:', error);
      // Revert optimistic update on error by triggering a re-fetch or re-evaluation
      // For now, let's just log and let the next render cycle fix it if the state didn't update.
    }
  };

  const isCurrentEpisode = (episode) => {
    return station?.id === episode.id;
  };

  if (loading || episodes.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>Continue Listening</h3>
        {onViewAll && episodes.length > 0 && (
          <Button variant="ghost" onClick={onViewAll} style={{color: 'var(--text-primary)'}}>
            View all
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {episodes.slice(0, 5).map((episode, index) => {
          const episodeProgress = podcastProgress[episode.id];
          const isCurrentlyPlaying = isCurrentEpisode(episode);
          
          const currentPosition = isCurrentlyPlaying ? currentTime : (episodeProgress?.saved_position || 0);
          const totalDurationSeconds = isCurrentlyPlaying && duration > 0 
            ? duration 
            : parseDuration(episode.duration);
          
          const progressPercentage = currentPosition && totalDurationSeconds > 0
            ? Math.min((currentPosition / totalDurationSeconds) * 100, 100)
            : 0;

          return (
            <motion.div
              key={episode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }} // Added exit animation
              transition={{ delay: 0.05 * index }}
              onClick={() => isCurrentEpisode(episode) ? togglePlayPause() : playEpisode(episode)}
              className="flex items-center gap-4 p-4 backdrop-blur-xl rounded-xl border hover:bg-white/5 transition-colors group cursor-pointer relative" // Added relative for absolute positioning
              style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
            >
              {/* Remove button now always visible */}
              <button
                onClick={(e) => removeEpisode(episode, e)}
                className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-500/20"
                title="Remove from Continue Listening"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
              
              <div className="relative w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden">
                {episode.podcast_image_url ? (
                  <img src={episode.podcast_image_url} alt={episode.podcast_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.1)'}}>
                    <PodcastIcon className="w-6 h-6" style={{color: 'var(--text-secondary)'}} />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 pr-8"> {/* Added right padding to avoid overlap with remove button */}
                <h4 className="font-semibold truncate mb-1" style={{color: 'var(--text-primary)'}} title={episode.title}>
                  {episode.title}
                </h4>
                <p className="text-sm truncate mb-2" style={{color: 'var(--text-secondary)'}} title={episode.podcast_name}>
                  {episode.podcast_name || 'Unknown Podcast'}
                </p>
                
                {progressPercentage > 0 && (
                  <div className="mb-2">
                    <div className="w-full bg-gray-600/50 rounded-full h-1.5">
                        <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              isCurrentlyPlaying ? 'bg-green-400' : 'bg-[color:var(--primary-color)]'
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs" style={{color: 'var(--text-secondary)'}}>
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatTime(currentPosition)} / {
                      isCurrentlyPlaying && duration > 0 
                        ? formatTime(duration)
                        : (episode.duration || '0:00')
                    }
                  </span>
                  <span>•</span>
                  <span>{Math.round(progressPercentage)}% complete</span>
                  {isCurrentlyPlaying && isPlaying && (
                    <>
                      <span>•</span>
                      <span className="text-green-400 font-semibold">Playing</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
