import { extractMetadata, extractAlbumArt } from './metadataService';
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

export interface AudioTrack extends MusicLibraryEntry {
  albumArt: string | null;
}

export interface AlbumArtEntry {
  id: string;
  data: ArrayBuffer | Blob;
  mimeType: string;
  filePath: string; // Add filePath for linking to music entry
}

// IndexedDB database name and version
const DB_NAME = 'MusicLibraryDB';
const DB_VERSION = 3;
const MUSIC_LIBRARY_STORE = 'musicLibrary';
const ALBUM_ART_STORE = 'albumArt';
const RADIO_STATIONS_STORE = 'radioStations';

export class MusicCacheService {
  private static instance: MusicCacheService | null = null;
  private db: IDBDatabase | null = null;
  private onProgressCallback: ((progress: number, current: number, total: number) => void) | null = null;

  private constructor() {
  }

  public static getInstance(): MusicCacheService {
    if (!MusicCacheService.instance) {
      MusicCacheService.instance = new MusicCacheService();
    }
    return MusicCacheService.instance;
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

        if (!db.objectStoreNames.contains(RADIO_STATIONS_STORE)) {
          const stationStore = db.createObjectStore(RADIO_STATIONS_STORE, { keyPath: 'id' });
          stationStore.createIndex('name', 'name', { unique: false });
        }
      };
    });
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
      
      // Update progress - start at 0%
      if (this.onProgressCallback) {
        this.onProgressCallback(0, 0, audioFiles.length);
      }

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
        console.log(`Deleting ${deletedEntries.length} entries`);
        await this.deleteEntries(deletedEntries);
        console.log(`Deleted ${deletedEntries.length} entries`);
      }

      // Find new files and extract metadata
      const newFiles = audioFiles.filter(file => !cachedFiles.some(entry => entry.filePath === file.name));
      const newEntries: MusicLibraryEntry[] = [];
      
      // Update progress - start at 0%
      if (this.onProgressCallback) {
        this.onProgressCallback(0, 0, newFiles.length);
      }

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i]!;
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
            
            // Store the music entry first
            await this.storeEntries([entry]);
            
            // Extract and store album art if available
            const albumArt = await extractAlbumArt(file);
            if (albumArt && albumArt.data) {
              await this.storeAlbumArt({
                id: this.generateId(file.name), // Use same ID as music entry for linking
                data: albumArt.data,
                mimeType: albumArt.mimeType,
                filePath: file.name
              });
            }
            
            // Update progress - increment by 1/total files percentage
            if (this.onProgressCallback) {
              this.onProgressCallback(((i + 1) / newFiles.length) * 100, i + 1, newFiles.length);
            }
          }
        } catch (error) {
          console.error(`Error extracting metadata from ${file.name}:`, error);
        }
      }

      // Add new entries to the database
      if (newEntries.length > 0) {
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

  async getAlbumArtById(id: string): Promise<AlbumArtEntry | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ALBUM_ART_STORE], 'readonly');
      const store = transaction.objectStore(ALBUM_ART_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
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

    const transaction = this.db!.transaction([MUSIC_LIBRARY_STORE], 'readwrite');
    const store = transaction.objectStore(MUSIC_LIBRARY_STORE);

    // Handle each entry individually to avoid multiple request errors
    for (const entry of entries) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
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

  private async storeAlbumArt(artEntry: AlbumArtEntry): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db!.transaction([ALBUM_ART_STORE], 'readwrite');
    const store = transaction.objectStore(ALBUM_ART_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(artEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
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

  /**
   * Set a callback function to receive progress updates
   */
  public setOnProgress(callback: (progress: number, current: number, total: number) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Clear the progress callback
   */
  public clearOnProgress(): void {
    this.onProgressCallback = null;
  }
}