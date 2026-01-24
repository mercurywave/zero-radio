import { parseFile, parseBlob } from 'music-metadata';

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

// Function to extract album art from a file handle (returns null if no cover)
export async function extractAlbumArt(fileHandle: FileSystemFileHandle): Promise<{ data: any; mimeType: string } | null> {
  try {
    // Get the File object from the handle
    const file = await fileHandle.getFile();
    
    // Parse the metadata to get album art - skip duration for performance
    const metadata = await parseBlob(file, { 
      duration: false,
      skipCovers: false
    });
    
    // Check if there are embedded pictures (album art)
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      // Get the first picture - use a safer approach to handle potential undefined values
      const cover = metadata.common.picture[0];
      
      if (cover && cover.data && cover.format) {
        return {
          data: cover.data,
          mimeType: cover.format
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting album art:', error);
    return null;
  }
}