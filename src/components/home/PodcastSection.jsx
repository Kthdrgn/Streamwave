
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Podcast as PodcastIcon, RefreshCw, Loader2 } from 'lucide-react';
import { Podcast } from '@/api/entities';
import { PodcastEpisode } from '@/api/entities';
import { PodcastSubscription } from '@/api/entities';
import { usePlayer } from '../player/PlayerContext';
import { parsePodcastRSS } from '@/api/functions';
import RecentEpisodeItem from './RecentEpisodeItem';

export default function PodcastSection({ onViewAll }) {
  const [recentEpisodes, setRecentEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { playStation } = usePlayer();

  useEffect(() => {
    loadRecentEpisodes();
  }, []);

  const loadRecentEpisodes = async () => {
    setLoading(true);
    try {
      const subscriptions = await PodcastSubscription.list();
      
      if (subscriptions.length === 0) {
        setRecentEpisodes([]); 
        setLoading(false); 
        return;
      }

      const subscribedPodcastIds = subscriptions.map(sub => sub.podcast_id);
      
      const allPodcasts = await Podcast.list();
      const subscribedPodcasts = allPodcasts.filter(p => subscribedPodcastIds.includes(p.id));
      
      if (subscribedPodcasts.length === 0) {
        setRecentEpisodes([]); 
        setLoading(false); 
        return;
      }

      const allEpisodes = await PodcastEpisode.filter(
        { podcast_id: { '$in': subscribedPodcastIds } },
        '-published_date', 20
      );

      const podcastMap = new Map(subscribedPodcasts.map(p => [p.id, p]));

      const episodesWithPodcasts = allEpisodes.map(episode => ({
        ...episode,
        name: episode.title,
        icon_url: podcastMap.get(episode.podcast_id)?.image_url,
        genres: ['Podcast'],
        call_letters: podcastMap.get(episode.podcast_id)?.name,
        podcast: podcastMap.get(episode.podcast_id)
      }));

      setRecentEpisodes(episodesWithPodcasts);
    } catch (error) {
      console.error('Failed to load recent episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshRecentEpisodes = async () => {
    setRefreshing(true);
    try {
      const subscriptions = await PodcastSubscription.list();
      
      if (subscriptions.length === 0) {
        setRefreshing(false);
        return;
      }

      const subscribedPodcastIds = subscriptions.map(sub => sub.podcast_id);
      const allPodcasts = await Podcast.list();
      const subscribedPodcasts = allPodcasts.filter(p => subscribedPodcastIds.includes(p.id));

      // Check each subscribed podcast for new episodes
      for (const podcast of subscribedPodcasts) {
        try {
          const result = await parsePodcastRSS({ rss_url: podcast.rss_url });
          
          if (!result.data.success) {
            console.warn(`Failed to refresh ${podcast.name}:`, result.data.error);
            continue;
          }

          const { episodes: newEpisodes } = result.data;
          const existingEpisodes = await PodcastEpisode.filter({ podcast_id: podcast.id });
          const existingGuids = new Set(existingEpisodes.map(ep => ep.guid));
          
          const newEpisodesToAdd = newEpisodes.filter(episode => !existingGuids.has(episode.guid));

          if (newEpisodesToAdd.length > 0) {
            const episodesToCreate = newEpisodesToAdd.map(episode => ({
              ...episode,
              podcast_id: podcast.id
            }));
            await PodcastEpisode.bulkCreate(episodesToCreate);
          }
        } catch (error) {
          console.warn(`Error refreshing ${podcast.name}:`, error);
        }
      }

      // Reload the episodes list to show new episodes
      await loadRecentEpisodes();

    } catch (error) {
      console.error('Failed to refresh recent episodes:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEpisodeSelect = (episode) => {
    const stationObject = {
      ...episode,
      url: episode.audio_url,
      name: episode.title,
    };
    playStation(stationObject);
  };
  
  const handleRemoveEpisode = (episodeId) => {
    setRecentEpisodes(prevEpisodes => prevEpisodes.filter(ep => ep.id !== episodeId));
  };

  if (loading || recentEpisodes.length === 0) {
    return null;
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>Recently Released Episodes</h3>
            <div className="flex items-center gap-2">
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={refreshRecentEpisodes}
                    disabled={refreshing}
                    className="flex items-center gap-2"
                    style={{color: 'var(--text-primary)'}}
                    title="Check for new episodes"
                >
                    {refreshing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    {refreshing ? 'Checking...' : 'Refresh'}
                </Button>
                {onViewAll && (
                    <Button variant="ghost" onClick={onViewAll} style={{color: 'var(--text-primary)'}}>
                        View all
                    </Button>
                )}
            </div>
        </div>
        <div className="space-y-3">
            {recentEpisodes.map(episode => (
                <RecentEpisodeItem 
                    key={episode.id} 
                    episode={episode} 
                    onPlay={handleEpisodeSelect} 
                    onRemove={handleRemoveEpisode}
                />
            ))}
        </div>
    </div>
  );
}
