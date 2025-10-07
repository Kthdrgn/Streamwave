
import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../components/player/PlayerContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Play, Pause, X, Radio, Clock, Plus, MoreVertical, Edit, Trash2, Loader2, Search, ExternalLink, ChevronDown, ThumbsUp, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadioStation } from '@/api/entities';
import { User } from '@/api/entities';
import { PodcastEpisode } from '@/api/entities';
import CommunityOverlay from '../components/player/CommunityOverlay';
import StationInfoOverlay from '../components/player/StationInfoOverlay';
import StationListOverlay from '../components/stations/StationListOverlay';
import SaveToPlaylistDialog from '../components/stations/SaveToPlaylistDialog';
import { Slider } from '@/components/ui/slider';

// New component for skip buttons with numbers
const SkipButton = ({ seconds, direction, onClick, className = "" }) => (
  <Button
    variant="ghost"
    size="lg"
    onClick={onClick}
    className={`w-16 h-16 rounded-full hover:bg-white/10 relative ${className}`}
    style={{color: 'var(--text-primary)'}}
    title={`Skip ${direction} ${seconds}s`}
  >
    <div className="relative flex items-center justify-center">
      <RotateCcw 
        className="w-14 h-14" 
        style={{ transform: direction === 'forward' ? 'scaleX(-1)' : 'none' }}
      />
      <span className="absolute text-xs font-bold" style={{ marginTop: '2px' }}>
        {seconds}
      </span>
    </div>
  </Button>
);

