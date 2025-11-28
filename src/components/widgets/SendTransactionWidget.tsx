import React, { useState, useRef, useEffect } from 'react';
import { WidgetProps } from './WidgetRegistry';
import { chainClient$ } from '@/state/chains/chain.state';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { kreivo } from '@polkadot-api/descriptors';
import { useVirto } from '@/contexts/VirtoContext';
import { resolveUserAddress } from '@/utils/userResolution';
import './Widget.css';
import './InlineSelect.css';

export const SendTransactionWidget: React.FC<WidgetProps> = ({
  onComplete,
  onCancel,
  initialData,
}) => {
  const { sdk, userAddress, isAuthenticated } = useVirto();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(initialData?.asset || null);
  const [assetSearch, setAssetSearch] = useState('');
  const [step, setStep] = useState<'address' | 'asset' | 'amount'>(
    initialData?.asset ? 'address' : 'address'
  );
  const [showAssetList, setShowAssetList] = useState(false);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const assets = [
    { id: '1', symbol: 'KSM', name: 'Kusama' },
    { id: '2', symbol: 'DUSD', name: 'Decent USD' },
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

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setAddress(newValue);
  };

  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      let resolvedAddress = address.trim();
      if (address.trim().startsWith('@')) {
        try {
          console.log(`Resolving username ${address.trim()}...`);
          resolvedAddress = await resolveUserAddress(address.trim());
          console.log(`Resolved ${address.trim()} to ${resolvedAddress}`);

          setAddress(resolvedAddress);
        } catch (resolveError: any) {
          console.error('Resolution error:', resolveError);
          return;
        }
      }
      if (selectedAsset) {
        setStep('amount');
      } else {
        setStep('asset');
      }
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

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim() || !address.trim() || !selectedAsset || isSubmitting) {
      return;
    }

    if (!isAuthenticated) {
      setSubmitError('Please connect your wallet first.');
      return;
    }

    if (!sdk) {
      setSubmitError('Wallet SDK not initialized. Please try reconnecting.');
      return;
    }

    if (!userAddress) {
      setSubmitError('User address not available. Please try reconnecting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);


    console.log('sdk:', sdk);
    try {
      console.log('Sender address:', userAddress);
      console.log('Recipient address:', address.trim());
      console.log('Amount:', amount.trim());
      console.log('Asset:', selectedAsset);

      const { client } = await firstValueFrom(chainClient$.pipe(take(1)));
      if (!client) {
        throw new Error('Chain client not available');
      }

      const typedApi = client.getTypedApi(kreivo);

      let amountValue: number;
      if (selectedAsset === 'KSM') {
        const amountFloat = parseFloat(amount.trim());
        if (isNaN(amountFloat) || amountFloat <= 0) {
          throw new Error('Invalid amount');
        }
        amountValue = Math.floor(amountFloat * 1e12);
        console.log('KSM amount (raw):', amountValue);
      } else if (selectedAsset === 'DUSD') {
        const amountFloat = parseFloat(amount.trim());
        if (isNaN(amountFloat) || amountFloat <= 0) {
          throw new Error('Invalid amount');
        }
        amountValue = Math.floor(amountFloat * 1e2);
        console.log('DUSD amount (raw):', amountValue);
      } else {
        throw new Error('Unsupported asset');
      }

      let tx;
      const recipientAddress = { type: "Id" as const, value: address.trim() };

      if (selectedAsset === 'KSM') {
        tx = typedApi.tx.Balances.transfer_keep_alive({
          dest: recipientAddress,
          value: BigInt(amountValue),
        });
        console.log('Created KSM transfer transaction');
      } else if (selectedAsset === 'DUSD') {
        const assetId = { type: "Sibling" as const, value: { id: 1000, pallet: 50, index: 50000002 } };
        tx = typedApi.tx.Assets.transfer_keep_alive({
          id: assetId,
          target: recipientAddress,
          amount: BigInt(amountValue),
        });
        console.log('Created DUSD transfer transaction');
      }

      if (!tx) {
        throw new Error('Failed to create transaction');
      }

      console.log('Transaction created, encoding call data...');

      const encodedCallHex = await tx.getEncodedData();
      const encodedCallHexString = encodedCallHex.asHex();

      console.log('Encoded call data (hex):', encodedCallHexString);

      if (!sdk.auth?.sessionSigner) {
        throw new Error('Session signer not available. Please try reconnecting your wallet.');
      }

      console.log('Signing and submitting transaction with VirtoConnect...');

      const result = await sdk.custom.submitCallAsync(
        sdk.auth.sessionSigner,
        { callDataHex: encodedCallHexString }
      );

      console.log('Transaction result:', result);

      onComplete({
        address: address.trim(),
        amount: amount.trim(),
        asset: selectedAsset,
        txHash: typeof result?.txHash === 'string' ? result.txHash :
          typeof result?.hash === 'string' ? result.hash :
            'submitted',
        success: true
      });

    } catch (error: any) {
      console.error('Transaction error:', error);
      setSubmitError(error.message || 'Transaction failed');
      setIsSubmitting(false);

      setTimeout(() => {
        setSubmitError(null);
      }, 5000);
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
                autoComplete="off"
              />
            </div>
            <button type="submit" className="widget-submit" disabled={!address.trim()}>
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
                      className={`inline-select-item ${index === selectedAssetIndex ? 'inline-select-item-selected' : ''
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
          disabled={isSubmitting}
        />
        <button
          type="submit"
          className="widget-submit"
          disabled={!amount.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </button>
        <button
          type="button"
          className="widget-cancel"
          onClick={() => {
            setStep('asset');
            setAmount('');
          }}
          disabled={isSubmitting}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
      {submitError && (
        <div style={{
          color: '#ff6b6b',
          fontSize: '0.85rem',
          marginTop: '8px',
          padding: '8px',
          background: 'rgba(255, 107, 107, 0.1)',
          borderRadius: '4px'
        }}>
          {submitError}
        </div>
      )}
      {isSubmitting && (
        <div style={{
          color: 'rgba(222, 208, 241, 0.7)',
          fontSize: '0.85rem',
          marginTop: '8px',
          padding: '8px',
          textAlign: 'center'
        }}>
          Signing and submitting transaction...
        </div>
      )}
    </form>
  );
};

