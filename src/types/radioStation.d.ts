export interface RadioStation {
  id: string;
  name: string;
  description: string | undefined;
  criteria: RadioStationCriteria[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RadioStationCriteria {
  attribute: 'artist' | 'album' | 'genre' | 'mood' | 'decade';
  value: string;
  weight: number; // 0-1 scale
}

export interface TrackScore {
  track: AudioTrack;
  score: number;
}