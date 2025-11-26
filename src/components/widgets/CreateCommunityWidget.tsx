import React, { useState, useEffect } from 'react';
import { WidgetProps } from './WidgetRegistry';
import { useAutoResizeInput } from '@/hooks/useAutoResizeInput';
import { chainClient$ } from '@/state/chains/chain.state';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { kreivo } from '@polkadot-api/descriptors';
import { useVirto } from '@/contexts/VirtoContext';
import { Binary } from '@polkadot-api/substrate-bindings';
import './Widget.css';

export const CreateCommunityWidget: React.FC<WidgetProps> = ({
  onComplete,
  onCancel,
}) => {
  const { sdk, userAddress, isAuthenticated } = useVirto();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { inputRef, measureRef } = useAutoResizeInput(name, 'Enter community name...');

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError('Please enter a community name');
      return;
    }

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
      console.log('Creating community:', name.trim());

      const { client } = await firstValueFrom(chainClient$.pipe(take(1)));
      if (!client) {
        throw new Error('Chain client not available');
      }
      const typedApi = client.getTypedApi(kreivo);

      const nameBytes = Binary.fromText(name.trim());

      const bytes = new TextEncoder().encode(name.trim());
      const nameBytesIdentifies = bytes.reduce((acc, byte) => acc + byte, 0);

      const tx = typedApi.tx.CommunitiesManager.register({
        community_id: nameBytesIdentifies,
        name: nameBytes,
        first_admin: { type: "Id" as const, value: userAddress },
        maybe_decision_method: { type: "Membership" as const, value: undefined },
        maybe_track_info: undefined,
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
        name: name.trim(),
        txHash: txResult?.txHash || txResult?.hash || 'submitted',
        success: true
      });
    } catch (error: any) {
      console.error('Transaction error:', error);
      setSubmitError(error.message || 'Transaction failed');
    } finally {
      setIsSubmitting(false);
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
          disabled={isSubmitting}
        />
        <button type="submit" className="widget-submit" disabled={!name.trim() || isSubmitting}>
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
    </form>
  );
};

