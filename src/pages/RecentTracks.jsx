
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { motion } from 'framer-motion';
import { History, Music, Clock, Radio, Copy, Check, ThumbsUp, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function RecentTracks() {
  const [recentTracks, setRecentTracks] = useState([]);
  const [likedTracks, setLikedTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [likedIndex, setLikedIndex] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentTracks = async () => {
      try {
        const user = await User.me();
        setRecentTracks(user.recently_played_tracks || []);
        setLikedTracks(user.liked_tracks || []);
      } catch (error) {
        console.error("Failed to fetch recent tracks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTracks();
  }, []);

  const handleCopyTrack = (track, index) => {
    const parts = track.streamTitle.split(' - ');
    const textToCopy = parts.length > 1 ? `${parts[0].trim()} - ${parts.slice(1).join(' - ').trim()}` : track.streamTitle;
    
    navigator.clipboard.writeText(textToCopy);
    
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const handleLikeTrack = async (track, index) => {
    try {
      // Check if track is already liked
      const isAlreadyLiked = likedTracks.some(likedTrack => 
        likedTrack.streamTitle === track.streamTitle && 
        likedTrack.stationId === track.stationId
      );

      if (isAlreadyLiked) {
        return; // Don't add duplicates
      }

      const newLikedTrack = {
        streamTitle: track.streamTitle,
        stationName: track.stationName,
        stationId: track.stationId,
        artworkUrl: track.artworkUrl,
        likedAt: new Date().toISOString(),
      };

      const updatedLikedTracks = [newLikedTrack, ...likedTracks];
      await User.updateMyUserData({ liked_tracks: updatedLikedTracks });
      
      setLikedTracks(updatedLikedTracks);
      setLikedIndex(index);
      
      setTimeout(() => {
        setLikedIndex(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to like track:", error);
    }
  };

  const isTrackLiked = (track) => {
    return likedTracks.some(likedTrack => 
      likedTrack.streamTitle === track.streamTitle && 
      likedTrack.stationId === track.stationId
    );
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
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <History className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Recent Tracks</h1>
          <p className="text-lg max-w-md mx-auto" style={{color: 'var(--text-secondary)'}}>
            Your last 10 listened songs.
          </p>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="text-center" style={{color: 'var(--text-primary)'}}>Loading your history...</div>
        ) : recentTracks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center rounded-2xl p-12"
            style={{backgroundColor: 'var(--button-bg)'}}
          >
            <Music className="w-16 h-16 mx-auto mb-6" style={{color: 'var(--text-secondary)'}} />
            <h3 className="text-2xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>No Listening History Yet</h3>
            <p className="mb-6" style={{color: 'var(--text-secondary)'}}>
              Start playing a station, and the songs you hear will show up here.
            </p>
            <Button onClick={() => navigate(createPageUrl('NowPlaying'))}>
              Go to Player
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {recentTracks.map((track, index) => (
              <motion.div
                key={`${track.playedAt}-${track.streamTitle}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
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
                          Listened at {new Date(track.playedAt).toLocaleString()}
                      </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleLikeTrack(track, index)}
                    variant="ghost"
                    size="icon"
                    disabled={isTrackLiked(track)}
                    className={`rounded-full transition-colors ${
                      isTrackLiked(track)
                        ? 'text-red-400 bg-red-500/20 opacity-50 cursor-not-allowed'
                        : likedIndex === index
                        ? 'text-red-400 bg-red-500/20'
                        : 'hover:bg-red-500/20 hover:text-red-400'
                    }`}
                    style={{color: !isTrackLiked(track) && likedIndex !== index ? 'var(--text-secondary)' : undefined}}
                    title={isTrackLiked(track) ? "Already in Liked Tracks" : "Add to Liked Tracks"}
                  >
                    {isTrackLiked(track) ? <Heart className="w-4 h-4 fill-current" /> : likedIndex === index ? <Heart className="w-4 h-4 fill-current" /> : <ThumbsUp className="w-4 h-4" />}
                  </Button>
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
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
