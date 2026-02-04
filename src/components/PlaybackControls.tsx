import React from 'react';
import { AudioTrack } from '../services/musicCacheService';
import { playbackService } from '../services/playbackService';
import './PlaybackControls.css';
import { RadioStation } from '../services/radioStationService';

type PlaybackControlsProps = {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  selectedStation: RadioStation | null;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onVolumeChange: (volume: number) => void;
  onStationSelected?: (stationId: string) => void;
};

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentTrack,
  isPlaying,
  progress,
  duration,
  volume,
  selectedStation,
  onPlayPause,
  onPrevious,
  onNext,
  onVolumeChange,
  onStationSelected,
}) => {
  // Format time for display
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get tooltip for track attributes based on station criteria
  const getTrackAttributesTooltip = (track: AudioTrack) => {
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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const trackWidth = rect.width;
    const newProgress = (clickPosition / trackWidth) * duration;

    // Seek to the clicked position
    playbackService.seek(newProgress);
  };

  return (
    <div className="playback-controls">
      <div className="controls-row">
        <div className="track-info">
          {currentTrack && currentTrack.albumArt && (
            <img src={currentTrack.albumArt} alt="Album art" className="album-art" />
          )}
          <div className="track-text-info">
            {currentTrack && selectedStation && (
              <div
                className="track-line"
                title={getTrackAttributesTooltip(currentTrack)}
              >
                <span className="track-title">{currentTrack.title}</span>
                {currentTrack.artist && (
                  <span className="track-artist"> - {currentTrack.artist}</span>
                )}
              </div>
            )}
            {selectedStation && (
              <div
                className="station-line"
                title={
                  `Criteria:\n${selectedStation.criteria
                    .map(criterion => `${criterion.attribute}: ${criterion.value} (${criterion.weight})`)
                    .join('\n')}`
                }
                onClick={() => onStationSelected && onStationSelected(selectedStation.id)}
                style={{ cursor: 'pointer' }}
              >
                {selectedStation.name}
              </div>
            )}
          </div>
        </div>
        <div className="volume-control">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          />
        </div>
        <div className="control-buttons">
          <button className="control-btn" onClick={onPrevious}>
            ⏮
          </button>
          <button className="control-btn" onClick={onPlayPause}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="control-btn" onClick={onNext}>
            ⏭
          </button>
        </div>
      </div>
      <div className="progress-bar">
        <span>{formatTime(progress)}</span>
        <div
          className="progress-track"
          onClick={handleProgressClick}
        >
          <div className="progress" style={{ width: `${Math.min(100, (progress / duration) * 100 || 0)}%` }}></div>
        </div>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default PlaybackControls;