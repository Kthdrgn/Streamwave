import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { RadioStation } from '@/api/entities';
import { Podcast } from '@/api/entities';
import { usePlayer } from '../components/player/PlayerContext';
import StationCarousel from '../components/home/StationCarousel';
import ExploreSection from '../components/home/ExploreSection';

export default function Discover() {
    const [communityStations, setCommunityStations] = useState({ recentlyAdded: [], mostPlayed: [] });
    const [popularPodcasts, setPopularPodcasts] = useState([]);
    const [dynamicDiscoverSections, setDynamicDiscoverSections] = useState([]);
    const [becauseYouListenedSections, setBecauseYouListenedSections] = useState([]);
    const [allStations, setAllStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);

    const { playStation, station, openOverlay, setSelectedPodcastFromAll } = usePlayer();

    useEffect(() => {
        loadDiscoverData();
    }, []);

    const loadDiscoverData = async () => {
        setLoading(true);
        try {
            // Fetch all stations
            const allStationsData = await RadioStation.list() || [];
            setAllStations(allStationsData);

            // Recently added stations
            const recentlyAdded = [...allStationsData]
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                .slice(0, 20);

            // Most played stations
            const communityMostPlayed = [...allStationsData]
                .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
                .slice(0, 20);

            setCommunityStations({ recentlyAdded, mostPlayed: communityMostPlayed });

            // Fetch popular podcasts
            const allPodcastsData = await Podcast.list() || [];
            const sortedPodcasts = allPodcastsData
                .sort((a, b) => {
                    const aEpisodes = a.episode_count || 0;
                    const bEpisodes = b.episode_count || 0;
                    
                    if (aEpisodes !== bEpisodes) {
                        return bEpisodes - aEpisodes;
                    }
                    
                    return new Date(b.created_date) - new Date(a.created_date);
                })
                .slice(0, 20);
            
            setPopularPodcasts(sortedPodcasts);

            // Load user's genre preferences for dynamic sections
            // (This would ideally come from user play history, simplified here)
            // For now, we'll show a few popular genres as discover sections

        } catch (error) {
            console.error('Failed to load discover data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStationSelect = (station) => {
        playStation(station);
    };

    const handleViewPodcastEpisodes = (podcast) => {
        if (setSelectedPodcastFromAll && openOverlay) {
            setSelectedPodcastFromAll(podcast);
            openOverlay('Podcasts');
        }
    };

    const handleViewAll = (title, stations) => {
        // You could implement a full-page view here if needed
        console.log('View all:', title, stations);
    };

    const handleExploreViewAll = (section) => {
        console.log('Explore view all:', section);
    };

    const handleDiscover = async () => {
        setIsLoadingDiscover(true);
        try {
            const excludedGenres = JSON.parse(localStorage.getItem('excludedGenres') || '[]');

            if (!Array.isArray(allStations) || allStations.length === 0) {
                alert("No community stations are available for discovery.");
                return;
            }

            const discoverableStations = allStations.filter(s => {
                const stationGenres = Array.isArray(s.genres) ? s.genres : [];
                if (stationGenres.length === 0) {
                    return !excludedGenres.includes('No Genres');
                }
                return !stationGenres.some(genre => excludedGenres.includes(genre));
            });

            if (discoverableStations.length === 0) { 
                alert("All available stations match your excluded genres. Change your Discover Preferences in Settings."); 
                return; 
            }
            
            const availableStations = station ? discoverableStations.filter(s => s.url !== station.url) : discoverableStations;
            
            if (availableStations.length === 0) { 
                alert("No other stations are available for discovery. Try adjusting your Discover Preferences in Settings."); 
                return; 
            }
            
            const randomIndex = Math.floor(Math.random() * availableStations.length);
            playStation(availableStations[randomIndex]);
        } catch (error) { 
            console.error('Failed to discover random station:', error); 
            alert("There was an error discovering stations. Please try again."); 
        } finally { 
            setIsLoadingDiscover(false); 
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };
    
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                <Loader2 className="w-8 h-8 animate-spin" style={{color: 'var(--text-primary)'}}/>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <motion.div 
                    className="space-y-10"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                                <Sparkles className="w-6 h-6" style={{color: 'var(--primary-color)'}} />
                                Find Your Next Favorite Station
                            </h3>
                            <p style={{color: 'var(--text-secondary)'}}>Explore new music and discover stations tailored to your taste</p>
                        </div>
                        <Button
                            onClick={handleDiscover}
                            disabled={isLoadingDiscover}
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white font-semibold px-8 py-3 h-12 rounded-full shadow-lg"
                        >
                            {isLoadingDiscover ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Discover a Station</>}
                        </Button>
                    </motion.div>

                    {communityStations.mostPlayed.length > 0 && (
                        <motion.div variants={itemVariants}>
                            <StationCarousel
                                title="Popular Radio Stations"
                                stations={communityStations.mostPlayed}
                                onStationSelect={handleStationSelect}
                                onViewAll={() => handleViewAll('Popular Radio Stations', communityStations.mostPlayed)}
                                size="small"
                            />
                        </motion.div>
                    )}

                    {popularPodcasts.length > 0 && (
                        <motion.div variants={itemVariants}>
                            <StationCarousel
                                title="Popular Podcasts"
                                stations={popularPodcasts.map(p => ({ 
                                    ...p, 
                                    icon_url: p.image_url,
                                    description: p.author,
                                    genres: ['Podcast']
                                }))}
                                onStationSelect={handleViewPodcastEpisodes}
                                size="small"
                            />
                        </motion.div>
                    )}

                    {allStations.length > 0 && (
                        <motion.div variants={itemVariants}>
                            <ExploreSection 
                                stations={allStations} 
                                onStationSelect={handleStationSelect}
                                onCategoryViewAll={handleExploreViewAll}
                            />
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}