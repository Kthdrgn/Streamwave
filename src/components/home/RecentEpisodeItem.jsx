import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Podcast as PodcastIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function RecentEpisodeItem({ episode, onPlay, onRemove }) {
    const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
    const descriptionRef = useRef(null);
    const [isClamped, setIsClamped] = useState(false);

    useEffect(() => {
        const checkClamping = () => {
            if (descriptionRef.current) {
                // Check if the scroll height is greater than the client height, indicating overflow
                setIsClamped(descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight);
            }
        };

        // A small delay to allow the DOM to render fully before checking
        const timer = setTimeout(checkClamping, 100);
        
        window.addEventListener('resize', checkClamping);
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkClamping);
        };
    }, [episode.description]);

    const cleanDescription = (htmlString) => {
        if (!htmlString) return '';
        const doc = new DOMParser().parseFromString(htmlString, 'text/html');
        return doc.body.textContent || "";
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPlay(episode)}
                className="w-full cursor-pointer p-4 border rounded-xl flex items-start gap-4 transition-colors relative"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--text-primary-rgb), 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--button-bg)'}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(episode.id);
                    }}
                    className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-500/20"
                    title="Hide this episode"
                >
                    <X className="w-4 h-4 text-red-400" />
                </button>
                <div className="relative w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden border" style={{borderColor: 'var(--border-color)'}}>
                    {episode.icon_url ? (
                        <img src={episode.icon_url} alt={episode.podcast?.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.1)'}}>
                            <PodcastIcon className="w-8 h-8" style={{color: 'var(--text-secondary)'}}/>
                        </div>
                    )}
                </div>
                
                <div className="flex-1 min-w-0 pr-8">
                    <h4 className="font-semibold truncate" style={{color: 'var(--text-primary)'}} title={episode.name}>
                        {episode.name}
                    </h4>
                    <p className="text-sm truncate mb-1" style={{color: 'var(--text-secondary)'}} title={episode.podcast?.name}>
                        {episode.podcast?.name}
                    </p>
                    {episode.published_date && (
                        <p className="text-xs mb-2" style={{color: 'var(--text-secondary)'}}>
                            {format(new Date(episode.published_date), 'MMM d, yyyy')}
                        </p>
                    )}
                    <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                        <p ref={descriptionRef} className="line-clamp-2">
                            {cleanDescription(episode.description)}
                        </p>
                        {isClamped && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDescriptionOpen(true);
                                }}
                                className="text-sm font-semibold hover:underline mt-1"
                                style={{color: 'var(--primary-color)'}}
                            >
                                Read more
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {isDescriptionOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsDescriptionOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border overflow-hidden"
                            style={{backgroundColor: 'var(--bg-from-color)', borderColor: 'var(--border-color)'}}
                        >
                            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b" style={{borderColor: 'var(--border-color)'}}>
                                <h3 className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>{episode.name}</h3>
                                <button onClick={() => setIsDescriptionOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                                    <X className="w-5 h-5" style={{color: 'var(--text-primary)'}}/>
                                </button>
                            </div>
                            <div className="flex-grow overflow-y-auto p-6" style={{color: 'var(--text-secondary)'}}>
                                <p className="whitespace-pre-wrap">{cleanDescription(episode.description)}</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}