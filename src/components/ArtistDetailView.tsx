import React, { useState, useEffect } from 'react';
import { MusicCacheService, MusicLibraryEntry } from '../services/musicCacheService';
import './AlbumDetailView.css';

interface ArtistDetailViewProps {
  artistName: string;
  onBack: () => void;
  onPlayTrack?: (track: MusicLibraryEntry) => void;
  onAlbumSelected?: (album: any) => void;
}

const ArtistDetailView: React.FC<ArtistDetailViewProps> = ({ artistName, onBack, onPlayTrack, onAlbumSelected }) => {
  const [albums, setAlbums] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cacheService = MusicCacheService.getInstance();

  useEffect(() => {
    const fetchArtistAlbums = async () => {
      try {
        // Get all entries for this artist
        const allEntries = await cacheService.getAllCachedEntries();
        const artistEntries = allEntries.filter(entry => 
          entry.artist.toLowerCase() === artistName.toLowerCase()
        );

        // Group by album
        const albumMap = new Map<string, MusicLibraryEntry[]>();
        
        artistEntries.forEach(entry => {
          const key = entry.album;
          if (!albumMap.has(key)) {
            albumMap.set(key, []);
          }
          albumMap.get(key)!.push(entry);
        });

        // Convert to array of albums
        const albumList = Array.from(albumMap.entries()).map(([albumName, tracks]) => ({
          albumName,
          artistName,
          trackCount: tracks.length,
          tracks,
          albumArt: null // Will be set later with individual fetch
        }));

        // Fetch album art for each album
        const albumsPromises = albumList.map(async (album) => {
          if (album.tracks.length > 0) {
            try {
              const firstTrack = album.tracks[0];
              if (firstTrack) {
                const albumArt = await cacheService.getAlbumArtUrl(firstTrack);
                return { ...album, albumArt };
              }
              return { ...album, albumArt: null };
            } catch (error) {
              console.error('Error fetching album art:', error);
              return { ...album, albumArt: null };
            }
          }
          return album;
        });

        const albumsWithArt = await Promise.all(albumsPromises);
        setAlbums(albumsWithArt);
      } catch (error) {
        console.error('Error fetching artist albums:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtistAlbums();
  }, [artistName, cacheService]);

  const handlePlayAlbum = (album: any) => {
    if (album && album.tracks && album.tracks.length > 0) {
      // Play the first track of the album
      onPlayTrack?.(album.tracks[0]);
    }
  };

  const handleViewAlbum = (album: any) => {
    // Call the onAlbumSelected prop to navigate to AlbumDetailView
    if (onAlbumSelected) {
      onAlbumSelected({
        albumName: album.albumName,
        artistName: album.artistName,
        tracks: album.tracks,
        albumArt: album.albumArt
      });
    }
  };

  return (
    <div className="album-detail-view">
      <div className="album-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>{artistName}</h1>
        <p className="album-artist">Artist</p>
      </div>

      <div className="album-content-wrapper">
        <div className="album-info-column">
          <div className="album-art-container">
            <div className="album-art-placeholder">
              <span className="album-icon">👤</span>
            </div>
          </div>
          
          <div className="album-stats">
            <p>{albums.length} albums</p>
          </div>
        </div>

        <div className="track-list-column">
          <div className="track-list">
            <h2>Albums</h2>
            {isLoading ? (
              <p>Loading albums...</p>
            ) : albums.length === 0 ? (
              <p>No albums found for this artist.</p>
            ) : (
              albums.map((album, index) => (
                <div key={index} className="track-item album-item">
                  <div className="track-number">{index + 1}</div>
                  <div className="track-info">
                    <h4>{album.albumName}</h4>
                    <p className="track-artist">{album.trackCount} tracks</p>
                  </div>
                  <div className="track-duration"></div>
                  {onAlbumSelected && (
                    <button
                      className="play-track-btn"
                      onClick={() => handleViewAlbum(album)}
                      title="View album"
                    >
                      View
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistDetailView;