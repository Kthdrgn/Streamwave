import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import ExploreStationItem from './ExploreStationItem';

export default function ExploreCategoryBox({ title, stations, onStationSelect, onViewAll }) {
    return (
        <div 
            className="w-72 sm:w-80 flex-shrink-0 rounded-2xl border p-4" 
            style={{
                backgroundColor: 'var(--button-bg)', 
                borderColor: 'var(--border-color)'
            }}
        >
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-xl" style={{color: 'var(--text-primary)'}}>{title}</h3>
                {onViewAll && (
                    <Button
                        onClick={onViewAll}
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-full hover:bg-white/20"
                        style={{color: 'var(--primary-color)'}}
                        title="View all stations"
                    >
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                )}
            </div>
            <div className="space-y-2">
                {stations.map(station => (
                    <ExploreStationItem 
                        key={station.id}
                        station={station}
                        onStationSelect={onStationSelect}
                    />
                ))}
            </div>
        </div>
    );
}