
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music, Plus, Trash2, Edit3, Play, Pause, MoreVertical, Loader2, X, SkipForward, Shuffle, ArrowUp, ArrowDown } from 'lucide-react';
import { Playlist } from '@/api/entities';
import { PlaylistStation } from '@/api/entities';
import { RadioStation } from '@/api/entities';
import { usePlayer } from '../components/player/PlayerContext';
import { getMultipleStreamMetadata } from '@/api/functions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistStations, setPlaylistStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);

  const { playStation, selectedPlaylistId, setSelectedPlaylistId, station, isPlaying, togglePlayPause } = usePlayer();

  const fetchMetadataForPlaylist = useCallback(async (stationsToFetch) => {
    if (!stationsToFetch || stationsToFetch.length === 0) return;
    const streamUrls = stationsToFetch.map(s => s.url);
    try {
      const response = await getMultipleStreamMetadata({ streamUrls });
      if (response.data) {
        setPlaylistStations(prevStations =>
          prevStations.map(s => {
            // Only update stations that were actually fetched
            if (response.data[s.url] !== undefined) {
              return {
                ...s,
                metadata: response.data[s.url]?.success ? response.data[s.url].metadata : undefined,
                isLoadingMetadata: false,
              };
            }
            // Keep existing metadata for stations that weren't fetched
            return s;
          })
        );
      }
    } catch (error) {
      console.error("Failed to fetch stream metadata for playlist:", error);
      // Only set loading to false for the stations we tried to fetch
      const fetchedUrls = new Set(streamUrls);
      setPlaylistStations(prevStations =>
        prevStations.map(s =>
          fetchedUrls.has(s.url) ? { ...s, isLoadingMetadata: false } : s
        )
      );
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const userPlaylists = await Playlist.list() || [];
      
      const playlistsWithOrder = userPlaylists.map((playlist, index) => ({
        ...playlist,
        sort_order: playlist.sort_order ?? index
      }));

      playlistsWithOrder.sort((a, b) => a.sort_order - b.sort_order);

      // After sorting, check for and fix duplicate sort_order values
      const finalOrderedPlaylists = playlistsWithOrder.map((playlist, index) => ({
        ...playlist,
        sort_order: index
      }));

      // If any orders were fixed, update them in the database
      const updates = finalOrderedPlaylists
        .filter((p, i) => p.sort_order !== playlistsWithOrder[i].sort_order)
        .map(p => Playlist.update(p.id, { sort_order: p.sort_order }));
        
      if (updates.length > 0) {
        await Promise.all(updates);
      }

      setPlaylists(finalOrderedPlaylists);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylistStations = useCallback(async (playlistId) => {
    setLoadingStations(true);
    setPlaylistStations([]); // Clear previous stations
    try {
      // Get playlist station relationships
      const playlistStationData = await PlaylistStation.filter({ playlist_id: playlistId });
      
      if (playlistStationData.length > 0) {
        // Get the actual station data
        const stationIds = playlistStationData.map(ps => ps.station_id).filter(id => id);
        
        if (stationIds.length > 0) {
          const stations = await RadioStation.filter({ id: { '$in': stationIds } });
          const stationsWithLoadingState = stations.map(s => ({...s, isLoadingMetadata: true}));
          setPlaylistStations(stationsWithLoadingState);
          // Metadata is now fetched by the auto-refresh useEffect
        } else {
          setPlaylistStations([]);
        }
      } else {
        setPlaylistStations([]);
      }
    } catch (error) {
      console.error('Failed to load playlist stations:', error);
      setPlaylistStations([]);
    } finally {
      setLoadingStations(false);
    }
  }, []);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      // Set sort_order to be after all existing playlists
      const maxOrder = playlists.length > 0 ? Math.max(...playlists.map(p => p.sort_order || 0)) : -1;
      
      const newPlaylist = await Playlist.create({
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim(),
        sort_order: maxOrder + 1
      });

      setPlaylists(prev => [...prev, { ...newPlaylist, sort_order: maxOrder + 1 }]);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create playlist:', error);
    }
  };

  const handleUpdatePlaylist = async (e) => {
    e.preventDefault();
    if (!editingPlaylist || !newPlaylistName.trim()) return;

    try {
      await Playlist.update(editingPlaylist.id, {
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim()
      });

      setPlaylists(prev => prev.map(p => 
        p.id === editingPlaylist.id 
          ? { ...p, name: newPlaylistName.trim(), description: newPlaylistDescription.trim() }
          : p
      ));

      // Update selectedPlaylist if it's the one being edited
      if (selectedPlaylist?.id === editingPlaylist.id) {
        setSelectedPlaylist(prev => ({
          ...prev,
          name: newPlaylistName.trim(),
          description: newPlaylistDescription.trim()
        }));
      }

      setEditingPlaylist(null);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
    } catch (error) {
      console.error('Failed to update playlist:', error);
    }
  };

  const handleDeletePlaylist = async (playlist) => {
    if (!window.confirm(`Are you sure you want to delete "${playlist.name}"? This will remove all stations from the playlist.`)) {
      return;
    }

    try {
      // First delete all playlist-station relationships
      const playlistStationData = await PlaylistStation.filter({ playlist_id: playlist.id });
      for (const ps of playlistStationData) {
        await PlaylistStation.delete(ps.id);
      }

      // Then delete the playlist
      await Playlist.delete(playlist.id);
      setPlaylists(prev => prev.filter(p => p.id !== playlist.id));
      
      // Close playlist view if it was the selected one
      if (selectedPlaylist?.id === playlist.id) {
        setSelectedPlaylist(null);
        setPlaylistStations([]);
      }
    } catch (error) {
      console.error('Failed to delete playlist:', error);
    }
  };

  const handleRemoveStationFromPlaylist = async (stationToRemove) => {
    if (!selectedPlaylist) return;

    try {
      const playlistStationData = await PlaylistStation.filter({ 
        playlist_id: selectedPlaylist.id, 
        station_id: stationToRemove.id 
      });

      for (const ps of playlistStationData) {
        await PlaylistStation.delete(ps.id);
      }

      setPlaylistStations(prev => prev.filter(s => s.id !== stationToRemove.id));
    } catch (error) {
      console.error('Failed to remove station from playlist:', error);
    }
  };

  const startEditing = (playlist) => {
    setEditingPlaylist(playlist);
    setNewPlaylistName(playlist.name);
    setNewPlaylistDescription(playlist.description || '');
    setShowCreateForm(false);
  };

  const cancelEditing = () => {
    setEditingPlaylist(null);
    setNewPlaylistName('');
    setNewPlaylistDescription('');
  };

  const openPlaylist = useCallback((playlist) => {
    setSelectedPlaylist(playlist);
    // Stations are now loaded by the useEffect hook that watches selectedPlaylist
  }, []);

  const closePlaylist = () => {
    setSelectedPlaylist(null);
    setPlaylistStations([]);
  };

  // Function to handle reordering playlists
  const handleReorder = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= playlists.length) return;

    // Create a new array and swap the items
    const reorderedPlaylists = [...playlists];
    const [movedPlaylist] = reorderedPlaylists.splice(index, 1);
    reorderedPlaylists.splice(newIndex, 0, movedPlaylist);

    // Update the sort_order property for all affected playlists in the reordered array
    const playlistsToUpdate = reorderedPlaylists.map((playlist, idx) => ({
      ...playlist,
      sort_order: idx
    }));

    // Optimistically update the UI
    setPlaylists(playlistsToUpdate);

    // Find the two playlists whose sort_order values actually changed
    const originalPlaylistAtIndex = playlists[index];
    const originalPlaylistAtNewIndex = playlists[newIndex];
    
    // Determine which playlists need a database update
    const dbUpdates = [];
    if (playlistsToUpdate[index].id === movedPlaylist.id) { // If the moved item ended up at 'index' in the new array
        if (playlistsToUpdate[index].sort_order !== originalPlaylistAtIndex.sort_order) {
            dbUpdates.push(Playlist.update(playlistsToUpdate[index].id, { sort_order: playlistsToUpdate[index].sort_order }));
        }
    }
    if (playlistsToUpdate[newIndex].id === movedPlaylist.id) { // If the moved item ended up at 'newIndex' in the new array
        if (playlistsToUpdate[newIndex].sort_order !== originalPlaylistAtNewIndex.sort_order) {
            dbUpdates.push(Playlist.update(playlistsToUpdate[newIndex].id, { sort_order: playlistsToUpdate[newIndex].sort_order }));
        }
    }

    // This simplified approach ensures all playlists' sort_order are correct after a move.
    // We only need to update the two that changed position to maintain minimal DB calls.
    // However, if we just swap, only two need to update. If we insert, more might.
    // The safest is to update all if we just re-indexed them all.
    // For simplicity with the outline, we'll update only the two directly involved.
    // The outline suggested updating just the two swapped items, which is simple.
    // If the whole list is re-indexed, then all changed items should be updated.
    // Given the outline's structure, updating the two directly swapped elements is likely the intent.
    try {
        await Promise.all([
            Playlist.update(playlistsToUpdate[index].id, { sort_order: playlistsToUpdate[index].sort_order }),
            Playlist.update(playlistsToUpdate[newIndex].id, { sort_order: playlistsToUpdate[newIndex].sort_order }),
        ]);
    } catch (error) {
      console.error('Failed to update playlist order:', error);
      // On error, revert by reloading from the database
      loadPlaylists();
    }
  };
  
  // Effect to load stations when a playlist is selected
  useEffect(() => {
    if (selectedPlaylist) {
        loadPlaylistStations(selectedPlaylist.id);
    }
  }, [selectedPlaylist, loadPlaylistStations]);

  // Effect to handle opening specific playlist from context
  useEffect(() => {
    if (selectedPlaylistId && playlists.length > 0) {
      const playlist = playlists.find(p => p.id === selectedPlaylistId);
      if (playlist) {
        openPlaylist(playlist);
        setSelectedPlaylistId(null); // Clear the selection
      }
    }
  }, [selectedPlaylistId, playlists, setSelectedPlaylistId, openPlaylist]);

  // Effect to handle auto-refreshing metadata
  useEffect(() => {
    if (!selectedPlaylist || playlistStations.length === 0) {
        return; // No playlist open or no stations to refresh
    }

    // Fetch metadata immediately when stations are loaded
    fetchMetadataForPlaylist(playlistStations);

    // Then set up an interval for subsequent refreshes
    const intervalId = setInterval(() => {
        fetchMetadataForPlaylist(playlistStations);
    }, 30000); // Refresh every 30 seconds

    // Cleanup function
    return () => {
        clearInterval(intervalId);
    };
  }, [selectedPlaylist, playlistStations, fetchMetadataForPlaylist]);


  const handlePlayFirst = () => {
    if (playlistStations.length > 0) {
      playStation(playlistStations[0]);
    }
  };

  const handlePlayNext = () => {
    if (playlistStations.length === 0) return;

    const currentIndex = playlistStations.findIndex(s => s.id === station?.id);

    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % playlistStations.length;
      playStation(playlistStations[nextIndex]);
    } else {
      playStation(playlistStations[0]);
    }
  };

  const handlePlayRandom = () => {
    if (playlistStations.length === 0) return;

    let availableStations = playlistStations.filter(s => s.id !== station?.id);
    if (availableStations.length === 0) {
      availableStations = playlistStations;
    }

    const randomIndex = Math.floor(Math.random() * availableStations.length);
    playStation(availableStations[randomIndex]);
  };

  const handlePauseStop = () => {
    togglePlayPause();
  };

  if (selectedPlaylist) {
    // Check if a station from *this* playlist is currently playing
    const isPlaylistPlaying = isPlaying && playlistStations.some(s => s.id === station?.id);

    // Playlist detail view
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button
            onClick={closePlaylist}
            variant="ghost"
            className="mb-6"
            style={{color: 'var(--text-primary)'}}
          >
            <X className="w-4 h-4 mr-2" />
            Back to Playlists
          </Button>

          {/* Playlist Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
              {selectedPlaylist.name}
            </h1>
            {selectedPlaylist.description && (
              <p className="text-lg" style={{color: 'var(--text-secondary)'}}>
                {selectedPlaylist.description}
              </p>
            )}
            <p className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
              {playlistStations.length} {playlistStations.length === 1 ? 'station' : 'stations'}
            </p>
          </div>
          
          {/* Playlist Controls */}
          {!loadingStations && playlistStations.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-8"
            >
              <Button 
                onClick={isPlaylistPlaying ? handlePauseStop : handlePlayFirst} 
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                {isPlaylistPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isPlaylistPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button 
                onClick={handlePlayNext} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Next
              </Button>
              <Button 
                onClick={handlePlayRandom} 
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Shuffle
              </Button>
            </motion.div>
          )}

          {/* Stations List */}
          {loadingStations && playlistStations.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{color: 'var(--text-primary)'}} />
              <p style={{color: 'var(--text-secondary)'}}>Loading stations...</p>
            </div>
          ) : playlistStations.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-16 h-16 mx-auto mb-6" style={{color: 'var(--text-secondary)'}} />
              <h3 className="text-2xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>No Stations Yet</h3>
              <p style={{color: 'var(--text-secondary)'}}>
                Add stations to this playlist by using the "Save Station" button on the Now Playing page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {playlistStations.map((stationItem, index) => {
                const isCurrentStation = station?.id === stationItem.id;
                return (
                  <motion.div
                    key={stationItem.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => playStation(stationItem)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                      isCurrentStation ? 'ring-2 ring-green-500 bg-green-500/10' : 'hover:bg-white/10'
                    }`}
                    style={{
                      borderColor: isCurrentStation ? 'var(--primary-color)' : 'var(--border-color)',
                      backgroundColor: 'var(--button-bg)'
                    }}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.05)'}}>
                      {stationItem.icon_url ? (
                        <img src={stationItem.icon_url} alt={stationItem.name} className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-8 h-8" style={{color: 'var(--text-secondary)'}} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate" style={{color: 'var(--text-primary)'}}>
                          {stationItem.name}
                        </h4>
                        {isCurrentStation && isPlaying && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-500 font-medium">Now Playing</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-[color:var(--text-secondary)] mt-1 line-clamp-2 min-h-[2.5rem]">
                        {stationItem.isLoadingMetadata ? (
                            <div className='flex items-center gap-2'><Loader2 className="w-4 h-4 animate-spin" /> <span>Loading...</span></div>
                        ) : (stationItem.metadata?.streamTitle) ? (
                            stationItem.metadata.streamTitle
                        ) : (
                            <span className="italic">Track info not available</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleRemoveStationFromPlaylist(stationItem); }}
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:bg-red-500/20 hover:text-red-300 opacity-50 hover:opacity-100 transition-opacity"
                        title="Remove from playlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main playlists view
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Your Playlists</h1>
          <p className="text-lg max-w-md mx-auto" style={{color: 'var(--text-secondary)'}}>
            Organize your favorite radio stations into custom playlists.
          </p>
        </motion.div>

        {/* Create/Edit Form */}
        <AnimatePresence>
          {(showCreateForm || editingPlaylist) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <div className="p-6 rounded-2xl border" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
                <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>
                  {editingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
                </h3>
                <form onSubmit={editingPlaylist ? handleUpdatePlaylist : handleCreatePlaylist} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>
                      Playlist Name *
                    </Label>
                    <Input
                      id="name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Enter playlist name"
                      className="mt-1"
                      style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>
                      Description (Optional)
                    </Label>
                    <Input
                      id="description"
                      value={newPlaylistDescription}
                      onChange={(e) => setNewPlaylistDescription(e.target.value)}
                      placeholder="Enter playlist description"
                      className="mt-1"
                      style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={!newPlaylistName.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {editingPlaylist ? 'Update' : 'Create'} Playlist
                    </Button>
                    <Button
                      type="button"
                      onClick={editingPlaylist ? cancelEditing : () => setShowCreateForm(false)}
                      variant="outline"
                      style={{borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Button */}
        {!showCreateForm && !editingPlaylist && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Playlist
            </Button>
          </motion.div>
        )}

        {/* Playlists List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{color: 'var(--text-primary)'}} />
            <p style={{color: 'var(--text-secondary)'}}>Loading playlists...</p>
          </div>
        ) : playlists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center rounded-2xl p-12"
            style={{backgroundColor: 'var(--button-bg)'}}
          >
            <Music className="w-16 h-16 mx-auto mb-6" style={{color: 'var(--text-secondary)'}} />
            <h3 className="text-2xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>No Playlists Yet</h3>
            <p className="mb-6" style={{color: 'var(--text-secondary)'}}>
              Create your first playlist to organize your favorite stations.
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Playlist
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group rounded-2xl border hover:shadow-lg transition-all flex flex-col"
                style={{
                  backgroundColor: 'var(--button-bg)', 
                  borderColor: 'var(--border-color)',
                }}
              >
                <div 
                  className="p-6 cursor-pointer flex-grow"
                  onClick={() => openPlaylist(playlist)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4 text-[color:var(--text-secondary)] group-hover:text-[color:var(--text-primary)] transition-colors" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="bg-slate-800/95 border-white/20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            startEditing(playlist); 
                          }}
                          className="text-white hover:bg-white/10"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDeletePlaylist(playlist); 
                          }}
                          className="text-red-400 hover:!text-red-300 hover:!bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="text-lg font-bold mb-2 truncate" style={{color: 'var(--text-primary)'}}>
                    {playlist.name}
                  </h3>
                  {playlist.description && (
                    <p className="text-sm mb-3 line-clamp-2" style={{color: 'var(--text-secondary)'}}>
                      {playlist.description}
                    </p>
                  )}
                  <p className="text-xs mt-auto" style={{color: 'var(--text-secondary)'}}>
                    Created {new Date(playlist.created_date).toLocaleDateString()}
                  </p>
                </div>
                
                {/* Reorder Controls */}
                <div 
                  className="flex justify-between items-center p-2 border-t"
                  style={{borderColor: 'var(--border-color)'}}
                >
                   <p className="text-xs pl-2" style={{color: 'var(--text-secondary)'}}>Move</p>
                  <div className="flex gap-1">
                     <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {e.stopPropagation(); handleReorder(index, -1)}}
                      disabled={index === 0}
                      className="disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {e.stopPropagation(); handleReorder(index, 1)}}
                      disabled={index === playlists.length - 1}
                      className="disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
