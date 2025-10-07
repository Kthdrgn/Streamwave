import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, Radio, RotateCcw } from 'lucide-react';

const parseDuration = (durationStr) => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    const parts = durationStr.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) { // HH:MM:SS
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) { // MM:SS
        seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 1) { // SS
        seconds = parts[0];
    }
    return seconds;
};

const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};


const LargeStationCard = ({ station, onStationSelect }) => {
    const isCompletedPodcast = station.genres?.includes('Podcast') && station.is_completed;
    const isPodcast = station.genres?.includes('Podcast');
    
    // Calculate progress percentage for podcasts with saved position
    const totalDurationSeconds = parseDuration(station.duration);
    const progressPercentage = isPodcast && station.saved_position && totalDurationSeconds > 0
        ? Math.min((station.saved_position / totalDurationSeconds) * 100, 100)
        : 0;

    return (
        <div 
            className="w-44 cursor-pointer group flex-shrink-0"
            onClick={() => onStationSelect(station)}
        >
            <div className="relative aspect-square rounded-lg overflow-hidden border transition-colors" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
                {station.icon_url ? (
                    <img src={station.icon_url} alt={station.name} className="w-full h-full object-contain p-2" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Radio className="w-10 h-10" style={{color: 'var(--text-secondary)'}}/>
                    </div>
                )}
                
                {/* Progress bar for podcasts with saved position */}
                {isPodcast && progressPercentage > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                        <div 
                            className="h-full bg-blue-400 transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                )}
                
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className={`p-2 rounded-full text-white ${isCompletedPodcast ? 'bg-blue-500' : 'bg-green-500'}`}>
                        {isCompletedPodcast ? (
                            <RotateCcw className="w-5 h-5" />
                        ) : (
                            <Play className="w-5 h-5 fill-current" />
                        )}
                    </div>
                </div>
            </div>
            <h4 className="mt-2 font-semibold truncate" style={{color: 'var(--text-primary)'}}>{station.name}</h4>
            <p className="text-sm truncate" style={{color: 'var(--text-secondary)'}}>
              {/* For podcasts, show the podcast name (call_letters). For radio, show description or genres. */}
              {(isPodcast && station.call_letters) ? station.call_letters : station.description || (station.genres || []).join(', ')}
            </p>
            
            {/* Progress text for podcasts */}
            {isPodcast && station.saved_position > 0 && station.duration && (
                <p className="text-xs mt-1" style={{color: 'var(--text-secondary)'}}>
                    {formatTime(station.saved_position)} / {station.duration}
                </p>
            )}
        </div>
    );
};

const SmallStationCard = ({ station, onStationSelect }) => {
    const isCompletedPodcast = station.genres?.includes('Podcast') && station.is_completed;
    const isPodcast = station.genres?.includes('Podcast');
    
    // Calculate progress percentage for podcasts with saved position
    const totalDurationSeconds = parseDuration(station.duration);
    const progressPercentage = isPodcast && station.saved_position && totalDurationSeconds > 0
        ? Math.min((station.saved_position / totalDurationSeconds) * 100, 100)
        : 0;
    
    return (
        <div 
            className="w-32 cursor-pointer group flex-shrink-0"
            onClick={() => onStationSelect(station)}
        >
            <div className="relative aspect-square rounded-lg overflow-hidden border transition-colors" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
                {station.icon_url ? (
                    <img src={station.icon_url} alt={station.name} className="w-full h-full object-contain p-2" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Radio className="w-8 h-8" style={{color: 'var(--text-secondary)'}}/>
                    </div>
                )}
                
                {/* Progress bar for podcasts with saved position */}
                {isPodcast && progressPercentage > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                        <div 
                            className="h-full bg-blue-400 transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                )}
                
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className={`p-2 rounded-full text-white ${isCompletedPodcast ? 'bg-blue-500' : 'bg-green-500'}`}>
                        {isCompletedPodcast ? (
                            <RotateCcw className="w-5 h-5" />
                        ) : (
                            <Play className="w-5 h-5 fill-current" />
                        )}
                    </div>
                </div>
            </div>
            <h4 className="mt-2 text-sm font-semibold truncate" style={{color: 'var(--text-primary)'}}>{station.name}</h4>
            <p className="text-xs truncate" style={{color: 'var(--text-secondary)'}}>
                {(isPodcast && station.call_letters) ? station.call_letters : station.description || (station.genres || []).join(', ')}
            </p>
        </div>
    );
};


export default function StationCarousel({ title, stations = [], onStationSelect, onViewAll, size = 'large' }) {
    if (stations.length === 0) return null;

    const CardComponent = size === 'large' ? LargeStationCard : SmallStationCard;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>{title}</h3>
                {onViewAll && (
                    <Button variant="ghost" onClick={onViewAll} style={{color: 'var(--text-primary)'}}>
                        View all
                    </Button>
                )}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mb-4">
                {stations.map(station => (
                    <CardComponent key={station.id || station.url} station={station} onStationSelect={onStationSelect} />
                ))}
                <div className="w-1 flex-shrink-0" /> {/* Spacer */}
            </div>
        </div>
    );
}