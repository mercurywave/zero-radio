import { AudioTrack } from './musicCacheService';
import { loadAudioFileFromTrack } from '../utils/fileHelpers';

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: AudioTrack | null;
  progress: number;
  duration: number;
  playbackHistory: AudioTrack[];
  selectedStation: string | null;
  nextTrack: AudioTrack | null;
}

export class PlaybackService {
  private audioElement: HTMLAudioElement | null = null;
  private onPlaybackStateChange?: (state: PlaybackState) => void;
  private currentTrack: AudioTrack | null = null;
  private playbackHistory: AudioTrack[] = [];
  private selectedStation: string | null = null;
  private nextTrack: AudioTrack | null = null;

  constructor() {
    this.createAudioElement();
  }

  private createAudioElement(): void {
    if (!this.audioElement) {
      this.audioElement = new Audio();

      // Set up event listeners
      this.audioElement.addEventListener('timeupdate', () => {
        this.notifyStateChange();
      });

      this.audioElement.addEventListener('ended', () => {
        this.notifyStateChange();
      });

      this.audioElement.addEventListener('loadedmetadata', () => {
        this.notifyStateChange();
      });
    }
  }

  private notifyStateChange(): void {
    if (this.onPlaybackStateChange && this.audioElement) {
      const state: PlaybackState = {
        isPlaying: !this.audioElement.paused,
        currentTrack: this.currentTrack,
        progress: this.audioElement.currentTime,
        duration: this.audioElement.duration || 0,
        playbackHistory: [...this.playbackHistory],
        selectedStation: this.selectedStation,
        nextTrack: this.nextTrack
      };
      this.onPlaybackStateChange(state);
    }
  }

  /**
   * Play a track
   * @param track The AudioTrack to play
   */
  public async play(track: AudioTrack): Promise<void> {
    if (!track) return;

    try {
      // Add current track to history before playing new one
      if (this.currentTrack && this.currentTrack.id !== track.id) {
        this.playbackHistory.push(this.currentTrack);
      }
      
      this.currentTrack = track;
      const audioFile = await loadAudioFileFromTrack(track);

      // Ensure audio element exists
      if (!this.audioElement) {
        this.createAudioElement();
      }

      if (!audioFile || !this.audioElement) {
        console.error('Could not load or initialize audio');
        return;
      }

      // Load the file
      const objectUrl = URL.createObjectURL(audioFile);
      this.audioElement.src = objectUrl;

      try {
        await this.audioElement.play();
      } catch (error) {
        console.error('Error playing audio:', error);
        throw error;
      }
    } catch (error) {
      console.error('Playback error:', error);
      throw error;
    }
  }

  /**
   * Pause playback
   */
  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.notifyStateChange();
    }
  }

  /**
   * Stop playback and clear current track
   */
  public stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
      this.currentTrack = null;
      // Clear history on stop
      this.playbackHistory = [];
      this.selectedStation = null;
      this.nextTrack = null;
      this.notifyStateChange();
    }
  }

  /**
   * Toggle play/pause
   */
  public async togglePlayPause(): Promise<void> {
    if (!this.audioElement) return;

    if (this.audioElement.paused && this.currentTrack) {
      // Resume playback without reloading the track
      try {
        await this.audioElement.play();
        this.notifyStateChange();
      } catch (error) {
        console.error('Error resuming playback:', error);
        throw error;
      }
    } else {
      this.pause();
    }
  }

  /**
   * Set the selected radio station
   * @param stationId The ID of the selected station
   */
  public setSelectedStation(stationId: string | null): void {
    this.selectedStation = stationId;
    this.notifyStateChange();
  }

  /**
   * Set the next track to play
   * @param track The AudioTrack that will play next
   */
  public setNextTrack(track: AudioTrack | null): void {
    this.nextTrack = track;
    this.notifyStateChange();
  }

  /**
   * Clear playback history
   */
  public clearHistory(): void {
    this.playbackHistory = [];
    this.notifyStateChange();
  }

  /**
   * Set callback for playback state changes
   */
  public setOnPlaybackStateChange(callback: (state: PlaybackState) => void): void {
    this.onPlaybackStateChange = callback;
     // Send initial state
     if (this.audioElement) {
       const state: PlaybackState = {
         isPlaying: !this.audioElement.paused,
         currentTrack: this.currentTrack,
         progress: this.audioElement.currentTime,
         duration: this.audioElement.duration || 0,
         playbackHistory: [...this.playbackHistory],
         selectedStation: this.selectedStation,
         nextTrack: this.nextTrack
       };
       callback(state);
     }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.removeAttribute('src');
      this.audioElement.load();

      // Remove event listeners by creating new element
      const clone = this.audioElement.cloneNode(true);
      this.audioElement.parentNode?.replaceChild(clone, this.audioElement);

      this.audioElement = null;
    }
  }
}

// Singleton instance
export const playbackService = new PlaybackService();