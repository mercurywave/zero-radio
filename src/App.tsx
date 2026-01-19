import React, { useState } from 'react'

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'folderSelect' | 'radioStations'>('folderSelect')
  
  return (
    <div className="app">
      {currentView === 'folderSelect' ? (
        <FolderSelectView onFolderSelected={() => setCurrentView('radioStations')} />
      ) : (
        <RadioStationView />
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

const RadioStationView: React.FC = () => {
  // Mock data for radio stations
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

  return (
    <div className="radio-stations-view">
      <h2>Radio Stations</h2>
      
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