

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom"; // Link is still used by MiniPlayer, so keep it.
import { Home, Plus, Menu, X, Link2, ThumbsUp, History, Activity, Info, Settings, Search, Music, Podcast as PodcastIcon, Rss, Globe, LayoutGrid, Radio, MicVocal, Clock, Download, BookOpen, Sparkles } from "lucide-react"; // Added Globe, LayoutGrid, Radio, MicVocal, Clock, Download, BookOpen, Sparkles
import { PlayerProvider, usePlayer } from "./components/player/PlayerContext";
import MobileDataWarningDialog from "./components/player/MobileDataWarningDialog";
import { AnimatePresence, motion } from "framer-motion"; // Fixed: Removed 'm' from framer-motion import
import MiniPlayer from "./components/player/MiniPlayer";
import NowPlaying from "./pages/NowPlaying";
import CommunityOverlay from "./components/player/CommunityOverlay";
import SleepTimerControl from "./components/player/SleepTimerControl"; // NEW: Import SleepTimerControl

// Import page components that will now be overlays
import HomePage from "./pages/Home";
import WhatsPlayingNowPage from "./pages/WhatsPlayingNow";
import LikedTracksPage from "./pages/LikedTracks";
import RecentTracksPage from "./pages/RecentTracks";
import AddStationPage from "./pages/AddStation";
import ResourcesPage from "./pages/Resources";
import AboutPage from "./pages/About";
import SettingsPage from "./pages/Settings";
import PlaylistsPage from "./pages/Playlists";
import PodcastsPage from "./pages/Podcasts";
import AddPodcastPage from "./pages/AddPodcast";
import AllStationsPage from "./pages/AllStations"; // New import
import AllPodcastsPage from "./pages/AllPodcasts"; // New import
import InProgressEpisodesPage from "./pages/InProgressEpisodes"; // New import
import DownloadsPage from "./pages/Downloads"; // New import
import MyAudiobooksPage from "./pages/MyAudiobooks"; // New import
import AddAudiobookPage from "./pages/AddAudiobook"; // New import
import DiscoverPage from "./pages/Discover"; // New import

function NavigationContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Consume overlay state and functions from PlayerContext
  const { openCommunityOverlay, openOverlay, closeOverlay, activeOverlay } = usePlayer();
  
  const navigationGroups = [
    {
      title: "Home",
      items: [
        { name: "Home", page: "Home", icon: Home, description: "Your personal dashboard" },
        { name: "Discover", page: "Discover", icon: Sparkles, description: "Find new stations and podcasts" }, // New item
      ]
    },
    {
      title: "Radio",
      icon: Radio,
      items: [
        { name: "What's Playing Now", page: "WhatsPlayingNow", icon: Activity, description: "Live view of your top stations" },
        { name: "Playlists", page: "Playlists", icon: Music, description: "Your custom station playlists" },
        { name: "All Stations", page: "AllStations", icon: Globe, description: "Browse all available stations" },
        { name: "Liked Tracks", page: "LikedTracks", icon: ThumbsUp, description: "View your saved songs" },
        { name: "Recent Tracks", page: "RecentTracks", icon: History, description: "Your listening history" },
      ]
    },
    {
      title: "Podcasts",
      icon: MicVocal,
      items: [
        { name: "Continue Listening", page: "InProgressEpisodes", icon: Clock, description: "Episodes you haven't finished" }, // New item
        { name: "My Podcasts", page: "Podcasts", icon: PodcastIcon, description: "Your subscribed podcasts" },
        { name: "Downloads", page: "Downloads", icon: Download, description: "Listen to episodes offline" }, // New item
        { name: "All Podcasts", page: "AllPodcasts", icon: LayoutGrid, description: "Browse all available podcasts" },
      ]
    },
    {
      title: "Audiobooks", // New group
      icon: BookOpen,
      items: [
        { name: "My Audiobooks", page: "MyAudiobooks", icon: BookOpen, description: "Your audiobook library" },
        { name: "Add Audiobook", page: "AddAudiobook", icon: Plus, description: "Add a new audiobook" },
      ]
    },
    {
      title: "Add Content",
      icon: Plus,
      items: [
        { name: "Add Station", page: "AddStation", icon: Radio, description: "Add radio station to community" },
        { name: "Add Podcast", page: "AddPodcast", icon: Rss, description: "Add podcast to community" },
      ]
    },
    {
      title: "Settings & Help",
      icon: Settings,
      items: [
        { name: "Resources", page: "Resources", icon: Link2, description: "Find station stream URLs" },
        { name: "About & Help", page: "About", icon: Info, description: "Learn about app features" },
        { name: "Settings", page: "Settings", icon: Settings, description: "App settings and preferences" },
      ]
    }
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  
  return (
    <>
      <header className="relative z-30 backdrop-blur-md border-b" style={{ 
        backgroundColor: 'var(--bg-from-color)', 
        borderColor: 'var(--border-color)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Click to close any active overlay and show main content */}
            <button onClick={() => closeOverlay()} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3cdc3be9cd0c4b26b1ff/7706333b0_652-removebg-preview.png" alt="StreamWave" className="h-12"/>
            </button>
            <div className="flex items-center gap-2">
              <button onClick={openCommunityOverlay} className="p-2 rounded-lg transition-colors" title="Search Stations" style={{ 
                  backgroundColor: 'transparent', 
                  color: 'var(--text-primary)' 
                }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-bg)'} 
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <Search className="w-6 h-6" />
              </button>
              <SleepTimerControl />
              <button onClick={toggleMenu} className="p-2 rounded-lg transition-colors" style={{ 
                backgroundColor: 'transparent', 
                color: 'var(--text-primary)' 
              }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-bg)'} 
                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeMenu}/>
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-80 max-w-[85vw] backdrop-blur-xl border-l z-50 overflow-y-auto"
              style={{ 
                backgroundColor: 'var(--bg-from-color)', 
                borderColor: 'var(--border-color)' 
              }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Menu</h2>
                  <button onClick={closeMenu} className="p-2 rounded-lg transition-colors" style={{ 
                    backgroundColor: 'var(--button-bg)', 
                    color: 'var(--text-primary)' 
                  }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-color)'} 
                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--button-bg)'}> 
                    <X className="w-5 h-5" /> 
                  </button>
                </div>
                <nav className="space-y-4">
                  {navigationGroups.map((group) => {
                    const GroupIcon = group.icon;
                    return (
                      <div key={group.title} className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(var(--text-primary-rgb), 0.03)' }}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          {GroupIcon && <GroupIcon className="w-4 h-4" />}
                          {group.title}
                        </h3>
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeOverlay === item.page; // Check against activeOverlay
                            // Home should close the current overlay if any, and close the menu
                            const clickHandler = item.page === 'Home'
                                ? () => { closeOverlay(); closeMenu(); }
                                // Other items should open their respective overlays and close the menu
                                : () => { openOverlay(item.page); closeMenu(); };

                            return (
                              <button 
                                key={item.name} 
                                onClick={clickHandler}
                                className="flex items-start gap-4 p-3 rounded-lg transition-colors w-full text-left"
                                style={{
                                  backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
                                  color: 'var(--text-primary)'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--button-bg)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <Icon className={`w-5 h-5 mt-1 flex-shrink-0`} style={{
                                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                                }} />
                                <div>
                                  <h3 className="font-semibold">{item.name}</h3>
                                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Overlay wrapper component for consistent styling
function OverlayWrapper({ title, onClose, children }) {
  return (
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
        className="w-full max-w-6xl h-[90vh] flex flex-col backdrop-blur-xl border rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--bg-from-color)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full transition-colors p-2" // using p-2 for similar sizing to other buttons
            style={{ 
              color: 'var(--text-primary)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function LayoutContent({ children }) {
  const { 
    isWarningVisible, handleConfirmPlay, handleCancelPlay, 
    station, isPlayerOpen, closePlayerView, 
    isCommunityOverlayOpen, closeCommunityOverlay, playStation,
    activeOverlay, openOverlay, closeOverlay, switchOverlay // Consumed from PlayerContext
  } = usePlayer();

  const handleStationSelectFromOverlay = (station) => {
    playStation(station);
    closeCommunityOverlay();
  }

  // Render the appropriate overlay component
  const renderOverlay = () => {
    if (!activeOverlay) return null;
    
    // Pass down overlay controls to each page
    const overlayProps = { 
        onClose: closeOverlay,
        switchOverlay: switchOverlay, // Make sure switchOverlay is passed if pages need it
    }; 
    
    switch (activeOverlay) {
      case 'Home':
        return <OverlayWrapper title="Home" onClose={closeOverlay}><HomePage {...overlayProps} /></OverlayWrapper>;
      case 'Discover': // New case
        return <OverlayWrapper title="Discover" onClose={closeOverlay}><DiscoverPage {...overlayProps} /></OverlayWrapper>;
      case 'WhatsPlayingNow':
        return <OverlayWrapper title="What's Playing Now" onClose={closeOverlay}><WhatsPlayingNowPage {...overlayProps} /></OverlayWrapper>;
      case 'Playlists': // New case for Playlists
        return <OverlayWrapper title="Playlists" onClose={closeOverlay}><PlaylistsPage {...overlayProps} /></OverlayWrapper>;
      case 'Podcasts': // Add Podcasts case
        return <OverlayWrapper title="My Podcasts" onClose={closeOverlay}><PodcastsPage {...overlayProps} /></OverlayWrapper>;
      case 'Downloads': // New case
        return <OverlayWrapper title="Offline Downloads" onClose={closeOverlay}><DownloadsPage {...overlayProps} /></OverlayWrapper>;
      case 'AllStations': // New
        return <OverlayWrapper title="All Stations" onClose={closeOverlay}><AllStationsPage {...overlayProps} /></OverlayWrapper>;
      case 'AllPodcasts': // New
        return <OverlayWrapper title="All Podcasts" onClose={closeOverlay}><AllPodcastsPage {...overlayProps} /></OverlayWrapper>;
      case 'InProgressEpisodes': // New case
        return <OverlayWrapper title="Continue Listening" onClose={closeOverlay}><InProgressEpisodesPage {...overlayProps} /></OverlayWrapper>;
      case 'MyAudiobooks': // New case
        return <OverlayWrapper title="My Audiobooks" onClose={closeOverlay}><MyAudiobooksPage {...overlayProps} /></OverlayWrapper>;
      case 'AddAudiobook': // New case
        return <OverlayWrapper title="Add Audiobook" onClose={closeOverlay}><AddAudiobookPage {...overlayProps} /></OverlayWrapper>;
      case 'LikedTracks':
        return <OverlayWrapper title="Liked Tracks" onClose={closeOverlay}><LikedTracksPage {...overlayProps} /></OverlayWrapper>;
      case 'RecentTracks':
        return <OverlayWrapper title="Recent Tracks" onClose={closeOverlay}><RecentTracksPage {...overlayProps} /></OverlayWrapper>;
      case 'AddStation':
        return <OverlayWrapper title="Add Station" onClose={closeOverlay}><AddStationPage {...overlayProps} /></OverlayWrapper>;
      case 'AddPodcast': // Add AddPodcast case
        return <OverlayWrapper title="Add Podcast" onClose={closeOverlay}><AddPodcastPage {...overlayProps} /></OverlayWrapper>;
      case 'Resources':
        return <OverlayWrapper title="Resources" onClose={closeOverlay}><ResourcesPage {...overlayProps} /></OverlayWrapper>;
      case 'About':
        return <OverlayWrapper title="About & Help" onClose={closeOverlay}><AboutPage {...overlayProps} /></OverlayWrapper>;
      case 'Settings':
        return <OverlayWrapper title="Settings" onClose={closeOverlay}><SettingsPage {...overlayProps} /></OverlayWrapper>;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ 
      background: 'linear-gradient(to bottom, var(--bg-from-color), var(--bg-to-color))',
      color: 'var(--text-primary)'
    }}>
        <NavigationContent />
        <main className={`flex-grow overflow-y-auto transition-all duration-300 ${station ? 'pb-20' : 'pb-0'}`}>
          {children}
        </main>
        
        <AnimatePresence>
          {station && <MiniPlayer />}
        </AnimatePresence>

        <AnimatePresence>
          {isPlayerOpen && <NowPlaying onClose={closePlayerView} />}
        </AnimatePresence>
        
        {/* Render active overlay from LayoutContent */}
        <AnimatePresence>
          {activeOverlay && renderOverlay()}
        </AnimatePresence>

        <CommunityOverlay 
            isOpen={isCommunityOverlayOpen}
            onClose={closeCommunityOverlay}
            onStationSelect={handleStationSelectFromOverlay}
        />

        <MobileDataWarningDialog isOpen={isWarningVisible} onConfirm={handleConfirmPlay} onCancel={handleCancelPlay} />
    </div>
  );
}

export default function Layout({ children }) {
    // The previous redirect logic is removed as pages are now overlays, not routed paths.
    // The 'children' prop is responsible for rendering the primary content of the main route.

  const applyTheme = useCallback((themeId) => {
    const themes = [
      { id: 'default', primary: '#3b82f6', secondary: '#06b6d4', bg_from: '#0f172a', bg_to: '#1e293b', text_primary: '#ffffff', text_secondary: '#cbd5e1', border_color: 'rgba(255, 255, 255, 0.1)', button_bg: 'rgba(255, 255, 255, 0.1)', text_primary_rgb: '255, 255, 255' },
      { id: 'purple', primary: '#8b5cf6', secondary: '#ec4899', bg_from: '#2e1065', bg_to: '#581c87', text_primary: '#ffffff', text_secondary: '#e2e8f0', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', text_primary_rgb: '255, 255, 255' },
      { id: 'emerald', primary: '#10b981', secondary: '#059669', bg_from: '#064e3b', bg_to: '#065f46', text_primary: '#ffffff', text_secondary: '#d1fae5', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', text_primary_rgb: '255, 255, 255' },
      { id: 'sunset', primary: '#f59e0b', secondary: '#ef4444', bg_from: '#78350f', bg_to: '#7f1d1d', text_primary: '#ffffff', text_secondary: '#fef3c7', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', text_primary_rgb: '255, 255, 255' },
      { id: 'slate', primary: '#64748b', secondary: '#475569', bg_from: '#1e293b', bg_to: '#0f172a', text_primary: '#ffffff', text_secondary: '#cbd5e1', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', text_primary_rgb: '255, 255, 255' },
      { id: 'fire', primary: '#dc2626', secondary: '#f59e0b', bg_from: '#7f1d1d', bg_to: '#991b1b', text_primary: '#ffffff', text_secondary: '#fecaca', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', text_primary_rgb: '255, 255, 255' },
      { id: 'snow', primary: '#1f2937', secondary: '#374151', bg_from: '#ffffff', bg_to: '#f9fafb', text_primary: '#000000', text_secondary: '#374151', border_color: 'rgba(0, 0, 0, 0.2)', button_bg: 'rgba(0, 0, 0, 0.08)', text_primary_rgb: '0, 0, 0' },
      { id: 'yellow', name: 'Golden Yellow', primary: '#44403c', secondary: '#57534e', bg_from: '#ffcc00', bg_to: '#fdaa00', text_primary: '#1c1917', text_secondary: '#57534e', border_color: 'rgba(0, 0, 0, 0.15)', button_bg: 'rgba(255, 255, 255, 0.4)', text_primary_rgb: '28, 25, 23' },
      { id: 'mist', primary: '#4b5563', secondary: '#374151', bg_from: '#d1d5db', bg_to: '#9ca3af', text_primary: '#111827', text_secondary: '#374151', border_color: 'rgba(0, 0, 0, 0.25)', button_bg: 'rgba(0, 0, 0, 0.1)', text_primary_rgb: '17, 24, 39' },
      { id: 'midnight', primary: '#06b6d4', secondary: '#8b5cf6', bg_from: '#000000', bg_to: '#111827', text_primary: '#ffffff', text_secondary: '#e0e7ff', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', text_primary_rgb: '255, 255, 255' }
    ];
    
    const theme = themes.find(t => t.id === themeId) || themes[0];
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--secondary-color', theme.secondary);
    document.documentElement.style.setProperty('--bg-from-color', theme.bg_from);
    document.documentElement.style.setProperty('--bg-to-color', theme.bg_to);
    document.documentElement.style.setProperty('--text-primary', theme.text_primary);
    document.documentElement.style.setProperty('--text-secondary', theme.text_secondary);
    document.documentElement.style.setProperty('--border-color', theme.border_color);
    document.documentElement.style.setProperty('--button-bg', theme.button_bg);
    document.documentElement.style.setProperty('--text-primary-rgb', theme.text_primary_rgb); // Added for rgba color calculation
  }, []); 

  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme') || 'default';
    applyTheme(savedTheme);
  }, [applyTheme]);

  return (
    <PlayerProvider>
      <LayoutContent>{children}</LayoutContent>
    </PlayerProvider>
  );
}

