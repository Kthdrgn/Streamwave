
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePlayer } from '../components/player/PlayerContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Trash2, Clock, TrendingUp, CheckCircle, Palette, WifiOff, ListFilter } from 'lucide-react';
import { motion } from 'framer-motion';
import { RadioStation } from '@/api/entities'; // Assuming this path is correct for your project
import { User } from '@/api/entities'; // Assuming this path is correct for your User entity

export default function Settings() {
  const { recentlyPlayed } = usePlayer();
  const [clearingRecent, setClearingRecent] = useState(false);
  const [clearingMostPlayed, setClearingMostPlayed] = useState(false);
  const [recentCleared, setRecentCleared] = useState(false);
  const [mostPlayedCleared, setMostPlayedCleared] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [isWarningDisabled, setIsWarningDisabled] = useState(false);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [excludedGenres, setExcludedGenres] = useState([]);
  const [mostPlayedCount, setMostPlayedCount] = useState(0); // State for most played count

  const themes = useMemo(() => [
    { id: 'default', name: 'Ocean Blue', primary: '#3b82f6', secondary: '#06b6d4', bg_from: '#0f172a', bg_to: '#172554', text_primary: '#ffffff', text_secondary: '#cbd5e1', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', description: 'Classic blue and cyan' },
    { id: 'purple', name: 'Purple Dream', primary: '#8b5cf6', secondary: '#ec4899', bg_from: '#2e1065', bg_to: '#581c87', text_primary: '#ffffff', text_secondary: '#e2e8f0', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', description: 'Purple and pink vibes' },
    { id: 'emerald', name: 'Emerald Forest', primary: '#10b981', secondary: '#059669', bg_from: '#064e3b', bg_to: '#065f46', text_primary: '#ffffff', text_secondary: '#d1fae5', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', description: 'Fresh green tones' },
    { id: 'sunset', name: 'Sunset Orange', primary: '#f59e0b', secondary: '#ef4444', bg_from: '#78350f', bg_to: '#7f1d1d', text_primary: '#ffffff', text_secondary: '#fef3c7', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', description: 'Warm orange and red' },
    { id: 'slate', name: 'Slate Gray', primary: '#64748b', secondary: '#475569', bg_from: '#1e293b', bg_to: '#0f172a', text_primary: '#ffffff', text_secondary: '#cbd5e1', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', description: 'Professional gray theme' },
    { id: 'fire', name: 'Fire Red', primary: '#dc2626', secondary: '#f59e0b', bg_from: '#7f1d1d', bg_to: '#991b1b', text_primary: '#ffffff', text_secondary: '#fecaca', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', description: 'Bold red and orange fire' },
    { id: 'snow', name: 'Pure White', primary: '#1f2937', secondary: '#374151', bg_from: '#ffffff', bg_to: '#f9fafb', text_primary: '#000000', text_secondary: '#374151', border_color: 'rgba(0, 0, 0, 0.2)', button_bg: 'rgba(0, 0, 0, 0.08)', description: 'Crisp white minimalist', icon_primary: '#9ca3af', icon_secondary: '#e5e7eb' },
    { id: 'yellow', name: 'Golden Yellow', primary: '#44403c', secondary: '#57534e', bg_from: '#ffcc00', bg_to: '#fdaa00', text_primary: '#1c1917', text_secondary: '#34302d', border_color: 'rgba(0, 0, 0, 0.15)', button_bg: 'rgba(255, 255, 255, 0.4)', description: 'Golden yellow theme with dark text', icon_primary: '#ffcc00', icon_secondary: '#fdaa00' },
    { id: 'mist', name: 'Charcoal Mist', primary: '#4b5563', secondary: '#374151', bg_from: '#d1d5db', bg_to: '#9ca3af', text_primary: '#111827', text_secondary: '#374151', border_color: 'rgba(0, 0, 0, 0.25)', button_bg: 'rgba(0, 0, 0, 0.1)', description: 'Dark charcoal and mist gray', icon_primary: '#6b7280', icon_secondary: '#9ca3af' },
    { id: 'midnight', name: 'Midnight Black', primary: '#06b6d4', secondary: '#8b5cf6', bg_from: '#000000', bg_to: '#111827', text_primary: '#ffffff', text_secondary: '#e0e7ff', border_color: 'rgba(255, 255, 255, 0.2)', button_bg: 'rgba(255, 255, 255, 0.1)', description: 'Pure black with neon accents', icon_primary: '#1e40af', icon_secondary: '#3730a3' }
  ], []);

  const applyTheme = useCallback((themeId) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      document.documentElement.style.setProperty('--primary-color', theme.primary);
      document.documentElement.style.setProperty('--secondary-color', theme.secondary);
      document.documentElement.style.setProperty('--bg-from-color', theme.bg_from);
      document.documentElement.style.setProperty('--bg-to-color', theme.bg_to);
      document.documentElement.style.setProperty('--text-primary', theme.text_primary);
      document.documentElement.style.setProperty('--text-secondary', theme.text_secondary);
      document.documentElement.style.setProperty('--border-color', theme.border_color);
      document.documentElement.style.setProperty('--button-bg', theme.button_bg);
    }
  }, [themes]);

  const getMostPlayedCount = async () => {
    try {
      const user = await User.me();
      const playCountData = user.station_play_counts || {};
      return Object.keys(playCountData).filter(url => playCountData[url].playCount > 0).length;
    } catch (error) {
      console.error('Failed to get most played count from user data, falling back to localStorage:', error);
      // Fallback to localStorage
      try {
        const playCountData = localStorage.getItem('stationPlayCounts');
        if (playCountData) {
          const playCounts = JSON.parse(playCountData);
          return Object.keys(playCounts).filter(url => playCounts[url].playCount > 0).length;
        }
      } catch (localError) {
        console.error('Failed to get most played count from localStorage:', localError);
      }
      return 0;
    }
  };

  useEffect(() => {
    // Load saved settings from local storage
    const savedTheme = localStorage.getItem('selectedTheme') || 'default';
    setSelectedTheme(savedTheme);
    applyTheme(savedTheme);

    const warningDisabled = localStorage.getItem('disableMobileDataWarning') === 'true';
    setIsWarningDisabled(warningDisabled);

    const loadGenres = async () => {
      try {
        const stations = await RadioStation.list(); // Assuming RadioStation.list() returns an array of stations
        const allGenres = new Set();
        let hasStationsWithoutGenres = false;
        
        stations.forEach(station => {
          if (station.genres && Array.isArray(station.genres) && station.genres.length > 0) {
            station.genres.forEach(genre => allGenres.add(genre));
          } else {
            hasStationsWithoutGenres = true;
          }
        });
        
        const genresList = Array.from(allGenres).sort();
        
        // Add "No Genres" option if there are stations without genres
        if (hasStationsWithoutGenres) {
          genresList.unshift('No Genres');
        }
        
        setAvailableGenres(genresList);
      } catch (error) {
        console.error("Failed to load genres:", error);
      }
    };

    const loadExcludedGenres = () => {
      const saved = localStorage.getItem('excludedGenres');
      if (saved) {
        try {
          setExcludedGenres(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse excluded genres from localStorage", e);
          setExcludedGenres([]); // Fallback to empty array on parse error
        }
      }
    };

    const loadMostPlayedCount = async () => {
      const count = await getMostPlayedCount();
      setMostPlayedCount(count);
    };
    
    loadGenres();
    loadExcludedGenres();
    loadMostPlayedCount();
  }, [applyTheme]);

  const handleThemeChange = (themeId) => {
    setSelectedTheme(themeId);
    applyTheme(themeId);
    localStorage.setItem('selectedTheme', themeId);
  };

  const handleWarningToggle = (checked) => {
    setIsWarningDisabled(checked);
    if (checked) {
      localStorage.setItem('disableMobileDataWarning', 'true');
    } else {
      localStorage.removeItem('disableMobileDataWarning');
    }
  };

  const handleToggleExcludedGenre = (genre) => {
    const newExcluded = excludedGenres.includes(genre)
      ? excludedGenres.filter(g => g !== genre)
      : [...excludedGenres, genre];
    
    setExcludedGenres(newExcluded);
    localStorage.setItem('excludedGenres', JSON.stringify(newExcluded));
  };

  const clearRecentlyPlayed = async () => {
    if (!confirm('Are you sure you want to clear your recently played history? This action cannot be undone.')) {
      return;
    }

    setClearingRecent(true);
    try {
      await User.updateMyUserData({ recently_played_stations: [] });
      // Also clear localStorage fallback
      localStorage.removeItem('recentlyPlayedStations');
      // Force refresh of recently played in context
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear recently played:', error);
    }
    setClearingRecent(false);
    setRecentCleared(true);
    setTimeout(() => setRecentCleared(false), 3000);
  };

  const clearMostPlayed = async () => {
    if (!confirm('Are you sure you want to clear your most played statistics? This action cannot be undone.')) {
      return;
    }

    setClearingMostPlayed(true);
    try {
      await User.updateMyUserData({ station_play_counts: {} });
      // Also clear localStorage fallback
      localStorage.removeItem('stationPlayCounts');
      setMostPlayedCount(0); // Update state immediately
    } catch (error) {
      console.error('Failed to clear most played:', error);
    }
    setClearingMostPlayed(false);
    setMostPlayedCleared(true);
    setTimeout(() => setMostPlayedCleared(false), 3000);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="h-40 flex items-center justify-center mx-auto mb-6">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3cdc3be9cd0c4b26b1ff/7706333b4_652-removebg-preview.png"
              alt="StreamWave"
              className="h-full object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Settings</h1>
          <p className="text-lg max-w-2xl mx-auto" style={{color: 'var(--text-secondary)'}}>
            Manage your listening history and app preferences
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Discover Preferences Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="backdrop-blur-xl rounded-2xl border p-6"
            style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <ListFilter className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Discover Preferences</h3>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Exclude genres from the 'Discover' button
                </p>
              </div>
            </div>
            
            <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
              Click genres below to exclude them from discovery. Excluded genres will appear in red.
            </p>

            <div className="rounded-xl p-4" style={{backgroundColor: 'rgba(var(--text-primary), 0.05)'}}>
              {availableGenres.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableGenres.map(genre => {
                    const isExcluded = excludedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        onClick={() => handleToggleExcludedGenre(genre)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                          isExcluded
                            ? 'bg-red-500/80 text-white'
                            : 'bg-[color:var(--primary-color)]/20 text-[color:var(--primary-color)] hover:bg-[color:var(--primary-color)]/30'
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center p-4" style={{color: 'var(--text-secondary)'}}>Loading genres...</p>
              )}
              
              {excludedGenres.length > 0 && (
                <div className="mt-4 pt-4" style={{borderTop: '1px solid var(--border-color)'}}>
                  <p className="text-sm text-red-300 mb-2">
                    Excluded genres ({excludedGenres.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {excludedGenres.map(genre => (
                      <span key={genre} className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Data Usage Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-xl rounded-2xl border p-6"
            style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-red-500 rounded-xl flex items-center justify-center">
                <WifiOff className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Data Usage</h3>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Manage warnings for streaming on mobile data
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-xl" style={{backgroundColor: 'rgba(var(--text-primary), 0.05)'}}>
              <Label htmlFor="data-warning-toggle" className="flex-1 cursor-pointer" style={{color: 'var(--text-primary)'}}>
                Disable Mobile Data Warning
              </Label>
              <Switch
                id="data-warning-toggle"
                checked={isWarningDisabled}
                onCheckedChange={handleWarningToggle}
              />
            </div>
             <p className="text-xs mt-3 px-1" style={{color: 'var(--text-secondary)'}}>
              When enabled, the app will warn you before streaming on a cellular network. Disable this if you have an unlimited data plan.
            </p>
          </motion.div>

          {/* Theme Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-xl rounded-2xl border p-6"
            style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-400 rounded-xl flex items-center justify-center">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Color Theme</h3>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Choose your preferred color scheme
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`p-4 rounded-xl border transition-all duration-300 text-left`}
                  style={{
                    borderColor: selectedTheme === theme.id ? 'var(--primary-color)' : 'var(--border-color)',
                    backgroundColor: selectedTheme === theme.id ? 'var(--primary-color)' : 'rgba(var(--text-primary), 0.05)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      style={{ 
                        background: `linear-gradient(135deg, ${theme.icon_primary || theme.primary}, ${theme.icon_secondary || theme.secondary})` 
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate" style={{color: 'var(--text-primary)'}}>{theme.name}</h4>
                      <p className="text-xs truncate" style={{color: 'var(--text-secondary)'}}>{theme.description}</p>
                    </div>
                    {selectedTheme === theme.id && (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Recently Played Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="backdrop-blur-xl rounded-2xl border p-6"
            style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-400 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Recently Played History</h3>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  You have {recentlyPlayed.length} stations in your recent history
                </p>
              </div>
            </div>
            
            {recentCleared && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3 bg-green-500/10 border border-green-400/20 rounded-xl flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400">Recently played history cleared successfully!</span>
              </motion.div>
            )}

            <Button
              onClick={clearRecentlyPlayed}
              disabled={clearingRecent || recentlyPlayed.length === 0}
              variant="outline"
              className="bg-red-500/10 border-red-400/30 text-red-200 hover:bg-red-500/20 w-full"
            >
              {clearingRecent ? (
                <>Clearing...</>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Recently Played
                </>
              )}
            </Button>
          </motion.div>

          {/* Most Played Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="backdrop-blur-xl rounded-2xl border p-6"
            style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-400 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Most Played Statistics</h3>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  You have play counts for {mostPlayedCount} stations
                </p>
              </div>
            </div>

            {mostPlayedCleared && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3 bg-green-500/10 border border-green-400/20 rounded-xl flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400">Most played statistics cleared successfully!</span>
              </motion.div>
            )}

            <Button
              onClick={clearMostPlayed}
              disabled={clearingMostPlayed || mostPlayedCount === 0}
              variant="outline"
              className="bg-red-500/10 border-red-400/30 text-red-200 hover:bg-red-500/20 w-full"
            >
              {clearingMostPlayed ? (
                <>Clearing...</>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Most Played Statistics
                </>
              )}
            </Button>
          </motion.div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="backdrop-blur-xl rounded-2xl border p-6"
            style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)'}}
          >
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>About Data Storage</h3>
            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
              Your listening history, play counts, and theme preferences are stored locally in your browser. 
              Clearing this data will permanently remove it and cannot be undone. 
              Your saved stations will not be affected by these actions.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
