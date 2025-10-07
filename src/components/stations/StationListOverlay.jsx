import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import StationCard from './StationCard';
import { usePlayer } from '../player/PlayerContext';

export default function StationListOverlay({ isOpen, onClose, title, stations }) {
  const { playStation } = usePlayer();

  const handleStationSelect = (station) => {
    playStation(station);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="w-full max-w-4xl h-[85vh] flex flex-col backdrop-blur-xl border rounded-2xl overflow-hidden"
            style={{ 
              backgroundColor: 'var(--bg-from-color)', 
              borderColor: 'var(--border-color)' 
            }}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="rounded-full transition-colors"
                style={{ 
                  color: 'var(--text-primary)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-6">
              {stations.length === 0 ? (
                <div className="text-center py-16">
                  <Search className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--text-secondary)'}}/>
                  <h2 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>No Stations Found</h2>
                  <p style={{color: 'var(--text-secondary)'}}>There are no stations in this list yet.</p>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.05 } },
                    hidden: {},
                  }}
                >
                  {stations.map(station => (
                    <StationCard key={station.id || station.url} station={station} onStationSelect={handleStationSelect} />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}