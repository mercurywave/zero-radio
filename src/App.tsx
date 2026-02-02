import React, { useState, useEffect } from 'react'
import { AudioTrack, MusicCacheService, MusicLibraryEntry } from './services/musicCacheService'
import ProgressPopover from './components/ProgressPopover'
import FolderSelectView from './components/FolderSelectView'
import MainView from './components/MainView'
import AlbumDetailView from './components/AlbumDetailView'
import PlaybackControls from './components/PlaybackControls'
import './index.css'
import './components/ProgressPopover.css'
import { tryUseCachedFolder } from './utils/fileHelpers'
import { playbackService, PlaybackState } from './services/playbackService'
import { RadioStation } from './services/radioStationService'

const cacheService = MusicCacheService.getInstance();

const App: React.FC = () => {
const [currentView, setCurrentView] = useState<'folderSelect' | 'radioStations' | 'albumDetail'>('folderSelect')
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

  // Album detail view state
  const [currentAlbumDetail, setCurrentAlbumDetail] = useState<any>(null)

  // Set up progress tracking - pass a callback function that updates our local state
  cacheService.setOnProgress((current, total) => {
    let progress = ((current + 1) / total) * 100;
    setProgress(progress);
    setCurrentFile(current);
    setTotalFiles(total);
    setIsProcessing(current < total);
  });

  // Handle track playback using PlaybackService
const handlePlayTrack = async (track: AudioTrack) => {
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

  const loadHandler = (async () => {
    const folder = await tryUseCachedFolder();
    if (folder) {
      // If we have a saved folder, skip to radio stations view
      await cacheService.loadFromFolder(folder);
      setCurrentView('radioStations');
    }
  });

  // Check for saved folder on initial load
  useEffect(() => {
    loadHandler();
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

  // Handle space bar for play/pause toggle
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Don't handle space bar if focus is on an input, textarea, or contenteditable element
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable) {
          return;
        }
        e.preventDefault();
        await playbackService.togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [])

return (
    <div className="app">
      {currentView === 'folderSelect' ? (
        <FolderSelectView
          onFolderSelected={() => setCurrentView('radioStations')}
        />
      ) : currentView === 'albumDetail' ? (
        <AlbumDetailView 
          album={currentAlbumDetail} 
          onBack={() => setCurrentView('radioStations')} 
          onPlayTrack={handlePlayTrack}
        />
      ) : (
        <>
          <MainView 
            onPlayTrack={handlePlayTrack} 
            onPlayStation={handlePlayStation} 
            onAlbumSelected={(album) => {
              setCurrentAlbumDetail(album);
              setCurrentView('albumDetail');
            }}
          />
          <PlaybackControls
            currentTrack={currentTrack}
            isPlaying={playbackState.isPlaying}
            progress={playbackState.progress}
            duration={playbackState.duration}
            volume={volume}
            selectedStation={playbackState.selectedStation}
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