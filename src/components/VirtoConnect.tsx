import React, { useEffect, useRef } from 'react';
import type { VirtoConnectProps } from '@/types/auth.types';



const VirtoConnect: React.FC<VirtoConnectProps> = ({
  serverUrl = 'https://demo.virto.one/api',
  providerUrl = 'wss://testnet.kreivo.kippu.rocks',
  onAuthSuccess,
  onAuthError,
}) => {
  const virtoConnectRef = useRef<HTMLElement>(null);
  const connectButtonRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.async = true;
    script.src = '/virto-connect.js';
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
    }
    };
  }, []);

  useEffect(() => {
    const virtoConnect = virtoConnectRef.current;
    const connectButton = connectButtonRef.current;

    if (!virtoConnect || !connectButton) return;

    const handleConnectClick = () => {
      if (virtoConnect && typeof (virtoConnect as any).open === 'function') {
        (virtoConnect as any).open();
      }
    };

    const handleAuthSuccess = (event: any) => {
      if (onAuthSuccess && event.detail) {
        onAuthSuccess(event.detail);
      }
    };

    const handleAuthError = (event: any) => {
      if (onAuthError && event.detail) {
        onAuthError(event.detail.message || 'Authentication failed');
      }
    };

    connectButton.addEventListener('click', handleConnectClick);
    virtoConnect.addEventListener('auth-error', handleAuthError);
    virtoConnect.addEventListener('login-success', handleAuthSuccess);
    virtoConnect.addEventListener('login-error', handleAuthError);
    virtoConnect.addEventListener('register-error', handleAuthError);

    return () => {
      connectButton.removeEventListener('click', handleConnectClick);
      virtoConnect.removeEventListener('auth-error', handleAuthError);
      virtoConnect.removeEventListener('login-success', handleAuthSuccess);
      virtoConnect.removeEventListener('login-error', handleAuthError);
      virtoConnect.removeEventListener('register-error', handleAuthError);
    };
  }, [onAuthSuccess, onAuthError]);

  return (
    <>
      {React.createElement('virto-button', {
        ref: connectButtonRef,
        id: "connect-button",
        label: "Connect to Virto"
      })}
      
      {React.createElement('virto-connect', {
        ref: virtoConnectRef,
        id: "virtoConnect",
        server: serverUrl,
        'provider-url': providerUrl
      })}
    </>
  );
};

export default VirtoConnect; 