import React, { useState, useEffect } from 'react'
import { MusicCacheService } from './services/musicCacheService'
import ProgressPopover from './components/ProgressPopover'
import FolderSelectView from './components/FolderSelectView'
import RadioStationView from './components/RadioStationView'
import './index.css'
import './components/ProgressPopover.css'
import { get, set } from 'idb-keyval'
import { tryUseCachedFolder } from './utils/fileHelpers'

const cacheService = new MusicCacheService();

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'folderSelect' | 'radioStations'>('folderSelect')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)

  // Set up progress tracking - pass a callback function that updates our local state
  cacheService.setOnProgress((progress, current, total) => {
    setProgress(progress);
    setCurrentFile(current);
    setTotalFiles(total);
    setIsProcessing(current < total);
  });

  // Check for saved folder on initial load
  useEffect(() => {
    tryUseCachedFolder().then(folder => {
      if (folder) {
        // If we have a saved folder, skip to radio stations view
        setCurrentView('radioStations')
      }
    });
  }, [])

  return (
    <div className="app">
      {currentView === 'folderSelect' ? (
        <FolderSelectView
          onFolderSelected={() => setCurrentView('radioStations')}
        />
      ) : (
        <RadioStationView />
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