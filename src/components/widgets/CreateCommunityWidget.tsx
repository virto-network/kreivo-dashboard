import React, { useState, useRef, useEffect } from 'react';
import { WidgetProps } from './WidgetRegistry';
import { useAutoResizeInput } from '@/hooks/useAutoResizeInput';
import './Widget.css';

export const CreateCommunityWidget: React.FC<WidgetProps> = ({
  command,
  onComplete,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const { inputRef, measureRef } = useAutoResizeInput(name, 'Enter community name...');

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete({ name: name.trim() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form className="widget-form" onSubmit={handleSubmit}>
      <span
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'pre',
          fontSize: '1rem',
          fontFamily: 'var(--font-primary, "Outfit", sans-serif)',
          padding: '0',
          margin: '0',
          height: 'auto',
          width: 'auto',
        }}
        aria-hidden="true"
      />
      <div className="widget-input-wrapper">
        <span className="widget-prefix">Create Community:</span>
        <input
          ref={inputRef}
          type="text"
          className="widget-input"
          placeholder="Enter community name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button type="submit" className="widget-submit" disabled={!name.trim()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button type="button" className="widget-cancel" onClick={onCancel}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </form>
  );
};

