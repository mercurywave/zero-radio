import React, { useState, useEffect } from 'react';
import { MusicCacheService, MusicLibraryEntry } from '../services/musicCacheService';
import './AlbumDetailView.css';

interface AlbumDetailViewProps {
  album: any;
  onBack: () => void;
  onPlayTrack?: (track: MusicLibraryEntry) => void;
}

const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({ album, onBack, onPlayTrack }) => {
  const [albumArt, setAlbumArt] = useState<string | null>(null);
  const cacheService = MusicCacheService.getInstance();

  useEffect(() => {
    // Fetch album art for the album
    const fetchAlbumArt = async () => {
      if (album && album.albumArt) {
        setAlbumArt(album.albumArt);
      } else if (album && album.tracks && album.tracks.length > 0) {
        try {
          const firstTrack = album.tracks[0];
          const artUrl = await cacheService.getAlbumArtUrl(firstTrack);
          setAlbumArt(artUrl);
        } catch (error) {
          console.error('Error fetching album art:', error);
        }
      }
    };

    fetchAlbumArt();
  }, [album, cacheService]);

  const handlePlayAlbum = () => {
    if (album && album.tracks && album.tracks.length > 0) {
      // Play the first track of the album
      onPlayTrack?.(album.tracks[0]);
    }
  };

  return (
    <div className="album-detail-view">
      <div className="album-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>{album.albumName}</h1>
        <p className="album-artist">by {album.artistName}</p>
      </div>

      <div className="album-content">
        <div className="album-art-container">
          {albumArt ? (
            <img src={albumArt} alt={`${album.albumName} album art`} className="album-detail-art" />
          ) : (
            <div className="album-art-placeholder">
              <span className="album-icon">📀</span>
            </div>
          )}
        </div>

        <div className="album-info">
          <div className="album-stats">
            <p>{album.trackCount} tracks</p>
          </div>
          
          <button className="play-button" onClick={handlePlayAlbum}>
            ▶ Play Album
          </button>
        </div>
      </div>

      <div className="track-list">
        <h2>Track List</h2>
        {album.tracks && album.tracks.map((track: MusicLibraryEntry, index: number) => (
          <div key={track.id} className="track-item">
            <div className="track-number">{index + 1}</div>
            <div className="track-info">
              <h4>{track.title}</h4>
              <p className="track-artist">{track.artist}</p>
            </div>
            <div className="track-duration">{track.duration ? formatDuration(track.duration) : '0:00'}</div>
            {onPlayTrack && (
              <button
                className="play-track-btn"
                onClick={() => onPlayTrack(track)}
                title="Play track"
              >
                ▶
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to format duration from seconds to mm:ss
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default AlbumDetailView;