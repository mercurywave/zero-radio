import React from 'react';

interface ProgressPopoverProps {
  isVisible: boolean;
  progress: number;
  current: number;
  total: number;
  message?: string;
}

const ProgressPopover: React.FC<ProgressPopoverProps> = ({ 
  isVisible, 
  progress, 
  current, 
  total,
  message = "Processing files..."
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="progress-popover">
      <div className="progress-content">
        <div className="progress-message">{message}</div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {current} of {total} files processed
        </div>
      </div>
    </div>
  );
};

export default ProgressPopover;