import React from 'react';
import { Radio, Play } from 'lucide-react';

export default function ExploreStationItem({ station, onStationSelect }) {
    // Show description if available, otherwise show genres
    const getSecondaryText = () => {
        if (station.description && station.description.trim()) {
            return station.description;
        }
        if (station.genres && station.genres.length > 0) {
            return station.genres.join(', ');
        }
        return station.call_letters || '';
    };

    return (
        <div 
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white/10 group"
            onClick={() => onStationSelect(station)}
        >
            <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.05)'}}>
                {station.icon_url ? (
                    <img src={station.icon_url} alt={station.name} className="w-full h-full object-cover" />
                ) : (
                    <Radio className="w-5 h-5" style={{color: 'var(--text-secondary)'}} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-base truncate group-hover:text-white transition-colors" style={{color: 'var(--text-primary)'}} title={station.name}>
                    {station.name}
                </h4>
                <p className="text-sm truncate" style={{color: 'var(--text-secondary)'}} title={getSecondaryText()}>
                    {getSecondaryText()}
                </p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-4 h-4" style={{color: 'var(--primary-color)'}} />
            </div>
        </div>
    );
}