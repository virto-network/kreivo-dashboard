import { useState, useCallback } from 'react';

export const useSpinner = () => {
  const [isSpinnerVisible, setIsSpinnerVisible] = useState(false);
  const [spinnerText, setSpinnerText] = useState('Processing...');

  const showSpinner = useCallback((text?: string) => {
    if (text) {
      setSpinnerText(text);
    }
    setIsSpinnerVisible(true);
  }, []);

  const hideSpinner = useCallback(() => {
    setIsSpinnerVisible(false);
  }, []);

  return {
    isSpinnerVisible,
    spinnerText,
    showSpinner,
    hideSpinner
  };
}; 