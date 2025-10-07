import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, Pause, Plus, Clock } from 'lucide-react';
import { Audiobook } from '@/api/entities';
import { User } from '@/api/entities';
import { usePlayer } from '../player/PlayerContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

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

export default function AudiobookSection({ onViewAll }) {
  const [audiobooks, setAudiobooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const { playStation, station, isPlaying, togglePlayPause, currentTime, podcastProgress } = usePlayer();
  const navigate = useNavigate();

  useEffect(() => {
    loadAudiobooks();
  }, []);

  const loadAudiobooks = async () => {
    setLoading(true);
    try {
      const allAudiobooks = await Audiobook.list('-created_date');
      
      const user = await User.me();
      const userProgress = user.podcast_progress || {};
      
      // Get recently played episodes to determine order
      const recentEpisodes = user.recently_played_episodes || [];
      
      // Filter to only audiobooks (no podcast_id)
      const audiobookEpisodes = recentEpisodes.filter(ep => !ep.podcast_id);
      
      // Create a map of audiobook IDs to their last played timestamp
      const lastPlayedMap = {};
      audiobookEpisodes.forEach(ep => {
        if (ep.id && !lastPlayedMap[ep.id]) {
          lastPlayedMap[ep.id] = recentEpisodes.indexOf(ep);
        }
      });
      
      // Sort audiobooks by most recently listened
      const sortedAudiobooks = [...allAudiobooks].sort((a, b) => {
        const aIndex = lastPlayedMap[a.id];
        const bIndex = lastPlayedMap[b.id];
        
        if (aIndex !== undefined && bIndex !== undefined) {
          return aIndex - bIndex;
        }
        if (aIndex !== undefined) return -1;
        if (bIndex !== undefined) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });
      
      setAudiobooks(sortedAudiobooks.slice(0, 10));
    } catch (error) {
      console.error('Failed to load audiobooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAudiobook = (audiobook) => {
    playStation({
      ...audiobook,
      name: audiobook.title,
      url: audiobook.audio_url,
      icon_url: audiobook.cover_image_url,
      genres: ['Podcast'],
      call_letters: `by ${audiobook.author}`,
      description: audiobook.description,
    });
  };

  const isCurrentAudiobook = (audiobook) => {
    return station?.id === audiobook.id || station?.audio_url === audiobook.audio_url;
  };

  if (loading) {
    return null;
  }

  if (audiobooks.length === 0) {
    return (
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7" style={{color: 'var(--primary-color)'}} />
            <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>My Audiobooks</h2>
          </div>
        </div>
        <div className="text-center p-12 backdrop-blur-xl rounded-2xl border" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
          <BookOpen className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--text-secondary)'}} />
          <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Start Your Audiobook Library</h3>
          <p className="mb-4" style={{color: 'var(--text-secondary)'}}>Add your personal audiobook collection</p>
          <Button
            onClick={() => navigate(createPageUrl('AddAudiobook'))}
            className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Audiobook
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7" style={{color: 'var(--primary-color)'}} />
          <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>My Audiobooks</h2>
        </div>
        <Button onClick={onViewAll} variant="ghost" style={{color: 'var(--primary-color)'}}>
          View All
        </Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
        {audiobooks.map((audiobook) => {
          const progress = podcastProgress[audiobook.id];
          const currentPosition = isCurrentAudiobook(audiobook) ? currentTime : (progress?.saved_position || 0);
          const totalDurationSeconds = parseDuration(audiobook.duration);
          const progressPercentage = currentPosition > 0 && totalDurationSeconds > 0
            ? Math.min((currentPosition / totalDurationSeconds) * 100, 100)
            : 0;
          const isComplete = progress?.is_completed;

          return (
            <motion.div
              key={audiobook.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => isCurrentAudiobook(audiobook) ? togglePlayPause() : playAudiobook(audiobook)}
              className="group cursor-pointer"
            >
              <div className="relative mb-3">
                <div className="aspect-[2/3] rounded-xl overflow-hidden border" style={{borderColor: 'var(--border-color)'}}>
                  {audiobook.cover_image_url ? (
                    <img src={audiobook.cover_image_url} alt={audiobook.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.1)'}}>
                      <BookOpen className="w-12 h-12" style={{color: 'var(--text-secondary)'}} />
                    </div>
                  )}
                  
                  {/* Play/Pause Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isCurrentAudiobook(audiobook) && isPlaying ? (
                      <Pause className="w-12 h-12 text-white" />
                    ) : (
                      <Play className="w-12 h-12 text-white" />
                    )}
                  </div>
                  
                  {/* Progress Percentage Badge */}
                  {progressPercentage > 0 && !isComplete && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      {Math.round(progressPercentage)}%
                    </div>
                  )}
                  
                  {/* Completed badge */}
                  {isComplete && (
                    <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1.5 shadow-lg">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  {/* Progress bar at bottom */}
                  {progressPercentage > 0 && !isComplete && (
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/50">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  )}
                </div>
                
                <h3 className="font-semibold text-sm line-clamp-2 mb-1" style={{color: 'var(--text-primary)'}} title={audiobook.title}>
                  {audiobook.title}
                </h3>
                <p className="text-xs line-clamp-1 mb-1" style={{color: 'var(--text-secondary)'}} title={`by ${audiobook.author}`}>
                  by {audiobook.author}
                </p>
                
                {/* Progress text - show if there's any progress OR if there's a duration */}
                {(currentPosition > 0 || totalDurationSeconds > 0) && (
                  <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                    {formatTime(currentPosition)} / {totalDurationSeconds > 0 ? formatTime(totalDurationSeconds) : (audiobook.duration || '0:00')}
                    {isComplete && ' (Finished)'}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}