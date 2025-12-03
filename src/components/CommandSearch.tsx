import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFuseSearch } from '@/hooks/useFuseSearch';
import { Command } from '@/data/commands.en';
import { getWidget } from './widgets/WidgetRegistry';
import type { FuseResultMatch } from 'fuse.js';
import { Extrinsics } from '@/pages/Extrinsics';
import { useVirto } from '@/contexts/VirtoContext';
import { useNotification } from '@/hooks/useNotification';
import { useSpinner } from '@/hooks/useSpinner';
import './CommandSearch.css';

interface CommandSearchProps {
  onCommandSelect?: (command: Command) => void;
  onWidgetComplete?: (command: Command, data: any) => void;
  externalTrigger?: { commandId: string; initialData?: any } | null;
  onExternalTriggerHandled?: () => void;
}

export const CommandSearch: React.FC<CommandSearchProps> = ({
  onCommandSelect,
  onWidgetComplete,
  externalTrigger,
  onExternalTriggerHandled,
}) => {
  const { query, setQuery, results } = useFuseSearch({
    debounceMs: 150,
    maxResults: 5,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeWidget, setActiveWidget] = useState<Command | null>(null);
  const [widgetInitialData, setWidgetInitialData] = useState<any>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showExtrinsicEditor, setShowExtrinsicEditor] = useState(false);
  const [isExtrinsicLoading, setIsExtrinsicLoading] = useState(false);
  const [showExtrinsicMenu, setShowExtrinsicMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const extrinsicMenuRef = useRef<HTMLDivElement>(null);
  const { sdk, isAuthenticated } = useVirto();
  const { showSuccessNotification, showErrorNotification } = useNotification();
  const { showSpinner, hideSpinner } = useSpinner();

  const handleFocus = useCallback(() => {
    setIsOpen(true);
    setIsFocused(true);
    setTimeout(() => {
      const promptSection = containerRef.current?.querySelector('.prompt-section');
      if (promptSection) {
        promptSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }, 200);
  }, []);

  useEffect(() => {
    if (query.trim()) {
      setIsOpen(true);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (extrinsicMenuRef.current && !extrinsicMenuRef.current.contains(event.target as Node)) {
        setShowExtrinsicMenu(false);
      }
    };

    if (showExtrinsicMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExtrinsicMenu]);

  const handleCommandSelect = useCallback(
    (command: Command, initialData?: any) => {
      const WidgetComponent = getWidget(command.id);
      
      setIsFocused(true);
      requestAnimationFrame(() => {
        setTimeout(() => {
          const promptSection = containerRef.current?.querySelector('.prompt-section');
          if (promptSection) {
            promptSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 100);
      });
      
      if (WidgetComponent) {
        setActiveWidget(command);
        setWidgetInitialData(initialData || null);
        setQuery('');
        setIsOpen(false);
      } else {
        setQuery('');
        setIsOpen(false);
        onCommandSelect?.(command);
      }
    },
    [onCommandSelect, setQuery]
  );

  const handleWidgetComplete = useCallback(
    (data: any) => {
      if (activeWidget) {
        onWidgetComplete?.(activeWidget, data);
        setActiveWidget(null);
        setWidgetInitialData(null);
      }
    },
    [activeWidget, onWidgetComplete]
  );

  const handleWidgetCancel = useCallback(() => {
    setActiveWidget(null);
    setWidgetInitialData(null);
    setQuery('');
    setIsOpen(false);
    setIsFocused(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    inputRef.current?.focus();
  }, [setQuery]);

  // Handle external trigger
  useEffect(() => {
    if (externalTrigger) {
      const command = { 
        id: externalTrigger.commandId,
        label: externalTrigger.commandId === 'send-transaction' ? 'Send Transaction' : externalTrigger.commandId,
        keywords: [],
        related: [],
        category: 'Transaction'
      };
      handleCommandSelect(command, externalTrigger.initialData);
      onExternalTriggerHandled?.();
    }
  }, [externalTrigger, handleCommandSelect, onExternalTriggerHandled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleCommandSelect(results[selectedIndex].item);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setQuery('');
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, selectedIndex, handleCommandSelect, setQuery]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    if (inputRef.current && measureRef.current) {
      const text = inputRef.current.value || inputRef.current.placeholder || '';
      measureRef.current.textContent = text;
      const width = measureRef.current.offsetWidth;  
      const calculatedWidth = text ? Math.max(150, width + 30) : 150;
      inputRef.current.style.width = `${calculatedWidth}px`;
    }
  }, [query]);

  const highlightMatch = (text: string, matches?: readonly FuseResultMatch[]): React.ReactNode => {
    if (!matches || matches.length === 0) {
      return text;
    }

    const allIndices: Array<{ start: number; end: number }> = [];
    matches.forEach((match) => {
      if (match.indices) {
        match.indices.forEach(([start, end]: [number, number]) => {
          allIndices.push({ start, end: end + 1 });
        });
      }
    });

    allIndices.sort((a, b) => a.start - b.start);

    const merged: Array<{ start: number; end: number }> = [];
    allIndices.forEach((indice) => {
      const last = merged[merged.length - 1];
      if (last && indice.start <= last.end) {
        last.end = Math.max(last.end, indice.end);
      } else {
        merged.push({ ...indice });
      }
    });

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    merged.forEach((indice: { start: number; end: number }) => {
      const { start, end } = indice;
      if (start > lastIndex) {
        segments.push(text.substring(lastIndex, start));
      }
      segments.push(
        <span key={start} className="command-search-highlight">
          {text.substring(start, end)}
        </span>
      );
      lastIndex = end;
    });

    if (lastIndex < text.length) {
      segments.push(text.substring(lastIndex));
    }

    return segments.length > 0 ? segments : text;
  };

  const handleSendCustomExtrinsic = useCallback(async (encodedCallHex: string) => {
    if (!sdk) {
      showErrorNotification("Connection Error", "Please connect to Virto first");
      return;
    }

    if (!isAuthenticated) {
      showErrorNotification("Authentication Error", "Please authenticate first");
      return;
    }

    setIsExtrinsicLoading(true);
    showSpinner('Sending transaction...');

    try {
      const result = await sdk.custom.submitCallAsync(
        sdk.auth.sessionSigner,
        { callDataHex: encodedCallHex }
      );

      console.log("Custom extrinsic result", result);

      if (result?.ok) {
        showSuccessNotification("Transaction Sent!", "Your custom extrinsic has been submitted successfully.");
        setShowExtrinsicEditor(false);
        setIsFocused(false);
      } else {
        const errorMsg = `Failed to send transaction: ${result?.error ? (typeof result.error === 'string' ? result.error : `Error Type: ${result.error.type}, Value Type: ${result.error.value?.type || 'Unknown'}`) : 'Unknown error'}`;
        console.warn(errorMsg);
        showErrorNotification("Transaction Error", errorMsg);
      }
    } catch (err: any) {
      console.error('Custom transaction failed:', err);
      const errorMsg = `Failed to send transaction: ${err?.message || 'Please try again'}`;
      showErrorNotification("Transaction Error", errorMsg);
    } finally {
      setIsExtrinsicLoading(false);
      hideSpinner();
    }
  }, [sdk, isAuthenticated, showSuccessNotification, showErrorNotification, showSpinner, hideSpinner]);

  const WidgetComponent = activeWidget ? getWidget(activeWidget.id) : null;

  return (
    <>
      <div className="command-search-container" ref={containerRef}>
        <div className={`prompt-section ${isFocused ? 'prompt-section-focused' : ''}`}>
          {WidgetComponent && activeWidget ? (
            <WidgetComponent
              command={activeWidget}
              onComplete={handleWidgetComplete}
              onCancel={handleWidgetCancel}
              initialData={widgetInitialData}
            />
          ) : (
            <>
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
              <div className="prompt-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  className="prompt-input"
                  placeholder="Enter blockchain query or command..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                  spellCheck="false"
                />
                <button className="prompt-search-button" type="button">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </button>
              </div>

              {results.length > 0 && (
                <div className="prompt-buttons">
                  {results.map((result, index) => {
                    const command = result.item;
                    const isSelected = index === selectedIndex;

                    return (
                      <button
                        key={command.id}
                        className={`command-search-droplet ${
                          isSelected ? 'command-search-droplet-selected' : ''
                        }`}
                        onClick={() => handleCommandSelect(command)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        {highlightMatch(command.label, result.matches)}
                      </button>
                    );
                  })}
                  <div className="command-search-extrinsic-menu-container" ref={extrinsicMenuRef}>
                    <button
                      className="command-search-extrinsic-menu-button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowExtrinsicMenu(!showExtrinsicMenu);
                      }}
                      title="Extrinsic actions"
                      type="button"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    {showExtrinsicMenu && (
                      <div className="command-search-extrinsic-dropdown-menu">
                        <button
                          className="command-search-extrinsic-menu-item"
                          onClick={() => {
                            setShowExtrinsicMenu(false);
                            setShowExtrinsicEditor(true);
                            setIsFocused(true);
                            requestAnimationFrame(() => {
                              setTimeout(() => {
                                const promptSection = containerRef.current?.querySelector('.prompt-section');
                                if (promptSection) {
                                  promptSection.scrollIntoView({ 
                                    behavior: 'smooth', 
                                    block: 'start',
                                    inline: 'nearest'
                                  });
                                }
                              }, 100);
                            });
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Custom Extrinsic
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showExtrinsicEditor && (
                <div className="command-search-extrinsic-editor">
                  <div className="command-search-extrinsic-editor-header">
                    <h3 className="command-search-extrinsic-editor-title">Create Custom Extrinsic</h3>
                    <button
                      className="command-search-extrinsic-editor-close"
                      onClick={() => {
                        setShowExtrinsicEditor(false);
                        setIsFocused(false);
                      }}
                      type="button"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  <div className="command-search-extrinsic-editor-content">
                    <Extrinsics
                      onSend={handleSendCustomExtrinsic}
                      isLoading={isExtrinsicLoading}
                      setIsLoading={setIsExtrinsicLoading}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

