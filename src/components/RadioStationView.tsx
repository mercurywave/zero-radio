import React, { useEffect, useState } from 'react';
import SearchView, { performSearch } from './SearchView';
import { AudioTrack, MusicCacheService, MusicLibraryEntry, SearchResult } from '../services/musicCacheService';
import { RadioStation } from '../types/radioStation';
import './RadioStationView.css';
import { radioStationService } from '../services/radioStationService';

const cacheService = MusicCacheService.getInstance();

interface RadioStationViewProps {
  onPlayTrack?: (track: AudioTrack) => void;
  onPlayStation?: (station: RadioStation, leadTrack?: MusicLibraryEntry) => void;
}

const RadioStationView: React.FC<RadioStationViewProps> = ({ onPlayTrack, onPlayStation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // State for suggested stations from the service
  const [suggestedStations, setSuggestedStations] = useState<RadioStation[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  const recentStations = [
    { id: '7', name: 'Indie Mix' },
    { id: '8', name: 'Classical Moments' },
    { id: '9', name: 'Country Roads' },
    { id: '10', name: 'Metal Madness' },
    { id: '11', name: 'R&B Smooth' },
    { id: '12', name: 'Reggae Vibes' },
  ]

  // Initialize the cache service and fetch suggested stations when component mounts
  useEffect(() => {
    const initAndFetchSuggestions = async () => {
      try {
        await cacheService.initDB();
        let allStations = await radioStationService.getAllStations();
        // Select 5 random stations if available
        let randomStations: RadioStation[] = [];
        if (allStations.length > 0) {
          randomStations = allStations.sort(() => Math.random() - 0.5).slice(0, 5);
        }
        setSuggestedStations(randomStations);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
      setIsLoadingSuggestions(false);
    };

    initAndFetchSuggestions();
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
        onPlayStation={onPlayStation}
      />

      {searchQuery.trim() === '' && !isLoadingSuggestions && <RenderStationTiles suggestedStations={suggestedStations} recentStations={recentStations} onPlayStation={onPlayStation} />}
    </div>
  )
}

// Render radio station tiles when no search query
const RenderStationTiles = ({ suggestedStations, recentStations, onPlayStation }: { suggestedStations: any[], recentStations: any[], onPlayStation?: ((station: RadioStation, leadTrack?: MusicLibraryEntry) => void) | undefined }) => {
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
            {onPlayStation && (
              <button
                className="play-btn"
                onClick={() => onPlayStation(station)}
                title="Play station"
              >
                ▶
              </button>
            )}
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
            {onPlayStation && (
              <button
                className="play-btn"
                onClick={() => onPlayStation(station.id)}
                title="Play station"
              >
                ▶
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default RadioStationView;