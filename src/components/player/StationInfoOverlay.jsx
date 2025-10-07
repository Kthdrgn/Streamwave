import React from 'react';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, Radio, MapPin, Music, Zap, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from './PlayerContext';

export default function StationInfoOverlay({ isOpen, onClose, station }) {
  const { metadata } = usePlayer();
  
  if (!isOpen || !station) return null;

  const streamInfo = metadata?.streamInfo;
  
  // Helper function to format bitrate
  const formatBitrate = (bitrate) => {
    if (!bitrate) return null;
    return `${bitrate} kbps`;
  };

  // Helper function to format audio format
  const formatAudioType = (contentType) => {
    if (!contentType) return null;
    if (contentType.includes('mpeg')) return 'MP3';
    if (contentType.includes('aac')) return 'AAC';
    if (contentType.includes('ogg')) return 'OGG';
    return contentType.split('/')[1]?.toUpperCase() || 'Unknown';
  };

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
          className="w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl max-h-[80vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="p-6 pb-4">
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-slate-100 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
              
              {/* Station Icon and Name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {station.icon_url ? (
                    <img
                      src={station.icon_url}
                      alt={station.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Radio className="w-8 h-8 text-white" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-slate-100 truncate">
                    {station.name}
                  </h2>
                  {(station.call_letters || station.frequency) && (
                    <p className="text-blue-200 text-sm">
                      {station.call_letters}{station.call_letters && station.frequency && ' - '}{station.frequency}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-6">
            {/* Description */}
            {station.description && (
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  About This Station
                </h3>
                <p className="text-slate-100 text-sm leading-relaxed bg-white/5 p-3 rounded-lg">
                  {station.description}
                </p>
              </div>
            )}

            {/* Stream Technical Info */}
            {streamInfo && (
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Stream Information
                </h3>
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  {streamInfo.bitrate && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Bitrate</span>
                      <span className="text-slate-100 font-medium">{formatBitrate(streamInfo.bitrate)}</span>
                    </div>
                  )}
                  {streamInfo.contentType && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Format</span>
                      <span className="text-slate-100 font-medium">{formatAudioType(streamInfo.contentType)}</span>
                    </div>
                  )}
                  {streamInfo.sampleRate && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Sample Rate</span>
                      <span className="text-slate-100 font-medium">{streamInfo.sampleRate} Hz</span>
                    </div>
                  )}
                  {streamInfo.server && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Server</span>
                      <span className="text-slate-100 font-medium text-right">{streamInfo.server}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Genres */}
            {station.genres && station.genres.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {station.genres.map((genre, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-500/20 text-blue-200 rounded-full text-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Website Link */}
            {station.website_url && (
              <div>
                <a
                  href={station.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit Station Website
                </a>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300">Total Plays</span>
                <span className="text-slate-100 font-medium">
                  {station.play_count || 0}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}