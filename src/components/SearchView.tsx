import React from 'react';

interface SearchViewProps {
  onSearchQueryChange: (query: string) => void;
  searchQuery: string;
  searchResults: any[];
  isSearching: boolean;
}

const SearchView: React.FC<SearchViewProps> = ({ 
  onSearchQueryChange, 
  searchQuery, 
  searchResults, 
  isSearching 
}) => {
  return (
    <div className="radio-stations-view">
      {/* Search bar at top middle */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search artists, songs, or albums..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="search-bar"
        />
      </div>

       {searchQuery.trim() !== '' ? (
         isSearching ? (
           <div className="search-results">
             <p>Searching...</p>
           </div>
         ) : searchResults.length === 0 ? (
           <div className="search-results">
             <p>No results found</p>
           </div>
         ) : (
           <div className="search-results">
             {searchResults.map((entry, index) => (
               <div key={index} className="search-result-item">
                 <div className="station-image-placeholder">
                   {entry.albumArt ? (
                     <img src={entry.albumArt} alt={`${entry.title} album art`} className="album-art" />
                   ) : (
                     <span className="station-icon">🎵</span>
                   )}
                 </div>
                 <div className="station-info">
                   <h4>{entry.title}</h4>
                   <p className="station-genre">{entry.artist}</p>
                   <p className="station-listeners">{entry.album}</p>
                 </div>
               </div>
             ))}
           </div>
         )
       ) : null}
    </div>
  )
}

export default SearchView;