import { get } from 'idb-keyval';
import { AudioTrack } from '../services/musicCacheService';

// Helper function - will be moved to a utilities file later
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

/**
 * Loads an audio file from the cached directory using a track's filePath
 * @param track The AudioTrack containing metadata and filePath
 * @returns Promise<File> that can be played with the Audio API, or null if file cannot be loaded
 */
export async function loadAudioFileFromTrack(track: AudioTrack): Promise<File | null> {
  if (!track || !track.filePath) {
    console.error('Cannot load audio file: track or filePath is missing');
    return null;
  }

  try {
    // Get the cached directory handle
    const dirHandle = await tryUseCachedFolder();
    if (!dirHandle) {
      console.error('No cached directory available');
      return null;
    }

    // Try to get the file from the directory
    let fileHandle: FileSystemFileHandle | null = null;
    
    try {
      // First, try to get the file directly (for files in root)
      fileHandle = await dirHandle.getFileHandle(track.filePath);
    } catch (rootError) {
      // If not found in root, search recursively
      fileHandle = await findFileRecursive(dirHandle, track.filePath);
    }

    if (!fileHandle) {
      console.error(`File not found: ${track.filePath}`);
      return null;
    }

    // Get the file contents
    const file = await fileHandle.getFile();
    
    if (!file) {
      console.error(`Could not read file: ${track.filePath}`);
      return null;
    }

    return file;
  } catch (error) {
    console.error(`Error loading audio file ${track.filePath}:`, error);
    return null;
  }
}

/**
 * Recursively searches for a file in a directory and its subdirectories
 * @param dirHandle The directory handle to search in
 * @param fileName The name of the file to find
 * @returns Promise<FileSystemFileHandle | null>
 */
async function findFileRecursive(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<FileSystemFileHandle | null> {
  // Check if this is actually a file with the matching name
  try {
    const handle = await dirHandle.getFileHandle(fileName);
    return handle;
  } catch (error) {
    // Not found or not a file, continue searching
  }

  // Search through all entries in this directory
  for await (const [name, entry] of dirHandle.entries()) {
    if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle;
      if (fileHandle.name === fileName) {
        return fileHandle;
      }
    } else if (entry.kind === 'directory') {
      // Recursively search subdirectories
      const subDirHandle = entry as FileSystemDirectoryHandle;
      const found = await findFileRecursive(subDirHandle, fileName);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

export { 
  loadDirectoryHandle, 
  verifyPermission, 
  tryUseCachedFolder 
};