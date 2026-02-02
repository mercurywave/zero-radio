import React, { useState, useEffect } from 'react';
import { RadioStation, radioStationService } from '../services/radioStationService';
import './RadioStationDetailView.css';

interface RadioStationDetailViewProps {
  stationId: string;
  onBack: () => void;
}

const RadioStationDetailView: React.FC<RadioStationDetailViewProps> = ({ stationId, onBack }) => {
  const [station, setStation] = useState<RadioStation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStationDetails = async () => {
      try {
        const fetchedStation = await radioStationService.getStationById(stationId);
        if (fetchedStation) {
          setStation(fetchedStation);
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

    fetchStationDetails();
  }, [stationId]);

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
        <h1>{station.name}</h1>
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
        </div>
      </div>
    </div>
  );
};

export default RadioStationDetailView;