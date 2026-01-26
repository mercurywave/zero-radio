import React, { useEffect, useState } from 'react';
import SearchView, { performSearch } from './SearchView';
import { AudioTrack, MusicCacheService, SearchResult } from '../services/musicCacheService';

const cacheService = MusicCacheService.getInstance();

interface RadioStationViewProps {
  onPlayTrack?: (track: AudioTrack) => void;
}

const RadioStationView: React.FC<RadioStationViewProps> = ({ onPlayTrack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock data for radio stations - will be replaced with actual library data
  const suggestedStations = [
    { id: '1', name: 'Chill Vibes' },
    { id: '2', name: 'Rock Classics' },
    { id: '3', name: 'Jazz Lounge' },
    { id: '4', name: 'Electronic Beats' },
    { id: '5', name: 'Pop Hits' },
    { id: '6', name: 'Hip Hop Central' },
  ]

  const recentStations = [
    { id: '7', name: 'Indie Mix' },
    { id: '8', name: 'Classical Moments' },
    { id: '9', name: 'Country Roads' },
    { id: '10', name: 'Metal Madness' },
    { id: '11', name: 'R&B Smooth' },
    { id: '12', name: 'Reggae Vibes' },
  ]

  // Initialize the cache service when component mounts
  useEffect(() => {
    const initCache = async () => {
      try {
        await cacheService.initDB();
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    
    initCache();
  }, []);

    // Perform search when query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const performSearchWrapper = async () => {
      await performSearch(
        cacheService,
        searchQuery,
        setSearchResults,
        setIsSearching
      );
    };

    // Add a small delay to avoid too frequent searches
    const timeoutId = setTimeout(performSearchWrapper, 100);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);



  return (
    <div className="radio-stations-view">
      <SearchView 
        onSearchQueryChange={setSearchQuery}
        searchQuery={searchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        onPlayTrack={onPlayTrack}
      />
      
      {searchQuery.trim() === '' && <RenderStationTiles suggestedStations={suggestedStations} recentStations={recentStations} />}
    </div>
  )
}

// Render radio station tiles when no search query
const RenderStationTiles = ({ suggestedStations, recentStations }: { suggestedStations: any[], recentStations: any[] }) => {
  return (
    <>
      {/* Suggested Stations */}
      <div className="section-title">
        <h3>Suggested Stations</h3>
      </div>
      <div className="radio-station-grid">
        {suggestedStations.map((station) => (
          <div key={station.id} className="radio-station-card">
            <div className="station-image-placeholder">
              <span className="station-icon">📻</span>
            </div>
            <div className="station-info">
              <h4>{station.name}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Stations */}
      <div className="section-title">
        <h3>Recently Played</h3>
      </div>
      <div className="radio-station-grid">
        {recentStations.map((station) => (
          <div key={station.id} className="radio-station-card">
            <div className="station-image-placeholder">
              <span className="station-icon">📻</span>
            </div>
            <div className="station-info">
              <h4>{station.name}</h4>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default RadioStationView;