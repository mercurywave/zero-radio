import { MusicCacheService, AudioTrack } from './musicCacheService';
import { RadioStation, RadioStationCriteria, TrackScore } from '../types/radioStation';

export class RadioStationService {
  private musicCache: MusicCacheService;

  constructor(musicCache: MusicCacheService) {
    this.musicCache = musicCache;
  }

  /**
   * Create a new radio station
   */
  public async createStation(station: Omit<RadioStation, 'id' | 'createdAt' | 'updatedAt'>): Promise<RadioStation> {
    const description = station.description !== undefined ? station.description : undefined;
    const newStation: RadioStation = {
      id: this.generateId(station.name),
      name: station.name,
      description,
      criteria: station.criteria,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.storeStation(newStation);
    return newStation;
  }

  /**
   * Update an existing radio station
   */
  public async updateStation(id: string, updates: Partial<Omit<RadioStation, 'id' | 'createdAt'>>): Promise<RadioStation> {
    const existing = await this.getStationById(id);
    if (!existing) {
      throw new Error('Station not found');
    }

    const description = updates.description !== undefined ? updates.description : existing.description;
    const updatedStation: RadioStation = {
      ...existing,
      name: updates.name || existing.name,
      description,
      criteria: updates.criteria || existing.criteria,
      updatedAt: new Date()
    };

    await this.storeStation(updatedStation);
    return updatedStation;
  }

  /**
   * Delete a radio station
   */
  public async deleteStation(id: string): Promise<void> {
    const db = (this.musicCache as any).db;
    if (!db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['radioStations'], 'readwrite');
      const store = transaction.objectStore('radioStations');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all radio stations
   */
  public async getAllStations(): Promise<RadioStation[]> {
    const db = (this.musicCache as any).db;
    if (!db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['radioStations'], 'readonly');
      const store = transaction.objectStore('radioStations');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get a radio station by ID
   */
  public async getStationById(id: string): Promise<RadioStation | null> {
    const db = (this.musicCache as any).db;
    if (!db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['radioStations'], 'readonly');
      const store = transaction.objectStore('radioStations');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Select tracks for a radio station based on weighted criteria
   */
  public async selectTracksForStation(
    station: RadioStation,
    limit: number = 20
  ): Promise<TrackScore[]> {
    // Get all tracks from the music library
    const allTracks = await this.musicCache.getAllCachedEntries();

    if (allTracks.length === 0) {
      return [];
    }

    // Calculate scores for each track
    const scoredTracks: TrackScore[] = [];

    for (const track of allTracks) {
      const score = this.calculateTrackScore(track as AudioTrack, station.criteria);
      scoredTracks.push({ track: track as AudioTrack, score });
    }

    // Sort by score in descending order
    scoredTracks.sort((a, b) => b.score - a.score);

    // Return top N tracks
    return scoredTracks.slice(0, limit);
  }

  /**
   * Calculate a weighted score for how well a track matches the station criteria
   */
  private calculateTrackScore(track: AudioTrack, criteria: RadioStationCriteria[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    // Normalize weights so they sum to 1
    const criterionWeights = this.normalizeWeights(criteria);

    for (const criterion of criteria) {
      const attributeWeight = criterionWeights.get(criterion.attribute) || 0;
      if (attributeWeight === 0) continue;

      const matchScore = this.calculateAttributeMatch(track, criterion);
      weightedSum += matchScore * attributeWeight;
      totalWeight += attributeWeight;
    }

    // Return the weighted sum (already normalized)
    return weightedSum;
  }

  /**
   * Normalize weights so they sum to 1
   */
  private normalizeWeights(criteria: RadioStationCriteria[]): Map<string, number> {
    const weightMap = new Map<string, number>();
    let totalWeight = 0;

    // Sum all weights
    for (const criterion of criteria) {
      weightMap.set(criterion.attribute, criterion.weight);
      totalWeight += criterion.weight;
    }

    // Normalize if there are any criteria
    if (totalWeight > 0) {
      for (const [attr, weight] of weightMap.entries()) {
        weightMap.set(attr, weight / totalWeight);
      }
    }

    return weightMap;
  }

  /**
   * Calculate how well a track matches a specific criterion
   */
  private calculateAttributeMatch(track: AudioTrack, criterion: RadioStationCriteria): number {
    switch (criterion.attribute) {
      case 'artist':
        return this.matchString(track.artist, criterion.value);
      case 'album':
        return this.matchString(track.album, criterion.value);
      case 'genre':
        // Handle comma-separated genres
        const trackGenres = track.genre.split(',').map(g => g.trim());
        let maxGenreMatch = 0;
        for (const genre of trackGenres) {
          const match = this.matchString(genre, criterion.value);
          if (match > maxGenreMatch) maxGenreMatch = match;
        }
        return maxGenreMatch;
      case 'mood':
        return this.matchString(track.mood, criterion.value);
      case 'decade':
        // Extract decade from year
        const trackDecade = Math.floor(track.year / 10) * 10;
        const criterionDecade = parseInt(criterion.value);
        return trackDecade === criterionDecade ? 1 : 0;
      default:
        return 0;
    }
  }

  /**
   * Calculate string match score (0-1)
   */
  private matchString(trackValue: string, criterionValue: string): number {
    if (!trackValue || !criterionValue) return 0;

    // Exact match gets full score
    if (trackValue.toLowerCase() === criterionValue.toLowerCase()) {
      return 1;
    }

    // Partial match gets partial score based on similarity
    const trackLower = trackValue.toLowerCase();
    const criterionLower = criterionValue.toLowerCase();

    if (trackLower.includes(criterionLower)) {
      // If criterion is contained in track value, score based on length ratio
      return Math.min(0.8, criterionLower.length / trackLower.length);
    }

    if (criterionLower.includes(trackLower)) {
      // If track value is contained in criterion, give some credit
      return Math.min(0.5, trackLower.length / criterionLower.length);
    }

    return 0;
  }

  /**
   * Store a radio station in the database
   */
  private async storeStation(station: RadioStation): Promise<void> {
    const db = (this.musicCache as any).db;
    if (!db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['radioStations'], 'readwrite');
      const store = transaction.objectStore('radioStations');
      const request = store.put(station);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

   /**
    * Generate a unique ID for a station
    */
   private generateId(name: string): string {
     // Simple hash function for generating IDs from names
     let hash = 0;
     for (let i = 0; i < name.length; i++) {
       const char = name.charCodeAt(i);
       hash = ((hash << 5) - hash) + char;
       hash = hash & hash; // Convert to 32bit integer
     }
     return `station_${hash.toString()}`;
   }

   /**
    * Update a radio station's criteria based on an array of AudioTracks
    * Averages the criteria values from all tracks
    */
   public async updateStationFromTracks(
     id: string,
     tracks: AudioTrack[]
   ): Promise<RadioStation> {
     const existing = await this.getStationById(id);
     if (!existing) {
       throw new Error('Station not found');
     }

     // Calculate average criteria from the tracks
     const averagedCriteria = this.calculateAverageCriteria(tracks, existing.criteria);

     const updatedStation: RadioStation = {
       ...existing,
       criteria: averagedCriteria,
       updatedAt: new Date()
     };

     await this.storeStation(updatedStation);
     return updatedStation;
   }

   /**
    * Calculate average criteria from an array of tracks
    */
   private calculateAverageCriteria(
     tracks: AudioTrack[],
     existingCriteria: RadioStationCriteria[]
   ): RadioStationCriteria[] {
     if (tracks.length === 0) {
       return existingCriteria;
     }

     // Collect all attribute values from tracks
     const attributeValues = new Map<string, { values: Set<string>; count: number }>();

     for (const track of tracks) {
       // Extract artist
       if (track.artist) {
         const key = `artist:${track.artist}`;
         if (!attributeValues.has(key)) {
           attributeValues.set(key, { values: new Set(), count: 0 });
         }
         attributeValues.get(key)!.count++;
       }

       // Extract album
       if (track.album) {
         const key = `album:${track.album}`;
         if (!attributeValues.has(key)) {
           attributeValues.set(key, { values: new Set(), count: 0 });
         }
         attributeValues.get(key)!.count++;
       }

       // Extract genres (comma-separated)
       if (track.genre) {
         const genres = track.genre.split(',').map(g => g.trim());
         for (const genre of genres) {
           const key = `genre:${genre}`;
           if (!attributeValues.has(key)) {
             attributeValues.set(key, { values: new Set(), count: 0 });
           }
           attributeValues.get(key)!.count++;
         }
       }

       // Extract mood
       if (track.mood) {
         const key = `mood:${track.mood}`;
         if (!attributeValues.has(key)) {
           attributeValues.set(key, { values: new Set(), count: 0 });
         }
         attributeValues.get(key)!.count++;
       }

       // Extract decade from year
       if (track.year) {
         const decade = Math.floor(track.year / 10) * 10;
         const key = `decade:${decade}`;
         if (!attributeValues.has(key)) {
           attributeValues.set(key, { values: new Set(), count: 0 });
         }
         attributeValues.get(key)!.count++;
       }
     }

     // Calculate average weights for each attribute value
     const averagedCriteria: RadioStationCriteria[] = [];

     for (const [key, data] of attributeValues.entries()) {
       const [attribute, value] = key.split(':') as [string, string];
       const weight = data.count / tracks.length;

       if (weight > 0) {
         averagedCriteria.push({
           attribute: attribute as RadioStationCriteria['attribute'],
           value,
           weight
         });
       }
     }

     return averagedCriteria;
   }
 }

// Singleton instance
const musicCacheService = new MusicCacheService();
export const radioStationService = new RadioStationService(musicCacheService);