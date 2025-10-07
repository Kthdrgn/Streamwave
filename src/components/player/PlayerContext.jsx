
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { RadioStation } from '@/api/entities';
import { User } from '@/api/entities'; // Import the User entity
import { PodcastEpisode } from '@/api/entities'; // Add this import
import { Audiobook } from '@/api/entities'; // NEW: Import Audiobook entity
import { fetchStationMetadata } from '../utils/metadataFetcher'; // Import the new metadata fetcher
import { Podcast } from '@/api/entities';
import { PodcastSubscription } from '@/api/entities';
import { parsePodcastRSS } from '@/api/functions';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

// NEW: Helper function to parse duration strings
const parseDuration = (durationStr) => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    seconds = parts[0];
  }
  return seconds;
};

// Define maximum history size
const HISTORY_MAX_SIZE = 50;

export const PlayerProvider = ({ children }) => {
  const [station, setStation] = useState(() => {
    try {
      const savedStation = localStorage.getItem('nowPlayingStation');
      return savedStation ? JSON.parse(savedStation) : null;
    } catch (error) {
      console.error("Failed to load station from localStorage", error);
      return null;
    }
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [volume, setVolumeState] = useState(50);
  const [isMuted, setIsMutedState] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [recentlyPlayedEpisodes, setRecentlyPlayedEpisodes] = useState([]); // New state for episodes
  const [podcastProgress, setPodcastProgress] = useState({}); // New state for progress
  const [isProgressLoading, setIsProgressLoading] = useState(true); // New loading state

  // New separate navigation history system
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [historyPosition, setHistoryPosition] = useState(-1);

  // New state for the data warning feature
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [pendingStation, setPendingStation] = useState(null);

  // New state for GDrive resolving
  const [isResolvingUrl, setIsResolvingUrl] = useState(false); 

  // New state for metadata
  const [metadata, setMetadata] = useState(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // New state for full-screen player visibility
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  
  // New state for community overlay
  const [isCommunityOverlayOpen, setIsCommunityOverlayOpen] = useState(false);

  // === State moved from components to context for global access ===
  const [activeOverlay, setActiveOverlay] = useState(null); // For page overlays
  
  // New state for selected playlist
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);

  // New state for communicating between AllPodcasts and Podcasts pages
  const [selectedPodcastFromAll, setSelectedPodcastFromAll] = useState(null);

  // New state for podcast progress, now managed centrally
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressUpdateIntervalRef = useRef(null);

  // === NEW: Sleep Timer State ===
  const [sleepTimerId, setSleepTimerId] = useState(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(0);
  const [isSleepTimerActive, setIsSleepTimerActive] = useState(false);
  const sleepTimerIdRef = useRef(null); // The ref to solve the effect issue

  const audioRef = useRef(null);
  const eventHandlersRef = useRef(null);
  const lastMetadataFetch = useRef(0);
  const metadataCache = useRef(new Map());
  const lastRecordedTrackRef = useRef(null); // Ref to prevent duplicate history entries
  const positionSaveIntervalRef = useRef(null); // New ref for position saving

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerIdRef.current) {
        clearInterval(sleepTimerIdRef.current);
        sleepTimerIdRef.current = null;
    }
    setSleepTimerId(null);
    setSleepTimerRemaining(0);
    setIsSleepTimerActive(false);
    console.log('Sleep timer cancelled.');
  }, []);

  const setSleepTimer = useCallback((minutes) => {
    cancelSleepTimer(); // Clear any existing timer first

    if (minutes > 0) {
        console.log(`Setting sleep timer for ${minutes} minutes.`);
        setIsSleepTimerActive(true);
        setSleepTimerRemaining(minutes * 60);

        const newTimerId = setInterval(() => {
            setSleepTimerRemaining(prev => {
                if (prev <= 1) {
                    // Timer finished, initiate fade-out and pause
                    if (audioRef.current && !audioRef.current.paused) {
                        const fadeDuration = 3000; // 3 seconds
                        const fadeSteps = 20;
                        const stepInterval = fadeDuration / fadeSteps;
                        const initialVolume = audioRef.current.volume;

                        let currentStep = 0;
                        const fadeInterval = setInterval(() => {
                            currentStep++;
                            const newVolume = initialVolume * (1 - (currentStep / fadeSteps));
                            if (audioRef.current) {
                                audioRef.current.volume = Math.max(0, newVolume);
                            }

                            if (currentStep >= fadeSteps) {
                                clearInterval(fadeInterval);
                                if (audioRef.current) {
                                    audioRef.current.pause();
                                    // Restore volume for next playback, but only if the audio element still exists
                                    setTimeout(() => {
                                        if (audioRef.current) {
                                            audioRef.current.volume = initialVolume;
                                        }
                                    }, 100);
                                }
                            }
                        }, stepInterval);
                    }
                    
                    // Cleanup main timer
                    clearInterval(newTimerId);
                    setIsSleepTimerActive(false);
                    setSleepTimerRemaining(0);
                    setSleepTimerId(null);
                    sleepTimerIdRef.current = null;
                    return 0; // Ensure remaining time doesn't go negative
                }
                return prev - 1;
            });
        }, 1000);

        setSleepTimerId(newTimerId);
        sleepTimerIdRef.current = newTimerId;
    }
  }, [cancelSleepTimer]);

  // Function to completely destroy current audio element
  const destroyCurrentAudio = useCallback(() => {
    if (audioRef.current && eventHandlersRef.current) {
      console.log('🔥 Destroying current audio element');
      const audio = audioRef.current;
      const handlers = eventHandlersRef.current;

      // Remove event listeners properly
      audio.removeEventListener('play', handlers.onPlay);
      audio.removeEventListener('pause', handlers.onPause);
      audio.removeEventListener('error', handlers.onError);
      audio.removeEventListener('loadstart', handlers.onLoadStart);
      audio.removeEventListener('canplay', handlers.onCanPlay);
      audio.removeEventListener('loadedmetadata', handlers.onloadedmetadata);
      audio.removeEventListener('volumechange', handlers.onVolumeChange);
      audio.removeEventListener('timeupdate', handlers.onTimeUpdate);
      audio.removeEventListener('durationchange', handlers.onDurationChange);
      audio.removeEventListener('ended', handlers.onEnded);


      // Stop and clean up
      audio.pause();
      audio.src = '';
      audio.load();

      audioRef.current = null;
      eventHandlersRef.current = null;
    }
  }, []);

  // Function to create a completely new audio element
  const createNewAudio = useCallback(() => {
    console.log('🎵 Creating new audio element');
    const newAudio = new Audio();
    newAudio.crossOrigin = "anonymous";
    newAudio.preload = "auto";
    newAudio.volume = volume / 100;
    newAudio.muted = isMuted;

    return newAudio;
  }, [volume, isMuted]);

  // Function to fetch metadata from backend with throttling and caching
  const fetchMetadata = useCallback(async (streamUrl, forceRefresh = false) => {
    if (!streamUrl || isLoadingMetadata) return;

    const now = Date.now();
    const minInterval = 30000; // 30 seconds minimum between requests

    // Check if we should throttle this request
    if (!forceRefresh && (now - lastMetadataFetch.current) < minInterval) {
      console.log('Metadata fetch throttled');
      return;
    }

    // Check cache first (valid for 60 seconds)
    const cachedData = metadataCache.current.get(streamUrl);
    if (!forceRefresh && cachedData && (now - cachedData.timestamp) < 60000) {
      console.log('Using cached metadata');
      setMetadata(cachedData.data);
      return;
    }

    setIsLoadingMetadata(true);
    lastMetadataFetch.current = now;

    try {
      // Use new metadata fetcher
      const response = await fetchStationMetadata(streamUrl);

      if (response?.success) {
        console.log('🎵 Stream data fetched:', response);
        const metadataData = {
          ...response.metadata,
          streamInfo: response.streamInfo
        };
        setMetadata(metadataData);

        // Cache the result
        metadataCache.current.set(streamUrl, {
          data: metadataData,
          timestamp: now
        });
      } else {
        console.warn('Failed to fetch stream data:', response?.error || 'Unknown error');
        setMetadata(null);
      }
    } catch (error) {
      console.warn('Error fetching stream data:', error);
      if (error.message?.includes('Rate limit')) {
        console.warn('Rate limit hit, will retry later');
      } else {
        setMetadata(null);
      }
    } finally {
      setIsLoadingMetadata(false);
    }
  }, [isLoadingMetadata]);

  // Media Session API integration - now with metadata support
  const updateMediaSession = useCallback((stationData, isCurrentlyPlaying, currentMetadata = null) => {
    if ('mediaSession' in navigator) {
      // Create artwork array - use metadata artwork first, then station icon
      const artwork = [];
      const metadataArtworkUrl = currentMetadata?.artworkUrl;
      const artworkIsValid = metadataArtworkUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(metadataArtworkUrl); // Basic validation

      if (artworkIsValid) {
        artwork.push({ src: metadataArtworkUrl }); // Just src for dynamic metadata artwork
      } else if (stationData.icon_url) {
        artwork.push({ src: stationData.icon_url, sizes: '512x512', type: 'image/png' });
      }

      // Use metadata if available, otherwise fall back to station info
      let title = stationData.name;
      let artist = 'Internet Radio';

      if (currentMetadata?.streamTitle) {
        // Parse "Artist - Title" format common in radio streams
        const parts = currentMetadata.streamTitle.split(' - ');
        if (parts.length >= 2) {
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        } else {
          title = currentMetadata.streamTitle;
          artist = stationData.name;
        }
      } else {
        // Fall back to station information
        if (stationData.call_letters && stationData.frequency) {
          artist = `${stationData.call_letters} - ${stationData.frequency}`;
        } else if (stationData.call_letters) {
          artist = stationData.call_letters;
        } else if (stationData.frequency) {
          artist = stationData.frequency; // Fix: Use stationData.frequency instead of capturing outer 'station' state
        } else if (stationData.genres && stationData.genres.length > 0) {
          artist = stationData.genres.join(', ');
        }
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        album: currentMetadata?.icyName || stationData.name || 'StreamWave',
        artwork: artwork
      });

      // Set playback state
      navigator.mediaSession.playbackState = isCurrentlyPlaying ? 'playing' : 'paused';

      // Set up action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current && audioRef.current.paused) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error("Media Session play failed:", error);
            });
          }
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      });

      // Disable unsupported actions for live streams
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    }
  }, []);

  // New function to save podcast position
  const savePodcastPosition = useCallback(async (episode, position, duration) => {
    if (!episode || !episode.id) return;
    
    try {
        // Fetch the LATEST user data directly to avoid stale state issues.
        const user = await User.me();
        const currentProgress = user.podcast_progress || {};

        const isCompleted = duration > 0 && position >= duration * 0.95;

        // Construct the new, merged progress object
        const newTotalProgress = {
            ...currentProgress,
            [episode.id]: {
                saved_position: Math.floor(position),
                is_completed: isCompleted,
                updated_at: new Date().toISOString()
            }
        };

        // Update the database with the complete progress object
        await User.updateMyUserData({ podcast_progress: newTotalProgress });

        // Update local state for immediate UI feedback
        setPodcastProgress(newTotalProgress);

        // Update local station state if completion status changed for the *active* station
        if (station && station.id === episode.id && isCompleted && !station.is_completed) {
            setStation(prev => ({ ...prev, is_completed: true }));
        }

        console.log(`Saved position for ${episode.title || episode.name} to ${Math.floor(position)}s. Completed: ${isCompleted}`);

    } catch (error) {
        console.error('Failed to save podcast position:', error);
    }
  }, [station]); // Keep station dependency for live player state updates

  // New function to restore podcast position
  const restorePodcastPosition = useCallback(async (episode) => {
    if (!episode || !episode.id) return 0;
    
    try {
        const user = await User.me();
        const progress = user.podcast_progress?.[episode.id];
        
        // If the episode is marked as completed in user's progress, always start from the beginning.
        if (progress?.is_completed) {
            console.log('Restoring completed episode, starting from 0.');
            return 0;
        }

        if (progress && progress.saved_position > 0) {
            // Only restore if the saved position is meaningful (more than 2 seconds)
            if (progress.saved_position > 2) {
              console.log(`Restoring position for ${episode.title || episode.name} to ${progress.saved_position}s`);
              return progress.saved_position;
            }
        }
    } catch (error) {
        console.error('Failed to restore podcast position:', error);
    }
    return 0;
  }, []);

  // Function to seek within a podcast
  const seek = useCallback((time) => {
    if (audioRef.current && station?.genres?.includes('Podcast')) {
        const newTime = Math.max(0, Math.min(time, audioRef.current.duration || 0));
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime); // Immediately update state for responsiveness
    }
  }, [station]);

  useEffect(() => {
    if (station) {
      localStorage.setItem('nowPlayingStation', JSON.stringify(station));
    } else {
      localStorage.removeItem('nowPlayingStation');
    }
  }, [station]);

  const refreshAllSubscribedPodcasts = async () => {
    console.log('🤫 Performing quiet background refresh of all subscribed podcasts...');
    try {
        const subscriptions = await PodcastSubscription.list();
        if (subscriptions.length === 0) {
            console.log('No subscriptions found, skipping refresh.');
            return;
        }

        const subscribedPodcastIds = subscriptions.map(sub => sub.podcast_id);
        const allPodcasts = await Podcast.list();
        const subscribedPodcasts = allPodcasts.filter(p => subscribedPodcastIds.includes(p.id));

        for (const podcast of subscribedPodcasts) {
            try {
                const result = await parsePodcastRSS({ rss_url: podcast.rss_url });
                if (!result.data.success) {
                    console.warn(`Background Refresh: Failed to parse ${podcast.name}:`, result.data.error);
                    continue;
                }

                const { episodes: newEpisodes } = result.data;
                const existingEpisodes = await PodcastEpisode.filter({ podcast_id: podcast.id });
                const existingGuids = new Set(existingEpisodes.map(ep => ep.guid));

                const newEpisodesToAdd = newEpisodes.filter(episode => !existingGuids.has(episode.guid));

                if (newEpisodesToAdd.length > 0) {
                    console.log(`Found ${newEpisodesToAdd.length} new episodes for ${podcast.name}. Adding to database.`);
                    const episodesToCreate = newEpisodesToAdd.map(episode => ({
                        ...episode,
                        podcast_id: podcast.id
                    }));
                    await PodcastEpisode.bulkCreate(episodesToCreate);
                }

            } catch (error) {
                console.warn(`Background Refresh: Error processing ${podcast.name}:`, error);
            }
        }
        console.log('✅ Quiet background refresh complete.');
    } catch (error) {
        console.error('Error during quiet background podcast refresh:', error);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsProgressLoading(true); // Start loading
      try {
        const user = await User.me();
        if (user) {
          if (user.recently_played_stations && Array.isArray(user.recently_played_stations)) {
            setRecentlyPlayed(user.recently_played_stations);
          }
          setPodcastProgress(user.podcast_progress || {}); // Load podcast progress
          
          if (user.recently_played_episodes && Array.isArray(user.recently_played_episodes)) {
            // Filter out completed episodes from the initial load for "Continue Listening"
            const nonCompletedEpisodes = user.recently_played_episodes.filter(ep => {
              // Use the loaded podcastProgress for filtering
              const progress = user.podcast_progress?.[ep.id];
              return !progress || !progress.is_completed;
            });
            setRecentlyPlayedEpisodes(nonCompletedEpisodes);
          }
          // Run the silent refresh in the background. Do not await.
          refreshAllSubscribedPodcasts();
        }
      } catch (e) {
        console.warn("Failed to load user data (user might not be logged in):", e);
      } finally {
        setIsProgressLoading(false); // Finish loading
      }
    };
    loadInitialData();
  }, []);

  // The actual playback logic, to be called after checks
  const _internalPlayStation = useCallback(async (stationToPlay, options = {}) => {
    if (!stationToPlay) return;

    let correctedStation = { ...stationToPlay };
    if (correctedStation.genre && !correctedStation.genres) {
        correctedStation.genres = [correctedStation.genre];
        delete correctedStation.genre;
    }

    // --- NEW: Google Drive URL Resolution ---
    if (correctedStation.url && correctedStation.url.includes('drive.google.com')) {
        setIsResolvingUrl(true);
        setError(null); // Clear any previous errors
        try {
            console.log('🎵 Preparing Google Drive stream for URL:', correctedStation.url);
            // Construct a URL to our backend streaming function
            const streamUrl = `/api/v1/functions/streamGoogleDriveAudio?url=${encodeURIComponent(correctedStation.url)}`;
            correctedStation.url = streamUrl;
            console.log('✅ Using proxied stream URL:', streamUrl);
        } catch (e) {
            console.error('⚠️ Error during Google Drive URL preparation:', e);
            setError('An error occurred while preparing the Google Drive link.');
            setIsResolvingUrl(false);
            return; // Stop playback if preparation fails
        } finally {
            setIsResolvingUrl(false); // Ensure this is always reset
        }
    }
    // --- END NEW ---

    // --- NEW: Process podcast audio URLs that might need extraction ---
    if (correctedStation.genres?.includes('Podcast') && correctedStation.url) {
        try {
            console.log('🎵 Processing podcast audio URL:', correctedStation.url);
            // Import the extractStreamFromPls function to handle various URL formats
            const { extractStreamFromPls } = await import('@/api/functions');
            const result = await extractStreamFromPls({ url: correctedStation.url });
            
            if (result.data?.success && result.data?.primaryUrl) {
                console.log('✅ Extracted podcast stream URL:', result.data.primaryUrl);
                correctedStation.url = result.data.primaryUrl;
            } else {
                console.log('ℹ️ Using original podcast URL (no extraction needed)');
            }
        } catch (error) {
            console.warn('⚠️ Failed to process podcast URL, using original:', error);
            // Continue with original URL as fallback
        }
    }
    // --- END NEW ---

    // --- NEW: Augment podcast episodes with user-specific progress ---
    if (correctedStation.genres?.includes('Podcast') && correctedStation.id) {
        try {
            const user = await User.me();
            const progress = user.podcast_progress?.[correctedStation.id];
            if (progress) {
                correctedStation.saved_position = progress.saved_position;
                correctedStation.is_completed = progress.is_completed;
            } else {
                // If no progress, assume not started and not completed
                correctedStation.saved_position = 0;
                correctedStation.is_completed = false;
            }
        } catch (e) {
            console.warn("Could not fetch user progress for podcast episode.", e);
        }
    }
    // --- END NEW ---

    setStation(correctedStation);
    setError(null);
    setMetadata(null);
    setCurrentTime(0); // Reset for new playback
    setDuration(0); // Reset for new playback

    fetchMetadata(correctedStation.url);

    destroyCurrentAudio();

    const newAudio = new Audio();
    audioRef.current = newAudio;

    // If a completed podcast is played, reset its state in the user's progress.
    if (correctedStation.genres?.includes('Podcast') && correctedStation.is_completed) {
        const resetInProgress = async () => {
            if (correctedStation.id) {
                console.log(`Resetting completed status for episode: ${correctedStation.id}`);
                // Use savePodcastPosition to update user's progress, marking it as incomplete
                await savePodcastPosition(correctedStation, 0, 1); // Duration 1 ensures it's not completed
                // Also update the local state for the currently playing station
                setStation(prev => ({ ...prev, is_completed: false, saved_position: 0 }));
            }
        };
        resetInProgress();
    }

    const handlers = {
      onPlay: async () => {
        setIsPlaying(true);
        updateMediaSession(correctedStation, true, metadata);
        
        // Start position saving for podcast episodes
        if (correctedStation.genres?.includes('Podcast')) {
          if (positionSaveIntervalRef.current) clearInterval(positionSaveIntervalRef.current); // Clear any previous interval
          positionSaveIntervalRef.current = setInterval(() => {
            if (newAudio && !newAudio.paused) {
              savePodcastPosition(correctedStation, newAudio.currentTime, newAudio.duration);
            }
          }, 10000); // Save every 10 seconds
        }
      },
      onPause: () => {
        setIsPlaying(false);
        updateMediaSession(correctedStation, false, metadata);
        
        // Save position when paused
        if (correctedStation.genres?.includes('Podcast') && newAudio) {
          savePodcastPosition(correctedStation, newAudio.currentTime, newAudio.duration);
        }
        
        // Clear position saving interval
        if (positionSaveIntervalRef.current) {
          clearInterval(positionSaveIntervalRef.current);
          positionSaveIntervalRef.current = null;
        }
      },
      onLoadStart: () => console.log('🔄 Loading new stream...'),
      onCanPlay: () => {
        console.log('✅ Stream ready to play');
      },
      onloadedmetadata: async () => { // MODIFIED HANDLER
        console.log('✅ Player metadata loaded, duration:', newAudio.duration);

        // NEW: Logic to update audiobook duration in DB if it's missing
        // An audiobook is a 'Podcast' genre without a 'podcast_id'
        if (correctedStation.genres?.includes('Podcast') && !correctedStation.podcast_id && newAudio.duration > 0) {
            try {
                const book = await Audiobook.get(correctedStation.id);
                const existingDurationSeconds = parseDuration(book.duration);
                
                // If duration is missing or 0, update it
                if (!book.duration || existingDurationSeconds <= 0) {
                    const hours = Math.floor(newAudio.duration / 3600);
                    const mins = Math.floor((newAudio.duration % 3600) / 60);
                    const secs = Math.floor(newAudio.duration % 60);
                    // Always save in H:MM:SS format for consistency
                    const formattedDuration = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    
                    console.log(`Updating duration for audiobook ${book.title} to ${formattedDuration}`);
                    await Audiobook.update(book.id, { duration: formattedDuration });

                    // Also update the currently playing station object in context for immediate feedback
                    setStation(prevStation => ({...prevStation, duration: formattedDuration}));
                }
            } catch (error) {
                console.error("Failed to update audiobook duration:", error);
            }
        }
        
        // Restore position logic remains
        if (correctedStation.genres?.includes('Podcast')) {
          try {
            const savedPosition = await restorePodcastPosition(correctedStation);
            if (savedPosition > 0 && newAudio) {
              console.log(`Seeking to saved position: ${savedPosition}`);
              newAudio.currentTime = savedPosition;
              setCurrentTime(savedPosition); // Update UI immediately
            }
          } catch (error) {
            console.error('Failed to restore podcast position on loadedmetadata:', error);
          }
        }
      },
      onError: (e) => {
        // Clear position saving on error
        if (positionSaveIntervalRef.current) {
          clearInterval(positionSaveIntervalRef.current);
          positionSaveIntervalRef.current = null;
        }
        
        let errorMessage = 'An unknown playback error occurred.';
        const err = e?.target?.error;
        if (err) {
          switch (err.code) {
            case err.MEDIA_ERR_ABORTED: return;
            case err.MEDIA_ERR_NETWORK: errorMessage = 'Network error. Check connection.'; break;
            case err.MEDIA_ERR_DECODE: 
              errorMessage = correctedStation.genres?.includes('Podcast') 
                ? 'This podcast episode format is not supported by your browser.' 
                : 'Audio format may not be supported.'; 
              break;
            case err.MEDIA_ERR_SRC_NOT_SUPPORTED: 
              errorMessage = correctedStation.genres?.includes('Podcast') 
                ? 'This podcast episode is not available or the audio URL is invalid.' 
                : 'Stream is offline or URL is incorrect.'; 
              break;
            default: 
              errorMessage = correctedStation.genres?.includes('Podcast') 
                ? 'Cannot play this podcast episode. It may be unavailable or in an unsupported format.' 
                : 'An error occurred during playback.';
          }
        }
        console.error('🚨 Audio error for URL:', correctedStation.url, 'Error:', errorMessage);
        setError(errorMessage);
        setIsPlaying(false);
        setMetadata(null);
        destroyCurrentAudio();
      },
      onVolumeChange: () => {
        if (newAudio) {
          setVolumeState(newAudio.volume * 100);
          setIsMutedState(newAudio.muted);
        }
      },
      onTimeUpdate: () => {
        if (correctedStation.genres?.includes('Podcast')) {
          setCurrentTime(newAudio.currentTime);
        }
      },
      onDurationChange: () => {
        if (correctedStation.genres?.includes('Podcast')) {
          setDuration(newAudio.duration || 0);
        }
      },
      onEnded: () => {
        if (correctedStation.genres?.includes('Podcast')) {
          savePodcastPosition(newAudio, newAudio.duration, newAudio.duration); // Mark as completed
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          if (positionSaveIntervalRef.current) {
            clearInterval(positionSaveIntervalRef.current);
            positionSaveIntervalRef.current = null;
          }
        }
      }
    };

    eventHandlersRef.current = handlers;

    // Add event listeners
    newAudio.addEventListener('play', handlers.onPlay);
    newAudio.addEventListener('pause', handlers.onPause);
    newAudio.addEventListener('error', handlers.onError);
    newAudio.addEventListener('loadstart', handlers.onLoadStart);
    newAudio.addEventListener('canplay', handlers.onCanPlay);
    newAudio.addEventListener('loadedmetadata', handlers.onloadedmetadata);
    newAudio.addEventListener('volumechange', handlers.onVolumeChange);
    newAudio.addEventListener('timeupdate', handlers.onTimeUpdate);
    newAudio.addEventListener('durationchange', handlers.onDurationChange);
    newAudio.addEventListener('ended', handlers.onEnded);


    // STEP 4: Set source and play
    console.log('🎵 Setting audio source to:', correctedStation.url);
    newAudio.src = correctedStation.url;

    const playPromise = newAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        if (error.name !== 'AbortError') {
          console.error("Audio playback failed:", error);
          setError("Playback was blocked by the browser.");
        }
      });
    }

    // Handle navigation history, but skip if it's just a quality change
    if (stationToPlay.name !== 'Test Stream' && !options.isQualityChange) {
      if (options.isHistoryNavigation) {
        // When navigating through history (goBack/goForward), we don't modify the history array itself.
        // The historyPosition is already updated by the calling function.
        console.log('History navigation, not modifying history array.');
      } else {
        // This is a new, user-initiated play. Update history array and position.
        setNavigationHistory(prevHistory => {
            let currentHistory = [...prevHistory];
            let newCalculatedPosition;

            // If user navigated back and then played a new station, truncate future history
            if (historyPosition >= 0 && historyPosition < currentHistory.length - 1) {
                currentHistory = currentHistory.slice(0, historyPosition + 1);
            }

            // Check if the station being played is already the current station at the end of history
            if (currentHistory.length > 0 && currentHistory[currentHistory.length - 1].url === correctedStation.url) {
                newCalculatedPosition = currentHistory.length - 1; // Position stays the same
            } else {
                currentHistory.push(correctedStation);
                newCalculatedPosition = currentHistory.length - 1;

                // Limit history size to prevent excessive memory usage
                if (currentHistory.length > HISTORY_MAX_SIZE) {
                    currentHistory = currentHistory.slice(currentHistory.length - HISTORY_MAX_SIZE);
                    newCalculatedPosition = HISTORY_MAX_SIZE - 1; // Adjust new position to reflect slicing
                }
            }

            setHistoryPosition(newCalculatedPosition); // Update history position state
            return currentHistory;
        });
      }
    }

    // Add to recently played and play counts (skip for history nav or quality change)
    if (stationToPlay.name !== 'Test Stream' && !options.isHistoryNavigation && !options.isQualityChange) {
      if (stationToPlay.genres?.includes('Podcast')) {
        // Handle Podcast Episode & Audiobook History. We add them to recently played episodes list.
        // Audiobooks are identified by having a 'Podcast' genre but no 'podcast_id'.
        setRecentlyPlayedEpisodes(prev => {
          // If the item being played is marked as completed, it should not be added back to "continue listening"
          if (correctedStation.is_completed) return prev.filter(ep => ep.id !== correctedStation.id);

          // If it's already the most recent item, don't change the list
          if (prev.length > 0 && prev[0].id === correctedStation.id) return prev;
          
          // Add the new item to the start of the list, remove duplicates, and cap at 10
          const newRecent = [correctedStation, ...prev.filter(ep => ep.id !== correctedStation.id)].slice(0, 10);
          
          // Save this updated list to the user's profile in the background
          const saveRecentToUser = async () => {
            try {
              await User.updateMyUserData({ recently_played_episodes: newRecent });
            } catch (error) {
              console.error('Failed to save recent episodes/audiobooks to user data:', error);
            }
          };
          saveRecentToUser();
          
          return newRecent;
        });

      } else {
        // This block now ONLY handles Radio Station History
        setRecentlyPlayed(prev => {
            // If it's already the most recent, do nothing
            if (prev.length > 0 && prev[0].url === correctedStation.url) return prev;
            
            // Add to the start, remove duplicates, and cap the list size
            const newRecent = [correctedStation, ...prev.filter(s => s.url !== correctedStation.url)].slice(0, 10);

            // Save to user data asynchronously
            const saveRecentToUser = async () => {
              try {
                await User.updateMyUserData({ recently_played_stations: newRecent });
              } catch (error) {
                console.error('Failed to save recent stations to user data:', error);
              }
            };
            saveRecentToUser();

            return newRecent;
        });
      }

      // Update most played (user data) - This logic can remain the same for both
      const updatePlayCounts = async () => {
        try {
          const user = await User.me();
          // Ensure user exists and has a station_play_counts property
          const currentPlayCounts = user?.station_play_counts || {};

          const existingData = currentPlayCounts[correctedStation.url] || {};

          const updatedPlayCounts = {
            ...currentPlayCounts,
            [correctedStation.url]: {
              ...existingData,
              ...correctedStation, // Include station details
              playCount: (existingData.playCount || 0) + 1, // Increment user-specific play count
            }
          };

          await User.updateMyUserData({ station_play_counts: updatedPlayCounts });
        } catch (error) {
          console.error('Failed to update user play count:', error);
        }
      };
      updatePlayCounts();

      // Update global play count, checking for valid ID and existence first
      if (stationToPlay.id && /^[0-9a-fA-F]{24}$/.test(stationToPlay.id) && !stationToPlay.genres?.includes('Podcast')) {
        const updateGlobalCount = async () => {
            try {
              // Fetch station to confirm existence and get latest play_count
              const freshStation = await RadioStation.get(stationToPlay.id);
              const currentPlayCount = freshStation.play_count || 0;
              await RadioStation.update(stationToPlay.id, { play_count: currentPlayCount + 1 });
            } catch (error) {
              // Catches 404 if station is deleted. Gracefully fail.
              console.warn(`Could not update global play count for station ID ${stationToPlay.id}. It may have been deleted.`);
            }
        };
        updateGlobalCount();
      }
    }
  }, [destroyCurrentAudio, updateMediaSession, metadata, fetchMetadata, historyPosition, savePodcastPosition, restorePodcastPosition]);

  // The public playStation function that performs the mobile data check first
  const playStation = useCallback((stationToPlay, options = {}) => {
    // Check for `navigator.connection` for Network Information API support
    const isMobile = navigator.connection?.type === 'cellular';
    const warningDisabled = localStorage.getItem('disableMobileDataWarning') === 'true';

    if (isMobile && !warningDisabled) {
      setPendingStation({ station: stationToPlay, options });
      setIsWarningVisible(true);
    } else {
      _internalPlayStation(stationToPlay, options);
      // Removed setIsPlayerOpen(true) - now only shows mini player
    }
  }, [_internalPlayStation]);

  const handleConfirmPlay = useCallback(() => {
    if (pendingStation) {
      _internalPlayStation(pendingStation.station, pendingStation.options);
      // Removed setIsPlayerOpen(true) - now only shows mini player
    }
    setIsWarningVisible(false);
    setPendingStation(null);
  }, [_internalPlayStation, pendingStation]);

  const handleCancelPlay = useCallback(() => {
    setIsWarningVisible(false);
    setPendingStation(null);
  }, []);

  const selectStation = useCallback((stationToSelect) => {
    setStation(stationToSelect);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!station) return; // No station to play.

    // If there's no audio element, or if its source is stale, we must initialize.
    if (!audioRef.current || audioRef.current.src !== station.url) {
      playStation(station);
      return;
    }

    // If we have a valid, paused audio element, just try to play it.
    if (audioRef.current.paused) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (error.name !== 'AbortError') {
            console.error("Resuming play failed. Re-initializing player.", error);
            // If play() fails on an existing element, it's likely stale. Re-create it.
            playStation(station);
          }
        });
      }
    } else {
      // If it's playing, pause it.
      audioRef.current.pause();
    }
  }, [station, playStation]);

  const closePlayer = useCallback(() => {
    // Clear position saving interval
    if (positionSaveIntervalRef.current) {
      clearInterval(positionSaveIntervalRef.current);
      positionSaveIntervalRef.current = null;
    }

    // Cancel any active sleep timer
    cancelSleepTimer();

    destroyCurrentAudio();
    setStation(null);
    setError(null);
    setIsPlaying(false);
    setMetadata(null); // Clear metadata when player closes
    setIsPlayerOpen(false); // Close the player view
    setCurrentTime(0); // Reset podcast progress
    setDuration(0); // Reset podcast duration

    // Clear Media Session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  }, [destroyCurrentAudio, cancelSleepTimer]);

  const setVolume = useCallback((vol) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, vol / 100));
      if (audioRef.current.volume > 0) audioRef.current.muted = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
    }
  }, []);
  
  const likeCurrentTrack = useCallback(async () => {
    if (!station || !metadata?.streamTitle) {
      console.warn("Cannot like track: missing station or metadata.");
      return false;
    }

    try {
      const user = await User.me();
      const currentLikedTracks = user.liked_tracks || [];

      // Optional: Prevent duplicates if liked very recently
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      const isDuplicate = currentLikedTracks.some(track => 
        track.streamTitle === metadata.streamTitle && 
        track.stationId === station.id &&
        track.likedAt > thirtySecondsAgo
      );

      if (isDuplicate) {
        console.log("Track already liked recently.");
        return true; // Still return success to show confirmation
      }

      const newTrack = {
        streamTitle: metadata.streamTitle,
        stationName: station.name,
        stationId: station.id,
        artworkUrl: metadata.artworkUrl || station.icon_url, // Fallback to station icon
        likedAt: new Date().toISOString(),
      };

      const updatedLikedTracks = [newTrack, ...currentLikedTracks];
      await User.updateMyUserData({ liked_tracks: updatedLikedTracks });
      return true;

    } catch (error) {
      console.error("Failed to like track:", error);
      return false;
    }
  }, [station, metadata]);

  // Function to refresh metadata manually
  const refreshMetadata = useCallback(() => {
    if (station?.url) {
      fetchMetadata(station.url, true); // Force refresh
    }
  }, [station, fetchMetadata]);

  // Periodically refresh metadata when playing (with much longer interval)
  useEffect(() => {
    if (isPlaying && station?.url && !station.genres?.includes('Podcast')) { // Do not refresh metadata for podcasts as they are not live streams
      // Set up interval with longer delay to avoid rate limiting
      const interval = setInterval(() => {
        fetchMetadata(station.url);
      }, 60000); // Refresh every 60 seconds instead of 15

      return () => clearInterval(interval);
    }
  }, [isPlaying, station, fetchMetadata]);

  // Effect to manage podcast progress updates
  useEffect(() => {
    if (isPlaying && station?.genres?.includes('Podcast') && audioRef.current) {
        progressUpdateIntervalRef.current = setInterval(() => {
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
                setDuration(audioRef.current.duration || 0);
            }
        }, 1000);
    } else {
        if (progressUpdateIntervalRef.current) {
            clearInterval(progressUpdateIntervalRef.current);
            progressUpdateIntervalRef.current = null;
        }
        // Reset progress when not playing a podcast or when paused
        if (!station?.genres?.includes('Podcast')) {
            setCurrentTime(0);
            setDuration(0);
        }
    }

    return () => {
        if (progressUpdateIntervalRef.current) {
            clearInterval(progressUpdateIntervalRef.current);
        }
    };
  }, [isPlaying, station]);

  // Update media session when metadata changes
  useEffect(() => {
    if (station) {
      updateMediaSession(station, isPlaying, metadata);
    }

    // Logic to add track to recent history
    // Only for non-podcast stations or if metadata provides a streamTitle for podcasts (which is less common)
    if (isPlaying && station && metadata?.streamTitle && metadata.streamTitle !== lastRecordedTrackRef.current && !station.genres?.includes('Podcast')) {
      // Basic check to avoid logging junk titles
      if (metadata.streamTitle.toLowerCase().includes('not available') || metadata.streamTitle.length < 3) return;

      lastRecordedTrackRef.current = metadata.streamTitle;

      const addTrackToHistory = async () => {
        try {
          const user = await User.me();
          const currentHistory = user.recently_played_tracks || [];

          // Prevent adding if it's the same as the most recent track
          if (currentHistory.length > 0 && currentHistory[0].streamTitle === metadata.streamTitle) {
            return;
          }

          const newTrack = {
            streamTitle: metadata.streamTitle,
            stationName: station.name,
            stationId: station.id,
            artworkUrl: metadata.artworkUrl || station.icon_url,
            playedAt: new Date().toISOString(),
          };

          // Add to history and cap at 10
          const updatedHistory = [newTrack, ...currentHistory].slice(0, 10);

          await User.updateMyUserData({ recently_played_tracks: updatedHistory });
        } catch (error) {
          console.error('Failed to update recently played tracks:', error);
        }
      };
      addTrackToHistory();
    }
  }, [metadata, station, isPlaying, updateMediaSession]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear position saving interval
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current);
      }
      // Clear podcast progress interval
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
      // Clear sleep timer interval
      if (sleepTimerIdRef.current) {
        clearInterval(sleepTimerIdRef.current);
      }
      destroyCurrentAudio();
      // Clear Media Session on component unmount
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      }
    };
  }, [destroyCurrentAudio]); // This is now correct and won't cause issues.

  // Navigation functions
  const canGoBack = useCallback(() => {
    // Can go back if there are previous items in the history array.
    return historyPosition > 0;
  }, [historyPosition]);

  const goBack = useCallback(() => {
    if (canGoBack()) {
      const newPosition = historyPosition - 1;
      setHistoryPosition(newPosition);
      const previousStation = navigationHistory[newPosition];
      _internalPlayStation(previousStation, { isHistoryNavigation: true });
    }
  }, [historyPosition, navigationHistory, _internalPlayStation, canGoBack]);

  const canGoForward = useCallback(() => {
    // Can go forward if we are not at the end of the history list.
    return historyPosition < navigationHistory.length - 1;
  }, [historyPosition, navigationHistory]);

  const goForward = useCallback(() => {
    if (canGoForward()) {
      const newPosition = historyPosition + 1;
      setHistoryPosition(newPosition);
      const nextStation = navigationHistory[newPosition];
      _internalPlayStation(nextStation, { isHistoryNavigation: true });
    }
  }, [historyPosition, navigationHistory, _internalPlayStation, canGoForward]);

  // New functions to control player view
  const openPlayerView = useCallback(() => {
    setIsPlayerOpen(true);
  }, []);

  const closePlayerView = useCallback(() => {
    setIsPlayerOpen(false);
  }, []);

  const togglePlayerView = useCallback(() => {
    setIsPlayerOpen(prev => !prev);
  }, []);

  // New functions for community overlay
  const openCommunityOverlay = useCallback(() => {
    setIsCommunityOverlayOpen(true);
  }, []);

  const closeCommunityOverlay = useCallback(() => {
    setIsCommunityOverlayOpen(false);
  }, []);

  // === Overlay control functions, now in context ===
  const openOverlay = useCallback((page) => setActiveOverlay(page), []);
  const closeOverlay = useCallback(() => setActiveOverlay(null), []);
  const switchOverlay = useCallback((page) => setActiveOverlay(page), []);

  // New function to open specific playlist
  const openPlaylistView = useCallback((playlistId) => {
    setSelectedPlaylistId(playlistId);
    setActiveOverlay('Playlists');
  }, []);

  // New function to specifically play a podcast episode
  const playEpisode = useCallback((episode, options = {}) => {
    // The `playStation` function is designed to handle both radio stations and podcast episodes.
    // It detects podcasts based on the `genres` array containing 'Podcast'.
    // We assume the 'episode' object passed here is a PodcastEpisode entity
    // which should inherently have the necessary properties (e.g., id, url, name, genres including 'Podcast').
    playStation(episode, options);
  }, [playStation]);


  const value = {
    station,
    isPlaying,
    error,
    volume,
    isMuted,
    metadata,
    isLoadingMetadata,
    isResolvingUrl, // NEW: Expose this to the UI
    selectStation,
    playStation,
    playEpisode, // Expose playEpisode function
    togglePlayPause,
    closePlayer,
    setVolume,
    toggleMute,
    recentlyPlayed,
    recentlyPlayedEpisodes, // Add new history to context
    setRecentlyPlayedEpisodes, // Expose setter for removing episodes
    podcastProgress, // Expose progress
    isProgressLoading, // Expose loading state
    refreshMetadata,
    isWarningVisible,
    handleConfirmPlay,
    handleCancelPlay,
    setStation,
    likeCurrentTrack,
    // Navigation functions
    canGoBack,
    goBack,
    canGoForward,
    goForward,
    // New player view controls
    isPlayerOpen,
    openPlayerView,
    closePlayerView,
    togglePlayerView,
    // New community overlay controls
    isCommunityOverlayOpen,
    openCommunityOverlay,
    closeCommunityOverlay,
    // === New context values ===
    activeOverlay,
    openOverlay,
    closeOverlay,
    switchOverlay,
    // New playlist-related context values
    selectedPlaylistId,
    setSelectedPlaylistId,
    openPlaylistView,
    // New podcast control values
    currentTime,
    duration,
    seek,
    // For AllPodcasts -> Podcasts navigation
    selectedPodcastFromAll,
    setSelectedPodcastFromAll,
    // === NEW: Sleep Timer Values ===
    isSleepTimerActive,
    sleepTimerRemaining,
    setSleepTimer,
    cancelSleepTimer,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};
