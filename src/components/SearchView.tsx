import React from 'react';
import { MusicCacheService, MusicLibraryEntry, AudioTrack, SearchResult, TrackSearchResult, ArtistSearchResult, AlbumSearchResult, AlbumArtEntry } from '../services/musicCacheService';
import { RadioStation, radioStationService } from '../services/radioStationService';
import './SearchView.css';

// track parallel events
let _generationId = 0;

export const performSearch = async (
  cacheService: MusicCacheService,
  searchQuery: string,
  setSearchResults: (results: SearchResult[]) => void,
  setIsSearching: (isSearching: boolean) => void
): Promise<void> => {
  try {
    let gen = ++_generationId;
    setIsSearching(true);
    const allEntries = await cacheService.getAllCachedEntries();

    // First, check if the search query matches an artist or album (fuzzy match)
    let results: SearchResult[] = [];

    // Get radio stations and filter by search query
    const allStations = await radioStationService.getAllStations();
    const stationResults = allStations.filter(station =>
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (station.description && station.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Add station results
    for (const station of stationResults) {
      results.push({
        type: 'station',
        stationName: station.name,
        description: station.description || '',
        stationId: station.id
      });
    }

    let tracksConsolidated: MusicLibraryEntry[] = []

    // Check for artist matches (fuzzy)
    const artistsWithName = await cacheService.getArtistsByName(searchQuery);
    if (artistsWithName) {
      for (const artist of artistsWithName.keys()) {
        const tracklist = artistsWithName.get(artist)!;
        tracksConsolidated.push(...tracklist);
        results.push({
          type: 'artist',
          artistName: tracklist[0]!.artist,
          trackCount: tracklist.length,
          tracks: tracklist
        });
      }
    }

    // Check for album matches (fuzzy)
    const albumsWithName = (await cacheService.getAlbumsByName(searchQuery));
    for (let key of albumsWithName.keys()) {
      const tracklist = albumsWithName.get(key)!;
      const first = tracklist[0]!;
      tracksConsolidated.push(...tracklist);
      // Get album art from the first track in the album
      let albumArtUrl = await cacheService.getAlbumArtUrl(first);

      results.push({
        type: 'album',
        albumName: first.album || '',
        artistName: first.artist || '',
        trackCount: tracklist.length,
        tracks: tracklist,
        albumArt: albumArtUrl
      });
    }

    // If no exact matches, do fuzzy search for tracks
    const trackResults = allEntries.filter((entry: MusicLibraryEntry) =>
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.album.toLowerCase().includes(searchQuery.toLowerCase())
    )
      .filter(r => !tracksConsolidated.find(t => t.id === r.id));
    for (let track of trackResults) {
      results.push({
        ...track,
        type: 'track',
        albumArt: await cacheService.getAlbumArtUrl(track),
      });
    }

    if (gen === _generationId) {
      setSearchResults(results.slice(0, 20));
      setIsSearching(false);
    }
  }

  catch (error) {
    console.error('Search error:', error);
    setIsSearching(false);
  }
};

interface SearchViewProps {
  onSearchQueryChange: (query: string) => void;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  onPlayTrack?: ((track: AudioTrack) => void) | undefined;
  onPlayStation?: ((station: RadioStation, leadTrack: MusicLibraryEntry) => void) | undefined;
}

const SearchView: React.FC<SearchViewProps> = ({
  onSearchQueryChange,
  searchQuery,
  searchResults,
  isSearching,
  onPlayTrack,
  onPlayStation
}) => {
  return (
    <div className="search-wrapper">
      {/* Search bar at top middle */}
      <div className="search-container">
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
                      <div className="station-image-placeholder">
                        {result.albumArt ? (
                          <img src={result.albumArt} alt={`${result.title} album art`} className="album-art" />
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
                    <div key={index} className="search-result-item artist-result">
                      <div className="station-image-placeholder">
                        <span className="station-icon">👤</span>
                      </div>
                      <div className="station-info">
                        <h4>{result.artistName}</h4>
                        <p className="station-genre">{result.trackCount} tracks</p>
                      </div>
                      {onPlayStation && (
                        <button
                          className="play-btn"
                          onClick={async () => {
                            let station = await radioStationService
                              .createArtistStation(result.artistName, result.tracks);
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

                case 'album':
                  return (
                    <div key={index} className="search-result-item album-result">
                      <div className="station-image-placeholder">
                        {result.albumArt ? (
                          <img src={result.albumArt} alt={`${result.albumName} album art`} className="album-art" />
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
                          onClick={async () => {
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
                    <div key={index} className="search-result-item station-result">
                      <div className="station-image-placeholder">
                        <span className="station-icon">📻</span>
                      </div>
                      <div className="station-info">
                        <h4>{result.stationName}</h4>
                        <p className="station-description">{result.description || 'Radio station'}</p>
                      </div>
                      {onPlayStation && (
                        <button
                          className="play-btn"
                          onClick={async () => {
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