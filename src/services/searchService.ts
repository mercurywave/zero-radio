import { MusicCacheService, MusicLibraryEntry, SearchResult } from "./musicCacheService";
import { radioStationService } from "./radioStationService";

// track parallel events
let _generationId = 0;

export const performSearch = async (
  searchQuery: string,
  setSearchResults: (results: SearchResult[]) => void,
  setIsSearching: (isSearching: boolean) => void
): Promise<void> => {
  try {
    let gen = ++_generationId;
    setIsSearching(true);
    let results: SearchResult[] = await findSearchResults(searchQuery);

    if (gen === _generationId) {
      setSearchResults(results.slice(0, 20));
      setIsSearching(false);
    }
  }

  catch (error) {
    console.error('Search error:', error);
    setIsSearching(false);
  }
};


async function findSearchResults(searchQuery: string) {
  if(searchQuery.trim() === '') { return []; }
  console.log(searchQuery);

  let cacheService = MusicCacheService.getInstance();
  const allEntries = await cacheService.getAllCachedEntries();

  // First, check if the search query matches an artist or album (fuzzy match)
  let results: SearchResult[] = [];

  // Get radio stations and filter by search query
  const allStations = await radioStationService.getAllStations();
  const stationResults = allStations.filter(station => !station.isTemporary)
    .filter(station => station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (station.description && station.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Add station results
  for (const station of stationResults) {
    results.push({
      type: 'station',
      stationName: station.name,
      description: station.description || '',
      stationId: station.id,
      imagePath: station.imagePath,
    });
  }

  let tracksConsolidated: MusicLibraryEntry[] = [];

  // Check for artist matches (fuzzy)
  const artistsWithName = await cacheService.getArtistsByName(searchQuery);
  if (artistsWithName) {
    for (const artist of artistsWithName.keys()) {
      const tracklist = artistsWithName.get(artist)!;
      tracksConsolidated.push(...tracklist);
      results.push({
        type: 'artist',
        artistName: tracklist[0]!.artist,
        trackCount: tracklist.length,
        tracks: tracklist
      });
    }
  }

  // Check for album matches (fuzzy)
  const albumsWithName = (await cacheService.getAlbumsByName(searchQuery));
  for (let key of albumsWithName.keys()) {
    const tracklist = albumsWithName.get(key)!;
    const first = tracklist[0]!;
    tracksConsolidated.push(...tracklist);
    // Get album art from the first track in the album
    let albumArtUrl = await cacheService.getAlbumArtUrl(first);

    results.push({
      type: 'album',
      albumName: first.album || '',
      artistName: first.artist || '',
      trackCount: tracklist.length,
      tracks: tracklist,
      albumArt: albumArtUrl
    });
  }

  // If no exact matches, do fuzzy search for tracks
  const trackResults = allEntries.filter((entry: MusicLibraryEntry) => entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.album.toLowerCase().includes(searchQuery.toLowerCase())
  )
    .filter(r => !tracksConsolidated.find(t => t.id === r.id));
  for (let track of trackResults) {
    results.push({
      ...track,
      type: 'track',
      albumArt: await cacheService.getAlbumArtUrl(track),
    });
  }
  return results;
}
