// Supported audio file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.ogg', '.wav', '.flac', '.aac'];

export async function scanDirectoryForAudioFiles(directoryHandle: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> {
  const audioFiles: FileSystemFileHandle[] = [];
  
  // Recursive function to traverse directories
  async function traverse(handle: FileSystemDirectoryHandle) {
    try {
      for await (const [name, entry] of handle.entries()) {
        if (entry.kind === 'file') {
          const fileHandle = entry as FileSystemFileHandle;
          const lowerName = name.toLowerCase();
          
          // Check if it's an audio file
          if (AUDIO_EXTENSIONS.some(ext => lowerName.endsWith(ext))) {
            audioFiles.push(fileHandle);
          }
        } else if (entry.kind === 'directory') {
          // Recursively traverse subdirectories
          await traverse(entry as FileSystemDirectoryHandle);
        }
      }
    } catch (error) {
      console.error('Error traversing directory:', error);
    }
  }
  
  // Start traversal from the root directory
  await traverse(directoryHandle);
  
  return audioFiles;
}