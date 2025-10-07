
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Check, Music, Loader2 } from 'lucide-react';
import { Playlist } from '@/api/entities';
import { PlaylistStation } from '@/api/entities';

export default function SaveToPlaylistDialog({ isOpen, onClose, station }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [savedToPlaylists, setSavedToPlaylists] = useState(new Set());

  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const userPlaylists = await Playlist.list('-created_date');
      setPlaylists(userPlaylists || []);
      
      // Check which playlists already contain this station
      if (station?.id) {
        const playlistStations = await PlaylistStation.filter({ station_id: station.id });
        const playlistIds = new Set(playlistStations.map(ps => ps.playlist_id));
        setSavedToPlaylists(playlistIds);
      }
    } catch (error) {
      console.error('Failed to load playlists:', error);
    } finally {
      setLoading(false);
    }
  }, [station?.id]); // `station?.id` is a dependency because it's used inside loadPlaylists

  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen, loadPlaylists]); // `loadPlaylists` is now a dependency because it's stable due to useCallback

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    setSaving(true);
    try {
      const newPlaylist = await Playlist.create({
        name: newPlaylistName.trim(),
        description: ''
      });
      
      // Add the station to the new playlist if we have a station
      if (station?.id) {
        await PlaylistStation.create({
          playlist_id: newPlaylist.id,
          station_id: station.id
        });
        setSavedToPlaylists(prev => new Set([...prev, newPlaylist.id]));
      }
      
      setPlaylists(prev => [newPlaylist, ...prev]);
      setNewPlaylistName('');
      setShowCreateNew(false);
    } catch (error) {
      console.error('Failed to create playlist:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    if (!station?.id) return;
    
    setSaving(true);
    try {
      // Check if station is already in playlist
      const existing = await PlaylistStation.filter({ 
        playlist_id: playlistId, 
        station_id: station.id 
      });
      
      if (existing.length === 0) {
        await PlaylistStation.create({
          playlist_id: playlistId,
          station_id: station.id
        });
        setSavedToPlaylists(prev => new Set([...prev, playlistId]));
      }
    } catch (error) {
      console.error('Failed to add station to playlist:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md backdrop-blur-xl border rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bg-from-color)', 
            borderColor: 'var(--border-color)' 
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Save to Playlist</h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="rounded-full"
              style={{ color: 'var(--text-primary)' }}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Station Info */}
          {station && (
            <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center" style={{backgroundColor: 'var(--button-bg)'}}>
                {station.icon_url ? (
                  <img src={station.icon_url} alt={station.name} className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-6 h-6" style={{color: 'var(--text-secondary)'}} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{station.name}</h3>
                <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                  {station.description || station.genres?.join(', ') || 'Radio Station'}
                </p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-4 max-h-80 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{color: 'var(--text-primary)'}} />
                <p style={{color: 'var(--text-secondary)'}}>Loading playlists...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Create New Playlist */}
                {showCreateNew ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="playlist-name" className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>
                        Playlist Name
                      </Label>
                      <Input
                        id="playlist-name"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="Enter playlist name"
                        className="mt-1"
                        style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreatePlaylist}
                        disabled={!newPlaylistName.trim() || saving}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Create
                      </Button>
                      <Button
                        onClick={() => setShowCreateNew(false)}
                        variant="outline"
                        style={{
                          borderColor: 'var(--border-color)', 
                          color: 'var(--text-primary)',
                          backgroundColor: 'var(--button-bg)'
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowCreateNew(true)}
                    variant="outline"
                    className="w-full"
                    style={{
                      borderColor: 'var(--border-color)', 
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--button-bg)'
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Playlist
                  </Button>
                )}

                {/* Existing Playlists */}
                {playlists.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>Your Playlists</h3>
                    {playlists.map((playlist) => {
                      const isInPlaylist = savedToPlaylists.has(playlist.id);
                      return (
                        <button
                          key={playlist.id}
                          onClick={() => !isInPlaylist && handleAddToPlaylist(playlist.id)}
                          disabled={isInPlaylist || saving}
                          className={`w-full p-3 rounded-lg text-left transition-colors ${
                            isInPlaylist 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'hover:bg-opacity-80'
                          }`}
                          style={{
                            backgroundColor: 'var(--button-bg)',
                            borderColor: 'var(--border-color)'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium truncate" style={{color: 'var(--text-primary)'}}>
                                {playlist.name}
                              </p>
                              {playlist.description && (
                                <p className="text-xs truncate" style={{color: 'var(--text-secondary)'}}>
                                  {playlist.description}
                                </p>
                              )}
                            </div>
                            {isInPlaylist && (
                              <Check className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {playlists.length === 0 && !showCreateNew && (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 mx-auto mb-3" style={{color: 'var(--text-secondary)'}} />
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                      No playlists yet. Create your first one!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
