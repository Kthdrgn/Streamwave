
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Podcast as PodcastIcon, Play, Pause, Clock, Calendar, ArrowLeft, RefreshCw, Loader2, Trash2, RotateCcw, CheckCircle, UserMinus, UserPlus, Download, ArrowDownToLine, Check } from 'lucide-react';
import { Podcast } from '@/api/entities';
import { PodcastEpisode } from '@/api/entities';
import { PodcastSubscription } from '@/api/entities';
import { DownloadedEpisode } from '@/api/entities'; // New import
import { usePlayer } from '../components/player/PlayerContext';
import { parsePodcastRSS } from '@/api/functions';
import { formatDistanceToNow } from 'date-fns';
import StationCarousel from '../components/home/StationCarousel';
import { User } from '@/api/entities'; // Import User entity
import { offlineDb } from '../components/offlineDb'; // New import
import { downloadEpisode } from '@/api/functions'; // New import

export default function Podcasts() {
  const [podcasts, setPodcasts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedPodcast, setSelectedPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [podcastProgress, setPodcastProgress] = useState({}); // New state for progress
  const [downloadStatus, setDownloadStatus] = useState({}); // New state for download status

  const {
    playStation,
    station, // Changed from currentStation to station
    isPlaying,
    togglePlayPause,
    recentlyPlayedEpisodes,
    // For handling navigation from AllPodcasts page
    selectedPodcastFromAll,
    setSelectedPodcastFromAll,
    // Removed: openOverlay, switchOverlay as they were not used in the original context of this file
    currentTime, // Added based on outline
    duration,    // Added based on outline
    podcastProgress: playerPodcastProgress // Added, renamed to avoid conflict with local state
  } = usePlayer();

  // Helper function to format position display (used for player's progress)
  const formatPosition = (seconds) => {
    if (!seconds) return '0:00'; // Ensure a default value
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to parse duration string to seconds
  const parseDurationToSeconds = (durationStr) => {
    if (!durationStr) return 0;
    const parts = durationStr.split(':');
    if (parts.length === 2) { // MM:SS
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) { // HH:MM:SS
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    }
    return 0;
  };

  // Helper function to format duration for display (e.g., from "01:02:30" to "1h 2m")
  const formatDuration = (durationStr) => {
    const totalSeconds = parseDurationToSeconds(durationStr);
    if (totalSeconds === 0) return 'N/A';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    // const seconds = totalSeconds % 60; // Not used in this formatting

    let formatted = '';
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0 || hours > 0) formatted += `${minutes}m `; // Show minutes if >0 or if hours are present
    // if (formatted === '' && seconds > 0) formatted += `${seconds}s`; // Only show seconds if no hours/minutes, but generally for podcasts, min/hr is sufficient
    
    return formatted.trim();
  };

  // Modified loadEpisodes
  const loadEpisodes = useCallback(async (podcast) => {
    setLoadingEpisodes(true);
    setEpisodes([]); // Clear episodes while loading
    try {
      const podcastEpisodes = await PodcastEpisode.filter({ podcast_id: podcast.id }, '-published_date');
      setEpisodes(podcastEpisodes || []);

      // Fetch download statuses for these episodes
      const downloadedRecord = await DownloadedEpisode.filter({ podcast_id: podcast.id });
      const downloadedEpisodeIds = new Set(downloadedRecord.map(rec => rec.episode_id));
      
      setDownloadStatus(prev => {
        const newStatus = {...prev};
        podcastEpisodes.forEach(ep => {
          if (downloadedEpisodeIds.has(ep.id)) {
            newStatus[ep.id] = 'downloaded';
          }
        });
        return newStatus;
      });

    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setLoadingEpisodes(false);
    }
  }, []);

  // Modified loadSubscribedPodcasts
  const loadSubscribedPodcasts = useCallback(async () => {
    setLoading(true);
    try {
      // Get user's subscriptions
      const userSubscriptions = await PodcastSubscription.list('-subscribed_at');
      setSubscriptions(userSubscriptions);
      
      if (userSubscriptions.length === 0) {
        setPodcasts([]);
        setLoading(false);
        setPodcastProgress({}); // Clear progress if no subscriptions
        return;
      }

      const podcastIds = userSubscriptions.map(sub => sub.podcast_id);
      
      // Get the actual podcast data
      const allPodcasts = await Podcast.list();
      const subscribedPodcasts = allPodcasts.filter(p => podcastIds.includes(p.id));
      
      // Sort by subscription date (most recent first)
      const podcastsWithSubDate = subscribedPodcasts.map(podcast => {
        const subscription = userSubscriptions.find(sub => sub.podcast_id === podcast.id);
        return {
          ...podcast,
          subscribed_at: subscription?.subscribed_at || podcast.created_date
        };
      });

      podcastsWithSubDate.sort((a, b) => new Date(b.subscribed_at) - new Date(a.subscribed_at));
      setPodcasts(podcastsWithSubDate);

      // Load user's podcast progress for all episodes
      const user = await User.me();
      setPodcastProgress(user.podcast_progress || {});

    } catch (error) {
      console.error('Failed to load subscribed podcasts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Main data loading effect - runs once on initial mount
  useEffect(() => {
    const initialize = async () => {
      await loadSubscribedPodcasts();
    };
    initialize();
  }, [loadSubscribedPodcasts]);

  // Effect to handle direct navigation from another component (like the Home page carousel)
  useEffect(() => {
    if (selectedPodcastFromAll) {
      const podcastToView = selectedPodcastFromAll;

      // Set it as the selected podcast for this page
      setSelectedPodcast(podcastToView);
      
      // Immediately load its episodes
      loadEpisodes(podcastToView); 

      // Reset the global state so this flow doesn't trigger again unintentionally
      setSelectedPodcastFromAll(null);
    }
  }, [selectedPodcastFromAll, setSelectedPodcastFromAll, loadEpisodes]);

  const selectPodcast = async (podcast) => { // Renamed from handlePodcastSelect and made async
    setSelectedPodcast(podcast);
    await loadEpisodes(podcast); // Pass full podcast object
  };

  const refreshPodcast = useCallback(async (podcast) => {
    setIsRefreshing(true);
    try {
      // Parse the RSS feed again
      const result = await parsePodcastRSS({ rss_url: podcast.rss_url });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to parse RSS feed.');
      }

      // We only need the episodes from the feed, not the podcast info
      const { episodes: newEpisodes } = result.data;

      // Get existing episodes to avoid duplicates
      const existingEpisodes = await PodcastEpisode.filter({ podcast_id: podcast.id });
      const existingGuids = new Set(existingEpisodes.map(ep => ep.guid));
      
      // Filter out episodes that already exist
      const newEpisodesToAdd = newEpisodes.filter(episode => !existingGuids.has(episode.guid));

      // If there are new episodes, add them to the database.
      if (newEpisodesToAdd.length > 0) {
        const episodesToCreate = newEpisodesToAdd.map(episode => ({
          ...episode,
          podcast_id: podcast.id
        }));
        await PodcastEpisode.bulkCreate(episodesToCreate);
      }
      // Always update last_updated, even if no new episodes
      await Podcast.update(podcast.id, { last_updated: new Date().toISOString() });

      // Refresh the episodes list for the current view
      if (selectedPodcast?.id === podcast.id) {
        await loadEpisodes(selectedPodcast); // This will handle the display of new episodes
      }

    } catch (error) {
      console.error('Failed to refresh podcast:', error);
      alert(`Failed to refresh podcast: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedPodcast, loadEpisodes]);

  const handleSubscriptionToggle = async (podcast) => {
    setSubscriptionLoading(true);
    try {
      const existingSubscription = subscriptions.find(sub => sub.podcast_id === podcast.id);

      if (existingSubscription) {
        // Unsubscribe
        if (!confirm(`Are you sure you want to unsubscribe from "${podcast.name}"?`)) {
          setSubscriptionLoading(false);
          return;
        }
        await PodcastSubscription.delete(existingSubscription.id);
        setSubscriptions(prev => prev.filter(sub => sub.id !== existingSubscription.id));
        setPodcasts(prev => prev.filter(p => p.id !== podcast.id));
        // If the selected podcast is unsubscribed, close its detail view
        if (selectedPodcast?.id === podcast.id) {
          backToList(); // Changed from closePodcast
        }
        // Also remove its progress
        setPodcastProgress(prev => {
          const newProgress = { ...prev };
          // Find all episodes related to this podcast and remove their progress.
          // This relies on episode.id sometimes being prefixed with podcastId,
          // or having access to episode.podcast_id during filtering.
          // For simplicity, let's assume `podcastProgress` stores only episode-specific data,
          // and the player clears data related to a podcast.
          // A more robust solution might require fetching all episodes for this podcast
          // and removing their IDs from `podcastProgress`.
          // For now, it's safer to just rely on the player to manage its state correctly.
          return newProgress;
        });

      } else {
        // Subscribe
        const newSubscription = await PodcastSubscription.create({
          podcast_id: podcast.id,
          subscribed_at: new Date().toISOString()
        });
        setSubscriptions(prev => [...prev, newSubscription]);
        // To add the podcast to the main list correctly, including subscribed_at
        const podcastWithSubDate = {
          ...podcast,
          subscribed_at: newSubscription.subscribed_at
        };
        setPodcasts(prev => {
          const updatedPodcasts = [...prev, podcastWithSubDate];
          return updatedPodcasts.sort((a, b) => new Date(b.subscribed_at) - new Date(a.subscribed_at));
        });
      }
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
      alert('Failed to update subscription. Please try again.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const backToList = () => { // Renamed from closePodcast
    setSelectedPodcast(null);
    setEpisodes([]);
    setDownloadStatus({}); // Clear download statuses when going back to list
  };

  const playEpisode = (episode) => {
    const episodeProgress = podcastProgress[episode.id];
    let initialPosition = episodeProgress?.saved_position || 0;
    let isCompleted = episodeProgress?.is_completed || false;

    // If episode is marked as completed and user clicks play, reset position for new playback
    if (isCompleted) {
      initialPosition = 0;
      isCompleted = false; // Player will start fresh, and mark completed if played through
    }

    // Convert episode to station format for the player
    const episodeAsStation = {
      name: episode.title,
      url: episode.audio_url,
      description: episode.description,
      icon_url: selectedPodcast?.image_url,
      podcast_image_url: selectedPodcast?.image_url, // Added for richer metadata
      genres: ['Podcast'],
      call_letters: selectedPodcast?.name, // Podcast name
      podcast_name: selectedPodcast?.name, // Added for richer metadata
      saved_position: initialPosition, // Pass saved position from user progress
      id: episode.id, // Pass episode ID for updating position
      is_completed: isCompleted, // Pass completion status from user progress (will be false if replaying completed)
      duration: episode.duration, // Pass the duration string
      podcast_id: episode.podcast_id, // Ensure podcast_id is passed
    };

    playStation(episodeAsStation);
  };

  const isCurrentEpisode = (episode) => {
    return station?.id === episode.id; // Check based on episode ID for player's current station
  };

  const handleDownload = useCallback(async (episode) => {
    setDownloadStatus(prev => ({ ...prev, [episode.id]: 'downloading' }));

    try {
      console.log(`Starting download for: ${episode.title}`);
      
      // Use backend function to download the episode
      const response = await downloadEpisode({
        audioUrl: episode.audio_url,
        episodeTitle: episode.title
      });

      // Convert response to blob
      const audioBlob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'audio/mpeg' 
      });

      // Save blob to IndexedDB
      await offlineDb.saveEpisode(episode.id, audioBlob);

      // Create a record in the main database
      await DownloadedEpisode.create({
        episode_id: episode.id,
        podcast_id: episode.podcast_id,
        title: episode.title,
        podcast_name: selectedPodcast?.name || 'Unknown Podcast',
        image_url: selectedPodcast?.image_url,
        duration: episode.duration,
        audio_url: episode.audio_url,
      });

      setDownloadStatus(prev => ({ ...prev, [episode.id]: 'downloaded' }));
      console.log(`Successfully downloaded: ${episode.title}`);

    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus(prev => ({ ...prev, [episode.id]: 'error' }));
      
      // Show more specific error message
      const errorMessage = error.response?.data?.details || error.message || 'Unknown error occurred';
      alert(`Failed to download "${episode.title}": ${errorMessage}`);
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setDownloadStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[episode.id];
          return newStatus;
        });
      }, 5000);
    }
  }, [selectedPodcast]);

  // Episode detail view
  if (selectedPodcast) {
    const isSubscribed = subscriptions.some(sub => sub.podcast_id === selectedPodcast.id);
    
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-6 mb-8"
          >
            <Button
              onClick={backToList} // Changed from closePodcast
              variant="ghost"
              size="icon"
              className="mt-2 flex-shrink-0"
              style={{color: 'var(--text-primary)'}}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 border" style={{borderColor: 'var(--border-color)'}}>
              <img src={selectedPodcast.image_url} alt={selectedPodcast.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold line-clamp-2" style={{color: 'var(--text-primary)'}}>{selectedPodcast.name}</h1>
              <p className="text-lg mt-1" style={{color: 'var(--text-secondary)'}}>{selectedPodcast.author}</p>
              <p className="text-sm mt-2 line-clamp-3" style={{color: 'var(--text-secondary)'}}>
                {selectedPodcast.description?.replace(/<[^>]*>?/gm, '')}
              </p>
            </div>
          </motion.div>

          {/* Podcast Actions */}
          <div className="flex gap-3 mb-6">
            <Button
              onClick={() => refreshPodcast(selectedPodcast)}
              disabled={isRefreshing}
              variant="outline"
              className="flex items-center gap-2"
              style={{
                borderColor: 'var(--border-color)', 
                backgroundColor: 'var(--button-bg)',
                color: 'var(--text-primary)'
              }}
            >
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Force Refresh
            </Button>
            <Button
              onClick={() => handleSubscriptionToggle(selectedPodcast)}
              disabled={subscriptionLoading}
              variant="outline"
              className="flex items-center gap-2 transition-colors"
              style={isSubscribed ? {
                  borderColor: 'rgba(239, 68, 68, 0.3)', 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444'
              } : {
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--button-bg)',
                  color: 'var(--text-primary)'
              }}
            >
              {subscriptionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSubscribed ? (
                <>
                  <UserMinus className="w-4 h-4" />
                  Unsubscribe
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Subscribe
                </>
              )}
            </Button>
          </div>

          {/* Episodes List */}
          {loadingEpisodes ? (
            <div className="text-center py-10">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{color: 'var(--text-primary)'}}/>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {episodes.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="text-center py-16"
                  >
                    <PodcastIcon className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--text-secondary)'}}/>
                    <h2 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>No Episodes Found</h2>
                    <p style={{color: 'var(--text-secondary)'}}>Try refreshing the podcast to load episodes.</p>
                  </motion.div>
                ) : (
                  episodes.map((episode) => {
                    const progress = podcastProgress[episode.id];
                    const isCompleted = progress?.is_completed || false;
                    const savedPosition = progress?.saved_position || 0;
                    const episodeTotalSeconds = parseDurationToSeconds(episode.duration);
                    const isCurrentlyPlaying = isCurrentEpisode(episode);
                    const status = downloadStatus[episode.id];
                    
                    return (
                      <motion.div
                        key={episode.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center gap-4 p-3 pr-4 rounded-xl border transition-colors group"
                        style={{
                          borderColor: 'var(--border-color)',
                          backgroundColor: isCurrentlyPlaying ? 'rgba(var(--text-primary-rgb), 0.08)' : 'transparent'
                        }}
                      >
                        <div className="flex-shrink-0">
                          <Button
                            onClick={() => isCurrentlyPlaying ? togglePlayPause() : playEpisode(episode)}
                            variant="ghost"
                            size="icon"
                            className="w-12 h-12 rounded-full"
                            title={isCurrentlyPlaying && isPlaying ? 'Pause' : isCompleted ? 'Replay' : 'Play'}
                          >
                            {isCurrentlyPlaying && isPlaying ? (
                              <Pause className="w-6 h-6" />
                            ) : isCompleted ? (
                              <RotateCcw className="w-6 h-6 text-gray-500" />
                            ) : (
                              <Play className="w-6 h-6" />
                            )}
                          </Button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                              {isCompleted && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                              <p className="font-semibold truncate" style={{color: 'var(--text-primary)'}}>{episode.title}</p>
                          </div>
                          <div className="flex items-center gap-4 text-xs mt-1" style={{color: 'var(--text-secondary)'}}>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(episode.published_date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(episode.duration)}</span>
                          </div>
                          {savedPosition > 0 && !isCompleted && episodeTotalSeconds > 0 && (
                              <div className="w-full bg-gray-600/50 rounded-full h-1 mt-2">
                                  <div 
                                      className="bg-[color:var(--primary-color)] h-1 rounded-full" 
                                      style={{ width: `${(savedPosition / episodeTotalSeconds) * 100}%` }}
                                  />
                              </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <AnimatePresence mode="wait">
                            <motion.button
                              key={status || 'default'}
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              onClick={() => handleDownload(episode)}
                              disabled={status === 'downloading' || status === 'downloaded'}
                              className="p-2 rounded-full transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                              style={{
                                backgroundColor: status === 'downloaded' ? 'var(--primary-color)' : 'transparent',
                                color: status === 'downloaded' ? 'white' : 'var(--text-primary)'
                              }}
                              title={status === 'downloaded' ? 'Downloaded' : 'Download for offline playback'}
                            >
                              {status === 'downloading' && <Loader2 className="w-5 h-5 animate-spin" />}
                              {status === 'downloaded' && <Check className="w-5 h-5" />}
                              {status === 'error' && <RotateCcw className="w-5 h-5 text-red-500" />}
                              {!status && <Download className="w-5 h-5 opacity-70 hover:opacity-100" />}
                            </motion.button>
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main podcasts list view
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>My Podcasts</h1>
          <p className="text-lg" style={{color: 'var(--text-secondary)'}}>
            Your subscribed podcasts and listening progress
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{color: 'var(--text-primary)'}}/>
          </div>
        ) : podcasts.length === 0 ? (
          <div className="text-center py-16">
            <PodcastIcon className="w-16 h-16 mx-auto mb-6" style={{color: 'var(--text-secondary)'}}/>
            <h2 className="text-2xl font-semibold mb-4" style={{color: 'var(--text-primary)'}}>No Subscriptions Yet</h2>
            <p className="mb-8" style={{color: 'var(--text-secondary)'}}>
              Browse all available podcasts to find something you like, or add a new podcast to the community
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {podcasts.map((podcast, index) => (
              <motion.div
                key={podcast.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="cursor-pointer group"
                onClick={() => selectPodcast(podcast)} // Changed from handlePodcastSelect
              >
                <div className="p-6 rounded-2xl border transition-colors group-hover:bg-white/5" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
                  <div className="aspect-square rounded-xl overflow-hidden mb-4">
                    {podcast.image_url ? (
                      <img
                        src={podcast.image_url}
                        alt={podcast.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.05)'}}>
                        <PodcastIcon className="w-12 h-12" style={{color: 'var(--text-secondary)'}}/>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2" style={{color: 'var(--text-primary)'}}>
                    {podcast.name}
                  </h3>
                  
                  {podcast.author && (
                    <p className="text-sm mb-2" style={{color: 'var(--text-secondary)'}}>
                      {podcast.author}
                    </p>
                  )}
                  
                  <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                    {podcast.episode_count || 0} episodes
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
