import React, { useState, useEffect } from 'react'
import { MusicCacheService, MusicLibraryEntry } from '../services/musicCacheService'
import './ArtistDetailView.css';

interface ArtistDetailViewProps {
  artist: any;
  onBack: () => void;
  onPlayTrack?: (track: MusicLibraryEntry) => void;
}

const ArtistDetailView: React.FC<ArtistDetailViewProps> = ({ artist, onBack, onPlayTrack }) => {
  const [artistArt, setArtistArt] = useState<string | null>(null);
  const cacheService = MusicCacheService.getInstance();

  useEffect(() => {
    // Fetch artist art for the artist
    const fetchArtistArt = async () => {
      if (artist && artist.tracks && artist.tracks.length > 0) {
        try {
          const firstTrack = artist.tracks[0];
          const artUrl = await cacheService.getAlbumArtUrl(firstTrack);
          setArtistArt(artUrl);
        } catch (error) {
          console.error('Error fetching artist art:', error);
        }
      }
    };

    fetchArtistArt();
  }, [artist, cacheService]);

  const handlePlayArtist = () => {
    if (artist && artist.tracks && artist.tracks.length > 0) {
      // Play the first track of the artist
      onPlayTrack?.(artist.tracks[0]);
    }
  };

  return (
    <div className="artist-detail-view">
      <div className="artist-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>{artist.artistName}</h1>
        <p className="artist-track-count">{artist.trackCount} tracks</p>
      </div>

      <div className="artist-content-wrapper">
        <div className="artist-info-column">
          <div className="artist-art-container">
