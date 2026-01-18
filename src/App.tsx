import React, { useState } from 'react'

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'folderSelect' | 'trackList'>('folderSelect')
  
  return (
    <div className="app">
      {currentView === 'folderSelect' ? (
        <FolderSelectView onFolderSelected={() => setCurrentView('trackList')} />
      ) : (
        <TrackListView />
      )}
    </div>
  )
}

const FolderSelectView: React.FC<{ onFolderSelected: () => void }> = ({ onFolderSelected }) => {
  const handleFolderSelect = () => {
    // In a real implementation, this would use the File System Access API
    // For now, we'll simulate the folder selection
    onFolderSelected()
  }

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

const TrackListView: React.FC = () => {
  // Mock data for tracks
  const mockTracks = [
    { id: '1', title: 'Song Title 1', artist: 'Artist Name 1', duration: '3:45' },
    { id: '2', title: 'Song Title 2', artist: 'Artist Name 2', duration: '4:20' },
    { id: '3', title: 'Song Title 3', artist: 'Artist Name 3', duration: '3:15' },
    { id: '4', title: 'Song Title 4', artist: 'Artist Name 4', duration: '5:10' },
    { id: '5', title: 'Song Title 5', artist: 'Artist Name 5', duration: '3:55' },
  ]

  return (
    <div className="track-list-view">
      <h2>Music Library</h2>
      <div className="track-list">
        {mockTracks.map((track) => (
          <div key={track.id} className="track-item">
            <div className="track-info">
              <h3>{track.title}</h3>
              <p>{track.artist}</p>
            </div>
            <div className="track-duration">
              {track.duration}
            </div>
          </div>
        ))}
      </div>
      
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

export default App