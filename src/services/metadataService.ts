import { parseFile, parseBlob } from 'music-metadata';
import { FileSystemFileHandle } from '../types/fileSystemTypes';

export interface AudioMetadata {
  title: string | undefined;
  artist: string | undefined;
  album: string | undefined;
  genre: string[] | undefined;
  year: number | undefined;
  mood: string | undefined;
  duration: number | undefined;
}

// We'll create a simplified version that works with the File API
export async function extractMetadata(fileHandle: FileSystemFileHandle): Promise<AudioMetadata | null> {
  try {
    // Get the File object from the handle
    const file = await fileHandle.getFile();
    
    // Parse the metadata - music-metadata expects a URL or Buffer, not a File object directly
    // We need to use parseBlob instead of parseFile for File objects
    const metadata = await parseBlob(file, { 
      duration: true,
      skipCovers: false
    });
    
    // Extract the relevant fields we need
    return {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      genre: metadata.common.genre,
      year: metadata.common.year,
      mood: metadata.common.mood,
      duration: metadata.format.duration
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return null;
  }
}