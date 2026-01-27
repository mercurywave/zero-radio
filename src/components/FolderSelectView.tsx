import React from 'react';
import { set } from 'idb-keyval';
import { MusicCacheService } from '../services/musicCacheService';
import './FolderSelectView.css';

interface FolderSelectViewProps {
  onFolderSelected: () => void;
}

const FolderSelectView: React.FC<FolderSelectViewProps> = ({ onFolderSelected }) => {
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

// Helper function - will be moved to a utilities file later
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
    const cacheService = MusicCacheService.getInstance();
    console.log('Initializing cache for folder:', folder.name)
    
    await cacheService.loadFromFolder(folder);

    // Proceed to radio stations view
    onFolderSelected()
  } catch (error) {
    console.error('Error selecting folder:', error)
    alert('Failed to select folder. Please try again.')
  }
}

// Helper function - will be moved to a utilities file later
async function saveDirectoryHandle(handle: FileSystemDirectoryHandle) {
  await set("savedDirHandle", handle);
}

export default FolderSelectView;