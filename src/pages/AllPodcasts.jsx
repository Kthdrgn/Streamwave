import React, { useState, useEffect, useCallback } from 'react';
import { Podcast } from '@/api/entities';
import { PodcastSubscription } from '@/api/entities';
import { usePlayer } from '../components/player/PlayerContext';
import { motion } from 'framer-motion';
import { Loader2, Podcast as PodcastIcon, UserPlus, UserCheck, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PodcastGridItem = ({ podcast, onViewEpisodes, isSubscribed, onSubscriptionToggle, subscriptionLoading }) => (
    <motion.div
        variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 }
        }}
        className="w-full group"
    >
        <div 
            className="relative aspect-square rounded-lg overflow-hidden border transition-colors cursor-pointer" 
            style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
            onClick={() => onViewEpisodes(podcast)}
            title="View Episodes"
        >
            {podcast.image_url ? (
                <img src={podcast.image_url} alt={podcast.name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/10">
                    <PodcastIcon className="w-1/2 h-1/2 text-[color:var(--text-secondary)] opacity-50" />
                </div>
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="p-2 rounded-full bg-green-500 text-white">
                    <ArrowRight className="w-5 h-5" />
                </div>
            </div>

            {/* Subscribe/Unsubscribe Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onSubscriptionToggle(podcast);
                }}
                disabled={subscriptionLoading}
                className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-blue-500 transition-colors"
                title={isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            >
                {subscriptionLoading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : isSubscribed ? (
                    <UserCheck className="w-4 h-4 text-green-400" />
                ) : (
                    <UserPlus className="w-4 h-4 text-white" />
                )}
            </button>
        </div>
        <h4 className="mt-2 font-semibold truncate" style={{color: 'var(--text-primary)'}}>{podcast.name}</h4>
        <p className="text-sm truncate" style={{color: 'var(--text-secondary)'}}>{podcast.author}</p>
    </motion.div>
);

export default function AllPodcastsPage() {
    const [allPodcasts, setAllPodcasts] = useState([]);
    const [filteredPodcasts, setFilteredPodcasts] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subscriptionLoading, setSubscriptionLoading] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    
    const { setSelectedPodcastFromAll, switchOverlay, closeOverlay } = usePlayer();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [allPodcastsData, userSubscriptions] = await Promise.all([
                Podcast.list(),
                PodcastSubscription.list()
            ]);
            
            setAllPodcasts(allPodcastsData || []);
            setSubscriptions(userSubscriptions || []);
        } catch (error) {
            console.error("Failed to fetch podcasts or subscriptions:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const applyFiltersAndSort = useCallback(() => {
        let processed = [...allPodcasts];

        // Search filter
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            processed = processed.filter(podcast => 
                podcast.name.toLowerCase().includes(searchLower) ||
                (podcast.author && podcast.author.toLowerCase().includes(searchLower))
            );
        }

        // Sorting
        switch (sortBy) {
            case 'recent':
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

        setFilteredPodcasts(processed);
    }, [allPodcasts, searchQuery, sortBy]);

    useEffect(() => {
        applyFiltersAndSort();
    }, [applyFiltersAndSort]);

    const handleViewEpisodes = (podcast) => {
        if (setSelectedPodcastFromAll && switchOverlay) {
            setSelectedPodcastFromAll(podcast);
            switchOverlay('Podcasts');
        }
    };

    const handleSubscriptionToggle = async (podcast) => {
        setSubscriptionLoading(prev => ({ ...prev, [podcast.id]: true }));
        
        try {
            const existingSubscription = subscriptions.find(sub => sub.podcast_id === podcast.id);
            const isCurrentlySubscribed = !!existingSubscription;
            
            if (isCurrentlySubscribed) {
                await PodcastSubscription.delete(existingSubscription.id);
                setSubscriptions(prev => prev.filter(sub => sub.id !== existingSubscription.id));
            } else {
                const newSubscription = await PodcastSubscription.create({
                    podcast_id: podcast.id,
                    subscribed_at: new Date().toISOString()
                });
                setSubscriptions(prev => [...prev, newSubscription]);
            }
        } catch (error) {
            console.error("Failed to toggle subscription:", error);
            alert("Failed to update subscription. Please try again.");
        } finally {
            setSubscriptionLoading(prev => ({ ...prev, [podcast.id]: false }));
        }
    };
    
    const containerVariants = {
        hidden: {},
        visible: {
            transition: { staggerChildren: 0.05 }
        }
    };

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            {/* Filter Bar */}
            <div className="mb-6 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                    <Input
                        type="text"
                        placeholder="Search by podcast name or author..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 border h-12"
                        style={{ backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[200px]" style={{ backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent style={{ backgroundColor: 'var(--bg-from-color)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                            <SelectItem value="recent" className="focus:bg-[var(--button-bg)] focus:text-[var(--text-primary)]">Recently Added</SelectItem>
                            <SelectItem value="name_asc" className="focus:bg-[var(--button-bg)] focus:text-[var(--text-primary)]">Name (A-Z)</SelectItem>
                            <SelectItem value="name_desc" className="focus:bg-[var(--button-bg)] focus:text-[var(--text-primary)]">Name (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="flex-grow flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text-primary)' }} />
                </div>
            ) : filteredPodcasts.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                    <PodcastIcon className="w-16 h-16 mb-4" style={{ color: 'var(--text-secondary)' }} />
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Podcasts Found</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {searchQuery ? "Your search returned no results. Try another query." : "There are no podcasts in the database yet. Try adding one!"}
                    </p>
                </div>
            ) : (
                <div className="flex-grow overflow-y-auto">
                    <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
                        Showing {filteredPodcasts.length} podcast{filteredPodcasts.length !== 1 ? 's' : ''}
                    </p>
                    <motion.div 
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {filteredPodcasts.map(podcast => {
                            const isSubscribed = subscriptions.some(sub => String(sub.podcast_id) === String(podcast.id));
                            const isLoading = subscriptionLoading[podcast.id] || false;
                            
                            return (
                               <PodcastGridItem 
                                   key={podcast.id}
                                   podcast={podcast} 
                                   onViewEpisodes={handleViewEpisodes}
                                   isSubscribed={isSubscribed}
                                   onSubscriptionToggle={handleSubscriptionToggle}
                                   subscriptionLoading={isLoading}
                               />
                            );
                        })}
                    </motion.div>
                </div>
            )}
        </div>
    );
}