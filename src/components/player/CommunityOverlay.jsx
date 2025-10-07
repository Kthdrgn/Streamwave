import React, { useState, useEffect, useCallback } from 'react';
import { RadioStation } from '@/api/entities';
import { User } from '@/api/entities'; // Import User entity
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search, Users, Play, ArrowUpDown, List, Grid, Radio, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from './PlayerContext';

export default function CommunityOverlay({ isOpen, onClose, onStationSelect, preselectedGenre, preselectedFilter, preselectedSort, preselectedSearch }) {
  const [allStations, setAllStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [availableGenres, setAvailableGenres] = useState([]);
  const [isCompactView, setIsCompactView] = useState(true);

  // State for on-demand metadata
  const [stationMetadatas, setStationMetadatas] = useState({});
  const [fetchingMetadataFor, setFetchingMetadataFor] = useState(null);

  const { station: playerStation, metadata, isLoadingMetadata } = usePlayer();

  useEffect(() => {
    if (isOpen) {
        // Reset all filters first to ensure a clean state when opening
        setSearchQuery('');
        setSelectedGenre('all');
        setSortBy('name_asc');
        
        // Then apply preselected filters/sorts if they exist
        if (preselectedGenre) {
            setSelectedGenre(preselectedGenre);
        }
        if (preselectedSearch) {
            setSearchQuery(preselectedSearch);
        }
        if (preselectedSort) {
            setSortBy(preselectedSort);
        }
        // Reset on-demand metadata when overlay opens
        setStationMetadatas({});
        setFetchingMetadataFor(null);
    }
  }, [isOpen, preselectedGenre, preselectedFilter, preselectedSort, preselectedSearch]);

  const loadStations = useCallback(async () => {
    if (!isOpen) return;
    
    setLoading(true);
    try {
      const stationsData = await RadioStation.list().catch(() => []);
      
      setAllStations(stationsData || []);
      
      // Extract unique genres
      const genres = new Set();
      (stationsData || []).forEach(station => {
        if (station.genres && Array.isArray(station.genres)) {
          station.genres.forEach(genre => genres.add(genre));
        }
      });
      setAvailableGenres(Array.from(genres).sort());
      
    } catch (error) {
      console.error('Failed to load stations:', error);
      setAllStations([]);
    }
    setLoading(false);
  }, [isOpen, setAllStations, setLoading, setAvailableGenres]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  const applyFilters = useCallback(async () => {
    let processed = [...allStations];

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      processed = processed.filter(station => 
        station.name.toLowerCase().includes(searchLower) ||
        (station.call_letters && station.call_letters.toLowerCase().includes(searchLower)) ||
        (station.frequency && station.frequency.toLowerCase().includes(searchLower)) ||
        (station.genres && station.genres.some(g => g.toLowerCase().includes(searchLower)))
      );
    }

    // Genre filter
    if (selectedGenre !== 'all') {
      processed = processed.filter(station => 
        station.genres && station.genres.includes(selectedGenre)
      );
    }

    // Load user-specific play history and counts, fallback to localStorage
    let playCountData = {};
    let recentData = [];
    
    try {
      const user = await User.me();
      playCountData = user.station_play_counts || {};
      recentData = user.recently_played_stations || [];
    } catch (error) {
      console.error('Failed to load user data for sorting:', error);
      // Fallback to localStorage
      try {
        const localPlayCountData = localStorage.getItem('stationPlayCounts');
        if (localPlayCountData) {
          playCountData = JSON.parse(localPlayCountData);
        }
        const localRecentData = localStorage.getItem('recentlyPlayedStations');
        if (localRecentData) {
          recentData = JSON.parse(localRecentData);
        }
      } catch (localError) {
        console.error('Failed to load localStorage fallback data:', localError);
      }
    }

    const myPlayCounts = new Map(Object.entries(playCountData).map(([url, data]) => [url, data.playCount || 0]));
    const myRecentOrder = new Map(recentData.map((station, index) => [station.url, recentData.length - index]));

    // Sort based on selection
    if (sortBy === 'my_most_played') {
      processed.sort((a, b) => (myPlayCounts.get(b.url) || 0) - (myPlayCounts.get(a.url) || 0));
    } else if (sortBy === 'my_recently_played') {
      processed.sort((a, b) => (myRecentOrder.get(b.url) || -1) - (myRecentOrder.get(a.url) || -1));
    } else if (sortBy === 'community_most_played') {
      processed.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
    } else if (sortBy === 'community_recent') {
      processed.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
    } else if (sortBy === 'name_asc') {
      processed.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name_desc') {
      processed.sort((a, b) => b.name.localeCompare(a.name));
    }

    setFilteredStations(processed);
  }, [allStations, searchQuery, selectedGenre, sortBy]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleStationClick = (station) => {
    onStationSelect(station);
    onClose();
  };

  const handleFetchStationMetadata = async (e, station) => {
    e.stopPropagation();
    if (fetchingMetadataFor === station.id) return;

    setFetchingMetadataFor(station.id);
    try {
        const { getStreamMetadata } = await import('@/api/functions');
        const response = await getStreamMetadata({ streamUrl: station.url });

        if (response.data?.success) {
            setStationMetadatas(prev => ({ ...prev, [station.id]: response.data }));
        } else {
            setStationMetadatas(prev => ({ ...prev, [station.id]: { error: 'Info not available' } }));
        }
    } catch (error) {
        console.error('Error fetching on-demand metadata:', error);
        setStationMetadatas(prev => ({ ...prev, [station.id]: { error: 'Failed to load' } }));
    } finally {
        setFetchingMetadataFor(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setSortBy('name_asc');
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
          className="w-full max-w-4xl h-[85vh] bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden"
        >
          {/* Scrollable Content */}
          <div className="h-full overflow-y-auto">
            {/* Compact Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-4 z-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Community Stations
                </h2>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  className="text-slate-100 hover:bg-white/20 rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Search and Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300 pointer-events-none" />
                  <Input
                    type="search"
                    placeholder="Search stations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white/10 border-white/20 text-slate-100 placeholder:text-slate-300 focus:border-blue-400 h-9 text-sm"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                    <SelectTrigger className="w-28 bg-white/10 border-white/20 text-slate-100 h-8 text-xs">
                      <SelectValue placeholder="Genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genres</SelectItem>
                      {availableGenres.map((genre) => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48 bg-white/10 border-white/20 text-slate-100 h-8 text-xs">
                       <div className="flex items-center gap-1">
                        <ArrowUpDown className="w-3 h-3" />
                        <SelectValue placeholder="Sort by" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="my_most_played">My Most Played</SelectItem>
                      <SelectItem value="my_recently_played">My Recently Played</SelectItem>
                      <SelectItem value="community_most_played">Community Most Played</SelectItem>
                      <SelectItem value="community_recent">Community Recently Added</SelectItem>
                      <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    size="sm"
                    className="text-cyan-300 hover:text-slate-100 hover:bg-white/10 text-xs h-8 px-2"
                  >
                    Clear
                  </Button>
                  
                  <div className="flex-grow"></div> {/* Spacer */}

                  <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsCompactView(!isCompactView)}
                      className="text-slate-100 hover:bg-white/20 h-8 w-8 bg-white/10 border-white/20"
                      title={isCompactView ? "Switch to List View" : "Switch to Grid View"}
                  >
                      {isCompactView ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-slate-100">Loading stations...</div>
                </div>
              ) : filteredStations.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-slate-100">No stations match your search.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 text-cyan-300 text-xs">
                    {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''} found
                  </div>
                  
                  {isCompactView ? (
                    // COMPACT GRID VIEW
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-2">
                      {filteredStations.map((station, index) => (
                        <motion.div
                          key={`${station.id}-compact`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.01 * index }}
                          className="relative group"
                        >
                          <div
                            onClick={() => handleStationClick(station)}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 border border-white/20 bg-white/10 hover:border-white/40"
                          >
                            {station.icon_url ? (
                              <img 
                                src={station.icon_url} 
                                alt={station.name}
                                className="w-full h-full object-cover"
                                title={station.name}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-4 h-4 text-slate-100" />
                              </div>
                            )}
                          </div>
                          
                          {/* Station name */}
                          <p className="text-xs text-slate-100 text-center mt-1 truncate leading-tight" title={station.name}>
                            {station.name}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    // DETAILED LIST VIEW
                    <div className="space-y-3">
                      {filteredStations.map((station, index) => {
                        const isCurrentlyPlaying = playerStation?.id === station.id;
                        const stationMetadata = stationMetadatas[station.id];
                        
                        // Determine which metadata to show
                        let displayMetadata;
                        if (isCurrentlyPlaying) {
                          displayMetadata = metadata; // Use live metadata from player
                        } else if (stationMetadata && !stationMetadata.error) {
                          displayMetadata = stationMetadata.metadata; // Use on-demand fetched metadata
                        }

                        const isFetchingThisStation = fetchingMetadataFor === station.id;

                        return (
                          <motion.div
                            key={`${station.id}-detailed`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.02 * index }}
                            className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-white/5 rounded-lg border border-transparent hover:border-white/20 transition-colors"
                          >
                            {/* Icon */}
                            <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center">
                                {station.icon_url ? (
                                    <img src={station.icon_url} alt={station.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Radio className="w-8 h-8 text-slate-300" />
                                )}
                            </div>
                    
                            {/* Info */}
                            <div className="flex-1 min-w-0 text-center sm:text-left">
                                <h3 className="text-base font-semibold text-white truncate">{station.name}</h3>
                                {station.description && <p className="text-xs text-slate-300 mt-1 line-clamp-2">{station.description}</p>}
                                 {(station.genres && station.genres.length > 0) && (
                                    <div className="flex flex-wrap gap-1 mt-2 justify-center sm:justify-start">
                                        {station.genres.slice(0, 3).map(genre => (
                                            <span key={genre} className="px-2 py-0.5 bg-blue-500/20 text-blue-200 rounded-full text-xs">{genre}</span>
                                        ))}
                                    </div>
                                )}
                                {/* Now Playing Metadata Section */}
                                {(displayMetadata?.streamTitle || isFetchingThisStation || stationMetadata?.error) && (
                                    <div className="mt-2 p-2 bg-black/20 rounded-md border border-white/10">
                                        {isFetchingThisStation ? (
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                <span>Loading track info...</span>
                                            </div>
                                        ) : displayMetadata?.streamTitle ? (
                                            <div>
                                                <p className="text-xs text-blue-300 font-medium">Now Playing:</p>
                                                <p className="text-sm text-white line-clamp-2" title={displayMetadata.streamTitle}>
                                                    {displayMetadata.streamTitle}
                                                </p>
                                            </div>
                                        ) : (
                                             <p className="text-xs text-slate-400 italic">{stationMetadata?.error || 'Track info not available'}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                    
                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3 sm:mt-0">
                                <Button
                                  onClick={(e) => handleFetchStationMetadata(e, station)}
                                  size="icon"
                                  variant="ghost"
                                  className="w-9 h-9 text-slate-300 hover:bg-white/10 hover:text-white"
                                  disabled={isFetchingThisStation}
                                  title="Check current track"
                                >
                                  {isFetchingThisStation ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                </Button>
                                <Button
                                    onClick={() => handleStationClick(station)}
                                    size="sm"
                                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-9 flex-shrink-0"
                                >
                                    <Play className="w-4 h-4 mr-2" />
                                    <span className="whitespace-nowrap">Play</span>
                                </Button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}