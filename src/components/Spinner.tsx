import React from 'react';

interface SpinnerProps {
  isVisible: boolean;
  text?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ isVisible, text = "Processing..." }) => {
  if (!isVisible) return null;

  return (
    <div id="spinner" className="spinner-overlay">
      <div className="spinner-container">
        <div className="spinner-text">{text}</div>
        <div className="spinner-icon"></div>
      </div>
    </div>
  );
};

export default Spinner; 