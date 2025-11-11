import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WidgetProps } from './WidgetRegistry';
import './Widget.css';
import './InlineSelect.css';

export const SendTransactionWidget: React.FC<WidgetProps> = ({
  onComplete,
  onCancel,
}) => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [assetSearch, setAssetSearch] = useState('');
  const [step, setStep] = useState<'address' | 'asset' | 'amount'>('address');
  const [showUserList, setShowUserList] = useState(false);
  const [showAssetList, setShowAssetList] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const addressRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const users = [
    { id: '1', name: 'alice', displayName: 'Alice' },
    { id: '2', name: 'bob', displayName: 'Bob' },
    { id: '3', name: 'charlie', displayName: 'Charlie' },
    { id: '4', name: 'diana', displayName: 'Diana' },
  ];

  const assets = [
    { id: '1', symbol: 'KSM', name: 'Kusama' },
  ];

  useEffect(() => {
    if (step === 'address') {
      addressRef.current?.focus();
    } else if (step === 'asset') {
      assetInputRef.current?.focus();
      setShowAssetList(true);
    } else {
      amountRef.current?.focus();
    }
  }, [step]);

  const parseInput = useCallback((text: string, cursorPos: number): {
    activeMention: string | null;
    mentionStart: number | null;
  } => {
    let activeMention: string | null = null;
    let mentionStart: number | null = null;

    const mentionRegex = /@(\w*)/g;
    let match;
    let lastMatch: RegExpExecArray | null = null;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index <= cursorPos && match.index + match[0].length >= cursorPos) {
        lastMatch = match;
      }
    }

    if (lastMatch) {
      mentionStart = lastMatch.index;
      activeMention = lastMatch[1];
    }

    return { activeMention, mentionStart };
  }, []);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setAddress(newValue);
    setCursorPosition(e.target.selectionStart || 0);

    const parsed = parseInput(newValue, e.target.selectionStart || 0);
    setShowUserList(!!parsed.activeMention);
  };

  const parsed = parseInput(address, cursorPosition);
  const filteredUsers = parsed.activeMention
    ? users.filter((u) =>
        u.name.toLowerCase().includes(parsed.activeMention!.toLowerCase()) ||
        u.displayName.toLowerCase().includes(parsed.activeMention!.toLowerCase())
      )
    : users;

  const handleUserSelect = (user: typeof users[0]) => {
    const parsed = parseInput(address, cursorPosition);
    if (parsed.mentionStart !== null) {
      const before = address.substring(0, parsed.mentionStart);
      const after = address.substring(cursorPosition);
      const newAddress = `${before}@${user.name}${after}`;
      setAddress(newAddress);
      setShowUserList(false);
      setTimeout(() => {
        const newCursorPos = parsed.mentionStart! + 1 + user.name.length;
        addressRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }, 0);
    }
  };

  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showUserList && filteredUsers.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedUserIndex((prev) =>
            prev < filteredUsers.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedUserIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          if (filteredUsers[selectedUserIndex]) {
            e.preventDefault();
            handleUserSelect(filteredUsers[selectedUserIndex]);
          }
          break;
        case 'Escape':
          setShowUserList(false);
          break;
      }
    } else {
      if (e.key === 'Escape') {
        onCancel();
      }
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim() && !showUserList) {
      setStep('asset');
    }
  };

  const handleAssetSelect = (asset: typeof assets[0]) => {
    setSelectedAsset(asset.symbol);
    setAssetSearch('');
    setShowAssetList(false);
    setTimeout(() => {
      setStep('amount');
    }, 100);
  };

  const handleAssetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAssetList && filteredAssets.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedAssetIndex((prev) =>
            prev < filteredAssets.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedAssetIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          if (filteredAssets[selectedAssetIndex]) {
            e.preventDefault();
            handleAssetSelect(filteredAssets[selectedAssetIndex]);
          }
          break;
        case 'Escape':
          setShowAssetList(false);
          setStep('address');
          break;
      }
    } else {
      if (e.key === 'Escape') {
        setStep('address');
      }
    }
  };

  const handleAssetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAssetSearch(value);
    setShowAssetList(true);
    setSelectedAssetIndex(0);
  };

  const filteredAssets = assetSearch
    ? assets.filter((asset) =>
        asset.symbol.toLowerCase().includes(assetSearch.toLowerCase()) ||
        asset.name.toLowerCase().includes(assetSearch.toLowerCase())
      )
    : assets;

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount.trim() && address.trim() && selectedAsset) {
      onComplete({ 
        address: address.trim(), 
        amount: amount.trim(),
        asset: selectedAsset
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (step === 'amount') {
        setStep('asset');
        setAmount('');
      } else if (step === 'asset') {
        setStep('address');
        setSelectedAsset(null);
      } else {
        onCancel();
      }
    }
  };

  useEffect(() => {
    setSelectedUserIndex(0);
  }, [filteredUsers]);

  useEffect(() => {
    setSelectedAssetIndex(0);
  }, [filteredAssets]);

  if (step === 'address') {
    return (
      <div className="widget-form" ref={containerRef}>
        <form onSubmit={handleAddressSubmit}>
          <div className="widget-input-wrapper">
            <span className="widget-prefix">Send to:</span>
            <div className="inline-select-container">
              <input
                ref={addressRef}
                type="text"
                className="widget-input"
                placeholder="Enter recipient address or @user..."
                value={address}
                onChange={handleAddressChange}
                onKeyDown={handleAddressKeyDown}
                onSelect={(e) => {
                  setCursorPosition(e.currentTarget.selectionStart || 0);
                }}
                autoComplete="off"
              />
              {showUserList && filteredUsers.length > 0 && (
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
            <button type="submit" className="widget-submit" disabled={!address.trim() || showUserList}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
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
      </div>
    );
  }

  if (step === 'asset') {
    return (
      <div className="widget-form" ref={containerRef}>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (filteredAssets[selectedAssetIndex]) {
            handleAssetSelect(filteredAssets[selectedAssetIndex]);
          }
        }}>
          <div className="widget-input-wrapper">
            <span className="widget-prefix">Asset:</span>
            <div className="inline-select-container">
              <input
                ref={assetInputRef}
                type="text"
                className="widget-input"
                placeholder="Select asset (KSM, kUSD)..."
                value={assetSearch}
                onChange={handleAssetInputChange}
                onKeyDown={handleAssetKeyDown}
                onFocus={() => setShowAssetList(true)}
                autoComplete="off"
              />
              {showAssetList && filteredAssets.length > 0 && (
                <div className="inline-select-dropdown">
                  {filteredAssets.map((asset, index) => (
                    <div
                      key={asset.id}
                      className={`inline-select-item ${
                        index === selectedAssetIndex ? 'inline-select-item-selected' : ''
                      }`}
                      onClick={() => handleAssetSelect(asset)}
                      onMouseEnter={() => setSelectedAssetIndex(index)}
                    >
                      <span className="inline-select-prefix">{asset.symbol}</span>
                      {asset.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              type="submit" 
              className="widget-submit" 
              disabled={!filteredAssets[selectedAssetIndex]}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            <button
              type="button"
              className="widget-cancel"
              onClick={() => {
                setStep('address');
                setSelectedAsset(null);
                setAssetSearch('');
                setShowAssetList(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form className="widget-form" onSubmit={handleAmountSubmit}>
      <div className="widget-input-wrapper">
        <span className="widget-prefix">Amount ({selectedAsset}):</span>
        <input
          ref={amountRef}
          type="text"
          className="widget-input"
          placeholder="Enter amount..."
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button type="submit" className="widget-submit" disabled={!amount.trim()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button
          type="button"
          className="widget-cancel"
          onClick={() => {
            setStep('asset');
            setAmount('');
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
    </form>
  );
};

