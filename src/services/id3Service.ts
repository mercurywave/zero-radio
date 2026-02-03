
export function genreSimilarity(genre1: string, genre2: string): number {
    // Normalize input to ensure consistent comparison
    const g1 = normalizeGenre(genre1);
    const g2 = normalizeGenre(genre2);

    // If genres are identical, return maximum similarity
    if (g1 === g2) return 1;

    // Define genre relationships with similarity scores
    const relationships: [string, string, number][] = [
        // Pop music and related genres
        ['pop', 'dance', 0.7],
        ['pop', 'synth pop', 0.6],
        ['pop', 'indie pop', 0.7],
        ['pop', 'adult contemporary', 0.6],
        ['dance', 'electronic', 0.6],
        ['dance', 'house', 0.8],
        ['dance', 'techno', 0.6],
        ['dance', 'progressive house', 0.7],
        ['dance', 'deep house', 0.8],

        // Rock and related genres
        ['rock', 'alternative rock', 0.8],
        ['rock', 'punk', 0.7],
        ['rock', 'metal', 0.6],
        ['rock', 'hard rock', 0.8],
        ['rock', 'progressive rock', 0.6],
        ['rock', 'indie rock', 0.8],
        ['alternative rock', 'indie rock', 0.8],
        ['alternative rock', 'grunge', 0.7],
        ['punk', 'post punk', 0.6],
        ['punk', 'ska', 0.5],

        // Electronic and related genres
        ['electronic', 'house', 0.7],
        ['electronic', 'techno', 0.7],
        ['electronic', 'ambient', 0.5],
        ['electronic', 'dubstep', 0.6],
        ['electronic', 'drum and bass', 0.6],
        ['house', 'deep house', 0.8],
        ['house', 'progressive house', 0.8],
        ['techno', 'acid techno', 0.8],
        ['techno', 'progressive techno', 0.7],
        ['techno', 'minimal techno', 0.7],

        // Hip-hop and related genres
        ['hip hop', 'rap', 0.9],
        ['hip hop', 'trap', 0.7],
        ['hip hop', 'conscious rap', 0.7],
        ['hip hop', 'gangsta rap', 0.8],
        ['rap', 'conscious rap', 0.7],
        ['rap', 'gangsta rap', 0.8],
        ['trap', 'melodic trap', 0.6],
        ['trap', 'cloud rap', 0.5],

        // Soul and related genres
        ['soul', 'r&b', 0.8],
        ['soul', 'funk', 0.7],
        ['soul', 'motown', 0.7],
        ['r&b', 'contemporary r&b', 0.8],
        ['r&b', 'neo soul', 0.7],
        ['funk', 'disco', 0.6],
        ['funk', 'soul funk', 0.8],

        // Jazz and related genres
        ['jazz', 'fusion', 0.7],
        ['jazz', 'smooth jazz', 0.6],
        ['jazz', 'bebop', 0.6],
        ['jazz', 'swing', 0.5],
        ['fusion', 'progressive rock', 0.5],
        ['bebop', 'jazz fusion', 0.7],

        // Country and related genres
        ['country', 'bluegrass', 0.7],
        ['country', 'folk', 0.6],
        ['country', 'country rock', 0.7],
        ['bluegrass', 'folk', 0.6],
        ['country rock', 'alternative country', 0.6],

        // Classical and related genres
        ['classical', 'orchestral', 0.8],
        ['classical', 'baroque', 0.7],
        ['classical', 'romantic', 0.7],
        ['orchestral', 'symphonic', 0.8],
        ['baroque', 'classical', 0.7],

        // Blues and related genres
        ['blues', 'blues rock', 0.7],
        ['blues', 'delta blues', 0.8],
        ['blues', 'chicago blues', 0.8],
        ['blues rock', 'hard blues', 0.6],

        // Other popular genres
        ['reggae', 'dub', 0.7],
        ['reggae', 'ska', 0.5],
        ['indie', 'indie rock', 0.8],
        ['indie', 'alternative rock', 0.7],
        ['folk', 'acoustic', 0.6],
        ['folk', 'traditional folk', 0.6],
        ['metal', 'heavy metal', 0.9],
        ['metal', 'thrash metal', 0.8],
        ['metal', 'death metal', 0.7],
        ['metal', 'black metal', 0.6],

        // Additional relationships
        ['gospel', 'soul', 0.7],
        ['gospel', 'r&b', 0.6],
        ['disco', 'funk', 0.6],
        ['disco', 'pop', 0.5],
        ['ambient', 'new age', 0.5],
        ['ambient', 'idm', 0.6],
        ['world', 'afrobeat', 0.6],
        ['world', 'latin', 0.5],
        ['world', 'flamenco', 0.4],
        ['experimental', 'avant garde', 0.7],
        ['experimental', 'noise', 0.6],
        ['experimental', 'free jazz', 0.6],
        ['punk', 'hardcore punk', 0.7],
        ['pop', 'boy band', 0.6],
        ['rock', 'power pop', 0.6],
        ['house', 'progressive', 0.6],
        ['techno', 'house', 0.7],
        ['hip hop', 'rap rock', 0.5],
        ['soul', 'disco', 0.6],
        ['jazz', 'latin jazz', 0.6],

        // Additional genre pairs
        ['alternative', 'indie', 0.8],
        ['progressive', 'progressive rock', 0.7],
        ['progressive', 'progressive house', 0.6],
        ['rock', 'pop rock', 0.7],
        ['rock', 'soft rock', 0.6],
        ['rock', 'goth rock', 0.5],
        ['metal', 'nu metal', 0.7],
        ['metal', 'metalcore', 0.6],
        ['rap', 'hip hop', 0.9],
        ['pop', 'dance pop', 0.7],
        ['electronic', 'synthwave', 0.5],
        ['electronic', 'chillout', 0.5],
        ['rock', 'acid rock', 0.6],
        ['jazz', 'contemporary jazz', 0.6],
        ['funk', 'soul funk', 0.8],
        ['country', 'country pop', 0.6],
        ['reggae', 'dub reggae', 0.8],
        ['indie', 'indie pop', 0.7],
        ['metal', 'thrash', 0.8],
        ['hip hop', 'east coast hip hop', 0.7]
    ];

    // Check for direct relationships
    for (const [gen1, gen2, similarity] of relationships) {
        if ((g1 === gen1 && g2 === gen2) || (g1 === gen2 && g2 === gen1)) {
            return similarity;
        }
    }

    // Default to no similarity for unrelated genres
    return 0;
}

function normalizeGenre(genre: string): string {

  // Convert to lowercase for consistent matching
  const lowerGenre = genre.toLowerCase().trim().replace(/\s+/g, ' ').replace(/-/g, ' ');

  // Common genre variations mapping
  const genreMap: Record<string, string> = {
    // Alternative rock variations
    'alt. rock': 'alternative rock',
    
    // R&B variations
    'rhythm & blues': 'r&b',
    'rhythm and blues': 'r&b',
    'r&b': 'r&b',
    'r&b music': 'r&b',
  };

  // Return normalized genre or original if not found
  return genreMap[lowerGenre] || genre;
}