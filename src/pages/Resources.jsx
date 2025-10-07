import React from 'react';
import { Button } from '@/components/ui/button';
import { Link2, ArrowLeft, Podcast } from 'lucide-react';
import { motion } from 'framer-motion';

const ResourceCard = ({ resource, delay }) => (
  <motion.a
    href={resource.url}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="block backdrop-blur-xl bg-white/10 rounded-2xl border p-6 hover:bg-white/15 hover:border-white/30 transition-all duration-300 group"
    style={{borderColor: 'var(--border-color)'}}
  >
    <h3 className="text-lg font-semibold group-hover:text-cyan-300 transition-colors" style={{color: 'var(--text-primary)'}}>{resource.name}</h3>
    <p className="mt-1" style={{color: 'var(--text-secondary)'}}>{resource.description}</p>
    <p className="text-cyan-400 text-sm mt-3 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
      Visit site →
    </p>
  </motion.a>
);

export default function Resources({ onClose }) {

  const radioResources = [
    {
      name: "RadioStream URL search engine",
      url: "https://streamurl.link/",
      description: "A search engine dedicated to finding direct radio stream URLs."
    },
    {
      name: "FMSTREAM - The Radio Stream Directory",
      url: "https://fmstream.org/index.php?c=FT",
      description: "A comprehensive directory of FM radio stations with their stream links."
    },
    {
      name: "SomaFM: Sonos Custom URLs",
      url: "https://somafm.com/listen/sonoscustom.html",
      description: "Official high-quality stream URLs for SomaFM stations, great for direct use."
    },
    {
      name: "Laut.fm",
      url: "https://laut.fm/",
      description: "German internet radio platform with thousands of user-created stations and stream URLs."
    }
  ];
  
  const podcastResources = [
    {
      name: "Castos: Podcast RSS Feed Finder",
      url: "https://castos.com/tools/find-podcast-rss-feed/",
      description: "A simple tool to find a podcast's RSS feed by searching its name."
    },
    {
        name: "Listen Notes: Podcast API & Database",
        url: "https://www.listennotes.com/",
        description: "A powerful podcast search engine that often displays RSS feed URLs directly."
    }
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="h-40 flex items-center justify-center mx-auto mb-6">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3cdc3be9cd0c4b26b1ff/7706333b4_652-removebg-preview.png"
              alt="StreamWave"
              className="h-full object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Helpful Resources</h1>
          <p className="text-lg max-w-md mx-auto" style={{color: 'var(--text-secondary)'}}>
            Find direct stream URLs for your favorite radio stations and podcasts.
          </p>
        </motion.div>

        {/* Radio Resources List */}
        <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
                <Link2 className="w-6 h-6"/>
                Radio Stream Finders
            </h2>
            <div className="space-y-4">
                {radioResources.map((resource, index) => (
                    <ResourceCard key={`radio-${index}`} resource={resource} delay={0.1 * (index + 1)} />
                ))}
            </div>
        </div>
        
        {/* Podcast Resources List */}
        <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
                <Podcast className="w-6 h-6"/>
                Podcast RSS Feed Finders
            </h2>
            <div className="space-y-4">
                {podcastResources.map((resource, index) => (
                    <ResourceCard key={`podcast-${index}`} resource={resource} delay={0.1 * (radioResources.length + index + 1)} />
                ))}
            </div>
        </div>
        
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              className="bg-transparent hover:bg-[var(--button-bg)]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Close
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}