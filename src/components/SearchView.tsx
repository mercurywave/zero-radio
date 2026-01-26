import React from 'react';
import { MusicCacheService, MusicLibraryEntry, AudioTrack, SearchResult, TrackSearchResult, ArtistSearchResult, AlbumSearchResult, AlbumArtEntry } from '../services/musicCacheService';

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
    console.log(artistsWithName);
    if (artistsWithName) {
      for (const artist of artistsWithName.keys()) {
        results.push({
          type: 'artist',
          artistName: artist,
          trackCount: artistsWithName.get(artist)!.length,
          tracks: artistsWithName.get(artist) ?? []
        });
      }
    }

    // Check for album matches (fuzzy)
    const albumsWithName = (await cacheService.getAlbumsByName(searchQuery))
      .filter(a => !artistsWithName.get(a.artist));
    if (albumsWithName && albumsWithName.length > 0) {
      // Get album art from the first track in the album
      let albumArtUrl = await cacheService.getAlbumArtUrl(albumsWithName[0]!);

      results.push({
        type: 'album',
        albumName: albumsWithName[0]?.album || '',
        artistName: albumsWithName[0]?.artist || '',
        trackCount: albumsWithName.length,
        tracks: albumsWithName,
        albumArt: albumArtUrl
      });
    }

    // If no exact matches, do fuzzy search for tracks
    const trackResults = allEntries.filter((entry: MusicLibraryEntry) =>
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.album.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(r => !artistsWithName.get(r.artist))
    .filter(r => !albumsWithName.find(a => a.album === r.album));
    for(let track of trackResults){
      results.push({
        ...track,
        type: 'track',
        albumArt: await cacheService.getAlbumArtUrl(track),
      });
    }

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