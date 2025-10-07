import React from 'react';
import { motion } from 'framer-motion';
import { Play, Radio, Plus } from 'lucide-react';

export default function StationCard({ station, onStationSelect, onAddToPlaylist }) {
    if (!station) {
        return null;
    }

    const handlePlay = (e) => {
        e.stopPropagation();
        onStationSelect(station);
    };

    const handleAddToPlaylist = (e) => {
        e.stopPropagation();
        onAddToPlaylist(station);
    };

    return (
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
                onClick={handlePlay}
            >
                {station.icon_url ? (
                    <img src={station.icon_url} alt={station.name} className="w-full h-full object-contain p-2" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Radio className="w-10 h-10" style={{color: 'var(--text-secondary)'}}/>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="p-2 rounded-full bg-green-500 text-white">
                        <Play className="w-5 h-5 fill-current" />
                    </div>
                </div>

                {/* Add to Playlist Button */}
                <button
                    onClick={handleAddToPlaylist}
                    className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-blue-500 transition-colors"
                    title="Save to playlist"
                >
                    <Plus className="w-4 h-4 text-white" />
                </button>
            </div>
            <h4 className="mt-2 font-semibold truncate" style={{color: 'var(--text-primary)'}}>{station.name}</h4>
            <p className="text-sm truncate" style={{color: 'var(--text-secondary)'}}>{station.description || (station.genres || []).join(', ')}</p>
        </motion.div>
    );
}