const DescriptionOverlay = ({ title, description, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
    >
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border"
            style={{ backgroundColor: 'var(--bg-from-color)', borderColor: 'var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex-shrink-0 p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full"><X className="w-5 h-5" /></Button>
            </div>
            <div className="flex-grow p-6 overflow-y-auto" style={{ color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: description }} />
        </motion.div>
    </motion.div>
);

export default function NowPlaying({ onClose }) {
  const {
    station, isPlaying, error, isLoadingAudio,
    togglePlayPause, playStation,
    closePlayer, metadata, isLoadingMetadata, refreshMetadata, likeCurrentTrack,
    recentlyPlayed,
    currentTime, duration, seek,
  } = usePlayer();
  
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);
  const [isStationInfoOpen, setIsStationInfoOpen] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('primary');
  const [preselectedGenre, setPreselectedGenre] = useState(null);
  const [preselectedFilter, setPreselectedFilter] = useState(null);
  const [preselectedSort, setPreselectedSort] = useState(null);
  const [showLikedConfirmation, setShowLikedConfirmation] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  
  const [isListOverlayOpen, setIsListOverlayOpen] = useState(false);
  const [overlayStations, setOverlayStations] = useState([]);
  const [overlayTitle, setOverlayTitle] = useState('');
  const [loadingListType, setLoadingListType] = useState(null);
  
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const parseStreamTitle = (streamTitle) => {
    if (!streamTitle) return { artist: null, title: null };
    
    const parts = streamTitle.split(' - ');
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim()
      };
    }
    return {
      artist: null,
      title: streamTitle.trim()
    };
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isPodcastOrAudiobook = station?.genres?.includes('Podcast');
  const isLiveRadio = !isPodcastOrAudiobook;
  const isCompletedPodcast = isPodcastOrAudiobook && station?.is_completed;
  
  const cleanDescription = station?.description?.replace(/<[^>]*>?/gm, '');
  const showReadMore = cleanDescription && cleanDescription.length > 200;

  useEffect(() => {
    const originalBodyStyle = document.body.style.overscrollBehaviorY;
    const originalHtmlStyle = document.documentElement.style.overscrollBehaviorY;
    
    document.body.style.overscrollBehaviorY = 'contain';
    document.documentElement.style.overscrollBehaviorY = 'contain';

    return () => {
      document.body.style.overscrollBehaviorY = originalBodyStyle;
      document.documentElement.style.overscrollBehaviorY = originalHtmlStyle;
    };
  }, []);

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || containerRef.current?.scrollTop > 0) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    currentY.current = e.touches[0].clientY;
    const distance = currentY.current - startY.current;
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, 100));
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance > 60) {
      onClose();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  useEffect(() => {
    const checkUserRole = async () => {
      try { const user = await User.me(); setIsAdmin(user.role === 'admin'); } catch (error) { setIsAdmin(false); }
    };
    checkUserRole();
  }, []);

  const handleStartOver = async () => {
    if (!isCompletedPodcast || !station?.id) return;
    
    try {
      await PodcastEpisode.update(station.id, {
        saved_position: 0,
        is_completed: false
      });
      
      const updatedStation = { ...station, saved_position: 0, is_completed: false };
      playStation(updatedStation);
    } catch (error) {
      console.error('Failed to reset episode:', error);
      alert('Failed to restart episode. Please try again.');
    }
  };

  if (!station) {
      return null;
  }

  const safeGenres = Array.isArray(station.genres) ? station.genres : [];
  const parsedMetadata = parseStreamTitle(metadata?.streamTitle);

  const handleGenreClick = (genre) => {
    setPreselectedGenre(genre);
    setPreselectedFilter(null);
    setPreselectedSort(null);
    setIsCommunityOpen(true);
  };

  const handleDiscover = async () => {
    setIsLoadingDiscover(true);
    try {
      const excludedGenres = JSON.parse(localStorage.getItem('excludedGenres') || '[]');
      const allStations = await RadioStation.list();

      if (!Array.isArray(allStations) || allStations.length === 0) {
          alert("No community stations are available for discovery.");
          setIsLoadingDiscover(false);
          return;
      }

      const discoverableStations = allStations.filter(s => {
        const stationGenres = Array.isArray(s.genres) ? s.genres : [];
        if (stationGenres.length === 0) {
          return !excludedGenres.includes('No Genres');
        }
        return !stationGenres.some(genre => excludedGenres.includes(genre));
      });

      if (discoverableStations.length === 0) { 
        alert(allStations.length > 0 ? "All available stations match your excluded genres. Change your Discover Preferences in Settings." : "No community stations are available for discovery."); 
        setIsLoadingDiscover(false); 
        return; 
      }
      const availableStations = station ? discoverableStations.filter(s => s.url !== station.url) : discoverableStations;
      if (availableStations.length === 0) { 
        alert("No other stations are available for discovery. Try adjusting your Discover Preferences in Settings."); 
        setIsLoadingDiscover(false); 
        return; 
      }
      const randomIndex = Math.floor(Math.random() * availableStations.length);
      playStation(availableStations[randomIndex]);
    } catch (error) { 
      console.error('Failed to discover random station:', error); 
      alert("There was an error discovering stations. Please try again."); 
    } 
    finally { 
      setIsLoadingDiscover(false); 
    }
  };

  const handleEditStation = () => { if (!station || !station.id) return; onClose(); navigate(createPageUrl(`AddStation?id=${station.id}`)); };
  const handleDeleteStation = async () => {
    if (!station || !station.id || !window.confirm(`Are you sure you want to permanently delete "${station.name}"?`) ) return;
    try {
      await RadioStation.delete(station.id);
      closePlayer();
      navigate(createPageUrl('Home'));
    } catch (error) { console.error('Failed to delete station:', error); alert('An error occurred while deleting the station.'); }
  };
  
  const handleCommunityClick = () => {
    setPreselectedGenre(null);
    setPreselectedFilter(null);
    setPreselectedSort(null);
    setIsCommunityOpen(true);
  };

  const openSimpleListOverlay = (title, stations) => {
    setOverlayTitle(title);
    setOverlayStations(stations);
    setIsListOverlayOpen(true);
    setLoadingListType(null);
  };
  
  const handleRecentlyPlayedClick = () => {
    openSimpleListOverlay('Recently Played', recentlyPlayed);
  };

  const handleMostPlayedClick = async () => {
    setLoadingListType('mostPlayed');
    try {
      const user = await User.me();
      const playCounts = user.station_play_counts || {};

      const stationsWithCounts = Object.values(playCounts);
      const sortedStations = stationsWithCounts
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 50);
      
      const validIds = [];
      const directStations = [];
      
      sortedStations.forEach(station => {
        if (station.id && station.id.length === 24) {
          validIds.push(station.id);
        } else if (station.name && station.url) {
          directStations.push(station);
        }
      });
      
      let result = [];
      
      if (validIds.length > 0) {
        try {
          const freshStations = await RadioStation.filter({ id: { '$in': validIds } });
          const stationMap = {};
          freshStations.forEach(s => { stationMap[s.id] = s; });
          
          validIds.forEach(id => {
            if (stationMap[id]) {
              result.push(stationMap[id]);
            }
          });
        } catch (e) {
          console.error('Error fetching stations by ID:', e);
        }
      }
      
      result = result.concat(directStations);
      openSimpleListOverlay('Your Most Played', result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingListType(null);
    }
  };
  
  const handleLikeTrack = async () => {
    const success = await likeCurrentTrack();
    if (success) { setShowLikedConfirmation(true); setTimeout(() => setShowLikedConfirmation(false), 2000); }
  };
  
  const handleQualityChange = (quality) => {
    if (!station) return;
    let newUrl = station.url;
    if (quality === 'low') newUrl = station.url_low || station.url;
    else if (quality === 'high') newUrl = station.url_high || station.url;
    playStation({ ...station, url: newUrl }, { isQualityChange: true });
    setCurrentQuality(quality);
  };
  
  const artworkUrl = metadata?.artworkUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(metadata.artworkUrl) ? metadata.artworkUrl : station.icon_url;
  const handleStationIconClick = () => { if (station.website_url) window.open(station.website_url, '_blank', 'noopener,noreferrer'); };

  return (
    <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-0 z-50 overflow-y-auto"
        style={{ 
            background: 'linear-gradient(to bottom, var(--bg-to-color), var(--bg-from-color))',
            transform: `translateY(${pullDistance * 0.5}px)`,
            transition: isPulling ? 'none' : 'transform 0.3s ease',
            overscrollBehaviorY: 'contain'
        }}
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      {isPulling && pullDistance > 20 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
          <div className={`h-1 rounded-full transition-all duration-200`}
            style={{ 
              width: `${Math.min(pullDistance, 60)}px`,
              backgroundColor: pullDistance > 60 ? 'rgb(74, 222, 128)' : 'rgb(96, 165, 250)'
            }}
          />
          <p className={`text-xs text-center mt-2 transition-all duration-200 ${
            pullDistance > 60 ? 'text-green-400' : 'text-blue-400'
          }`}>
            {pullDistance > 60 ? 'Release to minimize' : 'Pull to minimize'}
          </p>
        </div>
      )}

      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-32">
        <div className="relative">
            <div className="absolute top-0 left-0 z-10">
                <Button onClick={onClose} variant="ghost" size="icon" className="hover:bg-white/20 rounded-full" style={{color: 'var(--text-primary)'}} title="Minimize Player"><ChevronDown className="w-6 h-6" /></Button>
            </div>
            {station.id && isAdmin && (
                <div className="absolute top-0 right-0 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="hover:bg-white/20 rounded-full" style={{color: 'var(--text-primary)'}}><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800/95 border-white/20">
                      <DropdownMenuItem onClick={handleEditStation} className="text-white hover:bg-white/10"><Edit className="w-4 h-4 mr-2" />Edit Station</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDeleteStation} className="text-red-400 hover:!text-red-300 hover:!bg-red-500/20"><Trash2 className="w-4 h-4 mr-2" />Delete for All</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            )}
        </div>
        
        <div className="pt-12">
          <div className="grid grid-cols-1 gap-1 landscape:grid-cols-2 landscape:gap-4 landscape:min-w-[600px]:gap-6 landscape:min-w-[900px]:gap-8 landscape:min-w-[1200px]:gap-12 landscape:items-start space-y-2 landscape:space-y-0">
            
            <div className="flex justify-center landscape:justify-center order-1">
              <div className={`
                w-80 h-80 
                landscape:w-[min(50vw,280px)] landscape:h-[min(50vw,280px)]
                landscape:min-w-[600px]:w-[min(45vw,320px)] landscape:h-[min(45vw,320px)]
                landscape:min-w-[800px]:w-[min(42vw,380px)] landscape:h-[min(42vw,380px)]
                landscape:min-w-[1200px]:w-[min(40vw,480px)] landscape:min-w-[1200px]:h-[min(40vw,480px)]
                rounded-3xl flex items-center justify-center relative overflow-hidden border 
                ${station.website_url ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}
              `} style={{borderColor: 'var(--border-color)'}} onClick={handleStationIconClick} title={station.website_url ? 'Visit station website' : undefined}>
                <AnimatePresence mode="wait">
                    {artworkUrl ? (<motion.img key={artworkUrl} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} src={artworkUrl} alt={metadata?.streamTitle || station.name} className="w-full h-full object-cover absolute inset-0"/>
                    ) : ( <motion.div key="radio-icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full h-full flex flex-col items-center justify-center p-4"> <Radio className="
                      w-32 h-32 
                      landscape:w-[min(12vw,64px)] landscape:h-[min(12vw,64px)]
                      landscape:min-w-[800px]:w-[min(10vw,80px)] landscape:h-[min(10vw,80px)]
                      landscape:min-w-[1200px]:w-[min(8vw,120px)] landscape:min-w-[1200px]:h-[min(8vw,120px)]
                    " style={{color: 'var(--text-primary)'}} /> </motion.div> )}
                </AnimatePresence>
                {isPlaying && <div className="absolute inset-0 rounded-3xl bg-[color:var(--primary-color)]/20 animate-pulse"></div>}
                {station.website_url && <div className="absolute bottom-3 right-3 bg-black/50 rounded-full p-2"><ExternalLink className="w-4 h-4 text-white" /></div>}
              </div>
            </div>

            <div className="flex flex-col justify-start order-2">
              <div className="text-center landscape:text-left mb-2 landscape:mb-1">
                  <h1 className="
                    text-2xl 
                    landscape:text-[min(4vw,18px)]
                    landscape:min-w-[600px]:text-[min(3.5vw,20px)]
                    landscape:min-w-[800px]:text-[min(3vw,24px)]
                    landscape:min-w-[1200px]:text-[min(2.5vw,32px)]
                    font-bold truncate mb-2 landscape:mb-1
                  " style={{color: 'var(--text-primary)'}}>{station.name}</h1>
                  {isPodcastOrAudiobook ? (
                    <p className="
                      text-base 
                      landscape:text-[min(2.5vw,14px)]
                      landscape:min-w-[600px]:text-[min(2.2vw,15px)]
                      landscape:min-w-[800px]:text-[min(2vw,16px)]
                      landscape:min-w-[1200px]:text-[min(1.8vw,20px)]
                      truncate mb-3 landscape:mb-2
                    " style={{color: 'var(--text-secondary)'}}>{station.call_letters}</p>
                  ) : (
                    (station.call_letters || station.frequency) && (
                      <p className="
                        text-base 
                        landscape:text-[min(2.5vw,14px)]
                        landscape:min-w-[600px]:text-[min(2.2vw,15px)]
                        landscape:min-w-[800px]:text-[min(2vw,16px)]
                        landscape:min-w-[1200px]:text-[min(1.8vw,20px)]
                        truncate mb-3 landscape:mb-2
                      " style={{color: 'var(--text-secondary)'}}>{station.call_letters}{station.call_letters && station.frequency && ' - '}{station.frequency}</p>
                    )
                  )}
                  
                  <div className="landscape:hidden">
                    {safeGenres.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {safeGenres.map((genre, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => handleGenreClick(genre)} 
                            className="px-3 py-1 text-xs font-semibold rounded-full transition-colors bg-[color:var(--primary-color)]/20 text-[color:var(--primary-color)] hover:bg-[color:var(--primary-color)]/30"
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
              </div>

              {isPodcastOrAudiobook && station.description && (
                <div className="text-sm p-4 rounded-xl border mb-2 landscape:mb-3" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)'}}>
                  <p className={!showReadMore ? '' : 'line-clamp-3'}>
                    {cleanDescription}
                  </p>
                  {showReadMore && (
                    <button onClick={() => setIsDescriptionOpen(true)} className="font-semibold mt-2" style={{color: 'var(--primary-color)'}}>
                      Read More
                    </button>
                  )}
                </div>
              )}

              {isLiveRadio && (
                <div className="
                  p-3 landscape:p-[min(2vw,12px)]
                  rounded-xl border 
                  min-h-[80px] landscape:min-h-[min(10vh,60px)] 
                  flex flex-col justify-center mb-2 landscape:mb-3
                " style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <span className="
                              text-xs 
                              landscape:text-[min(2vw,11px)]
                              landscape:min-w-[800px]:text-[min(1.8vw,12px)]
                              landscape:min-w-[1200px]:text-[min(1.5vw,14px)]
                            " style={{color: 'var(--text-secondary)'}}>{isPlaying ? 'Now Playing' : 'Stopped'}</span>
                            {(isLoadingMetadata || (metadata && !isLoadingMetadata)) && <button onClick={refreshMetadata} disabled={isLoadingMetadata} className="hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait" style={{color: 'var(--text-secondary)'}} title="Refresh track info">{isLoadingMetadata ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}</button>}
                        </div>
                        {metadata?.streamTitle && ( 
                          <div className="flex gap-1">
                            <button onClick={handleLikeTrack} className="hover:text-white transition-colors relative" style={{color: 'var(--text-secondary)'}} title="Like this track"><ThumbsUp className="w-4 h-4" /><AnimatePresence>{showLikedConfirmation && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: -20 }} exit={{ opacity: 0, y: -25 }} className="absolute -top-4 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-500 text-white text-xs rounded-md shadow-lg whitespace-nowrap">Liked!</motion.div>}</AnimatePresence></button>
                          </div>
                        )}
                    </div>
                    
                    <div className="text-center space-y-1">
                      {metadata?.streamTitle ? (
                        <>
                          <div className="
                            font-bold text-2xl 
                            landscape:text-[min(3.5vw,20px)]
                            landscape:min-w-[600px]:text-[min(3.2vw,22px)]
                            landscape:min-w-[800px]:text-[min(2.8vw,24px)]
                            landscape:min-w-[1200px]:text-[min(2.5vw,28px)]
                            line-clamp-2
                          " style={{color: 'var(--text-primary)'}} title={parsedMetadata.title}>
                            {parsedMetadata.title}
                          </div>
                          
                          {parsedMetadata.artist && (
                            <div className="
                              font-medium text-base
                              landscape:text-[min(2.2vw,13px)]
                              landscape:min-w-[600px]:text-[min(2.0vw,14px)]
                              landscape:min-w-[800px]:text-[min(1.8vw,15px)]
                              landscape:min-w-[1200px]:text-[min(1.6vw,16px)]
                              line-clamp-1
                            " style={{color: 'var(--text-secondary)'}} title={parsedMetadata.artist}>
                              {parsedMetadata.artist}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="
                          font-medium text-sm
                          landscape:text-[min(2.2vw,12px)]
                          landscape:min-w-[600px]:text-[min(2.0vw,13px)]
                          landscape:min-w-[800px]:text-[min(1.8vw,14px)]
                          landscape:min-w-[1200px]:text-[min(1.6vw,16px)]
                          opacity-60 italic
                        " style={{color: 'var(--text-primary)'}}>
                          Track info not available
                        </div>
                      )}
                    </div>
                </div>
              )}

              {isPodcastOrAudiobook && duration > 0 && (
                <div className="
                  p-4 landscape:p-[min(2vw,16px)]
                  rounded-xl border 
                  mb-2 landscape:mb-3
                " style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
                  <div className="flex items-center justify-between text-sm mb-2" style={{color: 'var(--text-secondary)'}}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={1}
                    onValueChange={(value) => seek(value[0])}
                    className="w-full cursor-pointer [&>span:first-child]:h-1.5 [&>span:first-child]:rounded-full [&>span:first-child]:bg-gray-700 [&>span:first-child>span]:bg-gradient-to-r [&>span:first-child>span]:from-blue-500 [&>span:first-child>span]:to-cyan-400 [&>span:first-child>span]:rounded-full [&_[role=slider]]:hidden"
                  />
                </div>
              )}
              
              <div className="landscape:block hidden">
                <div className="flex items-center justify-start gap-2 flex-wrap">
                  {isPodcastOrAudiobook && (
                    <>
                    <SkipButton seconds={30} direction="back" onClick={() => seek(Math.max(0, currentTime - 30))} />
                    <SkipButton seconds={15} direction="back" onClick={() => seek(Math.max(0, currentTime - 15))} />
                    </>
                  )}

                  {isCompletedPodcast ? (
                    <Button onClick={handleStartOver} className="
                      font-semibold rounded-full transition-opacity hover:opacity-90
                      px-4 h-12 
                      landscape:px-[min(3vw,16px)] landscape:h-[min(8vw,44px)]
                      landscape:min-w-[800px]:px-[min(2.5vw,20px)] landscape:min-w-[800px]:h-[min(7vw,48px)]
                      landscape:min-w-[1200px]:px-[min(2.2vw,24px)] landscape:min-w-[1200px]:h-[min(6vw,56px)]
                      bg-blue-500 hover:bg-blue-600 text-white
                    ">{isLoadingAudio ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}Start Over</Button>
                  ) : (
                    <Button className="
                      w-14 h-14 
                      landscape:w-[min(8vw,56px)] landscape:h-[min(8vw,56px)]
                      landscape:min-w-[800px]:w-[min(7vw,60px)] landscape:min-w-[800px]:h-[min(7vw,60px)]
                      landscape:min-w-[1200px]:w-[min(6vw,64px)] landscape:min-w-[1200px]:h-[min(6vw,64px)]
                      rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:scale-105 transition-transform flex items-center justify-center p-0
                    " onClick={togglePlayPause}>
                      {isLoadingAudio ? <Loader2 className="w-6 h-6 animate-spin" /> : (isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />)}
                    </Button>
                  )}
                  
                  {isPodcastOrAudiobook && (
                      <>
                        <SkipButton seconds={30} direction="forward" onClick={() => seek(Math.min(duration, currentTime + 30))} />
                        <SkipButton seconds={60} direction="forward" onClick={() => seek(Math.min(duration, currentTime + 60))} label="+1:00" />
                      </>
                  )}

                  {isLiveRadio && (
                    <>
                      <Button onClick={handleDiscover} disabled={isLoadingDiscover} size="sm" className="
                        font-semibold rounded-full transition-opacity hover:opacity-90
                        px-3 h-10 
                        landscape:px-[min(2.5vw,12px)] landscape:h-[min(6vw,36px)]
                        landscape:min-w-[800px]:px-[min(2.2vw,16px)] landscape:min-w-[800px]:h-[min(5vw,40px)]
                        landscape:min-w-[1200px]:px-[min(2vw,24px)] landscape:min-w-[1200px]:h-[min(4vw,48px)]
                        text-xs landscape:text-[min(2vw,10px)]
                        landscape:min-w-[800px]:text-[min(1.8vw,11px)]
                        landscape:min-w-[1200px]:text-[min(1.5vw,13px)]
                      " style={{
                        backgroundColor: 'var(--primary-color)',
                        color: 'var(--text-primary)'
                      }}>{isLoadingDiscover ? <Loader2 className="w-4 h-4 mr-1" /> : <><Search className="w-4 h-4 mr-1" />Discover</>}</Button>

                      <Button onClick={() => setShowSaveDialog(true)} size="sm" className="
                        font-semibold rounded-full transition-opacity hover:opacity-90
                        px-3 h-10 
                        landscape:px-[min(2.5vw,12px)] landscape:h-[min(6vw,36px)]
                        landscape:min-w-[800px]:px-[min(2.2vw,16px)] landscape:min-w-[800px]:h-[min(5vw,40px)]
                        landscape:min-w-[1200px]:px-[min(2vw,24px)] landscape:min-w-[1200px]:h-[min(4vw,48px)]
                        text-xs landscape:text-[min(2vw,10px)]
                        landscape:min-w-[800px]:text-[min(1.8vw,11px)]
                        landscape:min-w-[1200px]:text-[min(1.5vw,13px)]
                      " style={{
                        backgroundColor: 'var(--primary-color)',
                        color: 'var(--text-primary)'
                      }}><Plus className="w-4 h-4 mr-1" />Save</Button>
                    </>
                  )}
                </div>
              </div>

              <div className="landscape:hidden block">
                <div className="text-center mb-2 sm:mb-4">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {isPodcastOrAudiobook && (
                    <>
                    <SkipButton seconds={30} direction="back" onClick={() => seek(Math.max(0, currentTime - 30))} />
                    <SkipButton seconds={15} direction="back" onClick={() => seek(Math.max(0, currentTime - 15))} />
                    </>
                    )}

                    {isCompletedPodcast ? (
                      <Button onClick={handleStartOver} className="px-6 py-3 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors">
                        {isLoadingAudio ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <RotateCcw className="w-5 h-5 mr-2" />}
                        Start Over
                      </Button>
                    ) : (
                      <Button className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:scale-105 transition-transform flex items-center justify-center p-0" onClick={togglePlayPause}>
                        {isLoadingAudio ? <Loader2 className="w-7 h-7 animate-spin" /> : (isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />)}
                      </Button>
                    )}

                    {isPodcastOrAudiobook && (
                      <>
                        <SkipButton seconds={30} direction="forward" onClick={() => seek(Math.min(duration, currentTime + 30))} />
                        <SkipButton seconds={60} direction="forward" onClick={() => seek(Math.min(duration, currentTime + 60))} label="+1:00" />
                      </>
                    )}
                    
                    {isLiveRadio && <Button onClick={handleDiscover} disabled={isLoadingDiscover} size="lg" variant="ghost" className="w-12 h-12 rounded-full hover:bg-white/10" style={{color: 'var(--text-primary)'}} title="Discover a Station">{isLoadingDiscover ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}</Button>}
                  </div>
                </div>

                {station.id && isLiveRadio && (
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <Button onClick={() => setShowSaveDialog(true)} className="font-semibold px-4 sm:px-8 py-2 sm:py-3 h-10 sm:h-12 rounded-full shadow-lg text-sm sm:text-base transition-opacity hover:opacity-90" style={{
                        backgroundColor: 'var(--primary-color)',
                        color: 'var(--text-primary)'
                    }}><Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />Save to Playlist</Button>
                  </div>
                )}
              </div>
              
              <div className="landscape:hidden">
                {station.id && isLiveRadio && (station.url_low || station.url_high) && (
                  <div className="p-3 sm:p-4 rounded-xl border mb-4 sm:mb-6" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
                    <h3 className="font-semibold mb-3 text-center" style={{color: 'var(--text-primary)'}}>Streaming Quality</h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button onClick={() => handleQualityChange('primary')} variant={currentQuality === 'primary' ? 'default' : 'outline'} size="sm" className={currentQuality === 'primary' ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-xs' : 'text-xs'} style={{backgroundColor: currentQuality === 'primary' ? undefined : 'var(--button-bg)', borderColor: currentQuality === 'primary' ? undefined : 'var(--border-color)', color: currentQuality === 'primary' ? undefined : 'var(--text-primary)'}}>Standard</Button>
                      {station.url_low && <Button onClick={() => handleQualityChange('low')} variant={currentQuality === 'low' ? 'default' : 'outline'} size="sm" className={currentQuality === 'low' ? 'bg-gradient-to-r from-green-500 to-emerald-400 text-white text-xs' : 'text-xs'} style={{backgroundColor: currentQuality === 'low' ? undefined : 'var(--button-bg)', borderColor: currentQuality === 'low' ? undefined : 'var(--border-color)', color: currentQuality === 'low' ? undefined : 'var(--text-primary)'}}>Low</Button>}
                      {station.url_high && <Button onClick={() => handleQualityChange('high')} variant={currentQuality === 'high' ? 'default' : 'outline'} size="sm" className={currentQuality === 'high' ? 'bg-gradient-to-r from-purple-500 to-pink-400 text-white text-xs' : 'text-xs'} style={{backgroundColor: currentQuality === 'high' ? undefined : 'var(--button-bg)', borderColor: currentQuality === 'high' ? undefined : 'var(--border-color)', color: currentQuality === 'high' ? undefined : 'var(--text-primary)'}}>High</Button>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {error && <div className="mt-8 p-3 bg-red-500/10 border border-red-400/20 rounded-xl text-center"><p className="text-red-400 font-medium text-sm">Playback Error</p><p className="text-red-300 text-xs mt-1">{error}</p></div>}
        </div>
      </div>
      
      <StationListOverlay
        isOpen={isListOverlayOpen}
        onClose={() => setIsListOverlayOpen(false)}
        title={overlayTitle}
        stations={overlayStations}
        onStationSelect={(selectedStation) => { playStation(selectedStation); setIsListOverlayOpen(false); }}
      />
      <SaveToPlaylistDialog 
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        station={station}
      />
      <CommunityOverlay isOpen={isCommunityOpen} onClose={() => { setIsCommunityOpen(false); setPreselectedGenre(null); setPreselectedFilter(null); setPreselectedSort(null); }} onStationSelect={(s) => { playStation(s); setIsCommunityOpen(false);}} preselectedGenre={preselectedGenre} preselectedFilter={preselectedFilter} preselectedSort={preselectedSort} />
      <StationInfoOverlay isOpen={isStationInfoOpen} onClose={() => setIsStationInfoOpen(false)} station={station} />

      <AnimatePresence>
        {isDescriptionOpen && (
            <DescriptionOverlay 
                title={station.name}
                description={station.description}
                onClose={() => setIsDescriptionOpen(false)}
            />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
