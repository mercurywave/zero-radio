import React, { useState, useEffect } from 'react'
import { AudioTrack, MusicCacheService, MusicLibraryEntry } from './services/musicCacheService'
import ProgressPopover from './components/ProgressPopover'
import FolderSelectView from './components/FolderSelectView'
import RadioStationView from './components/RadioStationView'
import PlaybackControls from './components/PlaybackControls'
import './index.css'
import './components/ProgressPopover.css'
import { tryUseCachedFolder } from './utils/fileHelpers'
import { playbackService, PlaybackState } from './services/playbackService'
import { RadioStation } from './types/radioStation'

const cacheService = MusicCacheService.getInstance();

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'folderSelect' | 'radioStations'>('folderSelect')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)

  // Playback controls state managed by PlaybackService
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTrack: null,
    progress: 0,
    duration: 0,
    playbackHistory: [],
    selectedStation: null,
    nextTrack: null
  })
  
  // Volume state
  const [volume, setVolume] = useState<number>(1)

  // Current track state (synced with playback service)
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null)
  const [currentArtist, setCurrentArtist] = useState<string>('')
  const [currentAlbum, setCurrentAlbum] = useState<string>('')

  // Set up progress tracking - pass a callback function that updates our local state
  cacheService.setOnProgress((current, total) => {
    let progress = ((current + 1) / total) * 100;
    setProgress(progress);
    setCurrentFile(current);
    setTotalFiles(total);
    setIsProcessing(current < total);
  });

  // Handle track playback using PlaybackService
  const handlePlayTrack = async (track: AudioTrack | null) => {
    if (track) {
      try {
        await playbackService.playSpecificTrack(track);
      } catch (error) {
        console.error('Error playing track:', error);
      }
    } else {
      playbackService.stop();
    }
  };

  const handlePlayStation = async (station: RadioStation, leadTrack?: MusicLibraryEntry) => {
    playbackService.playStation(station, leadTrack);
  }

  // Check for saved folder on initial load
  useEffect(() => {
    tryUseCachedFolder().then(folder => {
      if (folder) {
        // If we have a saved folder, skip to radio stations view
        setCurrentView('radioStations');
        cacheService.loadFromFolder(folder);
      }
    });
  }, [])

  // Set up playback service callback
  useEffect(() => {
    const handlePlaybackStateChange = (state: PlaybackState) => {
      setPlaybackState(state);

      if (state.currentTrack) {
        setCurrentTrack(state.currentTrack);
        setCurrentArtist(state.currentTrack.artist || '');
        setCurrentAlbum(state.currentTrack.album || '');
      } else {
        setCurrentTrack(null);
        setCurrentArtist('');
        setCurrentAlbum('');
      }
    };

    playbackService.setOnPlaybackStateChange(handlePlaybackStateChange);

    return () => {
      // Cleanup on unmount
      playbackService.destroy();
    };
  }, [])

  return (
    <div className="app">
      {currentView === 'folderSelect' ? (
        <FolderSelectView
          onFolderSelected={() => setCurrentView('radioStations')}
        />
      ) : (
        <>
          <RadioStationView onPlayTrack={handlePlayTrack} onPlayStation={handlePlayStation} />
          <PlaybackControls
            currentTrack={currentTrack}
            isPlaying={playbackState.isPlaying}
            progress={playbackState.progress}
            duration={playbackState.duration}
            volume={volume}
            selectedStation={playbackState.selectedStation ? {
              name: playbackState.selectedStation.name,
              ...(playbackState.selectedStation.description && { description: playbackState.selectedStation.description })
            } : null}
            onPlayPause={async () => {
              await playbackService.togglePlayPause();
            }}
            onPrevious={async () => {
              await playbackService.playPrevious();
            }}
            onNext={() => playbackService.playNextTrack()}
            onVolumeChange={(newVolume) => {
              setVolume(newVolume);
              if (playbackService['audioElement']) {
                playbackService['audioElement'].volume = newVolume;
              }
            }}
          />
        </>
      )}
      <ProgressPopover
        isVisible={isProcessing}
        progress={progress}
        current={currentFile}
        total={totalFiles}
      />
    </div>
  )
}


export default App