import React, { useState, useEffect, useRef } from 'react';
import { RadioStation, radioStationService, TrackScore } from '../services/radioStationService';
import { MusicLibraryEntry } from '../services/musicCacheService';
import { performSearch } from '../services/searchService';
import './RadioStationDetailView.css';
import { SearchResult } from '../services/musicCacheService';

interface RadioStationDetailViewProps {
  stationId: string;
  onBack: () => void;
  onPlayStation: (station: RadioStation) => void;
}

const RadioStationDetailView: React.FC<RadioStationDetailViewProps> = ({ stationId, onBack, onPlayStation }) => {
  const [station, setStation] = useState<RadioStation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [topTracks, setTopTracks] = useState<TrackScore[]>([]);
  const [isFetchingTracks, setIsFetchingTracks] = useState(false);
  const [maxScore, setMaxScore] = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // State for building criteria from tracks
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<MusicLibraryEntry[]>([]);

  // Get tooltip for track attributes based on station criteria
  const getTrackAttributesTooltip = (track: MusicLibraryEntry) => {
    if (!track) return '';

    const attributes = [];

    if (track.artist) {
      attributes.push(`Artist: ${track.artist}`);
    }
    if (track.album) {
      attributes.push(`Album: ${track.album}`);
    }
    if (track.genre) {
      attributes.push(`Genre: ${track.genre}`);
    }
    if (track.mood) {
      attributes.push(`Mood: ${track.mood}`);
    }
    if (track.year) {
      const decade = Math.floor(track.year / 10) * 10;
      attributes.push(`Decade: ${decade}s`);
    }

    return attributes.join('\n');
  };

  // Search for results when input changes
  const handleSearchInputChange = async (value: string) => {
    setSearchQuery(value);

    // Perform search using the search service
    const results = await performSearch(value, (results) => {
      // Filter out stations from search results for custom station building
      const filteredResults = results.filter(result => result.type !== 'station');
      setSearchResults(filteredResults);
    }, setIsSearching);
  };

  // Select a search result and add all tracks to the selected list
  const handleSelectResult = (result: SearchResult) => {
    let tracks: MusicLibraryEntry[] = [];

    switch (result.type) {
      case 'track':
        tracks = [result];
        break;
      case 'artist':
        tracks = result.tracks;
        break;
      case 'album':
        tracks = result.tracks;
        break;
      case 'station':
        // For stations, we would need to get the tracks from that station
        // This is a simplified implementation for now - just add empty array
        tracks = [];
        break;
    }

    // Add all tracks to selected list
    setSelectedTracks(prev => [...prev, ...tracks]);

    // Clear search results and input value
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove a track from the selected list
  const removeTrackFromList = (track: MusicLibraryEntry) => {
    setSelectedTracks(prev => prev.filter(t => t.id !== track.id));
  };

  // Remove all tracks from the selected list
  const removeAllTracks = () => {
    setSelectedTracks([]);
  };

  // Fetch top tracks for a station
  const fetchTopTracks = async (station: RadioStation) => {
    setIsFetchingTracks(true);
    try {
      const tracks = await radioStationService.scoreTracksForStation(station, []);
      setTopTracks(tracks.slice(0, 100));

      // Calculate max score for bar graph scaling
      if (tracks.length > 0) {
        const max = Math.max(...tracks.map(t => t.score));
        setMaxScore(max);
      } else {
        setMaxScore(0);
      }
    } catch (err) {
      console.error('Error fetching top tracks:', err);
    } finally {
      setIsFetchingTracks(false);
    }
  };

  // Build criteria from selected tracks
  const buildStationFromTracks = async () => {
    if (selectedTracks.length === 0) {
      return;
    }

    // Create or update the station with criteria from tracks
    try {
      if (station && station.isCustom) {
        station.isTemporary = false; // make the station more permanent
        await radioStationService.updateStationFromTracks(
          station,
          selectedTracks,
          { album: 0.5, decade: 0.1 }
        );
        // Clear selected tracks after building
        setSelectedTracks([]);
        // Refetch the updated station
        const updatedStation = await radioStationService.getStationById(stationId);
        if (updatedStation) {
          setStation(updatedStation);
          // Refresh top tracks based on updated criteria
          await fetchTopTracks(updatedStation);
        }
      }
    } catch (err) {
      console.error('Error building station from tracks:', err);
    }
  };

  useEffect(() => {
    const fetchStationDetails = async () => {
      try {
        const fetchedStation = await radioStationService.getStationById(stationId);
        if (fetchedStation) {
          setStation(fetchedStation);
          setEditedName(fetchedStation.name);
          await fetchTopTracks(fetchedStation);
        } else {
          setError('Station not found');
        }
      } catch (err) {
        console.error('Error fetching station details:', err);
        setError('Failed to load station details');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchTopTracks = async (station: RadioStation) => {
      setIsFetchingTracks(true);
      try {
        const tracks = await radioStationService.scoreTracksForStation(station, []);
        setTopTracks(tracks.slice(0, 100));

        // Calculate max score for bar graph scaling
        if (tracks.length > 0) {
          const max = Math.max(...tracks.map(t => t.score));
          setMaxScore(max);
        } else {
          setMaxScore(0);
        }
      } catch (err) {
        console.error('Error fetching top tracks:', err);
      } finally {
        setIsFetchingTracks(false);
      }
    };

    fetchStationDetails();
  }, [stationId]);

  const handleSaveName = async () => {
    if (!station || editedName.trim() === '') return;

    try {
      const updatedStation = await radioStationService.updateStation(station, { name: editedName });
      setStation(updatedStation);
      setIsEditingName(false);
    } catch (err) {
      console.error('Error updating station name:', err);
    }
  };

  const handleNameClick = () => {
    if (station?.isCustom) {
      setIsEditingName(true);
    }
  };

  const handleBlur = () => {
    if (isEditingName) {
      handleSaveName();
    }
  };

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  if (isLoading) {
    return (
      <div className="radio-station-detail-view">
        <div className="radio-station-header">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <h1>Loading Station...</h1>
        </div>
        <div className="radio-station-content">
          <p>Loading station details...</p>
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="radio-station-detail-view">
        <div className="radio-station-header">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <h1>Station Not Found</h1>
        </div>
        <div className="radio-station-content">
          <p>{error || 'The requested station could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="radio-station-detail-view">
      <div className="radio-station-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        {isEditingName ? (
          <div className="edit-name-container">
            <input
              ref={nameInputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveName();
                }
              }}
              className="edit-name-input"
              autoFocus
            />
          </div>
        ) : (
          <h1
            className={`station-title ${station.isCustom ? 'editable' : ''}`}
            onClick={handleNameClick}
          >
            {station.name}
          </h1>
        )}
        <button 
          className={`favorite-button ${station.isFavorite ? 'favorited' : ''}`}
          onClick={async () => {
            if (station) {
              const updatedStation = await radioStationService.updateStation(station, { isFavorite: !station.isFavorite });
              setStation(updatedStation);
            }
          }}
          aria-label={station.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {station.isFavorite ? '★' : '☆'}
        </button>
        <p className="radio-station-type">Radio Station</p>
      </div>

      <div className="radio-station-content-wrapper">
        <div className="radio-station-info-column">
          <div className="radio-station-art-container">
            <div className="radio-station-art-placeholder">
              {station.imagePath ? (
                <img src={station.imagePath} alt={`${station.name} station`} className="radio-station-art" />
              ) : (
                <span className="radio-station-icon">📻</span>
              )}
            </div>
          </div>
          <button className="play-button" onClick={() => onPlayStation(station)}>
            ▶ Play Station
          </button>
        </div>

        <div className="radio-station-description-column">
          
          {/* Build criteria from tracks section */}
          {station?.isCustom && (
            <div className="radio-station-build-criteria">
              <h2>Build Station Criteria</h2>
              <p>Add artists, albums, or tracks to build your custom station:</p>

              <div className="single-search-section">
                <div className="input-with-results">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    placeholder={`Enter artist, album, or track name...`}
                    className="criteria-input"
                  />
                  {(searchResults.length > 0 || isSearching) && (
                    <div className="search-results">
                      {isSearching && (
                        <div className="search-spinner">Searching...</div>
                      )}
                      {searchResults.length > 0 && searchResults.map((result, resultIndex) => (
                        <div
                          key={resultIndex}
                          className="inline-result-item"
                          onClick={() => handleSelectResult(result)}
                        >
                          {result.type === 'track' && (
                            <span>{result.title} - {result.artist}</span>
                          )}
                          {result.type === 'artist' && (
                            <span>Artist: {result.artistName} ({result.trackCount} tracks)</span>
                          )}
                          {result.type === 'album' && (
                            <span>Album: {result.albumName} by {result.artistName}</span>
                          )}
                          {result.type === 'station' && (
                            <span>Station: {result.stationName}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected tracks display */}
              {selectedTracks.length > 0 && (
                <div className="selected-tracks-section">
                  <div className="selected-tracks-header">
                    <span>Selected Tracks ({selectedTracks.length})</span>
                    <button
                      onClick={removeAllTracks}
                      className="remove-all-button"
                    >
                      Remove All
                    </button>
                  </div>
                  <div className="track-list">
                    {selectedTracks.map((track, trackIndex) => (
                      <div key={track.id} className="track-item-small">
                        <span>{track.title}</span>
                        <span>{track.artist}</span>
                        <button
                          onClick={() => removeTrackFromList(track)}
                          className="remove-track-button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={buildStationFromTracks}
                disabled={selectedTracks.length === 0}
                className="build-station-button"
              >
                Build Station from Selected Tracks
              </button>
            </div>
          )}
          
          {station.description && (
            <div className="radio-station-description">
              {station.description ? (
                <p>{station.description}</p>
              ) : (
                <p>No description available for this station.</p>
              )}
            </div>
          )}

          {station.criteria && station.criteria.length > 0 && (
            <div className="radio-station-criteria">
              <h2>Station Criteria</h2>
              <ul>
                {station.criteria.map((criterion, index) => (
                  <li key={index}>
                    <strong>{criterion.attribute}:</strong> {criterion.value} (weight: {criterion.weight.toFixed(2)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top tracks display */}
          <div className="radio-station-top-tracks">
            <h2>Top Tracks</h2>
            {isFetchingTracks ? (
              <p>Loading top tracks...</p>
            ) : topTracks.length > 0 ? (
              <div className="top-tracks-list">
                {topTracks.map((trackScore, index) => (
                  <div key={index} className="track-item">
                    <div className="track-info">
                      <span className="track-number">{index + 1}</span>
                      <div className="track-details">
                        <div
                          className="track-title"
                          title={getTrackAttributesTooltip(trackScore.track)}
                        >
                          {trackScore.track.title}
                        </div>
                        <div
                          className="track-artist"
                          title={getTrackAttributesTooltip(trackScore.track)}
                        >
                          {trackScore.track.artist}
                        </div>
                      </div>
                    </div>
                    <div className="track-score">
                      <div className="track-score-bar-container">
                        <div className="track-score-bar">
                          <div
                            className="track-score-bar-fill"
                            style={{
                              width: `${maxScore > 0 ? (trackScore.score / maxScore * 100).toFixed(2) : 0}%`,
                              minWidth: '2px'
                            }}
                          ></div>
                        </div>
                        <span className="score-value">{trackScore.score.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No tracks found for this station.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadioStationDetailView;