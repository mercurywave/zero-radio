import { FileSystemDirectoryHandle } from '../types/fileSystemTypes';
import { extractMetadata } from './metadataService';
import { scanDirectoryForAudioFiles } from './fileSystemService';

// Define types for our music library entries
export interface MusicLibraryEntry {
  id: string;
  filePath: string;
  fileName: string;
  modifiedTime: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number;
  mood: string;
  duration: number;
}

export interface AlbumArtEntry {
  id: string;
  data: ArrayBuffer | Blob;
  mimeType: string;
}

// IndexedDB database name and version
const DB_NAME = 'MusicLibraryDB';
const DB_VERSION = 2;
const MUSIC_LIBRARY_STORE = 'musicLibrary';
const ALBUM_ART_STORE = 'albumArt';

export class MusicCacheService {
  private db: IDBDatabase | null = null;

  constructor() {
  }

  public async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(MUSIC_LIBRARY_STORE)) {
          const musicStore = db.createObjectStore(MUSIC_LIBRARY_STORE, { keyPath: 'id' });
          musicStore.createIndex('filePath', 'filePath', { unique: true });
          musicStore.createIndex('modifiedTime', 'modifiedTime');
        }

        if (!db.objectStoreNames.contains(ALBUM_ART_STORE)) {
          const artStore = db.createObjectStore(ALBUM_ART_STORE, { keyPath: 'id' });
          artStore.createIndex('filePath', 'filePath', { unique: true });
        }
      };
    });
  }

  public async initializeCache(directoryHandle: FileSystemDirectoryHandle): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // First, scan for all audio files
      const audioFiles = await scanDirectoryForAudioFiles(directoryHandle);
      
      // Extract metadata for all files and store in cache
      const entries: MusicLibraryEntry[] = [];
      
      for (const file of audioFiles) {
        try {
          const metadata = await extractMetadata(file);
          if (metadata) {
            const entry: MusicLibraryEntry = {
              id: this.generateId(file.name),
              filePath: file.name,
              fileName: file.name,
              modifiedTime: Date.now(),
              title: metadata.title || 'Unknown Title',
              artist: metadata.artist || 'Unknown Artist',
              album: metadata.album || 'Unknown Album',
              genre: metadata.genre?.join(', ') || '',
              year: metadata.year || 0,
              mood: metadata.mood || '',
              duration: metadata.duration || 0
            };
            entries.push(entry);
          }
        } catch (error) {
          console.error(`Error extracting metadata from ${file.name}:`, error);
        }
      }

      // Store all entries in the database
      await this.storeEntries(entries);
      
      console.log(`Cached ${entries.length} audio files`);
    } catch (error) {
      console.error('Error initializing cache:', error);
      throw error;
    }
  }

  async updateCache(directoryHandle: FileSystemDirectoryHandle): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Get current cached files
      const cachedFiles = await this.getAllCachedEntries();
      
      // Scan for all audio files in the directory
      const audioFiles = await scanDirectoryForAudioFiles(directoryHandle);
      
      // Create a set of file paths that exist in the directory
      const directoryFilePaths = new Set(audioFiles.map(file => file.name));
      
      // Identify files that no longer exist in the directory
      const deletedEntries: string[] = [];
      const existingEntries = cachedFiles.filter(entry => {
        if (!directoryFilePaths.has(entry.filePath)) {
          deletedEntries.push(entry.id);
          return false;
        }
        return true;
      });
      
      // Delete entries for files that no longer exist
      if (deletedEntries.length > 0) {
        await this.deleteEntries(deletedEntries);
        console.log(`Deleted ${deletedEntries.length} entries`);
      }
      
      // Find new files and extract metadata
      const newFiles = audioFiles.filter(file => !cachedFiles.some(entry => entry.filePath === file.name));
      const newEntries: MusicLibraryEntry[] = [];
      
      for (const file of newFiles) {
        try {
          const metadata = await extractMetadata(file);
          if (metadata) {
            const entry: MusicLibraryEntry = {
              id: this.generateId(file.name),
              filePath: file.name,
              fileName: file.name,
              modifiedTime: Date.now(),
              title: metadata.title || 'Unknown Title',
              artist: metadata.artist || 'Unknown Artist',
              album: metadata.album || 'Unknown Album',
              genre: metadata.genre?.join(', ') || '',
              year: metadata.year || 0,
              mood: metadata.mood || '',
              duration: metadata.duration || 0
            };
            newEntries.push(entry);
          }
        } catch (error) {
          console.error(`Error extracting metadata from ${file.name}:`, error);
        }
      }
      
      // Add new entries to the database
      if (newEntries.length > 0) {
        await this.storeEntries(newEntries);
        console.log(`Added ${newEntries.length} new entries`);
      }
      
      console.log('Cache update completed');
    } catch (error) {
      console.error('Error updating cache:', error);
      throw error;
    }
  }

  async getAllCachedEntries(): Promise<MusicLibraryEntry[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MUSIC_LIBRARY_STORE], 'readonly');
      const store = transaction.objectStore(MUSIC_LIBRARY_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async storeEntries(entries: MusicLibraryEntry[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MUSIC_LIBRARY_STORE], 'readwrite');
      const store = transaction.objectStore(MUSIC_LIBRARY_STORE);

      // Handle each entry individually to avoid multiple request errors
      let completed = 0;
      const total = entries.length;
      
      if (total === 0) {
        resolve();
        return;
      }
      
      for (const entry of entries) {
        const request = store.put(entry);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        request.onerror = () => {
          reject(request.error);
        };
      }
    });
  }

  private async deleteEntries(ids: string[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MUSIC_LIBRARY_STORE], 'readwrite');
      const store = transaction.objectStore(MUSIC_LIBRARY_STORE);

      // Handle each delete individually to avoid multiple request errors
      let completed = 0;
      const total = ids.length;
      
      if (total === 0) {
        resolve();
        return;
      }
      
      for (const id of ids) {
        const request = store.delete(id);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        request.onerror = () => {
          reject(request.error);
        };
      }
    });
  }

  private generateId(filePath: string): string {
    // Simple hash function for generating IDs from file paths
    let hash = 0;
    for (let i = 0; i < filePath.length; i++) {
      const char = filePath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}