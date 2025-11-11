import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WidgetProps } from './WidgetRegistry';
import { useAutoResizeInput } from '@/hooks/useAutoResizeInput';
import './Widget.css';
import './InlineSelect.css';

interface ParsedSegment {
  type: 'text' | 'community' | 'user';
  value: string;
  display: string;
  start: number;
  end: number;
}

export const AddMemberWidget: React.FC<WidgetProps> = ({
  onComplete,
  onCancel,
}) => {
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showCommunityList, setShowCommunityList] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [selectedCommunityIndex, setSelectedCommunityIndex] = useState(0);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const { inputRef, measureRef } = useAutoResizeInput(input, '#community add member @user');
  const containerRef = useRef<HTMLDivElement>(null);

  const communities = [
    { id: '1', name: 'communitypepito' },
    { id: '2', name: 'communitydev' },
    { id: '3', name: 'communitynft' },
    { id: '4', name: 'communitydefi' },
  ];

  const users = [
    { id: '1', name: 'pedrito', displayName: 'Peter' },
    { id: '2', name: 'maria', displayName: 'Maria' },
    { id: '3', name: 'juan', displayName: 'John' },
    { id: '4', name: 'ana', displayName: 'Anna' },
  ];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const parseInput = useCallback((text: string, cursorPos: number): {
    segments: ParsedSegment[];
    activeHashtag: string | null;
    activeMention: string | null;
    hashtagStart: number | null;
    mentionStart: number | null;
  } => {
    const segments: ParsedSegment[] = [];
    let activeHashtag: string | null = null;
    let activeMention: string | null = null;
    let hashtagStart: number | null = null;
    let mentionStart: number | null = null;

    const hashtagRegex = /#(\w*)/g;
    const mentionRegex = /@(\w*)/g;

    let lastIndex = 0;
    const matches: Array<{ type: 'hashtag' | 'mention'; start: number; end: number; value: string }> = [];

    let match;
    while ((match = hashtagRegex.exec(text)) !== null) {
      matches.push({
        type: 'hashtag',
        start: match.index,
        end: match.index + match[0].length,
        value: match[1],
      });
    }

    while ((match = mentionRegex.exec(text)) !== null) {
      matches.push({
        type: 'mention',
        start: match.index,
        end: match.index + match[0].length,
        value: match[1],
      });
    }

    matches.sort((a, b) => a.start - b.start);

    matches.forEach((m) => {
      if (m.start > lastIndex) {
        segments.push({
          type: 'text',
          value: text.substring(lastIndex, m.start),
          display: text.substring(lastIndex, m.start),
          start: lastIndex,
          end: m.start,
        });
      }

      segments.push({
        type: m.type === 'hashtag' ? 'community' : 'user',
        value: m.value,
        display: m.type === 'hashtag' ? `#${m.value}` : `@${m.value}`,
        start: m.start,
        end: m.end,
      });

      if (cursorPos >= m.start && cursorPos <= m.end) {
        if (m.type === 'hashtag') {
          activeHashtag = m.value;
          hashtagStart = m.start;
        } else {
          activeMention = m.value;
          mentionStart = m.start;
        }
      }

      lastIndex = m.end;
    });

    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        value: text.substring(lastIndex),
        display: text.substring(lastIndex),
        start: lastIndex,
        end: text.length,
      });
    }

    return {
      segments,
      activeHashtag,
      activeMention,
      hashtagStart,
      mentionStart,
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const newCursorPos = e.target.selectionStart || 0;
    const oldValue = input;
    
    const parsed = parseInput(newValue, newCursorPos);
    const communitySegment = parsed.segments.find((s) => s.type === 'community');
    const hasMention = parsed.segments.some((s) => s.type === 'user');
    
    if (communitySegment && !hasMention) {
      const afterCommunity = newValue.substring(communitySegment.end);
      if (!afterCommunity.trim().startsWith('add member @')) {
        const communityName = communitySegment.value;
        const hasValidCommunityName = communityName.length > 0;
        const justTypedSpace = newValue.length > oldValue.length && 
                                newValue[newCursorPos - 1] === ' ' &&
                                communitySegment.end === newCursorPos - 1 &&
                                hasValidCommunityName;
        if (justTypedSpace && hasValidCommunityName) {
          const beforeCommunity = newValue.substring(0, communitySegment.end);
          const afterCommunityText = newValue.substring(communitySegment.end + 1);
          const autoText = ' add member @';
          const finalValue = beforeCommunity + autoText + afterCommunityText;
          setInput(finalValue);
          const newPos = communitySegment.end + autoText.length;
          setCursorPosition(newPos);
          setShowUserList(true);
          setShowCommunityList(false);
          setTimeout(() => {
            inputRef.current?.setSelectionRange(newPos, newPos);
            inputRef.current?.focus();
          }, 0);
          return;
        }
      }
    }
    
    setInput(newValue);
    setCursorPosition(newCursorPos);

    setShowCommunityList(!!parsed.activeHashtag && !hasMention);
    setShowUserList(!!parsed.activeMention || (communitySegment && !hasMention && newValue.includes('add member @')) || false);
    setSelectedCommunityIndex(0);
    setSelectedUserIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showCommunityList) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedCommunityIndex((prev) =>
            prev < communities.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedCommunityIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          const parsedComm = parseInput(input, cursorPosition);
          if (parsedComm.hashtagStart !== null && communities[selectedCommunityIndex]) {
            handleCommunitySelect(communities[selectedCommunityIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowCommunityList(false);
          break;
      }
    } else if (showUserList) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedUserIndex((prev) =>
            prev < users.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedUserIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          const parsed = parseInput(input, cursorPosition);
          if (parsed.mentionStart !== null && users[selectedUserIndex]) {
            const selected = users[selectedUserIndex];
            const before = input.substring(0, parsed.mentionStart);
            const after = input.substring(parsed.mentionStart + (parsed.activeMention?.length || 0) + 1);
            const newInput = `${before}@${selected.name} ${after}`;
            setInput(newInput);
            setShowUserList(false);
            setTimeout(() => {
              const newPos = parsed.mentionStart! + selected.name.length + 2;
              inputRef.current?.setSelectionRange(newPos, newPos);
            }, 0);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowUserList(false);
          break;
      }
    } else {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && input.trim()) {
        const parsed = parseInput(input, cursorPosition);
        const community = parsed.segments.find((s) => s.type === 'community');
        const user = parsed.segments.find((s) => s.type === 'user');

        if (community && user) {
          onComplete({
            community: community.value,
            user: user.value,
            fullText: input,
          });
        }
      }
    }
  };

  const handleCommunitySelect = (community: typeof communities[0]) => {
    const parsed = parseInput(input, cursorPosition);
    if (parsed.hashtagStart !== null) {
      const before = input.substring(0, parsed.hashtagStart);
      const after = input.substring(parsed.hashtagStart + (parsed.activeHashtag?.length || 0) + 1);
      const autoText = ' add member @';
      const newInput = `${before}#${community.name}${autoText}${after}`;
      setInput(newInput);
      setShowCommunityList(false);
      setShowUserList(true);
      setTimeout(() => {
        const newPos = parsed.hashtagStart! + community.name.length + autoText.length + 1;
        inputRef.current?.setSelectionRange(newPos, newPos);
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleUserSelect = (user: typeof users[0]) => {
    const parsed = parseInput(input, cursorPosition);
    if (parsed.mentionStart !== null) {
      const before = input.substring(0, parsed.mentionStart);
      const after = input.substring(parsed.mentionStart + (parsed.activeMention?.length || 0) + 1);
      const newInput = `${before}@${user.name} ${after}`;
      setInput(newInput);
      setShowUserList(false);
      setTimeout(() => {
        const newPos = parsed.mentionStart! + user.name.length + 2;
        inputRef.current?.setSelectionRange(newPos, newPos);
        inputRef.current?.focus();
      }, 0);
    }
  };

  const parsed = parseInput(input, cursorPosition);
  const communitySegment = parsed.segments.find((s) => s.type === 'community');
  const hasMention = parsed.segments.some((s) => s.type === 'user');
  
  const filteredCommunities = parsed.activeHashtag && !hasMention
    ? communities.filter((c) =>
        c.name.toLowerCase().includes(parsed.activeHashtag!.toLowerCase())
      )
    : communities;

  const shouldShowUserList = showUserList || (communitySegment && input.includes('add member @') && !hasMention);
  const filteredUsers = (parsed.activeMention || shouldShowUserList)
    ? (parsed.activeMention
        ? users.filter((u) =>
            u.name.toLowerCase().includes(parsed.activeMention!.toLowerCase()) ||
            u.displayName.toLowerCase().includes(parsed.activeMention!.toLowerCase())
          )
        : users)
    : users;

  return (
    <div className="widget-form" ref={containerRef}>
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
        <span className="widget-prefix">Add Member:</span>
        <div className="inline-select-container">
          <input
            ref={inputRef}
            type="text"
            className="widget-input"
            placeholder="#community add member @user"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSelect={(e) => {
              setCursorPosition(e.currentTarget.selectionStart || 0);
            }}
            autoComplete="off"
          />
          {showCommunityList && !hasMention && filteredCommunities.length > 0 && (
            <div className="inline-select-dropdown">
              {filteredCommunities.map((community, index) => (
                <div
                  key={community.id}
                  className={`inline-select-item ${
                    index === selectedCommunityIndex ? 'inline-select-item-selected' : ''
                  }`}
                  onClick={() => handleCommunitySelect(community)}
                  onMouseEnter={() => setSelectedCommunityIndex(index)}
                >
                  <span className="inline-select-prefix">#</span>
                  {community.name}
                </div>
              ))}
            </div>
          )}
          {shouldShowUserList && filteredUsers.length > 0 && (
            <div className="inline-select-dropdown">
              {filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  className={`inline-select-item ${
                    index === selectedUserIndex ? 'inline-select-item-selected' : ''
                  }`}
                  onClick={() => handleUserSelect(user)}
                  onMouseEnter={() => setSelectedUserIndex(index)}
                >
                  <span className="inline-select-prefix">@</span>
                  {user.displayName} <span className="inline-select-username">({user.name})</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="widget-submit"
          onClick={() => {
            const parsed = parseInput(input, cursorPosition);
            const community = parsed.segments.find((s) => s.type === 'community');
            const user = parsed.segments.find((s) => s.type === 'user');
            if (community && user) {
              onComplete({
                community: community.value,
                user: user.value,
                fullText: input,
              });
            }
          }}
          disabled={!parsed.segments.some((s) => s.type === 'community') || !parsed.segments.some((s) => s.type === 'user')}
        >
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
    </div>
  );
};

