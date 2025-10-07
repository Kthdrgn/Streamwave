import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Heart, X, Search, ArrowDownUp, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StationFilters({ 
  onFilterChange, 
  activeFilters, 
  availableGenres, 
  onSortChange, 
  activeSort,
  hideFavorites = false,
  communityMode = false,
  showNewFilter = false
}) {
  const handleGenreChange = (genre) => {
    onFilterChange({ ...activeFilters, genre: genre === 'all' ? null : genre });
  };

  const handleFavoritesToggle = () => {
    onFilterChange({ ...activeFilters, favoritesOnly: !activeFilters.favoritesOnly });
  };

  const handleNewFilterToggle = () => {
    onFilterChange({ ...activeFilters, showOnlyNew: !activeFilters.showOnlyNew });
  };

  const handleSearchChange = (searchQuery) => {
    onFilterChange({ ...activeFilters, search: searchQuery });
  };

  const clearFilters = () => {
    onFilterChange({ genre: null, favoritesOnly: false, search: '', showOnlyNew: false });
  };

  const hasActiveFilters = activeFilters.genre || (!hideFavorites && activeFilters.favoritesOnly) || activeFilters.search || (showNewFilter && activeFilters.showOnlyNew);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-4">
        {/* Mobile-friendly layout */}
        <div className="space-y-4">
          {/* Search Input - Full width on top */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-300" />
            <Input
              placeholder="Search by name, genre, call letters, or frequency..."
              value={activeFilters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:border-blue-400"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-300 flex-shrink-0" />
              <span className="text-white font-medium whitespace-nowrap">Filters:</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Select 
                value={activeFilters.genre || 'all'} 
                onValueChange={handleGenreChange}
              >
                <SelectTrigger className="w-full sm:w-40 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  {availableGenres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!hideFavorites && (
                <Button
                  variant={activeFilters.favoritesOnly ? "default" : "outline"}
                  onClick={handleFavoritesToggle}
                  className={`flex items-center justify-center gap-2 ${
                    activeFilters.favoritesOnly
                      ? 'bg-red-500/20 border-red-400/30 text-red-200 hover:bg-red-500/30'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${activeFilters.favoritesOnly ? 'fill-current' : ''}`} />
                  <span className="whitespace-nowrap">Favorites Only</span>
                </Button>
              )}

              {showNewFilter && (
                <Button
                  variant={activeFilters.showOnlyNew ? "default" : "outline"}
                  onClick={handleNewFilterToggle}
                  className={`flex items-center justify-center gap-2 ${
                    activeFilters.showOnlyNew
                      ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/30'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="whitespace-nowrap">New Only</span>
                </Button>
              )}

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-blue-300 hover:text-white hover:bg-white/10 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span className="whitespace-nowrap">Clear</span>
                </Button>
              )}
            </div>
          </div>

          {/* Sort Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <ArrowDownUp className="w-4 h-4 text-blue-300 flex-shrink-0" />
              <span className="text-white font-medium whitespace-nowrap">Sort by:</span>
            </div>
            
            <Select value={activeSort} onValueChange={onSortChange}>
              <SelectTrigger className="w-full sm:w-48 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{communityMode ? 'Recently Added' : 'Default Order'}</SelectItem>
                <SelectItem value="alpha_asc">Alphabetical (A-Z)</SelectItem>
                <SelectItem value="alpha_desc">Alphabetical (Z-A)</SelectItem>
                <SelectItem value="most_played">Most Played</SelectItem>
                {!communityMode && (
                    <SelectItem value="recently_played">Recently Played</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
              {activeFilters.search && (
                <span className="px-3 py-1 bg-green-500/20 text-green-200 rounded-full text-sm flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  "{activeFilters.search}"
                  <button
                    onClick={() => handleSearchChange('')}
                    className="hover:text-red-300 ml-1"
                  >
                    ×
                  </button>
                </span>
              )}
              {activeFilters.genre && (
                <span className="px-3 py-1 bg-blue-500/20 text-blue-200 rounded-full text-sm flex items-center gap-1">
                  Genre: {activeFilters.genre}
                  <button
                    onClick={() => handleGenreChange('all')}
                    className="hover:text-red-300 ml-1"
                  >
                    ×
                  </button>
                </span>
              )}
              {!hideFavorites && activeFilters.favoritesOnly && (
                <span className="px-3 py-1 bg-red-500/20 text-red-200 rounded-full text-sm flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-current" />
                  Favorites
                  <button
                    onClick={handleFavoritesToggle}
                    className="hover:text-red-300 ml-1"
                  >
                    ×
                  </button>
                </span>
              )}
              {showNewFilter && activeFilters.showOnlyNew && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full text-sm flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  New Only
                  <button
                    onClick={handleNewFilterToggle}
                    className="hover:text-red-300 ml-1"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}