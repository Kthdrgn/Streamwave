import React, { useMemo } from 'react';
import ExploreCategoryBox from './ExploreCategoryBox';
import { Compass } from 'lucide-react';

// Helper to shuffle array and return a new one
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Define categories and their filtering logic
const EXPLORE_CATEGORIES = [
    { title: 'Radio Paradise', filter: (s) => s.call_letters?.toLowerCase() === 'radio paradise' },
    { title: 'SomaFM', filter: (s) => s.call_letters?.toLowerCase().includes('somafm') },
    { title: 'YouRadio', filter: (s) => s.call_letters?.toLowerCase().includes('youradio') },
    { title: 'Exclusive Radio', filter: (s) => s.name?.toLowerCase().includes('exclusive radio') },
    { title: 'Public', filter: (s) => s.genres?.includes('Public') },
    { title: 'YourClassical', filter: (s) => s.name?.toLowerCase().includes('yourclassical') },
    { title: 'Positivity Radio', filter: (s) => s.name?.toLowerCase().includes('positivity radio') },
];

export default function ExploreSection({ stations, onStationSelect, onCategoryViewAll }) {
    // useMemo will re-calculate sections only when the stations prop changes
    const sections = useMemo(() => {
        if (!stations || stations.length === 0) return [];
        
        return EXPLORE_CATEGORIES.map(category => {
            const filteredStations = stations.filter(category.filter);
            const randomStations = shuffleArray(filteredStations).slice(0, 3); // Get up to 3 random stations
            return {
                title: category.title,
                stations: randomStations,
            };
        }).filter(section => section.stations.length > 0); // Only return sections that have stations
    }, [stations]);

    if (sections.length === 0) {
        return null; // Don't render the section if there are no matching stations
    }

    return (
        <div className="space-y-4">
            <h2 className="text-3xl font-bold flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
                <Compass className="w-7 h-7" style={{color: 'var(--primary-color)'}}/>
                Explore
            </h2>
            <div className="relative">
                {/* Horizontal scroll container */}
                <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 -m-2 p-2 scrollbar-hide">
                    {sections.map(section => (
                        <ExploreCategoryBox 
                            key={section.title}
                            title={section.title}
                            stations={section.stations}
                            onStationSelect={onStationSelect}
                            onViewAll={() => onCategoryViewAll(section)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}