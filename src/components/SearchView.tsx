import React from 'react';
import { MusicCacheService, MusicLibraryEntry } from '../services/musicCacheService';

export const performSearch = async (
  cacheService: MusicCacheService,
  searchQuery: string,
  setSearchResults: (results: any[]) => void,
  setIsSearching: (isSearching: boolean) => void
) => {
  try {
    setIsSearching(true);
    const allEntries = await cacheService.getAllCachedEntries();
    
    // Simple fuzzy search implementation
    const results = allEntries.filter((entry: any) => 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.album.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Fetch album art for each result
    const resultsWithArt = await Promise.all(
      results.map(async (entry: MusicLibraryEntry) => {
        try {
          const albumArt = await cacheService.getAlbumArtById(entry.id);
          let albumArtUrl = null;
          
          if (albumArt && albumArt.data) {
            // Handle different data types that might be returned
            if (albumArt.data instanceof Blob) {
              albumArtUrl = URL.createObjectURL(albumArt.data);
            } else if(albumArt.data instanceof Uint8Array) {
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
            albumArt: albumArtUrl
          };
        } catch (error) {
          console.error('Error fetching album art:', error);
          return {
            ...entry,
            albumArt: null
          };
        }
      })
    );
    
    setSearchResults(resultsWithArt);
    setIsSearching(false);
  } catch (error) {
    console.error('Search error:', error);
    setIsSearching(false);
  }
};

interface SearchViewProps {
  onSearchQueryChange: (query: string) => void;
  searchQuery: string;
  searchResults: any[];
  isSearching: boolean;
  onPlayTrack?: ((track: any) => void) | undefined;
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
              {searchResults.map((entry, index) => (
                <div key={index} className="search-result-item">
                  <div className="station-image-placeholder">
                    {entry.albumArt ? (
                      <img src={entry.albumArt} alt={`${entry.title} album art`} className="album-art" />
                    ) : (
                      <span className="station-icon">🎵</span>
                    )}
                  </div>
                  <div className="station-info">
                    <h4>{entry.title}</h4>
                    <p className="station-genre">{entry.artist}</p>
                    <p className="station-listeners">{entry.album}</p>
                  </div>
                  {onPlayTrack && (
                    <button
                      className="play-btn"
                      onClick={() => onPlayTrack(entry)}
                      title="Play track"
                    >
                      ▶
                    </button>
                  )}
                </div>
              ))}
           </div>
         )
       ) : null}
    </div>
  )
}

export default SearchView;