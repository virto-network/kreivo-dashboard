import { useEffect, useRef } from 'react';

export const useAutoResizeInput = (value: string, placeholder?: string) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (inputRef.current && measureRef.current) {
      const text = value || placeholder || '';
      measureRef.current.textContent = text;
      const width = measureRef.current.offsetWidth;
      const calculatedWidth = text ? Math.max(150, width + 30) : 150;
      inputRef.current.style.width = `${calculatedWidth}px`;
    }
  }, [value, placeholder]);

  return { inputRef, measureRef };
};

