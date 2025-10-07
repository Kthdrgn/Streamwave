
import React from 'react';
import { Button } from '@/components/ui/button';
import { Music, List } from 'lucide-react';

const PlaylistArtwork = ({ icons }) => {
    if (!icons || icons.length === 0) {
        return <Music className="w-16 h-16 text-purple-300 transition-transform group-hover:scale-110" />;
    }

    if (icons.length === 1) {
        return <img src={icons[0]} alt="Playlist artwork" className="w-full h-full object-cover" />;
    }
    
    // For 2-4 icons, use a grid
    return (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full bg-[color:var(--border-color)]">
            {icons.slice(0, 4).map((icon, index) => (
                <div key={index} className="w-full h-full overflow-hidden">
                    <img src={icon} alt={`Playlist artwork ${index + 1}`} className="w-full h-full object-cover" />
                </div>
            ))}
            {/* Fill remaining grid cells if less than 4 icons */}
            {Array.from({ length: 4 - icons.length }).map((_, i) => <div key={`fill-${i}`} />)}
        </div>
    );
};

const PlaylistCard = ({ playlist, onPlaylistSelect }) => (
    <div 
        className="w-44 cursor-pointer group flex-shrink-0"
        onClick={() => onPlaylistSelect(playlist)}
    >
        <div className="relative aspect-square rounded-lg overflow-hidden border transition-colors flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10" style={{borderColor: 'var(--border-color)'}}>
            <PlaylistArtwork icons={playlist.stationIcons} />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="p-2 rounded-full bg-green-500 text-white">
                    <List className="w-5 h-5 fill-current" />
                </div>
            </div>
        </div>
        <h4 className="mt-2 font-semibold truncate" style={{color: 'var(--text-primary)'}}>{playlist.name}</h4>
        <p className="text-sm truncate" style={{color: 'var(--text-secondary)'}}>
            {playlist.stationCount > 0 
                ? `${playlist.stationCount} ${playlist.stationCount === 1 ? 'station' : 'stations'}`
                : 'Empty playlist'}
        </p>
    </div>
);


export default function PlaylistCarousel({ title, playlists, onPlaylistSelect, onViewAll }) {
    if (!playlists || playlists.length === 0) {
        return null;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>{title}</h2>
                {onViewAll && (
                    <Button variant="link" onClick={onViewAll} className="hover:text-white" style={{color: 'var(--primary-color)'}}>
                        View All
                    </Button>
                )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 -mb-4 scrollbar-hide">
                {playlists.map(playlist => (
                    <PlaylistCard key={playlist.id} playlist={playlist} onPlaylistSelect={onPlaylistSelect} />
                ))}
            </div>
        </div>
    );
}
