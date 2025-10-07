
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Music, Trash2, Clock, Radio, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function LikedTracks() {
  const [likedTracks, setLikedTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null); // State to track copied item
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLikedTracks = async () => {
      try {
        const user = await User.me();
        setLikedTracks(user.liked_tracks || []);
      } catch (error) {
        console.error("Failed to fetch liked tracks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedTracks();
  }, []);

  const handleDeleteTrack = async (trackIndex) => {
    const trackToRemove = likedTracks[trackIndex];
    if (!trackToRemove) return;

    // Optimistic UI update
    const updatedTracks = likedTracks.filter((_, index) => index !== trackIndex);
    setLikedTracks(updatedTracks);

    try {
      await User.updateMyUserData({ liked_tracks: updatedTracks });
    } catch (error) {
      console.error("Failed to delete track:", error);
      // Revert on failure
      setLikedTracks(prev => [...prev.slice(0, trackIndex), trackToRemove, ...prev.slice(trackIndex)]);
      alert("Failed to delete track. Please try again.");
    }
  };

  const handleCopyTrack = (track, index) => {
    const parts = track.streamTitle.split(' - ');
    const textToCopy = parts.length > 1 ? `${parts[0].trim()} - ${parts.slice(1).join(' - ').trim()}` : track.streamTitle;
    
    navigator.clipboard.writeText(textToCopy);
    
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ThumbsUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Liked Tracks</h1>
          <p className="text-lg max-w-md mx-auto" style={{color: 'var(--text-secondary)'}}>
            Your personal collection of saved songs.
          </p>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="text-center" style={{color: 'var(--text-primary)'}}>Loading your tracks...</div>
        ) : likedTracks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center rounded-2xl p-12"
            style={{backgroundColor: 'var(--button-bg)'}}
          >
            <Music className="w-16 h-16 mx-auto mb-6" style={{color: 'var(--text-secondary)'}} />
            <h3 className="text-2xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>No Liked Tracks Yet</h3>
            <p className="mb-6" style={{color: 'var(--text-secondary)'}}>
              When you hear a song you like, press the thumbs up button on the Now Playing screen.
            </p>
            <Button onClick={() => navigate(createPageUrl('NowPlaying'))}>
              Go to Player
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {likedTracks.map((track, index) => (
                <motion.div
                  key={`${track.likedAt}-${track.streamTitle}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50, transition: { duration: 0.3 } }}
                  className="flex items-center gap-4 p-4 rounded-2xl border"
                  style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
                >
                  <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.05)'}}>
                    {track.artworkUrl ? (
                      <img src={track.artworkUrl} alt="Artwork" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-8 h-8" style={{color: 'var(--text-secondary)'}} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {(() => {
                      const parts = track.streamTitle.split(' - ');
                      const artist = parts.length > 1 ? parts[0].trim() : null;
                      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : track.streamTitle;
                      return (
                        <>
                          <h4 className="font-semibold truncate" style={{color: 'var(--text-primary)'}} title={title}>
                            {title}
                          </h4>
                          {artist && (
                            <p className="text-sm truncate" style={{color: 'var(--text-secondary)'}} title={artist}>
                              {artist}
                            </p>
                          )}
                        </>
                      );
                    })()}
                    <div className="mt-2 text-xs space-y-1" style={{color: 'var(--text-secondary)'}}>
                        <p className="flex items-center gap-2">
                            <Radio className="w-3 h-3" /> 
                            Heard on {track.stationName}
                        </p>
                        <p className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Liked on {new Date(track.likedAt).toLocaleString()}
                        </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleCopyTrack(track, index)}
                      variant="ghost"
                      size="icon"
                      className={`rounded-full transition-colors ${
                        copiedIndex === index 
                          ? 'text-green-400 bg-green-500/20'
                          : 'hover:bg-blue-500/20 hover:text-blue-200'
                      }`}
                      style={{color: copiedIndex !== index ? 'var(--text-secondary)' : undefined}}
                      title="Copy Artist & Title"
                    >
                      {copiedIndex === index ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={() => handleDeleteTrack(index)}
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-full"
                      title="Remove from Liked Tracks"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
