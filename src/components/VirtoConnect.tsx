import React, { useEffect, useRef } from 'react';
import type { VirtoConnectProps } from '@/types/auth.types';
import { useVirto } from '@/contexts/VirtoContext';



const VirtoConnect: React.FC<VirtoConnectProps> = ({
  serverUrl = 'https://connect.virto.one/api',
  providerUrl = 'wss://kreivo.io',
  onAuthSuccess,
  onAuthError,
}) => {
  const virtoConnectRef = useRef<HTMLElement>(null);
  const connectButtonRef = useRef<HTMLElement>(null);
  const { setSdk, setUserAddress, setUserId, setIsAuthenticated } = useVirto();

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
    if (!virtoConnect) return;

    let checkCount = 0;
    const maxChecks = 40;

    const checkForSdk = setInterval(() => {
      checkCount++;
      const virtoElement = virtoConnect as any;

      if (virtoElement.sdk) {
        console.log('VirtoConnect: SDK found, checking initialization...');
        console.log('SDK auth:', virtoElement.sdk.auth);
        console.log('SDK custom:', virtoElement.sdk.custom);

        setSdk(virtoElement.sdk);

        (window as any).virtoSdkDirect = virtoElement.sdk;

        clearInterval(checkForSdk);
        console.log('VirtoConnect: SDK saved to context successfully');
      } else if (checkCount >= maxChecks) {
        console.warn('VirtoConnect: SDK not found after 20 seconds');
        clearInterval(checkForSdk);
      }
    }, 500);

    const virtoElement = virtoConnect as any;
    if (virtoElement.sdk) {
      console.log('VirtoConnect: SDK already available immediately');
      setSdk(virtoElement.sdk);
      (window as any).virtoSdkDirect = virtoElement.sdk;
      clearInterval(checkForSdk);
    }

    return () => clearInterval(checkForSdk);
  }, [setSdk]);

  useEffect(() => {
    const virtoConnect = virtoConnectRef.current;
    const connectButton = connectButtonRef.current;

    if (!virtoConnect || !connectButton) return;

    const handleConnectClick = () => {
      if (virtoConnect && typeof (virtoConnect as any).open === 'function') {
        (virtoConnect as any).open();
      }
    };

    const handleAuthSuccess = async (event: any) => {
      if (event.detail) {
        console.log('VirtoConnect: Login success event received');

        const virtoElement = virtoConnect as any;

        await new Promise(resolve => setTimeout(resolve, 500));

        if (virtoElement.sdk) {
          console.log('VirtoConnect: Updating SDK in context after login');
          console.log('SDK auth after login:', virtoElement.sdk.auth);

          setSdk(virtoElement.sdk);
          (window as any).virtoSdkDirect = virtoElement.sdk;

          const userId = virtoElement.sdk.auth?.passkeysAuthenticator?.userId;
          if (userId) {
            setUserId(userId);

            try {
              const userInfo = await virtoElement.sdk.transfer.getUserInfo(userId);
              if (userInfo?.address) {
                setUserAddress(userInfo.address);
                console.log('User address set:', userInfo.address);
              }
            } catch (error) {
              console.error('Error getting user address:', error);
            }
          } else {
            console.warn('No userId found after login');
          }
        } else {
          console.error('SDK not found after login');
        }

        setIsAuthenticated(true);

        if (onAuthSuccess) {
          onAuthSuccess(event.detail);
        }
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