import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Music, Plus, Loader2, Check } from 'lucide-react';
import { Playlist } from '@/api/entities';
import { PlaylistStation } from '@/api/entities';

export default function SaveToPlaylistDialog({ isOpen, onClose, station }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [playlistsContainingStation, setPlaylistsContainingStation] = useState(new Set());

  const loadPlaylistsAndRelations = useCallback(async () => {
    if (!station?.id) return;
    setLoading(true);
    try {
      const [userPlaylists, existingRelations] = await Promise.all([
        Playlist.list('-created_date'),
        PlaylistStation.filter({ station_id: station.id })
      ]);

      setPlaylists(userPlaylists || []);
      const playlistIdsWithStation = new Set((existingRelations || []).map(rel => rel.playlist_id));
      setPlaylistsContainingStation(playlistIdsWithStation);
    } catch (error) {
      console.error('Failed to load playlists and relations:', error);
    } finally {
      setLoading(false);
    }
  }, [station]);

  useEffect(() => {
    if (isOpen) {
      loadPlaylistsAndRelations();
    }
  }, [isOpen, loadPlaylistsAndRelations]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setSaving(true);
    try {
      const newPlaylist = await Playlist.create({
        name: newPlaylistName.trim(),
        description: ''
      });

      // Add station to the new playlist
      await PlaylistStation.create({
        playlist_id: newPlaylist.id,
        station_id: station.id
      });

      setSuccessMessage(`Station saved to "${newPlaylist.name}"!`);
      setNewPlaylistName('');
      setShowCreateForm(false);
      loadPlaylistsAndRelations(); // Refresh the list
      
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to create playlist and save station:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveToPlaylist = async (playlist) => {
    if (!station?.id) return;

    setSaving(true);
    try {
      await PlaylistStation.create({
        playlist_id: playlist.id,
        station_id: station.id
      });
      
      // Optimistically update the UI
      setPlaylistsContainingStation(prev => new Set(prev).add(playlist.id));
      
      setSuccessMessage(`Station saved to "${playlist.name}"!`);

      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to save station to playlist:', error);
       // Revert optimistic update on error
      setPlaylistsContainingStation(prev => {
        const newSet = new Set(prev);
        newSet.delete(playlist.id);
        return newSet;
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSuccessMessage('');
    setShowCreateForm(false);
    setNewPlaylistName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md backdrop-blur-xl border rounded-2xl p-6"
            style={{ 
              backgroundColor: 'var(--bg-from-color)', 
              borderColor: 'var(--border-color)' 
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Save Station
              </h2>
              <Button
                onClick={handleClose}
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
                <div className="flex items-center gap-3 p-3 rounded-lg mb-6" style={{ backgroundColor: 'var(--button-bg)' }}>
                <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--border-color)' }}>
                  {station.icon_url ? (
                    <img src={station.icon_url} alt={station.name} className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {station.name}
                  </p>
                  <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                    {station.description || station.genres?.join(', ') || 'Radio Station'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Success Message */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-green-500/20 border border-green-400/30 rounded-lg text-green-400 text-sm text-center"
              >
                {successMessage}
              </motion.div>
            )}

            {/* Create New Playlist Form */}
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <form onSubmit={handleCreatePlaylist} className="space-y-3">
                  <div>
                    <Label htmlFor="playlist-name" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      New Playlist Name
                    </Label>
                    <Input
                      id="playlist-name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Enter playlist name"
                      className="mt-1"
                      style={{ backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={!newPlaylistName.trim() || saving}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create & Save'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      variant="outline"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Create New Playlist Button */}
            {!showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={saving}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Playlist
              </Button>
            )}

            {/* Existing Playlists */}
            <div className="space-y-2">
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                Save to existing playlist:
              </p>
              
              {loading ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-primary)' }} />
                  <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Loading playlists...</p>
                </div>
              ) : playlists.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No playlists found. Create your first playlist above!
                  </p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {playlists.map((playlist) => {
                    const alreadyInPlaylist = playlistsContainingStation.has(playlist.id);
                    return (
                      <button
                        key={playlist.id}
                        onClick={() => handleSaveToPlaylist(playlist)}
                        disabled={saving || alreadyInPlaylist}
                        className="w-full text-left p-3 rounded-lg border transition-colors hover:bg-white/5 disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--button-bg)' }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="min-w-0">
                            <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                              {playlist.name}
                            </p>
                            {playlist.description && (
                              <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                                {playlist.description}
                              </p>
                            )}
                          </div>
                          {alreadyInPlaylist && (
                            <Check className="w-5 h-5 text-green-400 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}