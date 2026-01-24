import React, { useState, useEffect } from 'react'
import { MusicCacheService } from './services/musicCacheService'
import ProgressPopover from './components/ProgressPopover'
import './index.css'
import './components/ProgressPopover.css'
import { get, set } from 'idb-keyval'

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

const FolderSelectView: React.FC<{
  onFolderSelected: () => void;
}> = ({ onFolderSelected }) => {
  const handleFolderSelect = () => doSelectFolder(onFolderSelected)

  return (
    <div className="folder-select-view">
      <h1>Zero Radio</h1>
      <p>Select a folder containing your music files</p>
      <button onClick={handleFolderSelect} className="select-folder-btn">
        Select Music Folder
      </button>
    </div>
  )
}

const RadioStationView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Mock data for radio stations - will be replaced with actual library data
  const suggestedStations = [
    { id: '1', name: 'Chill Vibes' },
    { id: '2', name: 'Rock Classics' },
    { id: '3', name: 'Jazz Lounge' },
    { id: '4', name: 'Electronic Beats' },
    { id: '5', name: 'Pop Hits' },
    { id: '6', name: 'Hip Hop Central' },
  ]

  const recentStations = [
    { id: '7', name: 'Indie Mix' },
    { id: '8', name: 'Classical Moments' },
    { id: '9', name: 'Country Roads' },
    { id: '10', name: 'Metal Madness' },
    { id: '11', name: 'R&B Smooth' },
    { id: '12', name: 'Reggae Vibes' },
  ]

  // Initialize the cache service when component mounts
  useEffect(() => {
    const initCache = async () => {
      try {
        await cacheService.initDB();
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    
    initCache();
  }, []);

  // Perform search when query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const performSearch = async () => {
      try {
        setIsSearching(true);
        const allEntries = await cacheService.getAllCachedEntries();
        
        // Simple fuzzy search implementation
        const results = allEntries.filter(entry => 
          entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.album.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        setSearchResults(results);
        setIsSearching(false);
      } catch (error) {
        console.error('Search error:', error);
        setIsSearching(false);
      }
    };

    // Add a small delay to avoid too frequent searches
    const timeoutId = setTimeout(performSearch, 100);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Render search results or radio station tiles
  const renderContent = () => {
    if (searchQuery.trim() !== '') {
      if (isSearching) {
        return (
          <div className="search-results">
            <p>Searching...</p>
          </div>
        );
      }
      
      if (searchResults.length === 0) {
        return (
          <div className="search-results">
            <p>No results found</p>
          </div>
        );
      }

      return (
        <div className="search-results">
          {searchResults.map((entry, index) => (
            <div key={index} className="search-result-item">
              <div className="station-image-placeholder">
                <span className="station-icon">🎵</span>
              </div>
              <div className="station-info">
                <h4>{entry.title}</h4>
                <p className="station-genre">{entry.artist}</p>
                <p className="station-listeners">{entry.album}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Show radio station tiles when no search query
    return (
      <>
        {/* Suggested Stations */}
        <div className="section-title">
          <h3>Suggested Stations</h3>
        </div>
        <div className="radio-station-grid">
          {suggestedStations.map((station) => (
            <div key={station.id} className="radio-station-card">
              <div className="station-image-placeholder">
                <span className="station-icon">📻</span>
              </div>
              <div className="station-info">
                <h4>{station.name}</h4>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Stations */}
        <div className="section-title">
          <h3>Recently Played</h3>
        </div>
        <div className="radio-station-grid">
          {recentStations.map((station) => (
            <div key={station.id} className="radio-station-card">
              <div className="station-image-placeholder">
                <span className="station-icon">📻</span>
              </div>
              <div className="station-info">
                <h4>{station.name}</h4>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="radio-stations-view">
      {/* Search bar at top middle */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search artists, songs, or albums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-bar"
        />
      </div>

      {renderContent()}

      {/* Playback Controls */}
      <div className="playback-controls">
        <div className="control-buttons">
          <button className="control-btn">⏮</button>
          <button className="control-btn">⏯</button>
          <button className="control-btn">⏭</button>
        </div>
        <div className="progress-bar">
          <span>1:23</span>
          <div className="progress-track">
            <div className="progress" style={{ width: '30%' }}></div>
          </div>
          <span>3:45</span>
        </div>
      </div>
    </div>
  )
}

async function doSelectFolder(onFolderSelected: () => void) {
  try {
    // Check if the File System Access API is supported
    if (typeof window.showDirectoryPicker === 'undefined') {
      alert('Your browser does not support the File System Access API. Please use a modern browser like Chrome, Edge, or Opera.')
      return
    }

    // Open directory picker
    const folder = await window.showDirectoryPicker({
      mode: 'read'
    })
    if(!folder) return;

    saveDirectoryHandle(folder);

    // Initialize cache with the selected directory
    console.log('Initializing cache for folder:', folder.name)
    await cacheService.initDB()

    console.log('Updating cache for folder:', folder.name)

    await cacheService.updateCache(folder)

    // Clear progress tracking
    cacheService.clearOnProgress()

    // Proceed to radio stations view
    onFolderSelected()
  } catch (error) {
    console.error('Error selecting folder:', error)
    alert('Failed to select folder. Please try again.')
  }
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle) {
  await set("savedDirHandle", handle);
}

async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  return (await get("savedDirHandle")) ?? null;
}

async function verifyPermission(handle: FileSystemHandle, mode: "read" | "readwrite" = "readwrite"): Promise<boolean> {
  const opts = { mode };

  const query = await (handle as any).queryPermission(opts);
  if (query === "granted") return true;

  const request = await (handle as any).requestPermission(opts);
  return request === "granted";
}

async function tryUseCachedFolder(): Promise< FileSystemDirectoryHandle | null> {
  let dirHandle = await loadDirectoryHandle();

  if (!dirHandle || !(await verifyPermission(dirHandle))) {
    return null;
  }
  return dirHandle;
}




export default App