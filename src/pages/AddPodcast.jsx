
import React, { useState } from 'react';
import { Podcast } from '@/api/entities';
import { PodcastEpisode } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Podcast as PodcastIcon, CheckCircle, Rss, Link2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { parsePodcastRSS } from '@/api/functions';

export default function AddPodcast({ onClose, switchOverlay }) {
  const [rssUrl, setRssUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rssUrl.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // Parse the RSS feed
      const result = await parsePodcastRSS({ rss_url: rssUrl });

      if (!result.data.success) {
        setError(result.data.error || 'Failed to parse podcast RSS feed');
        setIsLoading(false);
        return;
      }

      const { podcast, episodes } = result.data;

      // Create the podcast
      const createdPodcast = await Podcast.create({
        ...podcast,
        rss_url: rssUrl,
        last_updated: new Date().toISOString()
      });

      // Create episodes
      if (episodes.length > 0) {
        const episodesToCreate = episodes.map(episode => ({
          ...episode,
          podcast_id: createdPodcast.id
        }));

        await PodcastEpisode.bulkCreate(episodesToCreate);
      }

      setSuccess(true);
      setRssUrl('');
      setTimeout(() => setSuccess(false), 5000);

    } catch (error) {
      console.error('Error adding podcast:', error);
      setError(error.message || 'Failed to add podcast');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="h-40 flex items-center justify-center mx-auto mb-6">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3cdc3be9cd0c4b26b1ff/7706333b652-removebg-preview.png"
              alt="StreamWave"
              className="h-full object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Add Podcast</h1>
          <p className="text-lg max-w-md mx-auto" style={{color: 'var(--text-secondary)'}}>
            Subscribe to your favorite podcasts by adding their RSS feed
          </p>
        </motion.div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-green-500/10 border border-green-400/20 rounded-2xl flex items-center gap-3"
          >
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-green-400 font-semibold">Podcast Added Successfully!</p>
              <p className="text-green-300 text-sm">Your podcast and episodes have been imported.</p>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-red-500/10 border border-red-400/20 rounded-2xl flex items-center gap-3"
          >
            <div>
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-xl rounded-3xl border p-8 shadow-2xl"
          style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* RSS URL */}
            <div>
              <Label htmlFor="rss_url" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Podcast RSS Feed URL *
              </Label>
              <Input
                id="rss_url"
                type="url"
                value={rssUrl}
                onChange={(e) => setRssUrl(e.target.value)}
                placeholder="https://feeds.example.com/podcast-name"
                className="w-full border h-16 text-lg"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                required
                disabled={isLoading}
              />
              <p className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
                Enter the RSS feed URL for the podcast you want to subscribe to
              </p>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-xl border" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)'}}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                <Rss className="w-4 h-4" />
                How to find RSS feeds:
              </h3>
              <ul className="text-sm space-y-1 mb-4" style={{color: 'var(--text-secondary)'}}>
                <li>• Look for "RSS", "Feed", or "Subscribe" links on podcast websites</li>
                <li>• Check podcast directories like Apple Podcasts, Spotify, or Google Podcasts</li>
                <li>• Many podcast hosting services provide direct RSS links</li>
                <li>• The URL usually ends with .xml or contains "rss" or "feed"</li>
              </ul>
              
              <div className="border-t pt-4" style={{borderColor: 'rgba(59, 130, 246, 0.2)'}}>
                <h4 className="font-semibold mb-2 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                    <Link2 className="w-4 h-4" />
                    Helpful Tools
                </h4>
                <div className="flex flex-col sm:flex-row gap-4">
                    <a href="https://castos.com/tools/find-podcast-rss-feed/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                        → Use the Castos RSS Feed Finder
                    </a>
                    {switchOverlay && (
                         <button type="button" onClick={() => switchOverlay('Resources')} className="text-cyan-400 hover:text-cyan-300 hover:underline">
                             → More Resources
                         </button>
                    )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !rssUrl.trim()}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold py-4 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-lg h-14"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-3" />
                  Importing Podcast...
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 mr-3" />
                  Add Podcast
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
