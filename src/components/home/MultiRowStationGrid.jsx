
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, Radio } from 'lucide-react';

const SmallStationCard = ({ station, onStationSelect }) => {
    return (
        <motion.div
            className="w-20 cursor-pointer group"
            onClick={() => onStationSelect(station)}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
            <div className="relative aspect-square rounded-lg overflow-hidden border transition-colors" style={{backgroundColor: 'var(--button-bg)', borderColor: 'transparent'}}>
                {station.icon_url ? (
                    <img src={station.icon_url} alt={station.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Radio className="w-6 h-6" style={{color: 'var(--text-secondary)'}} />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="p-1.5 rounded-full bg-green-500 text-white">
                        <Play className="w-4 h-4 fill-current" />
                    </div>
                </div>
            </div>
            <h4 className="mt-1.5 font-semibold truncate text-xs" style={{color: 'var(--text-primary)'}}>{station.name}</h4>
        </motion.div>
    );
};

export default function MultiRowStationGrid({ title, stations, onStationSelect, onViewAll }) {
    if (!stations || stations.length === 0) return null;

    // Calculate number of rows based on station count
    const getRowCount = (stationCount) => {
        return Math.min(Math.ceil(stationCount / 10), 6); // Cap at 6 rows for very large collections
    };

    const rowCount = getRowCount(stations.length);

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
            <div className="overflow-x-auto pb-3 -mb-3 scrollbar-hide">
                <div 
                    className="grid grid-flow-col auto-cols-max gap-x-3 gap-y-4"
                    style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
                >
                    {stations.map(station => (
                        <SmallStationCard key={station.id || station.url} station={station} onStationSelect={onStationSelect} />
                    ))}
                </div>
            </div>
        </div>
    );
}
