import React from 'react';
import { MusicCacheService, MusicLibraryEntry, AudioTrack, SearchResult, TrackSearchResult, ArtistSearchResult, AlbumSearchResult, AlbumArtEntry } from '../services/musicCacheService';
import { RadioStation, radioStationService } from '../services/radioStationService';
import './SearchView.css';

interface SearchViewProps {
  onSearchQueryChange: (query: string) => void;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  onPlayTrack?: ((track: AudioTrack) => void) | undefined;
  onPlayStation?: ((station: RadioStation, leadTrack: MusicLibraryEntry) => void) | undefined;
  onAlbumSelected?: ((album: any) => void) | undefined;
  onArtistSelected?: ((artistName: string) => void) | undefined;
  onStationSelected?: ((stationId: string) => void) | undefined;
  onCreateNewStation?: (() => void) | undefined;
}

const SearchView: React.FC<SearchViewProps> = ({
  onSearchQueryChange,
  searchQuery,
  searchResults,
  isSearching,
  onPlayTrack,
  onPlayStation,
  onAlbumSelected,
  onArtistSelected,
  onStationSelected,
  onCreateNewStation
}) => {
  return (
    <div className="search-wrapper">
      {/* Search bar at top middle */}
      <div className="search-container">
        <button className="create-station-button" onClick={onCreateNewStation}>
          +Station
        </button>
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search artists, songs, or albums..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="search-bar"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="search-clear-btn"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {searchQuery.trim() !== '' ? (
        isSearching ? (
          <div className="search-results">
            <p>Searching...</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="search-results">
            <p>No results found</p>
          </div>
        ) : (
          <div className="search-results">
            {searchResults.map((result, index) => {
              switch (result.type) {
                case 'track':
                  return (
                    <div key={index} className="search-result-item">
                      <div className="result-image-placeholder">
                        {result.albumArt ? (
                          <img src={result.albumArt} alt={`${result.title} album art`} className="result-art" />
                        ) : (
                          <span className="station-icon">🎵</span>
                        )}
                      </div>
                      <div className="station-info">
                        <h4>{result.title}</h4>
                        <p className="station-genre">{result.artist}</p>
                        <p className="station-listeners">{result.album}</p>
                      </div>
                      {onPlayTrack && (
                        <button
                          className="play-btn"
                          onClick={() => onPlayTrack(result)}
                          title="Play track"
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  );

                case 'artist':
                  return (
                    <div
                      key={index}
                      className="search-result-item artist-result"
                      onClick={() => onArtistSelected && onArtistSelected(result.artistName)}
                    >
                      <div className="result-image-placeholder">
                        <span className="station-icon">👤</span>
                      </div>
                      <div className="station-info">
                        <h4>{result.artistName}</h4>
                        <p className="station-genre">{result.trackCount} tracks</p>
                      </div>
                      {onPlayStation && (
                        <button
                          className="play-btn"
                          onClick={async (e) => {
                            e.stopPropagation(); // Prevents the artist card click from firing
                            let station = await radioStationService
                              .createArtistStation(result.artistName, result.tracks);
                            const randomIndex = Math.floor(Math.random() * result.tracks.length);
                            let track = result.tracks[randomIndex]!;
                            onPlayStation(station, track);
                          }}
                          title="Play artist"
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  );

                case 'album':
                  return (
                    <div
                      key={index}
                      className="search-result-item album-result"
                      onClick={() => onAlbumSelected && onAlbumSelected(result)}
                    >
                      <div className={"result-image-placeholder"}>
                        {result.albumArt ? (
                          <img src={result.albumArt} alt={`${result.albumName} album art`} className="result-art" />
                        ) : (
                          <span className="station-icon">📀</span>
                        )}
                      </div>
                      <div className="station-info">
                        <h4>{result.albumName}</h4>
                        <p className="station-genre">{result.artistName}</p>
                        <p className="station-listeners">{result.trackCount} tracks</p>
                      </div>
                      {onPlayStation && (
                        <button
                          className="play-btn"
                          onClick={async (e) => {
                            e.stopPropagation(); // Prevents the album click from firing
                            let station = await radioStationService
                              .createAlbumStation(result.artistName, result.albumName, result.tracks);
                            const randomIndex = Math.floor(Math.random() * result.tracks.length);
                            let track = result.tracks[randomIndex]!;
                            onPlayStation(station, track);
                          }}
                          title="Play track"
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  );

                case 'station':
                  return (
                    <div
                      key={index}
                      className="search-result-item station-result"
                      onClick={() => onStationSelected && onStationSelected(result.stationId)}
                    >
                      <div className="result-image-placeholder">
                        {result.imagePath ? (
                          <img src={result.imagePath} alt={`${result.imagePath} station`} className="result-art" />
                        ) : (
                          <span className="station-icon">📻</span>
                        )}
                      </div>
                      <div className="station-info">
                        <h4>📻 {result.stationName}</h4>
                        <p className="station-description">{result.description || 'Radio station'}</p>
                      </div>
                      {onPlayStation && (
                        <button
                          className="play-btn"
                          onClick={async e => {
                            e.stopPropagation(); // Prevents the album click from firing
                            const station = await radioStationService.getStationById(result.stationId);
                            if (station) {
                              const nextTrack = await radioStationService.selectNextTrackForStation(
                                station,
                                []
                              );
                              if (nextTrack && onPlayStation) {
                                onPlayStation(station, nextTrack.track);
                              }
                            }
                          }}
                          title="Play station"
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  );
              }
            })}
          </div>
        )
      ) : null}
    </div>
  )
}

export default SearchView;
