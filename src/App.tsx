import React, { useState, useEffect, useRef } from 'react'
import { AudioTrack, MusicCacheService } from './services/musicCacheService'
import ProgressPopover from './components/ProgressPopover'
import FolderSelectView from './components/FolderSelectView'
import RadioStationView from './components/RadioStationView'
import PlaybackControls from './components/PlaybackControls'
import './index.css'
import './components/ProgressPopover.css'
import { tryUseCachedFolder, loadAudioFileFromTrack } from './utils/fileHelpers'

const cacheService = new MusicCacheService();

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'folderSelect' | 'radioStations'>('folderSelect')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)

  // Playback controls state
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackProgress, setPlaybackProgress] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(180) // Default to 3 minutes

  // Current track state
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null)
  const [currentArtist, setCurrentArtist] = useState<string>('')
  const [currentAlbum, setCurrentAlbum] = useState<string>('')
  
  // Audio element ref
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Set up progress tracking - pass a callback function that updates our local state
  cacheService.setOnProgress((progress, current, total) => {
    setProgress(progress);
    setCurrentFile(current);
    setTotalFiles(total);
    setIsProcessing(current < total);
  });

  // Handle track playback
  const handlePlayTrack = async (track: AudioTrack | null) => {
    setCurrentTrack(track);
    
    if (track) {
      try {
        // Load the actual audio file from disk
        const audioFile = await loadAudioFileFromTrack(track);
        
        if (!audioFile) {
          console.error('Could not load audio file');
          return;
        }

        // Create audio element if it doesn't exist
        let audioElement = audioElementRef.current;
        if (!audioElement) {
          audioElement = new Audio();
          audioElementRef.current = audioElement;
          
          // Set up event listeners for progress tracking
          const handleTimeUpdate = () => {
            if (audioElement) {
              setPlaybackProgress(audioElement.currentTime);
            }
          };
          
          const handleEnded = () => {
            setIsPlaying(false);
          };
          
          const handleLoadedMetadata = () => {
            if (audioElement && audioElement.duration) {
              setPlaybackDuration(audioElement.duration);
            }
          };

          audioElement.addEventListener('timeupdate', handleTimeUpdate);
          audioElement.addEventListener('ended', handleEnded);
          audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        }

        // Load the file into the audio element
        const objectUrl = URL.createObjectURL(audioFile);
        if (audioElement) {
          audioElement.src = objectUrl;
          
          // Set duration from metadata or wait for loadedmetadata event
          if (track.duration) {
            setPlaybackDuration(track.duration);
          }

          try {
            await audioElement.play();
            setIsPlaying(true);
          } catch (playError) {
            console.error('Error playing audio:', playError);
          }
        }

        // Update track info
        setCurrentArtist(track.artist || '');
        setCurrentAlbum(track.album || '');
      } catch (error) {
        console.error('Error handling track playback:', error);
      }
    } else {
      // Stop playback if track is null
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setIsPlaying(false);
    }
    
    setPlaybackProgress(0);
  };

  // Check for saved folder on initial load
  useEffect(() => {
    tryUseCachedFolder().then(folder => {
      if (folder) {
        // If we have a saved folder, skip to radio stations view
        setCurrentView('radioStations')
      }
    });
  }, [])
  
  // Clean up audio element on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        const audio = audioElementRef.current;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        
        // Clean up event listeners by creating a new element
        const newAudio = new Audio();
        audioElementRef.current = newAudio;
      }
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
          <RadioStationView onPlayTrack={handlePlayTrack} />
           <PlaybackControls
             currentTrack={currentTrack}
             isPlaying={isPlaying}
             progress={playbackProgress}
             duration={playbackDuration}
             onPlayPause={async () => {
               const audio = audioElementRef.current;
               if (audio) {
                 if (isPlaying) {
                   await audio.pause();
                 } else {
                   await audio.play();
                 }
                 setIsPlaying(!isPlaying);
               }
             }}
             onPrevious={() => { }}
             onNext={() => { }}
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