import { AudioTrack, MusicCacheService, MusicLibraryEntry } from './musicCacheService';
import { loadAudioFileFromTrack } from '../utils/fileHelpers';
import { RadioStation, RadioStationCriteria } from '../types/radioStation';
import { radioStationService } from './radioStationService';

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: AudioTrack | null;
  progress: number;
  duration: number;
  playbackHistory: AudioTrack[];
  selectedStation: RadioStation | null;
  nextTrack: AudioTrack | null;
}

let musicCacheService = MusicCacheService.getInstance();

export class PlaybackService {
  private audioElement: HTMLAudioElement | null = null;
  private onPlaybackStateChange?: (state: PlaybackState) => void;
  private currentTrack: AudioTrack | null = null;
  private playbackHistory: AudioTrack[] = [];
  private selectedStation: RadioStation | null = null;
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

      this.audioElement.addEventListener('ended', async () => {
        await this.playNextTrack();
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
  public async playSpecificTrack(track: AudioTrack): Promise<void> {
    if (!track) return;

    try {
      this.play(track);

      // Create temporary radio station based on the selected track
      await this.createTemporaryStationFromTrack(track);
    } catch (error) {
      console.error('Playback error:', error);
      throw error;
    }
  }

  /**
   * Play a track
   * @param track The AudioTrack to play
   */
  public async playStation(station: RadioStation, leadTrack?: MusicLibraryEntry): Promise<void> {
    try {

      // Set as selected station
      if (!leadTrack) {
        let score = await radioStationService.selectNextTrackForStation(station, this.playbackHistory);
        leadTrack = score?.track;
      }
      if (!leadTrack) return;
      let track = await musicCacheService.getTrackFromLibraryEntry(leadTrack);

      // Update last played time for non-temporary stations
      if (!station.isTemporary) {
        station.lastPlayed = new Date();
        await radioStationService.updateStation(station.id, { lastPlayed: station.lastPlayed });
      }

      this.selectedStation = station;
      this.notifyStateChange();

      this.play(track);
    } catch (error) {
      console.error('Playback error:', error);
      throw error;
    }
  }

  public async play(track: AudioTrack): Promise<void> {
    if (!track) return;
    // Add current track to history before playing new one
    if (this.currentTrack && this.currentTrack.id !== track.id) {
      this.playbackHistory.push(this.currentTrack);
    }
    
    await this.playInternal(track);
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
   * Create a temporary radio station based on the current track
   * @param track The AudioTrack to base the station on
   */
  private async createTemporaryStationFromTrack(track: AudioTrack): Promise<void> {
    if (!track) return;

    // Create a temporary station name
    const stationName = `Station from ${track.artist} - ${track.title}`;

    // Create the temporary radio station with default criteria
    const tempStation = await radioStationService.createStation({
      name: stationName,
      description: `Temporary station based on "${track.title}" by ${track.artist}`,
      criteria: [],
      isAutoGenerated: true,
      isTemporary: true
    });

    // Update the station's criteria based on this track (pass station object instead of ID)
    await radioStationService.updateStationFromTracks(tempStation, [track], {
      album: 0.5,
    });

    // Set as selected station
    this.selectedStation = tempStation;
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
   * Play the next track for the currently selected station
   */
  public async playNextTrack(): Promise<void> {
    if (this.selectedStation) {
      const station = this.selectedStation;
      if (station) {
        const nextTrackScore = await radioStationService.selectNextTrackForStation(
          station,
          this.playbackHistory
        );


        if (nextTrackScore && nextTrackScore.track) {
          this.nextTrack = await musicCacheService.getTrackFromLibraryEntry(nextTrackScore?.track);
          await this.play(this.nextTrack);
        }
      }
    }
  }

  /**
   * Clear playback history
   */
  public clearHistory(): void {
    this.playbackHistory = [];
    this.notifyStateChange();
  }

  /**
   * Seek to a specific time position in the current track
   * @param time The time in seconds to seek to
   */
  public seek(time: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = time;
      this.notifyStateChange();
    }
  }

  /**
   * Play a track without adding it to history (used for navigation)
   * @param track The AudioTrack to play
   */
  private async playInternal(track: AudioTrack): Promise<void> {
    if (!track) return;

    try {
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
   * Go back in playback - either restart current track or go to previous track
   */
  public async playPrevious(): Promise<void> {
    if (!this.currentTrack || !this.audioElement) return;

    const currentProgress = this.audioElement.currentTime;

    // If past 5 seconds, go back to beginning of current track
    if (currentProgress > 5) {
      this.seek(0);
      // Resume playback if it was playing
      if (!this.audioElement.paused) {
        await this.audioElement.play();
      }
    } else {
      // Otherwise go back to previous track in history
      const previousTrack = this.playbackHistory.pop();

      if (previousTrack) {
        await this.playInternal(previousTrack);
      }
    }
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