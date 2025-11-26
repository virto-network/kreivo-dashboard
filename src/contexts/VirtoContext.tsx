import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface VirtoContextType {
  sdk: any | null;
  userAddress: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setSdk: (sdk: any) => void;
  setUserAddress: (address: string | null) => void;
  setUserId: (id: string | null) => void;
  setIsAuthenticated: (authenticated: boolean) => void;
  logout: () => void;
}

const VirtoContext = createContext<VirtoContextType | undefined>(undefined);

export const VirtoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sdk, setSdkState] = useState<any | null>(null);
  const [userAddress, setUserAddressState] = useState<string | null>(() => {
    return localStorage.getItem('virto_account_address');
  });
  const [userId, setUserIdState] = useState<string | null>(() => {
    return localStorage.getItem('lastUserId') || localStorage.getItem('virto_connected_user');
  });
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const setSdk = useCallback((newSdk: any) => {
    console.log('VirtoContext: Setting SDK');
    console.log('SDK has auth?', !!newSdk?.auth);
    console.log('SDK has custom?', !!newSdk?.custom);
    console.log('SDK has transfer?', !!newSdk?.transfer);

    setSdkState(newSdk);
    setIsInitialized(true);

    (window as any).virtoSdk = newSdk;

    console.log('VirtoContext: SDK saved successfully');
  }, []);

  const setUserAddress = useCallback((address: string | null) => {
    console.log('VirtoContext: Setting user address', address);
    setUserAddressState(address);
    if (address) {
      localStorage.setItem('virto_account_address', address);
    } else {
      localStorage.removeItem('virto_account_address');
    }
  }, []);

  const setUserId = useCallback((id: string | null) => {
    console.log('VirtoContext: Setting user ID', id);
    setUserIdState(id);
    if (id) {
      localStorage.setItem('lastUserId', id);
    } else {
      localStorage.removeItem('lastUserId');
    }
  }, []);

  const setIsAuthenticated = useCallback((authenticated: boolean) => {
    console.log('VirtoContext: Setting authenticated', authenticated);
    setIsAuthenticatedState(authenticated);
    localStorage.setItem('isLoggedIn', authenticated ? 'true' : 'false');
  }, []);

  const logout = useCallback(() => {
    console.log('VirtoContext: Logging out');
    setUserAddressState(null);
    setUserIdState(null);
    setIsAuthenticatedState(false);
    localStorage.removeItem('virto_account_address');
    localStorage.removeItem('lastUserId');
    localStorage.removeItem('virto_connected_user');
    localStorage.setItem('isLoggedIn', 'false');
    document.dispatchEvent(new CustomEvent('virto-auth-change'));
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'virto_account_address' && e.newValue) {
        setUserAddressState(e.newValue);
      }
      if (e.key === 'lastUserId' && e.newValue) {
        setUserIdState(e.newValue);
      }
      if (e.key === 'isLoggedIn') {
        setIsAuthenticatedState(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const handleAuthChange = () => {
      const storedAddress = localStorage.getItem('virto_account_address');
      const storedUserId = localStorage.getItem('lastUserId') || localStorage.getItem('virto_connected_user');
      const storedAuth = localStorage.getItem('isLoggedIn') === 'true';

      if (storedAddress) setUserAddressState(storedAddress);
      if (storedUserId) setUserIdState(storedUserId);
      setIsAuthenticatedState(storedAuth);
    };

    document.addEventListener('virto-auth-change', handleAuthChange);
    return () => document.removeEventListener('virto-auth-change', handleAuthChange);
  }, []);

  useEffect(() => {
    const attemptRestore = () => {
      const virtoConnect = document.getElementById('virtoConnect') as any;
      const previewVirtoConnect = document.getElementById('previewVirtoConnect') as any;

      const element = virtoConnect || previewVirtoConnect;

      if (element?.sdk) {
        console.log('VirtoContext: Found SDK on element, restoring...');
        setSdk(element.sdk);
        return true;
      }
      return false;
    };

    if (!sdk) {
      attemptRestore();
    }
    const interval = setInterval(() => {
      if (!sdk) {
        attemptRestore();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sdk, setSdk]);

  useEffect(() => {
    const fetchUserAddress = async () => {
      if (sdk && userId && !userAddress && isAuthenticated) {
        try {
          console.log('VirtoContext: Fetching user address for userId:', userId);
          const userInfo = await sdk.transfer.getUserInfo(userId);
          if (userInfo?.address) {
            setUserAddress(userInfo.address);
          }
        } catch (error) {
          console.error('VirtoContext: Error fetching user address:', error);
        }
      }
    };

    fetchUserAddress();
  }, [sdk, userId, userAddress, isAuthenticated, setUserAddress]);

  const value: VirtoContextType = {
    sdk,
    userAddress,
    userId,
    isAuthenticated,
    isInitialized,
    setSdk,
    setUserAddress,
    setUserId,
    setIsAuthenticated,
    logout,
  };

  return <VirtoContext.Provider value={value}>{children}</VirtoContext.Provider>;
};

export const useVirto = () => {
  const context = useContext(VirtoContext);
  if (context === undefined) {
    throw new Error('useVirto must be used within a VirtoProvider');
  }
  return context;
};

