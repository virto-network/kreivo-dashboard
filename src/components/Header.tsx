import React, { useState, useEffect } from 'react';
import VirtoConnect from '@/components/VirtoConnect';
import type { User } from '@/types/auth.types';
import './Header.css';

interface HeaderProps {
  onAuthSuccess?: (user: User) => void;
  onAuthError?: (error: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onAuthSuccess, onAuthError }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInitial, setUserInitial] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    const checkAuth = () => {
      try {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (isLoggedIn === 'false' || isLoggedIn === null) {
          setIsAuthenticated(false);
          setUsername('');
          setUserInitial('');
          return;
        }

        const virtoUser = localStorage.getItem('virto_connected_user');
        const lastUserId = localStorage.getItem('lastUserId');
        const userId = virtoUser || lastUserId;

        if (userId && userId.trim() !== '' && isLoggedIn === 'true') {
          setIsAuthenticated(true);
          setUsername(userId);
          const initial = userId.charAt(0).toUpperCase();
          setUserInitial(initial);
        } else {
          setIsAuthenticated(false);
          setUsername('');
          setUserInitial('');
        }
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'virto_connected_user' || e.key === 'lastUserId' || e.key === 'isLoggedIn') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const handleAuthChange = () => {
      checkAuth();
    };

    document.addEventListener('virto-auth-change', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('virto-auth-change', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    const virtoConnect = document.getElementById('virtoConnect') as any;
    const previewVirtoConnect = document.getElementById('previewVirtoConnect') as any;

    const handleLoginSuccess = (event: any) => {
      console.log('handleLoginSuccess received event:', event);
      const username = event.detail?.username || event.detail?.userId || event.detail;

      if (username) {
        const usernameStr = typeof username === 'string' ? username : String(username);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('virto_account_address', event.detail?.address);
        setIsAuthenticated(true);
        setUsername(usernameStr);
        const initial = usernameStr.charAt(0).toUpperCase();
        setUserInitial(initial);

        document.dispatchEvent(new CustomEvent('virto-auth-change'));
      }
    };

    const handleRegisterSuccess = (event: any) => {
      const username = event.detail?.username || event.detail?.userId || event.detail;

      if (username) {
        const usernameStr = typeof username === 'string' ? username : String(username);
        localStorage.setItem('isLoggedIn', 'true');
        setIsAuthenticated(true);
        setUsername(usernameStr);
        const initial = usernameStr.charAt(0).toUpperCase();
        setUserInitial(initial);

        document.dispatchEvent(new CustomEvent('virto-auth-change'));
      }
    };

    if (virtoConnect) {
      virtoConnect.addEventListener('login-success', handleLoginSuccess);
      virtoConnect.addEventListener('register-success', handleRegisterSuccess);
    }

    if (previewVirtoConnect) {
      previewVirtoConnect.addEventListener('login-success', handleLoginSuccess);
      previewVirtoConnect.addEventListener('register-success', handleRegisterSuccess);
    }

    const interval = !isAuthenticated ? setInterval(() => {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      if (isLoggedIn === 'false' || isLoggedIn === null) {
        setIsAuthenticated(false);
        return;
      }

      const virtoUser = localStorage.getItem('virto_connected_user');
      const lastUserId = localStorage.getItem('lastUserId');
      const userId = virtoUser || lastUserId;

      if (userId && userId.trim() !== '' && isLoggedIn === 'true') {
        setIsAuthenticated(true);
        setUsername(userId);
        const initial = userId.charAt(0).toUpperCase();
        setUserInitial(initial);
      }
    }, 2000) : null;

    return () => {
      if (virtoConnect) {
        virtoConnect.removeEventListener('login-success', handleLoginSuccess);
        virtoConnect.removeEventListener('register-success', handleRegisterSuccess);
      }
      if (previewVirtoConnect) {
        previewVirtoConnect.removeEventListener('login-success', handleLoginSuccess);
        previewVirtoConnect.removeEventListener('register-success', handleRegisterSuccess);
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAuthenticated]);

  const handleAuthSuccess = (user: User) => {
    console.log('handleAuthSuccess received user:', user);
    localStorage.setItem('isLoggedIn', 'true');
    setIsAuthenticated(true);
    const usernameStr = user?.profile?.name || user?.profile?.id || '';
    if (usernameStr) {
      setUsername(usernameStr);
      const initial = usernameStr.charAt(0).toUpperCase();
      setUserInitial(initial);
    }
    onAuthSuccess?.(user);
  };

  const handleAuthError = (error: string) => {
    onAuthError?.(error);
  };

  const handleLogout = () => {
    localStorage.removeItem('virto_connected_user');
    localStorage.removeItem('lastUserId');
    localStorage.setItem('isLoggedIn', 'false');

    setIsAuthenticated(false);
    setUserInitial('');
    setUsername('');
    setShowUserMenu(false);

    document.dispatchEvent(new CustomEvent('virto-auth-change'));

    const virtoConnect = document.getElementById('virtoConnect') as any;
    const previewVirtoConnect = document.getElementById('previewVirtoConnect') as any;

    if (virtoConnect && typeof virtoConnect.close === 'function') {
      virtoConnect.close();
    }
    if (previewVirtoConnect && typeof previewVirtoConnect.close === 'function') {
      previewVirtoConnect.close();
    }
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUserMenu(!showUserMenu);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.kreivo-user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  return (
    <header className="kreivo-header">
      <div className="kreivo-header-container">
        <div className="kreivo-brand">
          <h1 className="kreivo-brand-name">Kreivo</h1>
        </div>

        <div className="kreivo-header-right">
          {!isAuthenticated ? (
            <div className="kreivo-connect-wrapper">
              <VirtoConnect
                serverUrl="https://connect.virto.one/api"
                providerUrl="wss://kreivo.io"
                onAuthSuccess={handleAuthSuccess}
                onAuthError={handleAuthError}
              />
            </div>
          ) : (
            <div className="kreivo-user-menu-container">
              <div className="kreivo-user-avatar" onClick={handleAvatarClick}>
                <div className="kreivo-avatar-circle">
                  {userInitial}
                </div>
              </div>

              {showUserMenu && (
                <div className="kreivo-user-menu">
                  <div className="kreivo-user-menu-header">
                    <div className="kreivo-user-menu-avatar">
                      {userInitial}
                    </div>
                    <div className="kreivo-user-menu-info">
                      <div className="kreivo-user-menu-username">{username}</div>
                      <div className="kreivo-user-menu-label">Usuario</div>
                    </div>
                  </div>
                  <div className="kreivo-user-menu-divider"></div>
                  <button
                    className="kreivo-user-menu-item logout"
                    onClick={handleLogout}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

