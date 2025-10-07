
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Audiobook } from '@/api/entities';
import { User } from '@/api/entities';
import { usePlayer } from '../components/player/PlayerContext';
import { motion } from 'framer-motion';
import { MoreVertical, Edit, Trash2, Clock, BookOpen, Plus, Play, Pause, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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

const parseDuration = (durationStr) => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    seconds = parts[0];
  }
  return seconds;
};

export default function MyAudiobooksPage() {
  const [allAudiobooks, setAllAudiobooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { 
    playStation, 
    station, 
    isPlaying, 
    togglePlayPause, 
    currentTime, 
    duration: liveDuration, 
    podcastProgress,
    isProgressLoading 
  } = usePlayer();
  
  const [editingAudiobook, setEditingAudiobook] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [audiobookToDelete, setAudiobookToDelete] = useState(null);

  useEffect(() => {
    loadAudiobooks();
  }, []);

  const displayAudiobooks = useMemo(() => {
    let patchedAudiobooks = [...allAudiobooks];

    // Live patch: If the playing station has an updated duration, apply it to our list.
    // This is useful if the duration was initially unknown or estimated and the player now has an exact value.
    if (station && station.id && !station.podcast_id && station.duration) {
      const stationIndex = patchedAudiobooks.findIndex(b => b.id === station.id);
      if (stationIndex !== -1) {
        const bookInList = patchedAudiobooks[stationIndex];
        const listDurationSeconds = parseDuration(bookInList.duration);
        const stationDurationSeconds = parseDuration(station.duration);
        // Only update if the station's duration is valid and the list's duration is either invalid or smaller.
        // This prevents overwriting a correct duration with a temporary or incorrect one.
        if (stationDurationSeconds > 0 && (listDurationSeconds <= 0 || stationDurationSeconds > listDurationSeconds)) {
          patchedAudiobooks[stationIndex] = { ...bookInList, duration: station.duration };
        }
      }
    }

    if (isProgressLoading) {
        return patchedAudiobooks.map(book => ({
          ...book, 
          progressPercentage: 0, 
          currentPosition: 0,
          isCurrentlyPlaying: false,
          totalDurationSeconds: parseDuration(book.duration),
          isComplete: false,
        }));
    }

    return patchedAudiobooks.map(book => {
      const progressData = podcastProgress[book.id];
      const isCurrentlyPlaying = station?.id === book.id;

      const currentPosition = isCurrentlyPlaying ? currentTime : (progressData?.saved_position || 0);
      const totalDurationSeconds = isCurrentlyPlaying && liveDuration > 0 
          ? liveDuration 
          : parseDuration(book.duration);
      
      const progressPercentage = currentPosition > 0 && totalDurationSeconds > 0
        ? Math.min((currentPosition / totalDurationSeconds) * 100, 100)
        : 0;

      return {
        ...book,
        isCurrentlyPlaying,
        currentPosition,
        totalDurationSeconds,
        progressPercentage,
        isComplete: progressData?.is_completed || false,
      };
    });
  }, [allAudiobooks, podcastProgress, isProgressLoading, currentTime, liveDuration, station]);


  const loadAudiobooks = async () => {
    setLoading(true);
    try {
      const fetchedAudiobooks = await Audiobook.list('-created_date');
      setAllAudiobooks(fetchedAudiobooks);
    } catch (error) {
      console.error('Failed to load audiobooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAudiobook = (audiobook) => {
    playStation({
      ...audiobook,
      name: audiobook.title,
      url: audiobook.audio_url,
      icon_url: audiobook.cover_image_url,
      genres: ['Podcast'],
      call_letters: `by ${audiobook.author}`,
      description: audiobook.description,
    });
  };

  const isCurrentAudiobook = (audiobook) => {
    return station?.id === audiobook.id;
  };

  const handleEditClick = (audiobook) => {
    setEditingAudiobook({ ...audiobook });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (audiobook) => {
    setAudiobookToDelete(audiobook);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (audiobookToDelete) {
      try {
        await Audiobook.delete(audiobookToDelete.id);
        loadAudiobooks(); // Reload all audiobooks to refresh the list
      } catch (error) {
        console.error('Failed to delete audiobook:', error);
      }
    }
    setIsDeleteAlertOpen(false);
    setAudiobookToDelete(null);
  };

  const handleUpdate = async () => {
    if (editingAudiobook) {
      try {
        const { id, ...dataToUpdate } = editingAudiobook;
        await Audiobook.update(id, dataToUpdate);
        loadAudiobooks(); // Reload all audiobooks to refresh the list
        setIsEditModalOpen(false);
        setEditingAudiobook(null);
      } catch (error) {
        console.error('Failed to update audiobook:', error);
      }
    }
  };

  if (loading) { // Only check 'loading' for initial data fetch, 'isProgressLoading' is handled by useEffect now
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin" style={{color: 'var(--text-primary)'}} />
        </div>
    );
  }

  if (allAudiobooks.length === 0) {
    return (
      <div className="text-center p-12 backdrop-blur-xl rounded-2xl border" style={{backgroundColor: 'var(--button-bg)', borderColor: 'var(--border-color)'}}>
        <BookOpen className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--text-secondary)'}} />
        <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Your Library is Empty</h3>
        <p className="mb-4" style={{color: 'var(--text-secondary)'}}>Add your personal audiobooks to get started.</p>
        <Button 
          onClick={() => alert("Navigation to Add Audiobook page would happen here.")}
          className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Audiobook
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-left">
          <h1 className="text-4xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>My Audiobooks</h1>
          <p className="text-lg" style={{color: 'var(--text-secondary)'}}>
            Your personal library of audiobooks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {displayAudiobooks.map((audiobook) => {
          return (
            <motion.div
              key={audiobook.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group cursor-pointer"
            >
              <div className="relative mb-3">
                <div className="aspect-[2/3] rounded-xl overflow-hidden border relative" style={{borderColor: 'var(--border-color)'}}>
                  {audiobook.cover_image_url ? (
                    <img src={audiobook.cover_image_url} alt={audiobook.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: 'rgba(var(--text-primary-rgb), 0.1)'}}>
                      <BookOpen className="w-12 h-12" style={{color: 'var(--text-secondary)'}} />
                    </div>
                  )}
                  
                  {/* Play/Pause Overlay */}
                  <div 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => audiobook.isCurrentlyPlaying ? togglePlayPause() : playAudiobook(audiobook)}
                  >
                    {audiobook.isCurrentlyPlaying && isPlaying ? (
                      <Pause className="w-12 h-12 text-white" />
                    ) : (
                      <Play className="w-12 h-12 text-white" />
                    )}
                  </div>
                  
                  {/* Progress bar at bottom */}
                  {audiobook.progressPercentage > 0 && !audiobook.isComplete && (
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/70">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${audiobook.progressPercentage}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Progress Percentage Badge */}
                  {audiobook.progressPercentage > 0 && !audiobook.isComplete && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      {Math.round(audiobook.progressPercentage)}%
                    </div>
                  )}
                  
                  {/* Completed badge */}
                  {audiobook.isComplete && (
                    <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1.5 shadow-lg">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  {/* Edit/Delete Dropdown */}
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(audiobook); }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-500 focus:text-red-500"
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(audiobook); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-left" style={{color: 'var(--text-primary)'}} title={audiobook.title}>
                  {audiobook.title}
                </h3>
                <p className="text-xs line-clamp-1 mb-1 text-left" style={{color: 'var(--text-secondary)'}} title={`by ${audiobook.author}`}>
                  by {audiobook.author}
                </p>
                
                {/* Progress text */}
                {(audiobook.currentPosition > 0 || audiobook.totalDurationSeconds > 0) && (
                  <p className="text-xs text-left" style={{color: 'var(--text-secondary)'}}>
                    {formatTime(audiobook.currentPosition)} / {formatTime(audiobook.totalDurationSeconds)}
                    {audiobook.isComplete && ' (Finished)'}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {isEditModalOpen && editingAudiobook && (
          <AlertDialog open onOpenChange={setIsEditModalOpen}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Edit Audiobook</AlertDialogTitle>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-4">
                      {/* Form fields for editing */}
                      <Input value={editingAudiobook.title} onChange={(e) => setEditingAudiobook({...editingAudiobook, title: e.target.value})} placeholder="Title" />
                      <Input value={editingAudiobook.author} onChange={(e) => setEditingAudiobook({...editingAudiobook, author: e.target.value})} placeholder="Author" />
                      <Input value={editingAudiobook.duration} onChange={(e) => setEditingAudiobook({...editingAudiobook, duration: e.target.value})} placeholder="Duration (e.g. 5:23:15)" />
                      <Textarea value={editingAudiobook.description} onChange={(e) => setEditingAudiobook({...editingAudiobook, description: e.target.value})} placeholder="Description" />
                  </div>
                  <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setIsEditModalOpen(false)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUpdate}>Save Changes</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}

      {isDeleteAlertOpen && (
          <AlertDialog open onOpenChange={setIsDeleteAlertOpen}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently delete "{audiobookToDelete?.title}". This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
    </div>
  );
}
