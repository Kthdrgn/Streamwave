
import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, RadioTower, Users, ThumbsUp, Activity, Plus, Settings, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

const FeatureCard = ({ icon: Icon, title, children, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-2xl border p-6 flex flex-col sm:flex-row items-start gap-6"
    style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
  >
    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center flex-shrink-0">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>{title}</h3>
      <div className="space-y-2" style={{color: 'var(--text-secondary)'}}>{children}</div>
    </div>
  </motion.div>
);

export default function About() {
  const navigate = useNavigate();

  const features = [
    {
      icon: RadioTower,
      title: "The Player Experience",
      content: (
        <>
          <p>The <strong>Now Playing</strong> screen is your central hub. Here you can play/pause, view song metadata, and control your stream.</p>
          <p>Use the <strong>Discover</strong> button for a random community station, or <strong>Shuffle</strong> to play a random station from your personal collection.</p>
        </>
      ),
    },
    {
      icon: Users,
      title: "My Stations & Community",
      content: (
        <>
          <p>Click the <strong>plus icon (+)</strong> to add any station to <strong>My Stations</strong>. Mark your absolute favorites with the <strong>heart icon (♥)</strong>.</p>
          <p>Use the buttons at the bottom of the player to browse all community stations, or filter by your collection, favorites, and most played.</p>
        </>
      ),
    },
    {
      icon: ThumbsUp,
      title: "Liked & Recent Tracks",
      content: (
        <>
          <p>Hear a song you love? Hit the <strong>thumbs-up button (👍)</strong> on the player. The track info is saved to your <strong>Liked Tracks</strong> page.</p>
          <p>The app also automatically saves the last 10 songs you've heard to the <strong>Recent Tracks</strong> page, so you never miss a tune.</p>
        </>
      ),
    },
    {
      icon: Activity,
      title: "What's Playing Now",
      content: (
        <p>This page gives you a live dashboard view of what's currently playing on your top 10 most-listened-to stations, all in one place.</p>
      ),
    },
    {
      icon: Plus,
      title: "Add Your Own Stations",
      content: (
        <p>Help the community grow! If you have a station's stream URL, you can add it to the public library using the <strong>Add Community Station</strong> page. The <strong>Stream Resources</strong> page can help you find URLs.</p>
      ),
    },
    {
      icon: Settings,
      title: "Personalize Your Experience",
      content: (
        <p>Head to the <strong>Settings</strong> page to choose a new color theme, manage your mobile data warning preferences, and clear your listening history.</p>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Welcome to StreamWave</h1>
          <p className="text-lg max-w-2xl mx-auto" style={{color: 'var(--text-secondary)'}}>
            Your personal internet radio player. Here's a guide to all the features.
          </p>
        </motion.div>

        {/* Features List */}
        <div className="space-y-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} icon={feature.icon} title={feature.title} delay={0.1 * (index + 1)}>
              {feature.content}
            </FeatureCard>
          ))}
        </div>
        
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <Button
            onClick={() => navigate(createPageUrl('NowPlaying'))}
            className="bg-gradient-to-r from-blue-500 to-cyan-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to the Player
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
