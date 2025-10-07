import React, { useState, useEffect } from 'react';
import { Audiobook } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, BookOpen, Upload, X, Save } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { UploadFile } from '@/api/integrations';

export default function AddAudiobook() {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    audio_url: '',
    narrator: '',
    cover_image_url: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [audiobookId, setAudiobookId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');

    if (id) {
      setIsEditMode(true);
      setAudiobookId(id);
      setIsLoading(true);

      const fetchAudiobook = async () => {
        try {
          const audiobookData = await Audiobook.get(id);
          if (audiobookData) {
            setFormData({
              title: audiobookData.title,
              author: audiobookData.author,
              description: audiobookData.description || '',
              audio_url: audiobookData.audio_url,
              narrator: audiobookData.narrator || '',
              cover_image_url: audiobookData.cover_image_url || '',
            });
          }
        } catch (error) {
          console.error("Failed to fetch audiobook data for editing:", error);
          alert('Failed to load audiobook. Redirecting to My Audiobooks.');
          navigate(createPageUrl('MyAudiobooks'));
        } finally {
          setIsLoading(false);
        }
      };

      fetchAudiobook();
    }
  }, [location.search, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB.');
      return;
    }

    setIsUploadingCover(true);
    try {
      const result = await UploadFile({ file });
      setFormData(prev => ({ ...prev, cover_image_url: result.file_url }));
    } catch (error) {
      console.error('Failed to upload cover:', error);
      alert('Failed to upload cover image. Please try again.');
    }
    setIsUploadingCover(false);
  };

  const removeCover = () => {
    setFormData(prev => ({ ...prev, cover_image_url: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.audio_url) {
      alert('Please fill in all required fields (Title, Author, and Audio URL).');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode && audiobookId) {
        await Audiobook.update(audiobookId, formData);
        alert('Audiobook updated successfully!');
      } else {
        await Audiobook.create(formData);
        alert('Audiobook added successfully!');
        setFormData({
          title: '',
          author: '',
          description: '',
          audio_url: '',
          narrator: '',
          cover_image_url: '',
        });
      }
      navigate(createPageUrl('MyAudiobooks'));
    } catch (error) {
      console.error('Error saving audiobook:', error);
      alert('Failed to save audiobook. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
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
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>
            {isEditMode ? 'Edit Audiobook' : 'Add Audiobook'}
          </h1>
          <p className="text-lg max-w-md mx-auto" style={{color: 'var(--text-secondary)'}}>
            {isEditMode ? 'Update your audiobook details' : 'Add your personal audiobook collection'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-xl rounded-3xl border p-8 shadow-2xl"
          style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Cover Image Upload */}
            <div>
              <Label className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Cover Image <span className="text-sm font-normal" style={{color: 'var(--text-secondary)'}}>(Optional)</span>
              </Label>

              {formData.cover_image_url ? (
                <div className="flex items-center gap-4 p-4 rounded-xl border" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.05)', borderColor: 'var(--border-color)'}}>
                  <img
                    src={formData.cover_image_url}
                    alt="Cover"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium" style={{color: 'var(--text-primary)'}}>Cover uploaded successfully</p>
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>This will be displayed with your audiobook</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={removeCover}
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
                    onChange={handleCoverUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploadingCover}
                  />
                  <div className="p-6 border-2 border-dashed rounded-xl text-center hover:border-opacity-60 transition-colors" style={{borderColor: 'var(--border-color)'}}>
                    {isUploadingCover ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-2" />
                        <p style={{color: 'var(--text-primary)'}}>Uploading cover...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 mb-2" style={{color: 'var(--primary-color)'}} />
                        <p className="font-medium mb-1" style={{color: 'var(--text-primary)'}}>Click to upload cover image</p>
                        <p className="text-sm" style={{color: 'var(--text-secondary)'}}>PNG, JPG up to 2MB</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="The Great Gatsby"
                className="border h-12 text-lg"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                required
              />
            </div>

            {/* Author */}
            <div>
              <Label htmlFor="author" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Author *
              </Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                placeholder="F. Scott Fitzgerald"
                className="border h-12 text-lg"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                required
              />
            </div>

            {/* Narrator */}
            <div>
              <Label htmlFor="narrator" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Narrator <span className="text-sm font-normal" style={{color: 'var(--text-secondary)'}}>(Optional)</span>
              </Label>
              <Input
                id="narrator"
                value={formData.narrator}
                onChange={(e) => handleInputChange('narrator', e.target.value)}
                placeholder="Jake Gyllenhaal"
                className="border h-12 text-lg"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
              />
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
                placeholder="Enter a synopsis or description of the audiobook..."
                className="w-full border rounded-xl p-4 h-32 resize-none"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                maxLength={1000}
              />
              <p className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
                {formData.description.length}/1000 characters
              </p>
            </div>

            {/* Audio URL */}
            <div>
              <Label htmlFor="audio_url" className="mb-3 block text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                Audio URL *
              </Label>
              <Input
                id="audio_url"
                type="url"
                value={formData.audio_url}
                onChange={(e) => handleInputChange('audio_url', e.target.value)}
                placeholder="https://www.dropbox.com/s/example/audiobook.mp3?dl=1"
                className="w-full border h-16 text-lg"
                style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                required
              />
              <div className="mt-3 text-sm space-y-1 p-4 rounded-xl border" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--text-secondary)'}}>
                <p className="font-medium" style={{color: 'var(--text-primary)'}}>💡 Tips for Audio URLs:</p>
                <p>• <strong>Dropbox:</strong> Change <code>?dl=0</code> to <code>?dl=1</code> at the end of the URL</p>
                <p>• <strong>Google Drive:</strong> Use a direct download link generator</p>
                <p>• The URL must point directly to an audio file (MP3, M4A, M4B, etc.)</p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || isUploadingCover || !formData.title || !formData.author || !formData.audio_url}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold py-4 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-lg h-14"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-3" />
                  {isEditMode ? 'Saving Changes...' : 'Adding Audiobook...'}
                </>
              ) : isEditMode ? (
                <>
                  <Save className="w-6 h-6 mr-3" />
                  Save Changes
                </>
              ) : (
                <>
                  <BookOpen className="w-6 h-6 mr-3" />
                  Add Audiobook
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}