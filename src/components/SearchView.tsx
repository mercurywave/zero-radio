import React from 'react';
import { MusicCacheService, MusicLibraryEntry, AudioTrack, SearchResult, TrackSearchResult, ArtistSearchResult, AlbumSearchResult } from '../services/musicCacheService';

export const performSearch = async (
  cacheService: MusicCacheService,
  searchQuery: string,
  setSearchResults: (results: SearchResult[]) => void,
  setIsSearching: (isSearching: boolean) => void
): Promise<void> => {
  try {
    setIsSearching(true);
    const allEntries = await cacheService.getAllCachedEntries();

    // First, check if the search query matches an artist or album (fuzzy match)
    let results: SearchResult[] = [];

    // Check for artist matches (fuzzy)
    const artistsWithName = await cacheService.getArtistsByName(searchQuery);
    if (artistsWithName && artistsWithName.length > 0) {
      results.push({
        type: 'artist',
        artistName: searchQuery,
        trackCount: artistsWithName.length,
        tracks: artistsWithName
      });
    }

    // Check for album matches (fuzzy)
    const albumsWithName = await cacheService.getAlbumsByName(searchQuery);
    if (albumsWithName && albumsWithName.length > 0) {
      // Get album art from the first track in the album
      let albumArtUrl: string | null = null;
      try {
        const firstTrackArt = await cacheService.getAlbumArtById(albumsWithName[0]?.id || '');
        if (firstTrackArt && firstTrackArt.data) {
          if (firstTrackArt.data instanceof Blob) {
            albumArtUrl = URL.createObjectURL(firstTrackArt.data);
          } else if (firstTrackArt.data instanceof Uint8Array) {
            const blob = new Blob([firstTrackArt.data], { type: firstTrackArt.mimeType });
            albumArtUrl = URL.createObjectURL(blob);
          } else if (firstTrackArt.data instanceof ArrayBuffer) {
            const blob = new Blob([firstTrackArt.data], { type: firstTrackArt.mimeType });
            albumArtUrl = URL.createObjectURL(blob);
          } else if (typeof firstTrackArt.data === 'string') {
            albumArtUrl = firstTrackArt.data;
          }
        }
      } catch (error) {
        console.error('Error fetching album art for album result:', error);
      }

      results.push({
        type: 'album',
        albumName: searchQuery,
        artistName: albumsWithName[0]?.artist || '',
        trackCount: albumsWithName.length,
        tracks: albumsWithName,
        albumArt: albumArtUrl
      });
    }

    // If no exact matches, do fuzzy search for tracks
    const fuzzyResults = allEntries.filter((entry: MusicLibraryEntry) =>
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.album.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Fetch album art for each result
    const resultsWithArt: TrackSearchResult[] = await Promise.all(
      fuzzyResults.map(async (entry: MusicLibraryEntry): Promise<TrackSearchResult> => {
        try {
          const albumArt = await cacheService.getAlbumArtById(entry.id);
          let albumArtUrl: string | null = null;

          if (albumArt && albumArt.data) {
            // Handle different data types that might be returned
            if (albumArt.data instanceof Blob) {
              albumArtUrl = URL.createObjectURL(albumArt.data);
            } else if (albumArt.data instanceof Uint8Array) {
              // Convert Uint8Array to Blob for URL creation
              const blob = new Blob([albumArt.data], { type: albumArt.mimeType });
              albumArtUrl = URL.createObjectURL(blob);
            } else if (albumArt.data instanceof ArrayBuffer) {
              // Convert ArrayBuffer to Blob for URL creation
              const blob = new Blob([albumArt.data], { type: albumArt.mimeType });
              albumArtUrl = URL.createObjectURL(blob);
            } else if (typeof albumArt.data === 'string') {
              // If it's already a data URL, use it directly
              albumArtUrl = albumArt.data;
            }
          }

          return {
            ...entry,
            type: 'track',
            albumArt: albumArtUrl
          };
        } catch (error) {
          console.error('Error fetching album art:', error);
          return {
            ...entry,
            type: 'track',
            albumArt: null
          };
        }
      })
    );

    results = resultsWithArt;

    setSearchResults(results);
    setIsSearching(false);
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
}

const SearchView: React.FC<SearchViewProps> = ({
  onSearchQueryChange,
  searchQuery,
  searchResults,
  isSearching,
  onPlayTrack
}) => {
  return (
    <div className="search-wrapper">
      {/* Search bar at top middle */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search artists, songs, or albums..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="search-bar"
        />
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