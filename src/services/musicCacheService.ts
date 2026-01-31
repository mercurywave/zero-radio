import { extractMetadata, extractAlbumArt } from './metadataService';
import { scanDirectoryForAudioFiles } from './fileSystemService';
import { RadioStation, RadioStationAttribute, radioStationService } from './radioStationService';

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

export type SearchResultType = 'track' | 'artist' | 'album' | 'station';

export interface TrackSearchResult extends MusicLibraryEntry {
  type: 'track';
  albumArt: string | null;
}

export interface ArtistSearchResult {
  type: 'artist';
  artistName: string;
  trackCount: number;
  tracks: MusicLibraryEntry[];
}

export interface AlbumSearchResult {
  type: 'album';
  albumName: string;
  artistName: string;
  trackCount: number;
  tracks: MusicLibraryEntry[];
  albumArt: string | null;
}

export interface StationSearchResult {
  type: 'station';
  stationName: string;
  description: string;
  stationId: string;
}

export type SearchResult = TrackSearchResult | ArtistSearchResult | AlbumSearchResult | StationSearchResult;

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
  private onProgressCallback: ((current: number, total: number) => void) | null = null;

  private constructor() {
  }

  public static getInstance(): MusicCacheService {
    if (!MusicCacheService.instance) {
      MusicCacheService.instance = new MusicCacheService();
    }
    return MusicCacheService.instance;
  }

  public async loadFromFolder(directoryHandle: FileSystemDirectoryHandle): Promise<void> {
    await this.initDB();
    await this.updateCache(directoryHandle);
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
        this.onProgressCallback(0, audioFiles.length);
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
        this.onProgressCallback(0, newFiles.length);
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
              this.onProgressCallback(i + 1, newFiles.length);
            }
          }
        } catch (error) {
          console.error(`Error extracting metadata from ${file.name}:`, error);
        }
      }

      // Clean up progress display
      if (this.onProgressCallback) {
        this.onProgressCallback(0, 0);
      }

      // Add new entries to the database
      if (newEntries.length > 0) {
        console.log(`Added ${newEntries.length} new entries`);
      }

      if (deletedEntries.length > 0 || newFiles.length > 0) {
        await this.scanForRadioStations();
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

  public async getTrackFromLibraryEntry(track: MusicLibraryEntry): Promise<AudioTrack> {
    let albumArtUrl = await this.getAlbumArtUrl(track);
    return {
      ...track,
      albumArt: albumArtUrl
    }
  }

  async getAlbumArtUrl(track: MusicLibraryEntry): Promise<string | null> {
    let albumArtUrl: string | null = null;
    try {
      const firstTrackArt = await this.getAlbumArtById(track.id || '');
      if (firstTrackArt && firstTrackArt.data) {
        if (firstTrackArt.data instanceof Blob) {
          albumArtUrl = URL.createObjectURL(firstTrackArt.data);
        } else if (firstTrackArt.data instanceof Uint8Array) {
          const blob = new Blob([firstTrackArt.data], { type: firstTrackArt.mimeType });
          albumArtUrl = URL.createObjectURL(blob);
        } else if (firstTrackArt.data instanceof ArrayBuffer) {
          const blob = new Blob([firstTrackArt.data], { type: firstTrackArt.mimeType });
          albumArtUrl = URL.createObjectURL(blob);
        } else if (typeof firstTrackArt.data === 'string') {
          albumArtUrl = firstTrackArt.data;
        }
      }
    } catch (error) {
      console.error('Error fetching album art for album result:', error);
    }
    return albumArtUrl;
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

  async getArtistsByName(artistName: string): Promise<Map<string, MusicLibraryEntry[]>> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MUSIC_LIBRARY_STORE], 'readonly');
      const store = transaction.objectStore(MUSIC_LIBRARY_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const allEntries: MusicLibraryEntry[] = request.result || [];
        const artistMap = new Map<string, MusicLibraryEntry[]>();

        // Group entries by artist name
        for (const entry of allEntries) {
          if (entry.artist.toLowerCase().includes(artistName.toLowerCase())) {
            const key = entry.artist.toLowerCase();
            if (!artistMap.has(key)) {
              artistMap.set(key, []);
            }
            artistMap.get(key)!.push(entry);
          }
        }
        resolve(artistMap);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAlbumsByName(albumName: string): Promise<Map<string, MusicLibraryEntry[]>> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MUSIC_LIBRARY_STORE], 'readonly');
      const store = transaction.objectStore(MUSIC_LIBRARY_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const allEntries: MusicLibraryEntry[] = request.result || [];
        const albumMap = new Map<string, MusicLibraryEntry[]>();

        // Group entries by album name (lowercase)
        for (const entry of allEntries) {
          if (entry.album.toLowerCase().includes(albumName.toLowerCase())) {
            const key = entry.artist.toLowerCase() + '|' + entry.album.toLowerCase();
            if (!albumMap.has(key)) {
              albumMap.set(key, []);
            }
            albumMap.get(key)!.push(entry);
          }
        }
        resolve(albumMap);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllArtists(): Promise<{ artist: string, count: number }[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MUSIC_LIBRARY_STORE], 'readonly');
      const store = transaction.objectStore(MUSIC_LIBRARY_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const allEntries: MusicLibraryEntry[] = request.result || [];
        const artistMap = new Map<string, number>();

        allEntries.forEach(entry => {
          const artist = entry.artist.toLowerCase();
          artistMap.set(artist, (artistMap.get(artist) || 0) + 1);
        });

        const artists = Array.from(artistMap.entries()).map(([artist, count]) => ({
          artist,
          count
        }));

        resolve(artists);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllAlbums(): Promise<{ album: string, artist: string, count: number }[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MUSIC_LIBRARY_STORE], 'readonly');
      const store = transaction.objectStore(MUSIC_LIBRARY_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const allEntries: MusicLibraryEntry[] = request.result || [];
        const albumMap = new Map<string, { artist: string }[]>();

        allEntries.forEach(entry => {
          const albumKey = `${entry.album.toLowerCase()}-${entry.artist.toLowerCase()}`;
          if (!albumMap.has(albumKey)) {
            albumMap.set(albumKey, []);
          }
          albumMap.get(albumKey)!.push({
            artist: entry.artist
          });
        });

        const albums = Array.from(albumMap.entries()).map(([key, entries]) => {
          const albumParts = key.split('-');
          return {
            album: (albumParts[0] ?? '') as string,
            artist: entries[0]?.artist || '',
            count: entries.length
          };
        }) as { album: string, artist: string, count: number }[];

        resolve(albums);
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
   * Scan for potential radio stations based on track metadata
   * Groups tracks by common attributes and creates stations with >20 tracks
   */
  private async scanForRadioStations(): Promise<void> {
    const allTracks = await this.getAllCachedEntries();
    if (allTracks.length < 20) {
      console.log('Not enough tracks to create radio stations');
      return;
    }

    // Group tracks by each attribute
    type GroupingAttribute = 'genre' | 'mood' | 'decade' | 'genre+decade';
    const groupsByAttribute: Record<GroupingAttribute, Map<string, MusicLibraryEntry[]>> = {
      genre: new Map(),
      mood: new Map(),
      decade: new Map(),
      'genre+decade': new Map()
    };

    // Populate groups
    for (const track of allTracks) {

      // Group by genre (comma-separated)
      const genres = track.genre.split(',').map(g => g.trim()).filter(g => g.length > 0);
      for (const genre of genres) {
        const genreKey = genre.toLowerCase();
        if (!groupsByAttribute.genre.has(genreKey)) {
          groupsByAttribute.genre.set(genreKey, []);
        }
        groupsByAttribute.genre.get(genreKey)!.push(track);
      }

      // Group by mood
      const moodKey = track.mood.toLowerCase();
      if (moodKey && !groupsByAttribute.mood.has(moodKey)) {
        groupsByAttribute.mood.set(moodKey, []);
      }
      if (moodKey) {
        groupsByAttribute.mood.get(moodKey)!.push(track);
      }

      // Group by decade
      const decade = track.year > 0 ? Math.floor(track.year / 10) * 10 : 0;
      const decadeKey = decade.toString();
      if (!groupsByAttribute.decade.has(decadeKey)) {
        groupsByAttribute.decade.set(decadeKey, []);
      }
      groupsByAttribute.decade.get(decadeKey)!.push(track);

      // Group by genre+decade (hybrid grouping)
      for (const genre of genres) {
        const hybridKey = `${genre.toLowerCase()}|${decadeKey}`;
        if (!groupsByAttribute['genre+decade'].has(hybridKey)) {
          groupsByAttribute['genre+decade'].set(hybridKey, []);
        }
        groupsByAttribute['genre+decade'].get(hybridKey)!.push(track);
      }
    }

    // Find groups with more than 20 tracks and create radio stations
    const createdStations: [RadioStation, number][] = [];
    const existingStations = await radioStationService.getAllStations();

    for (const [attribute, groups] of Object.entries(groupsByAttribute)) {
      for (const [groupKey, tracks] of groups) {
        if (tracks.length > 20) {
          // Create criteria based on the grouping attribute
          const criteria = this.createCriteriaFromGroup(attribute as 'artist' | 'album' | 'genre' | 'mood' | 'decade' | 'genre+decade', groupKey);

          // Create station name
          let stationName = '';
          switch (attribute) {
            case 'album':
              const [artist, album] = groupKey.split('|');
              stationName = `${artist} - ${album}`;
              break;
            case 'genre':
              stationName = `Genre: ${groupKey}`;
              break;
            case 'mood':
              stationName = `Mood: ${groupKey}`;
              break;
            case 'decade':
              stationName = `Decade: ${groupKey}'s`;
              break;
            case 'genre+decade':
              const [genre, decade] = groupKey.split('|');
              stationName = `${genre} (${decade}'s)`;
              break;
          }

          // Create the radio station
          try {
            if (!existingStations.find(s => s.name === stationName)) {
              let station = await this.createRadioStationFromTracks(stationName, criteria);
              createdStations.push([station, tracks.length]);
            }
          } catch (error) {
            console.error(`Error creating radio station for ${groupKey}:`, error);
          }
        }
      }
    }

    if (createdStations.length > 0) {
      createdStations.sort((a, b) => a[1] - b[1]);
      for (const pair of createdStations) {
        await this.assignImagesToStation(pair[0]);
      }
    }

    if (createdStations.length > 0) {
      console.log(`Created ${createdStations.length} new radio stations`);
    } else {
      console.log('No groups with enough tracks to create radio stations');
    }
  }

  /**
   * Create criteria array from a group key
   */
  private createCriteriaFromGroup(attribute: 'artist' | 'album' | 'genre' | 'mood' | 'decade' | 'genre+decade', groupKey: string): { attribute: 'artist' | 'album' | 'genre' | 'mood' | 'decade'; value: string; weight: number }[] {
    const criteria: { attribute: 'artist' | 'album' | 'genre' | 'mood' | 'decade'; value: string; weight: number }[] = [];

    switch (attribute) {
      case 'artist':
        criteria.push({ attribute: 'artist', value: groupKey, weight: 1.0 });
        break;
      case 'album':
        const [artist, album] = groupKey.split('|');
        if (artist && album) {
          criteria.push({ attribute: 'artist', value: artist, weight: 0.7 });
          criteria.push({ attribute: 'album', value: album, weight: 1.0 });
        }
        break;
      case 'genre':
        criteria.push({ attribute: 'genre', value: groupKey, weight: 1.0 });
        break;
      case 'mood':
        criteria.push({ attribute: 'mood', value: groupKey, weight: 1.0 });
        break;
      case 'decade':
        criteria.push({ attribute: 'decade', value: groupKey, weight: 1.0 });
        break;
      case 'genre+decade':
        const [genre, decade] = groupKey.split('|');
        if (genre && decade) {
          criteria.push({ attribute: 'genre', value: genre, weight: 0.7 });
          criteria.push({ attribute: 'decade', value: decade, weight: 0.7 });
        }
        break;
    }

    return criteria;
  }

  /**
   * Create a radio station from tracks with specific criteria
   */
  private async createRadioStationFromTracks(
    name: string,
    criteria: { attribute: RadioStationAttribute; value: string; weight: number }[]
  ): Promise<RadioStation> {
    // Import the RadioStationService here to avoid circular dependency
    const { radioStationService } = await import('./radioStationService');

    return await radioStationService.createStation({
      name,
      description: name,
      criteria,
      isAutoGenerated: true,
      isTemporary: false
    });
  }

  /**
   * Assign images to auto-generated radio stations based on genre
   */
  private async assignImagesToStation(station: RadioStation): Promise<void> {
    // Define image paths statically - Vite will handle these at build time
    const imagesByGenre = new Map<string, string[]>();

    // Manually define the image paths based on the actual asset structure
    // This approach works with Vite's static asset handling
    const genreImages: Record<string, string[]> = {
      'blues': ['/assets/blues/1.jpg', '/assets/blues/2.jpg'],
      'classic rock': ['/assets/classic rock/1.jpg', '/assets/classic rock/2.jpg',
        '/assets/classic rock/3.jpg', '/assets/classic rock/4.jpg',
        '/assets/classic rock/5.jpg'],
      'country': ['/assets/country/1.jpg', '/assets/country/2.jpg',
        '/assets/country/3.jpg', '/assets/country/4.jpg',
        '/assets/country/5.jpg'],
      'dance': ['/assets/dance/1.jpg', '/assets/dance/2.jpg', '/assets/dance/3.jpg'],
      'disco': ['/assets/disco/1.jpg'],
      'electronic': ['/assets/electronic/1.jpg', '/assets/electronic/2.jpg'],
      'grunge': ['/assets/grunge/1.jpg', '/assets/grunge/2.jpg'],
      'hip-hop': ['/assets/hip-hop/1.jpg', '/assets/hip-hop/2.jpg'],
      'jazz': ['/assets/jazz/1.jpg', '/assets/jazz/2.jpg', '/assets/jazz/3.jpg',
        '/assets/jazz/4.jpg'],
      'metal': ['/assets/metal/1.jpg', '/assets/metal/2.jpg', '/assets/metal/3.jpg',
        '/assets/metal/4.jpg', '/assets/metal/5.jpg', '/assets/metal/6.jpg'],
      'new age': ['/assets/new age/1.jpg', '/assets/new age/2.jpg'],
      'oldies': ['/assets/oldies/1.jpg'],
      'rap': ['/assets/rap/1.jpg']
    };

    // Populate the map
    for (const [genre, images] of Object.entries(genreImages)) {
      imagesByGenre.set(genre, images);
    }

    let assignedImages = (await radioStationService.getAllStations())
      .filter(s => s.isAutoGenerated && !s.isAllMusic && s.imagePath)
      .map(s => s.imagePath);


    // Find a genre criterion
    const genreCriterion = station.criteria.find(c => c.attribute === 'genre');
    if (!genreCriterion) return;

    const genre = genreCriterion.value.toLowerCase();
    const availableImages = imagesByGenre.get(genre);

    if (availableImages && availableImages.length > 0) {
      // Find an image that hasn't been assigned yet
      for (const imagePath of availableImages) {
        if (!assignedImages.includes(imagePath)) {
          await radioStationService.updateStation(station.id, {
            imagePath: imagePath
          });
          break;
        }
      }
      console.log(station);
    }
  }

  /**
   * Set a callback function to receive progress updates
   */
  public setOnProgress(callback: (current: number, total: number) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Clear the progress callback
   */
  public clearOnProgress(): void {
    this.onProgressCallback = null;
  }
}