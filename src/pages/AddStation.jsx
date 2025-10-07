
import React, { useState, useEffect } from 'react';
import { RadioStation } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, CheckCircle, Play, Save, Upload, X, Link2 } from 'lucide-react';
import { usePlayer } from '../components/player/PlayerContext';
import { motion } from 'framer-motion';
import { UploadFile } from '@/api/integrations';
import { User } from '@/api/entities'; // Import the User entity
import { extractStreamFromPls } from '@/api/functions'; // Import the new function

const popularGenres = [
  '60s', '70s', '80s', '90s', 'Adult Contemporary', 'Alternative',
  'Ambient', 'Blues', 'Classical', 'Classic Rock', 'College', 'Country', 'Dance',
  'Electronic', 'Folk', 'Hip Hop', 'Hits', 'Indie', 'Jazz', 'Local',
  'Metal', 'News', 'Oldies', 'Pop', 'Public', 'Punk',
  'R&B', 'Reggae', 'Religion', 'Rock', 'Sports', 'Talk',
  'Techno', 'Top 40', 'World'
];

export default function AddStation({ onClose, switchOverlay }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    url_low: '',
    url_high: '',
    website_url: '',
    description: '',
    genres: [],
    call_letters: '',
    frequency: '',
    icon_url: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // isEditMode and stationId are removed as this component is now only for adding.
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newGenreInput, setNewGenreInput] = useState('');
  const [isProcessingUrl, setIsProcessingUrl] = useState(false); // New state for URL processing
  
  const [availableGenres, setAvailableGenres] = useState(popularGenres);

  const { playStation } = usePlayer();
  // useNavigate and useLocation are no longer needed
  
  useEffect(() => {
    const checkAdminStatusAndLoadGenres = async () => {
      try {
        const user = await User.me();
        if (user && user.role === 'admin') {
          setIsAdmin(true);
          
          // Load custom genres from user data
          const customGenres = user.custom_genres || [];
          const combinedGenres = [...new Set([...popularGenres, ...customGenres])];
          setAvailableGenres(combinedGenres.sort((a,b) => a.localeCompare(b)));
        } else {
            // If not admin, just set popular genres
            setAvailableGenres(popularGenres.sort((a,b) => a.localeCompare(b)));
        }
      } catch (error) {
        // User not logged in or error, isAdmin remains false.
        // Fallback to popular genres if user check fails
        setAvailableGenres(popularGenres.sort((a,b) => a.localeCompare(b)));
        console.error("Failed to check admin status or load custom genres:", error);
      }
    };
    checkAdminStatusAndLoadGenres();
  }, []);

  // The useEffect that parsed URL params for edit mode is no longer needed
  // This page will now only be for adding new stations. Editing can be a future feature.

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (success) setSuccess(false);
  };

  // New function to handle URL processing
  const handleUrlBlur = async (field) => {
    const urlValue = formData[field];
    if (!urlValue || isProcessingUrl) return;

    // Check if it might be a PLS file
    if (urlValue.toLowerCase().includes('.pls') || urlValue.toLowerCase().includes('playlist')) {
      setIsProcessingUrl(true);
      try {
        const result = await extractStreamFromPls({ url: urlValue });
        
        if (result.data.success && result.data.isPls) {
          // Update the URL with the extracted stream URL
          setFormData(prev => ({ 
            ...prev, 
            [field]: result.data.primaryUrl 
          }));
          
          // Optionally update station name if we got a title and current name is empty
          if (result.data.titles && result.data.titles.length > 0 && !formData.name) {
            setFormData(prev => ({ 
              ...prev, 
              name: result.data.titles[0] 
            }));
          }
          
          // Show success message
          alert(`PLS file processed! Found ${result.data.streamUrls.length} stream(s). Using: ${result.data.primaryUrl}`);
        }
      } catch (error) {
        console.error('Error processing PLS URL:', error);
        // Don't show error to user for non-PLS files, just log it.
        // If it's a real error parsing a PLS, the URL field remains as user typed.
      } finally {
        setIsProcessingUrl(false);
      }
    }
  };

  const handleIconUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB.');
      return;
    }

    setIsUploadingIcon(true);
    try {
      const result = await UploadFile({ file });
      setFormData(prev => ({ ...prev, icon_url: result.file_url }));
    } catch (error) {
      console.error('Failed to upload icon:', error);
      alert('Failed to upload icon. Please try again.');
    }
    setIsUploadingIcon(false);
  };

  const removeIcon = () => {
    setFormData(prev => ({ ...prev, icon_url: '' }));
  };

  const addGenre = (genre) => {
    if (genre && !formData.genres.includes(genre)) {
      setFormData(prev => ({ ...prev, genres: [...prev.genres, genre] }));
    }
  };

  const removeGenre = (genreToRemove) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.filter(g => g !== genreToRemove)
    }));
  };

  const handleAddNewGenre = async () => {
    const trimmedGenre = newGenreInput.trim();
    if (trimmedGenre && !availableGenres.map(g => g.toLowerCase()).includes(trimmedGenre.toLowerCase())) {
      try {
        // Get current user data
        const user = await User.me();
        const currentCustomGenres = user.custom_genres || [];
        
        // Add new genre to user's custom genres
        const updatedCustomGenres = [...new Set([...currentCustomGenres, trimmedGenre])].sort((a,b) => a.localeCompare(b));
        await User.updateMyUserData({ custom_genres: updatedCustomGenres });
        
        // Update local state
        const updatedGenres = [...new Set([...availableGenres, trimmedGenre])].sort((a, b) => a.localeCompare(b));
        setAvailableGenres(updatedGenres);
        addGenre(trimmedGenre);
        setNewGenreInput('');
      } catch (error) {
        console.error('Failed to save custom genre:', error);
        // Still add locally for this session even if save fails
        const updatedGenres = [...new Set([...availableGenres, trimmedGenre])].sort((a, b) => a.localeCompare(b));
        setAvailableGenres(updatedGenres);
        addGenre(trimmedGenre);
        setNewGenreInput('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url) return;

    setIsLoading(true);
    try {
      // This component is now only for creating new stations
      const station = await RadioStation.create({
        ...formData,
        is_favorite: false
      });

      setFormData({ name: '', url: '', url_low: '', url_high: '', website_url: '', description: '', genres: [], call_letters: '', frequency: '', icon_url: '' });
      setSuccess(true);

      // Auto-play the newly added station
      playStation(station);
      
      // Close the overlay after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500); // Give user a moment to see success message before closing

      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error saving station:', error);
    }
    setIsLoading(false);
  };

  const handleQuickPlay = () => {
    if (formData.url) {
      playStation({
        url: formData.url,
        name: formData.name || 'Test Stream',
        genres: formData.genres
      });
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="h-40 flex items-center justify-center mx-auto mb-6">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3cdc3be9cd0c4b26b1ff/7706333b652-removebg-preview.png"
              alt="StreamWave"
              className="h-full object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Add New Station</h1>
          <p className="text-lg max-w-md mx-auto" style={{color: 'var(--text-secondary)'}}>
            Discover and add your favorite internet radio stations from around the world
          </p>
        </motion.div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-green-500/10 border border-green-400/20 rounded-2xl flex items-center gap-3"
          >
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-green-400 font-semibold">Station Added Successfully!</p>
              <p className="text-green-300 text-sm">Your station is now playing and saved to your collection.</p>
            </div>
          </motion.div>
        )}

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-xl rounded-3xl border p-8 shadow-2xl"
          style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Station Icon Upload */}
            <div>
              <Label className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Station Icon <span className="text-sm font-normal" style={{color: 'var(--text-secondary)'}}>(Optional)</span>
              </Label>

              {formData.icon_url ? (
                <div className="flex items-center gap-4 p-4 rounded-xl border" style={{backgroundColor: 'rgba(var(--text-primary), 0.05)', borderColor: 'var(--border-color)'}}>
                  <img
                    src={formData.icon_url}
                    alt="Station icon"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium" style={{color: 'var(--text-primary)'}}>Icon uploaded successfully</p>
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>This will be displayed with your station</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={removeIcon}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploadingIcon}
                  />
                  <div className="p-6 border-2 border-dashed rounded-xl text-center hover:border-opacity-60 transition-colors" style={{borderColor: 'var(--border-color)'}}>
                    {isUploadingIcon ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-2" />
                        <p style={{color: 'var(--text-primary)'}}>Uploading icon...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 mb-2" style={{color: 'var(--primary-color)'}} />
                        <p className="font-medium mb-1" style={{color: 'var(--text-primary)'}}>Click to upload station icon</p>
                        <p className="text-sm" style={{color: 'var(--text-secondary)'}}>PNG, JPG up to 2MB</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stream URLs */}
            <div>
              <Label htmlFor="url" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Primary Stream URL * {isProcessingUrl && <span className="text-sm font-normal">(Processing PLS...)</span>}
              </Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                onBlur={() => handleUrlBlur('url')}
                placeholder="https://stream.example.com/radio or https://stream.example.com/playlist.pls"
                className="w-full border h-16 text-lg mb-6"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                required
                disabled={isProcessingUrl}
              />

              {/* Additional Quality Streams */}
              <div className="space-y-4 mb-4">
                <div>
                  <Label htmlFor="url_low" className="mb-2 block font-semibold" style={{color: 'var(--text-primary)'}}>
                    Low Quality Stream <span className="text-sm font-normal" style={{color: 'var(--text-secondary)'}}>(Optional - for mobile/slow connections)</span>
                  </Label>
                  <Input
                    id="url_low"
                    type="url"
                    value={formData.url_low}
                    onChange={(e) => handleInputChange('url_low', e.target.value)}
                    onBlur={() => handleUrlBlur('url_low')}
                    placeholder="https://stream.example.com/radio-low or .pls file"
                    className="border h-12"
                    style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                    disabled={isProcessingUrl}
                  />
                </div>

                <div>
                  <Label htmlFor="url_high" className="mb-2 block font-semibold" style={{color: 'var(--text-primary)'}}>
                    High Quality Stream <span className="text-sm font-normal" style={{color: 'var(--text-secondary)'}}>(Optional - for high-speed connections)</span>
                  </Label>
                  <Input
                    id="url_high"
                    type="url"
                    value={formData.url_high}
                    onChange={(e) => handleInputChange('url_high', e.target.value)}
                    onBlur={() => handleUrlBlur('url_high')}
                    placeholder="https://stream.example.com/radio-high or .pls file"
                    className="border h-12"
                    style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                    disabled={isProcessingUrl}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={handleQuickPlay}
                  disabled={!formData.url || isProcessingUrl}
                  variant="outline"
                  className="h-12 px-6"
                  style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Test Primary Stream
                </Button>
                {switchOverlay && (
                    <Button
                        type="button"
                        onClick={() => switchOverlay('Resources')}
                        variant="outline"
                        className="h-12 px-6"
                        style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                    >
                        <Link2 className="w-5 h-5 mr-2" />
                        Find Stream URLs
                    </Button>
                )}
              </div>
              <div className="mt-3 text-sm space-y-1 p-4 rounded-xl border" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--text-secondary)'}}>
                <p className="font-medium" style={{color: 'var(--text-primary)'}}>💡 Tips for Stream URLs:</p>
                <p>• <strong>Direct URLs</strong> work best (e.g., .mp3, .aac, .ogg streams)</p>
                <p>• <strong>PLS files</strong> (.pls) will be automatically processed to extract direct URLs</p>
                <p>• <strong>Multiple Quality</strong> streams help users choose based on their connection</p>
                <p>• The app will automatically extract station info from PLS files when available</p>
              </div>
            </div>

            {/* Station Name */}
            <div>
              <Label htmlFor="name" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Station Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="My Awesome Radio Station"
                className="border h-12 text-lg"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                required
              />
            </div>

            {/* Website URL */}
            <div>
              <Label htmlFor="website_url" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Station Website <span className="text-sm font-normal" style={{color: 'var(--text-secondary)'}}>(Optional)</span>
              </Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                placeholder="https://www.station.com"
                className="border h-12 text-lg"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
              />
              <p className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
                The station icon will link to this website when clicked
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Description <span className="text-sm font-normal" style={{color: 'var(--text-secondary)'}}>(Optional)</span>
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the station, what kind of music it plays, location, etc."
                className="w-full border rounded-xl p-4 h-24 resize-none"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                maxLength={300}
              />
              <p className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
                {formData.description.length}/300 characters
              </p>
            </div>

            {/* Call Letters & Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="call_letters" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                  Call Letters <span className="text-sm font-normal" style={{color: 'var(--text-secondary)'}}>(Optional)</span>
                </Label>
                <Input
                  id="call_letters"
                  value={formData.call_letters}
                  onChange={(e) => handleInputChange('call_letters', e.target.value)}
                  placeholder="e.g. WNYC-FM"
                  className="border h-12 text-lg"
                  style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                />
              </div>

              <div>
                <Label htmlFor="frequency" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                  Frequency <span className="text-sm font-normal" style={{color: 'var(--text-secondary)'}}>(Optional)</span>
                </Label>
                <Input
                  id="frequency"
                  value={formData.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value)}
                  placeholder="e.g. 93.9 FM"
                  className="border h-12 text-lg"
                  style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                />
              </div>
            </div>

            {/* Genres */}
            <div>
              <Label htmlFor="genres" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Genres
              </Label>
              
              {/* Admin: Add New Genre */}
              {isAdmin && (
                <div className="mb-4 p-4 rounded-xl border" style={{backgroundColor: 'rgba(var(--text-primary), 0.05)', borderColor: 'var(--border-color)'}}>
                  <Label htmlFor="new-genre" className="mb-2 block font-semibold" style={{color: 'var(--text-primary)'}}>
                    Add New Genre (Admin)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-genre"
                      value={newGenreInput}
                      onChange={(e) => setNewGenreInput(e.target.value)}
                      placeholder="e.g. Lofi, Chiptune"
                      className="border h-10"
                      style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                    />
                    <Button
                      type="button"
                      onClick={handleAddNewGenre}
                      className="bg-blue-500/30 text-blue-200 hover:bg-blue-500/40 h-10"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* Selected Genres */}
              {formData.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 rounded-xl" style={{backgroundColor: 'rgba(var(--text-primary), 0.05)'}}>
                  {formData.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 bg-[color:var(--primary-color)]/30 text-[color:var(--primary-color)]"
                    >
                      {genre}
                      <button
                        type="button"
                        onClick={() => removeGenre(genre)}
                        className="hover:opacity-75 transition-opacity"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Genre Selection */}
              <div className="flex flex-wrap gap-2 mb-3">
                {availableGenres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => addGenre(genre)}
                    disabled={formData.genres.includes(genre)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                      formData.genres.includes(genre)
                        ? 'bg-[color:var(--primary-color)]/50 text-[color:var(--primary-color)] cursor-not-allowed'
                        : 'bg-[color:var(--primary-color)]/20 text-[color:var(--primary-color)] hover:bg-[color:var(--primary-color)]/30'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || isUploadingIcon || isProcessingUrl || !formData.name || !formData.url}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold py-4 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-lg h-14"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-3" />
                  Saving Station...
                </>
              ) : isProcessingUrl ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-3" />
                  Processing PLS File...
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 mr-3" />
                  Add Station & Play
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
