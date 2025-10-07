
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { RadioStation } from '@/api/entities';
import { Playlist } from '@/api/entities';
import { PlaylistStation } from '@/api/entities';
import { Podcast } from '@/api/entities';
import { PodcastSubscription } from '@/api/entities';
import { Audiobook } from '@/api/entities';
import { usePlayer } from '../components/player/PlayerContext';
import { motion } from 'framer-motion';
import { Loader2, Search, Radio, MicVocal, Music, Activity, BookOpen, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StationCarousel from '../components/home/StationCarousel';
import WhatsPlayingNowSection from '../components/home/WhatsPlayingNowSection';
import StationListOverlay from '../components/stations/StationListOverlay';
import ExploreSection from '../components/home/ExploreSection';
import PlaylistCarousel from '../components/home/PlaylistCarousel';
import PodcastSection from '../components/home/PodcastSection';
import AudiobookSection from '../components/home/AudiobookSection';
import ContinueListeningSection from '../components/home/ContinueListeningSection';
import MyAudiobooksPage from './MyAudiobooks'; // Add this import

// New Section Header Component
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
            <Icon className="w-6 h-6" style={{color: 'var(--primary-color)'}}/>
            {title}
        </h2>
        {subtitle && (
            <p className="text-lg mt-1" style={{color: 'var(--text-secondary)'}}>
                {subtitle}
            </p>
        )}
    </div>
);

