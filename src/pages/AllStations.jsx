
import React, { useState, useEffect, useCallback } from 'react';
import { RadioStation } from '@/api/entities';
import { User } from '@/api/entities';
import { usePlayer } from '../components/player/PlayerContext';
import StationCard from '../components/stations/StationCard';
import SaveToPlaylistDialog from '../components/stations/SaveToPlaylistDialog'; // Import the dialog
import { motion } from 'framer-motion';
import { Loader2, Search, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function AllStationsPage() {
    const [allStations, setAllStations] = useState([]);
    const [filteredStations, setFilteredStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('all');
    const [sortBy, setSortBy] = useState('community_most_played');
    const [availableGenres, setAvailableGenres] = useState([]);
    
    // State for the playlist dialog
    const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
    const [stationToAddToPlaylist, setStationToAddToPlaylist] = useState(null);

    const { playStation, closeOverlay } = usePlayer();

    const loadStations = useCallback(async () => {
        setLoading(true);
        try {
            const stationsData = await RadioStation.list().catch(() => []);
            setAllStations(stationsData || []);
            
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
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStations();
    }, [loadStations]);

    const applyFiltersAndSort = useCallback(async () => {
        let processed = [...allStations];

        // Search filter
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            processed = processed.filter(station => 
                station.name.toLowerCase().includes(searchLower) ||
                (station.call_letters && station.call_letters.toLowerCase().includes(searchLower)) ||
                (station.genres && station.genres.some(g => g.toLowerCase().includes(searchLower)))
            );
        }

        // Genre filter
        if (selectedGenre !== 'all') {
            processed = processed.filter(station => 
                station.genres && station.genres.includes(selectedGenre)
            );
        }

        let playCountData = {};
        try {
            const user = await User.me();
            playCountData = user.station_play_counts || {};
        } catch (error) {
            console.warn('Could not load user data for sorting.');
        }

        const myPlayCounts = new Map(Object.entries(playCountData).map(([url, data]) => [url, data.playCount || 0]));

        // Sorting
        switch (sortBy) {
            case 'my_most_played':
                processed.sort((a, b) => (myPlayCounts.get(b.url) || 0) - (myPlayCounts.get(a.url) || 0));
                break;
            case 'community_most_played':
                processed.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
                break;
            case 'community_recent':
                processed.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
                break;
            case 'name_asc':
                processed.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name_desc':
                processed.sort((a, b) => b.name.localeCompare(a.name));
                break;
            default:
                break;
        }

        setFilteredStations(processed);
    }, [allStations, searchQuery, selectedGenre, sortBy]);

    useEffect(() => {
        applyFiltersAndSort();
    }, [applyFiltersAndSort]);

    const handleStationSelect = (station) => {
        playStation(station);
        if (closeOverlay) {
            closeOverlay();
        }
    };

    const handleAddToPlaylist = (station) => {
        setStationToAddToPlaylist(station);
        setIsPlaylistDialogOpen(true);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedGenre('all');
        setSortBy('community_most_played');
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            {/* Filter Bar */}
            <div className="mb-6 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <Input
                        type="search"
                        placeholder="Search stations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full"
                        style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                        <SelectTrigger className="w-[150px]" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}>
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
                        <SelectTrigger className="w-[200px]" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}>
                            <div className="flex items-center gap-1">
                                <ArrowUpDown className="w-3 h-3" />
                                <SelectValue placeholder="Sort by" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="community_most_played">Most Popular</SelectItem>
                            <SelectItem value="my_most_played">My Most Played</SelectItem>
                            <SelectItem value="community_recent">Recently Added</SelectItem>
                            <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Button
                        variant="ghost"
                        onClick={clearFilters}
                        size="sm"
                        style={{color: 'var(--primary-color)'}}
                    >
                        Clear
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex-grow flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text-primary)' }} />
                </div>
            ) : filteredStations.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                    <Search className="w-16 h-16 mb-4" style={{ color: 'var(--text-secondary)' }} />
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Stations Found</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>No stations match your current filters.</p>
                </div>
            ) : (
                <div className="flex-grow overflow-y-auto">
                    <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
                        Showing {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''}
                    </p>
                    <motion.div
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {filteredStations.map(station => (
                            <StationCard
                                key={station.id}
                                station={station}
                                onStationSelect={handleStationSelect}
                                onAddToPlaylist={handleAddToPlaylist}
                            />
                        ))}
                    </motion.div>
                </div>
            )}
            
            {/* Playlist Dialog */}
            <SaveToPlaylistDialog
                isOpen={isPlaylistDialogOpen}
                onClose={() => setIsPlaylistDialogOpen(false)}
                station={stationToAddToPlaylist}
            />
        </div>
    );
}
