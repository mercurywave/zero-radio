import React from 'react';
import { AudioTrack } from '../services/musicCacheService';
import './PlaybackControls.css';

type PlaybackControlsProps = {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentTrack,
  isPlaying,
  progress,
  duration,
  onPlayPause,
  onPrevious,
  onNext,
}) => {
  // Format time for display
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="playback-controls">
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
      <div className="progress-bar">
        <span>{formatTime(progress)}</span>
        <div className="progress-track">
          <div className="progress" style={{ width: `${Math.min(100, (progress / duration) * 100 || 0)}%` }}></div>
        </div>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default PlaybackControls;