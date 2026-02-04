import React, { useState, useEffect } from 'react';
import { RadioStation, radioStationService, TrackScore } from '../services/radioStationService';
import { MusicLibraryEntry } from '../services/musicCacheService';
import './RadioStationDetailView.css';

interface RadioStationDetailViewProps {
  stationId: string;
  onBack: () => void;
  onPlayStation: (station: RadioStation) => void;
}

const RadioStationDetailView: React.FC<RadioStationDetailViewProps> = ({ stationId, onBack, onPlayStation }) => {
  const [station, setStation] = useState<RadioStation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [topTracks, setTopTracks] = useState<TrackScore[]>([]);
  const [isFetchingTracks, setIsFetchingTracks] = useState(false);
  const [maxScore, setMaxScore] = useState(0);

  useEffect(() => {
    const fetchStationDetails = async () => {
      try {
        const fetchedStation = await radioStationService.getStationById(stationId);
        if (fetchedStation) {
          setStation(fetchedStation);
          setEditedName(fetchedStation.name);
          await fetchTopTracks(fetchedStation);
        } else {
          setError('Station not found');
        }
      } catch (err) {
        console.error('Error fetching station details:', err);
        setError('Failed to load station details');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchTopTracks = async (station: RadioStation) => {
      setIsFetchingTracks(true);
      try {
        const tracks = await radioStationService.scoreTracksForStation(station, []);
        setTopTracks(tracks.slice(0, 100));

        // Calculate max score for bar graph scaling
        if (tracks.length > 0) {
          const max = Math.max(...tracks.map(t => t.score));
          setMaxScore(max);
        } else {
          setMaxScore(0);
        }
      } catch (err) {
        console.error('Error fetching top tracks:', err);
      } finally {
        setIsFetchingTracks(false);
      }
    };

    fetchStationDetails();
  }, [stationId]);

  const handleSaveName = async () => {
    if (!station || editedName.trim() === '') return;

    try {
      const updatedStation = await radioStationService.updateStation(station, { name: editedName });
      setStation(updatedStation);
      setIsEditingName(false);
    } catch (err) {
      console.error('Error updating station name:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="radio-station-detail-view">
        <div className="radio-station-header">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <h1>Loading Station...</h1>
        </div>
        <div className="radio-station-content">
          <p>Loading station details...</p>
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="radio-station-detail-view">
        <div className="radio-station-header">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <h1>Station Not Found</h1>
        </div>
        <div className="radio-station-content">
          <p>{error || 'The requested station could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="radio-station-detail-view">
      <div className="radio-station-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        {isEditingName ? (
          <div className="edit-name-container">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="edit-name-input"
              autoFocus
            />
            <button onClick={handleSaveName} className="save-name-button">Save</button>
          </div>
        ) : (
          <h1>{station.name}</h1>
        )}
        <p className="radio-station-type">Radio Station</p>
      </div>

      <div className="radio-station-content-wrapper">
        <div className="radio-station-info-column">
          <div className="radio-station-art-container">
            <div className="radio-station-art-placeholder">
              {station.imagePath ? (
                <img src={station.imagePath} alt={`${station.name} station`} className="radio-station-art" />
              ) : (
                <span className="radio-station-icon">📻</span>
              )}
            </div>
          </div>
          <button className="play-button" onClick={() => onPlayStation(station)}>
            ▶ Play Station
          </button>
        </div>

        <div className="radio-station-description-column">
          <div className="radio-station-description">
            {station.description ? (
              <p>{station.description}</p>
            ) : (
              <p>No description available for this station.</p>
            )}
          </div>

          {station.criteria && station.criteria.length > 0 && (
            <div className="radio-station-criteria">
              <h2>Station Criteria</h2>
              <ul>
                {station.criteria.map((criterion, index) => (
                  <li key={index}>
                    <strong>{criterion.attribute}:</strong> {criterion.value} (weight: {criterion.weight})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top tracks display */}
          <div className="radio-station-top-tracks">
            <h2>Top Tracks</h2>
            {isFetchingTracks ? (
              <p>Loading top tracks...</p>
            ) : topTracks.length > 0 ? (
              <div className="top-tracks-list">
                {topTracks.map((trackScore, index) => (
                  <div key={index} className="track-item">
                    <div className="track-info">
                      <span className="track-number">{index + 1}</span>
                      <div className="track-details">
                        <div className="track-title">{trackScore.track.title}</div>
                        <div className="track-artist">{trackScore.track.artist}</div>
                      </div>
                    </div>
<div className="track-score">
                       <div className="track-score-bar-container">
                         <div className="track-score-bar">
                           <div 
                             className="track-score-bar-fill" 
                             style={{ 
                               width: `${maxScore > 0 ? (trackScore.score / maxScore * 100).toFixed(2) : 0}%`,
                               minWidth: '2px'
                             }}
                           ></div>
                         </div>
                         <span className="score-value">{trackScore.score.toFixed(2)}</span>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No tracks found for this station.</p>
            )}
          </div>

          {/* Show edit button for temporary stations only */}
          {station.isTemporary && (
            <div className="edit-name-section">
              <button
                onClick={() => setIsEditingName(true)}
                className="edit-name-button"
              >
                Edit Name
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RadioStationDetailView;