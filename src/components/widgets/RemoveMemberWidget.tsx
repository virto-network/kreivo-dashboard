import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WidgetProps } from './WidgetRegistry';
import { useAutoResizeInput } from '@/hooks/useAutoResizeInput';
import { chainClient$ } from '@/state/chains/chain.state';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { kreivo } from '@polkadot-api/descriptors';
import { useVirto } from '@/contexts/VirtoContext';
import { useCommunities } from '@/hooks/useCommunities';
import { ss58Decode } from '@polkadot-labs/hdkd-helpers';
import { resolveUserAddress } from '@/utils/userResolution';
import './Widget.css';
import './InlineSelect.css';

interface ParsedSegment {
  type: 'text' | 'community';
  value: string;
  display: string;
  start: number;
  end: number;
}

export const RemoveMemberWidget: React.FC<WidgetProps> = ({
  onComplete,
  onCancel,
}) => {
  const { sdk, userAddress, isAuthenticated } = useVirto();
  const { communities: communitiesData, isLoading: communitiesLoading } = useCommunities();
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showCommunityList, setShowCommunityList] = useState(false);
  const [selectedCommunityIndex, setSelectedCommunityIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { inputRef, measureRef } = useAutoResizeInput(input, '#community remove member @user');
  const containerRef = useRef<HTMLDivElement>(null);

  const communities = communitiesData.map(c => ({
    id: c.id.toString(),
    name: c.name,
  }));

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const parseInput = useCallback((text: string, cursorPos: number): {
    segments: ParsedSegment[];
    activeHashtag: string | null;
    hashtagStart: number | null;
    userAddress: string | null;
  } => {
    const segments: ParsedSegment[] = [];
    let activeHashtag: string | null = null;
    let hashtagStart: number | null = null;

    const hashtagRegex = /#(\w*)/g;

    let lastIndex = 0;
    const matches: Array<{ type: 'hashtag'; start: number; end: number; value: string }> = [];

    let match;
    while ((match = hashtagRegex.exec(text)) !== null) {
      matches.push({
        type: 'hashtag',
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
        type: 'community',
        value: m.value,
        display: `#${m.value}`,
        start: m.start,
        end: m.end,
      });

      if (cursorPos >= m.start && cursorPos <= m.end) {
        activeHashtag = m.value;
        hashtagStart = m.start;
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

    let userAddress: string | null = null;
    const memberMatch = text.match(/remove member\s+(@?\S+)/i);
    if (memberMatch) {
      userAddress = memberMatch[1].trim();
    }

    return {
      segments,
      activeHashtag,
      hashtagStart,
      userAddress,
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const newCursorPos = e.target.selectionStart || 0;
    const oldValue = input;

    const parsed = parseInput(newValue, newCursorPos);
    const communitySegment = parsed.segments.find((s) => s.type === 'community');

    if (communitySegment && !newValue.includes('remove member')) {
      const afterCommunity = newValue.substring(communitySegment.end);
      if (!afterCommunity.trim().startsWith('remove member')) {
        const communityName = communitySegment.value;
        const hasValidCommunityName = communityName.length > 0;
        const justTypedSpace = newValue.length > oldValue.length &&
          newValue[newCursorPos - 1] === ' ' &&
          communitySegment.end === newCursorPos - 1 &&
          hasValidCommunityName;
        if (justTypedSpace && hasValidCommunityName) {
          const beforeCommunity = newValue.substring(0, communitySegment.end);
          const afterCommunityText = newValue.substring(communitySegment.end + 1);
          const autoText = ' remove member ';
          const finalValue = beforeCommunity + autoText + afterCommunityText;
          setInput(finalValue);
          const newPos = communitySegment.end + autoText.length;
          setCursorPosition(newPos);
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

    setShowCommunityList(parsed.activeHashtag !== null);
    setSelectedCommunityIndex(0);
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
        case 'Tab': {
          e.preventDefault();
          const parsedComm = parseInput(input, cursorPosition);
          if (parsedComm.hashtagStart !== null && communities[selectedCommunityIndex]) {
            handleCommunitySelect(communities[selectedCommunityIndex]);
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          setShowCommunityList(false);
          break;
      }
    } else {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && input.trim() && !isSubmitting) {
        const parsed = parseInput(input, cursorPosition);
        const community = parsed.segments.find((s) => s.type === 'community');

        if (community && parsed.userAddress) {
          handleSubmitTransaction(community.value, parsed.userAddress);
        }
      }
    }
  };

  const handleSubmitTransaction = async (communityName: string, userName: string) => {
    if (!isAuthenticated) {
      setSubmitError('Please connect your wallet first.');
      return;
    }

    if (!sdk) {
      setSubmitError('VirtoConnect SDK not available.');
      return;
    }

    if (!userAddress) {
      setSubmitError('User address not available. Please reconnect your wallet.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('Removing member from community:', communityName, userName);

      const { client } = await firstValueFrom(chainClient$.pipe(take(1)));
      if (!client) {
        throw new Error('Chain client not available');
      }
      const typedApi = client.getTypedApi(kreivo);

      const community = communities.find(c => c.name.toLowerCase() === communityName.toLowerCase());
      if (!community) {
        throw new Error(`Community "${communityName}" not found`);
      }
      const communityIdNum = parseInt(community.id);

      let resolvedAddress = userName;
      if (userName.startsWith('@')) {
        try {
          console.log(`Resolving username ${userName}...`);
          resolvedAddress = await resolveUserAddress(userName);
          console.log(`Resolved ${userName} to ${resolvedAddress}`);
        } catch (resolveError: any) {
          console.error('Resolution error:', resolveError);
          setSubmitError(resolveError.message);
          setIsSubmitting(false);
          return;
        }
      }

      let membershipId: number | null = null;

      try {
        for (let itemId = 0; itemId < 100; itemId++) {
          try {
            const itemData = await typedApi.query.CommunityMemberships.Item.getValue(communityIdNum, itemId);

            if (itemData && itemData.owner) {
              const owner = itemData.owner;

              try {
                const [ownerBytes] = ss58Decode(owner);
                const [userBytes] = ss58Decode(resolvedAddress);

                const areEqual = ownerBytes.length === userBytes.length &&
                  ownerBytes.every((byte, index) =>
                    byte === userBytes[index]
                  );

                if (areEqual) {
                  membershipId = itemId;
                  console.log(`Found membership ID ${itemId} for user ${resolvedAddress} in community ${communityIdNum}`);
                  break;
                }
              } catch (decodeError) {
                console.warn(`Could not decode addresses for comparison at item ${itemId}:`, decodeError);
                if (owner === resolvedAddress) {
                  membershipId = itemId;
                  console.log(`Found membership ID ${itemId} (direct match) for user ${resolvedAddress} in community ${communityIdNum}`);
                  break;
                }
              }
            }
          } catch (e) {
            console.debug('Catching error finding membership ID:', e);
            continue;
          }
        }
      } catch (error) {
        console.error('Error finding membership ID:', error);
      }

      if (membershipId === null) {
        throw new Error(`User ${resolvedAddress} doesn't have a membership in community ${communityName}`);
      }

      const tx = typedApi.tx.Communities.remove_member({
        who: { type: "Id" as const, value: resolvedAddress },
        membership_id: membershipId,
      });

      const encodedCallHex = await tx.getEncodedData();
      const encodedCallHexString = encodedCallHex.asHex();

      console.log('Encoded Call Hex:', encodedCallHexString);
      console.log('Signing and submitting transaction...');

      const txResult = await sdk.custom.submitCallAsync(
        sdk.auth.sessionSigner,
        { callDataHex: encodedCallHexString }
      );

      console.log('Transaction result:', txResult);
      onComplete({
        community: communityName,
        user: userName,
        membershipId,
        fullText: input,
        txHash: txResult?.txHash || txResult?.hash || 'submitted',
        success: true
      });
    } catch (error: any) {
      console.error('Transaction error:', error);
      setSubmitError(error.message || 'Transaction failed');
      setIsSubmitting(false);
    }
  };

  const handleCommunitySelect = (community: typeof communities[0]) => {
    const parsed = parseInput(input, cursorPosition);
    if (parsed.hashtagStart !== null) {
      const before = input.substring(0, parsed.hashtagStart);
      const after = input.substring(parsed.hashtagStart + (parsed.activeHashtag?.length || 0) + 1);
      const autoText = ' remove member ';
      const newInput = `${before}#${community.name}${autoText}${after}`;
      setInput(newInput);
      setShowCommunityList(false);
      setTimeout(() => {
        const newPos = parsed.hashtagStart! + community.name.length + autoText.length + 1;
        inputRef.current?.setSelectionRange(newPos, newPos);
        inputRef.current?.focus();
      }, 0);
    }
  };

  const parsed = parseInput(input, cursorPosition);
  const communitySegment = parsed.segments.find((s) => s.type === 'community');

  const filteredCommunities = (parsed.activeHashtag !== null)
    ? (parsed.activeHashtag === ''
      ? communities
      : communities.filter((c) =>
        c.name.toLowerCase().includes(parsed.activeHashtag!.toLowerCase())
      ))
    : communities;

  if (communitiesLoading) {
    return (
      <div className="widget-form" ref={containerRef}>
        <div className="widget-input-wrapper">
          <span className="widget-prefix">Remove Member:</span>
          <div style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
            Loading communities...
          </div>
        </div>
      </div>
    );
  }

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
        <span className="widget-prefix">Remove Member:</span>
        <div className="inline-select-container">
          <input
            ref={inputRef}
            type="text"
            className="widget-input"
            placeholder="#community remove member @user_or_address"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSelect={(e) => {
              setCursorPosition(e.currentTarget.selectionStart || 0);
            }}
            autoComplete="off"
          />
          {showCommunityList && filteredCommunities.length > 0 && (
            <div className="inline-select-dropdown">
              {filteredCommunities.map((community, index) => (
                <div
                  key={community.id}
                  className={`inline-select-item ${index === selectedCommunityIndex ? 'inline-select-item-selected' : ''
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
        </div>
        <button
          type="button"
          className="widget-submit"
          onClick={() => {
            const parsed = parseInput(input, cursorPosition);
            const community = parsed.segments.find((s) => s.type === 'community');
            if (community && parsed.userAddress) {
              handleSubmitTransaction(community.value, parsed.userAddress);
            }
          }}
          disabled={!communitySegment || !parsed.userAddress || isSubmitting}
        >
          {isSubmitting ? (
            <svg className="spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </button>
        <button type="button" className="widget-cancel" onClick={onCancel} disabled={isSubmitting}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      {submitError && (
        <div className="widget-error" style={{ marginTop: '8px', color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>
          {submitError}
        </div>
      )}
    </div>
  );
};