// Tab Button Component
const TabButton = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
            isActive ? 'shadow-lg' : ''
        }`}
        style={{
            backgroundColor: isActive ? 'var(--primary-color)' : 'var(--button-bg)',
            color: isActive ? '#ffffff' : 'var(--text-primary)',
            borderColor: 'var(--border-color)'
        }}
        onMouseEnter={(e) => {
            if (!isActive) {
                e.currentTarget.style.backgroundColor = 'var(--primary-color)';
                e.currentTarget.style.color = '#ffffff';
            }
        }}
        onMouseLeave={(e) => {
            if (!isActive) {
                e.currentTarget.style.backgroundColor = 'var(--button-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
            }
        }}
    >
        <Icon className="w-5 h-5" />
        {label}
    </button>
);

export default function Home() {
    const [userData, setUserData] = useState({ mostPlayed: [] });
    const [playlists, setPlaylists] = useState([]);
    const [subscribedPodcasts, setSubscribedPodcasts] = useState([]);
    const [popularPodcasts, setPopularPodcasts] = useState([]);
    // podcastProgress is now sourced from usePlayer()
    const [communityStations, setCommunityStations] = useState({ recentlyAdded: [], mostPlayed: [] });
    const [dynamicDiscoverSections, setDynamicDiscoverSections] = useState([]);
    const [becauseYouListenedSections, setBecauseYouListenedSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);
    const [allStations, setAllStations] = useState([]);
    const [audiobooks, setAudiobooks] = useState([]); // New state for audiobooks
    
    // New state for active tab - changed from 'radio', 'podcasts', 'discover' to 'radio', 'podcasts', 'audiobooks'
    const [activeTab, setActiveTab] = useState('continueListening');

    // State for the new list overlay
    const [isListOverlayOpen, setIsListOverlayOpen] = useState(false);
    const [overlayStations, setOverlayStations] = useState([]);
    const [overlayTitle, setOverlayTitle] = useState('');

    const { playStation, station, recentlyPlayed, openCommunityOverlay, switchOverlay, openOverlay, openPlaylistView, setSelectedPodcastFromAll } = usePlayer();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch user-specific data (play counts only - recently played comes from PlayerContext)
                const user = await User.me();
                const playCounts = user.station_play_counts || {};
                // podcast_progress is now managed by PlayerContext
                
                // Filter most played to only include radio stations (exclude podcasts)
                const mostPlayed = Object.values(playCounts)
                    .filter(station => {
                        // Only include stations that don't have 'Podcast' in their genres
                        const genres = station.genres || [];
                        return !genres.includes('Podcast');
                    })
                    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
                    .slice(0, 20);

                setUserData({ mostPlayed });

                // Fetch all podcasts data once for both subscribed and popular sections
                const allPodcastsData = await Podcast.list(); 

                // --- NEW SUBSCRIBED PODCASTS FETCHING LOGIC ---
                const subscriptions = await PodcastSubscription.list();
                if (subscriptions.length > 0) {
                    const podcastIds = subscriptions.map(sub => sub.podcast_id);
                    const userSubscribedPodcasts = allPodcastsData.filter(p => podcastIds.includes(p.id));

                    const podcastsWithSubDate = userSubscribedPodcasts.map(podcast => {
                        const subscription = subscriptions.find(sub => sub.podcast_id === podcast.id);
                        return {
                            ...podcast,
                            // Use subscribed_at if available, fallback to created_date
                            subscribed_at: subscription?.subscribed_at || podcast.created_date 
                        };
                    });
                    // Sort by subscribed_at descending (most recently subscribed first)
                    podcastsWithSubDate.sort((a, b) => new Date(b.subscribed_at) - new Date(a.subscribed_at));
                    
                    setSubscribedPodcasts(podcastsWithSubDate);
                } else {
                    setSubscribedPodcasts([]); // Ensure state is reset if no subscriptions
                }
                // --- END NEW LOGIC ---

                // --- NEW POPULAR PODCASTS FETCHING LOGIC ---
                if (allPodcastsData && allPodcastsData.length > 0) {
                    // Sort podcasts by episode count (descending) and then by creation date (newest first)
                    const sortedPodcasts = allPodcastsData
                        .sort((a, b) => {
                            const aEpisodes = a.episode_count || 0;
                            const bEpisodes = b.episode_count || 0;
                            
                            if (aEpisodes !== bEpisodes) {
                                return bEpisodes - aEpisodes; // Higher episode count first
                            }
                            
                            // If episode counts are equal, sort by creation date (newest first)
                            return new Date(b.created_date) - new Date(a.created_date);
                        })
                        .slice(0, 20); // Take top 20 popular podcasts
                    
                    setPopularPodcasts(sortedPodcasts);
                } else {
                    setPopularPodcasts([]);
                }
                // --- END POPULAR PODCASTS LOGIC ---

                // --- NEW PLAYLIST FETCHING LOGIC ---
                const rawPlaylists = await Playlist.list() || [];
                let currentAllStationsData = []; // Temporary variable to hold all stations for subsequent logic

                if (rawPlaylists.length > 0) {
                    // Ensure playlists have sort_order values and sort them properly
                    const playlistsWithOrder = rawPlaylists.map((playlist, index) => ({
                        ...playlist,
                        sort_order: playlist.sort_order ?? index
                    }));

                    // Sort by sort_order, then by created_date for ties (same as Playlists page)
                    playlistsWithOrder.sort((a, b) => {
                        if (a.sort_order !== b.sort_order) {
                            return a.sort_order - b.sort_order;
                        }
                        return new Date(b.created_date) - new Date(a.created_date);
                    });
                    
                    const playlistIds = playlistsWithOrder.map(p => p.id);
                    
                    // Fetch all relations and stations in parallel
                    const [playlistStationRelations, allStationsFetched] = await Promise.all([
                        PlaylistStation.filter({ playlist_id: { '$in': playlistIds } }),
                        RadioStation.list()
                    ]);
                    currentAllStationsData = allStationsFetched || [];
                    
                    const stationMap = new Map(currentAllStationsData.map(s => [s.id, s]));
                    
                    const relationsByPlaylist = (playlistStationRelations || []).reduce((acc, rel) => {
                        if (!acc[rel.playlist_id]) {
                            acc[rel.playlist_id] = [];
                        }
                        acc[rel.playlist_id].push(rel.station_id);
                        return acc;
                    }, {});

                    const playlistsWithArt = playlistsWithOrder.map(playlist => {
                        const stationIds = relationsByPlaylist[playlist.id] || [];
                        const stationIcons = stationIds
                            .map(id => stationMap.get(id)?.icon_url)
                            .filter(Boolean) // Remove null/undefined icons
                            .slice(0, 4); // Take the first 4 icons
                        
                        return {
                            ...playlist,
                            stationIcons,
                            stationCount: stationIds.length,
                        };
                    });

                    setPlaylists(playlistsWithArt);
                    setAllStations(currentAllStationsData); // Set state for Explore section
                } else {
                    setPlaylists([]);
                    const allStationsFetched = await RadioStation.list() || [];
                    currentAllStationsData = allStationsFetched;
                    setAllStations(currentAllStationsData);
                }
                // --- END NEW PLAYLIST FETCHING LOGIC ---

                // --- NEW: Fetch audiobooks ---
                const userAudiobooks = await Audiobook.list('-created_date');
                setAudiobooks(userAudiobooks);
                // --- END NEW ---

                // Fetch community-wide data (uses currentAllStationsData which is guaranteed to be set)
                const recentlyAdded = [...currentAllStationsData]
                    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                    .slice(0, 20);

                const communityMostPlayed = [...currentAllStationsData]
                    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
                    .slice(0, 20);

                setCommunityStations({ recentlyAdded, mostPlayed: communityMostPlayed });

                // --- DYNAMIC DISCOVER LOGIC (based on listening history) ---
                const genreCounts = {};
                // Use user's play counts to determine genre preference
                Object.values(playCounts).forEach(stationData => {
                    if (stationData.genres && Array.isArray(stationData.genres)) {
                        const count = stationData.playCount || 0;
                        stationData.genres.forEach(genre => {
                            genreCounts[genre] = (genreCounts[genre] || 0) + count;
                        });
                    }
                });

                // Sort genres by play count
                const sortedGenres = Object.entries(genreCounts)
                    .sort(([, countA], [, countB]) => countB - countA)
                    .map(([genre]) => genre);
                
                // Define genres that are already displayed in other sections to avoid duplication
                const excludedGenres = ['Public'];

                // Select top 2 genres for the main Discover section
                const topDiscoverGenres = sortedGenres
                    .filter(genre => !excludedGenres.includes(genre))
                    .slice(0, 2);

                // Create the dynamic discover sections
                const discoverSectionsData = topDiscoverGenres.map(genre => {
                    const stationsForGenre = currentAllStationsData
                        .filter(s => s.genres?.includes(genre))
                        .slice(0, 20);
                    return {
                        title: `Because You Like ${genre}`,
                        stations: stationsForGenre
                    };
                }).filter(section => section.stations.length > 0);

                setDynamicDiscoverSections(discoverSectionsData);

                // Create additional "Because you listened to..." sections
                // Exclude genres already used in discover sections and other static sections
                const usedGenres = [...excludedGenres, ...topDiscoverGenres];
                const additionalGenres = sortedGenres
                    .filter(genre => !usedGenres.includes(genre))
                    .slice(0, 2); // Get next 2 genres

                const becauseYouListenedData = additionalGenres.map(genre => {
                    const stationsForGenre = currentAllStationsData
                        .filter(s => s.genres?.includes(genre))
                        .slice(0, 20);
                    return {
                        title: `Because You Listened to ${genre}`,
                        stations: stationsForGenre
                    };
                }).filter(section => section.stations.length > 0);

                setBecauseYouListenedSections(becauseYouListenedData);

            } catch (error) {
                console.error("Failed to fetch homepage data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleStationSelect = (station) => {
        playStation(station);
    };

    const handleViewAll = (title, stations) => {
        setOverlayTitle(title);
        setOverlayStations(stations);
        setIsListOverlayOpen(true);
    };

    // New handler for individual playlist selection
    const handlePlaylistSelect = (playlist) => {
        if (openPlaylistView) {
            openPlaylistView(playlist.id);
        }
    };
    
    // Handler for "View All" playlists button
    const handleViewAllPlaylists = () => {
        openOverlay('Playlists');
    };
    
    // New handler for podcasts
    const handleViewAllPodcasts = () => {
        openOverlay('Podcasts');
    };
    
    // New handler to open a podcast's episode list
    const handleViewPodcastEpisodes = (podcast) => {
        if (setSelectedPodcastFromAll && openOverlay) {
            setSelectedPodcastFromAll(podcast);
            openOverlay('Podcasts');
        }
    };

    // New handler for ExploreSection's "View All" buttons
    const handleExploreViewAll = (section) => {
        let filtered = [];
        const title = section.title;

        const categoryFilters = {
            'Radio Paradise': (s) => s.call_letters?.toLowerCase() === 'radio paradise',
            'SomaFM': (s) => s.call_letters?.toLowerCase().includes('somafm'),
            'YouRadio': (s) => s.call_letters?.toLowerCase().includes('youradio'),
            'Exclusive Radio': (s) => s.name?.toLowerCase().includes('exclusive radio'),
            'Public': (s) => s.genres?.includes('Public'),
            'YourClassical': (s) => s.name?.toLowerCase().includes('yourclassical'),
            'Positivity Radio': (s) => s.name?.toLowerCase().includes('positivity radio')
        };
        
        const filterFunction = categoryFilters[title];
        if (filterFunction) {
            filtered = allStations.filter(filterFunction);
        } else if (section.isGenre) { // Handle genre-based sections from ExploreSection
            filtered = allStations.filter(s => s.genres?.includes(title));
        }
        
        // Now call the generic handler to open the overlay
        handleViewAll(title, filtered);
    };

    const handleDiscover = async () => {
        setIsLoadingDiscover(true);
        try {
            const excludedGenres = JSON.parse(localStorage.getItem('excludedGenres') || '[]');
            const allStationsForDiscover = await RadioStation.list(); // Re-fetch to ensure latest data or use `allStations` state if guaranteed fresh

            if (!Array.isArray(allStationsForDiscover) || allStationsForDiscover.length === 0) {
                alert("No community stations are available for discovery.");
                return;
            }

            const discoverableStations = allStationsForDiscover.filter(s => {
                const stationGenres = Array.isArray(s.genres) ? s.genres : [];
                if (stationGenres.length === 0) {
                    return !excludedGenres.includes('No Genres');
                }
                return !stationGenres.some(genre => excludedGenres.includes(genre));
            });

            if (discoverableStations.length === 0) { 
                alert(allStationsForDiscover.length > 0 ? "All available stations match your excluded genres. Change your Discover Preferences in Settings." : "No community stations are available for discovery."); 
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

    const handleViewWhatsPlaying = () => {
        if (switchOverlay) {
            switchOverlay('WhatsPlayingNow');
        }
    };

    // New handler for Continue Listening "View All"
    const handleViewAllInProgress = () => {
        openOverlay('InProgressEpisodes');
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

    // Define tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case 'continueListening':
                return (
                    <motion.div
                        className="space-y-8"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div variants={itemVariants}>
                            <ContinueListeningSection
                                onViewAll={handleViewAllInProgress}
                            />
                        </motion.div>

                        {recentlyPlayed.length > 0 && (
                            <motion.div variants={itemVariants}>
                                <StationCarousel
                                    title="Recently Played Stations"
                                    stations={recentlyPlayed}
                                    onStationSelect={handleStationSelect}
                                    onViewAll={() => handleViewAll('Recently Played Stations', recentlyPlayed)}
                                />
                            </motion.div>
                        )}
                    </motion.div>
                );
            case 'radio':
                return (
                    <motion.div 
                        className="space-y-8"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {userData.mostPlayed.length > 0 && (
                            <motion.div variants={itemVariants}>
                                <StationCarousel
                                    title="Your Most Played"
                                    stations={userData.mostPlayed}
                                    onStationSelect={handleStationSelect}
                                    onViewAll={() => handleViewAll('Your Most Played', userData.mostPlayed)}
                                />
                            </motion.div>
                        )}
                        
                        {playlists.length > 0 && (
                            <motion.div variants={itemVariants}>
                                <PlaylistCarousel
                                    title="Your Playlists"
                                    playlists={playlists}
                                    onPlaylistSelect={handlePlaylistSelect}
                                    onViewAll={handleViewAllPlaylists}
                                />
                            </motion.div>
                        )}

                        <motion.div variants={itemVariants}>
                            <WhatsPlayingNowSection onViewAll={handleViewWhatsPlaying} />
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>Find Your Next Favorite Station</h3>
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

                        {/* DYNAMIC SECTIONS RENDERED HERE */}
                        {dynamicDiscoverSections.map((section, index) => (
                            <motion.div key={section.title} variants={itemVariants}>
                                <StationCarousel
                                    title={section.title}
                                    stations={section.stations}
                                    onStationSelect={handleStationSelect}
                                    onViewAll={() => handleViewAll(section.title, section.stations)}
                                    size="small"
                                />
                            </motion.div>
                        ))}

                        {/* "BECAUSE YOU LISTENED TO" SECTIONS */}
                        {becauseYouListenedSections.map((section, index) => (
                            <motion.div key={section.title} variants={itemVariants}>
                                <StationCarousel
                                    title={section.title}
                                    stations={section.stations}
                                    onStationSelect={handleStationSelect}
                                    onViewAll={() => handleViewAll(section.title, section.stations)}
                                    size="small"
                                />
                            </motion.div>
                        ))}

                        {/* EXPLORE SECTION */}
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
                );
                
            case 'podcasts':
                return (
                    <motion.div 
                        className="space-y-8"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {subscribedPodcasts.length > 0 && (
                            <motion.div variants={itemVariants}>
                                <StationCarousel
                                    title="Your Subscribed Podcasts"
                                    stations={subscribedPodcasts.map(p => ({ 
                                        ...p, 
                                        icon_url: p.image_url,
                                        description: p.author,
                                        genres: ['Podcast']
                                    }))}
                                    onStationSelect={handleViewPodcastEpisodes}
                                    onViewAll={handleViewAllPodcasts}
                                />
                            </motion.div>
                        )}
                        
                        <motion.div variants={itemVariants}>
                            <PodcastSection onViewAll={handleViewAllPodcasts} />
                        </motion.div>

                        {/* NEW POPULAR PODCASTS SECTION */}
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
                                    onViewAll={handleViewAllPodcasts}
                                    size="small"
                                />
                            </motion.div>
                        )}
                    </motion.div>
                );
                
            case 'audiobooks':
                return (
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <MyAudiobooksPage />
                    </motion.div>
                );
                
            default:
                return null;
        }
    };

    return (
        <div className="p-4 sm:p-6 pb-24">
            <div className="max-w-7xl mx-auto">
                {/* Tab Navigation */}
                <div className="flex gap-2 mb-8 p-2 rounded-2xl border overflow-x-auto scrollbar-hide" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
                    <TabButton 
                        icon={Clock} 
                        label="Continue Listening" 
                        isActive={activeTab === 'continueListening'} 
                        onClick={() => setActiveTab('continueListening')} 
                    />
                    <TabButton 
                        icon={Radio} 
                        label="My Radio" 
                        isActive={activeTab === 'radio'} 
                        onClick={() => setActiveTab('radio')} 
                    />
                    <TabButton 
                        icon={MicVocal} 
                        label="My Podcasts" 
                        isActive={activeTab === 'podcasts'} 
                        onClick={() => setActiveTab('podcasts')} 
                    />
                    <TabButton 
                        icon={BookOpen} 
                        label="My Audiobooks" 
                        isActive={activeTab === 'audiobooks'} 
                        onClick={() => setActiveTab('audiobooks')} 
                    />
                </div>

                {/* Tab Content */}
                <div className="min-h-[50vh]">
                    {renderTabContent()}
                </div>
            </div>

            <StationListOverlay
                isOpen={isListOverlayOpen}
                onClose={() => setIsListOverlayOpen(false)}
                title={overlayTitle}
                stations={overlayStations}
            />
        </div>
    );
}
