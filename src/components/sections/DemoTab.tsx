import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import VirtoConnect from '@/components/VirtoConnect';
import FaucetIframe from '@/components/FaucetIframe';
import type { User } from '@/types/auth.types';
import { Extrinsics } from '@/pages/Extrinsics';
import NotificationContainer from '@/components/NotificationContainer';
import { useNotification } from '@/hooks/useNotification';
import Spinner from '@/components/Spinner';
import { useSpinner } from '@/hooks/useSpinner';

interface DemoTabProps {
  onAuthSuccess: (user: User) => void;
  onAuthError: (error: string) => void;
}

type ActionType = 'transfer-balance' | 'sign-extrinsic' | 'transfer' | 'create-extrinsic' | null;

interface UserSession {
  username: string;
  address?: string;
  sdk?: any;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const DemoTab: React.FC<DemoTabProps> = ({ onAuthSuccess, onAuthError }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAction, setCurrentAction] = useState<ActionType>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [balance, setBalance] = useState<string>('Loading...');
  const [userAddress, setUserAddress] = useState<string>('Not connected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [connectionMessage, setConnectionMessage] = useState<string>('Initializing connection...');
  const [lastError, setLastError] = useState<string>('');

  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [billPeriod, setBillPeriod] = useState('');

  const { notifications, showSuccessNotification, showErrorNotification, removeNotification } = useNotification();
  const { isSpinnerVisible, spinnerText, showSpinner, hideSpinner } = useSpinner();

  useEffect(() => {
    if (customElements.get('virto-input') && customElements.get('virto-button')) {
      console.log('Web components already loaded');
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.innerHTML = `
      import("https://cdn.jsdelivr.net/npm/virto-components@0.1.11/dist/virto-components.min.js")
        .then(() => {
          console.log('Virto components loaded successfully');
        })
        .catch(err => {
          console.error('Failed to load virto components:', err);
        });
    `;
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    const virtoConnect = document.getElementById('virtoConnect') as any;
    
    if (!virtoConnect) return;

    const handleRegisterStart = () => showSpinner('Registering...');
    const handleLoginStart = () => showSpinner('Logging in...');
    const handleRegisterError = () => hideSpinner();
    const handleLoginError = (event: CustomEvent) => {
      hideSpinner();
      
      // Check if the error is the specific payment error that indicates need for faucet
      const error = event.detail?.error;
      console.log('Login error received:', error);
      
      if (error) {
        // Convert error to string to check for the specific error pattern
        const errorString = error.toString ? error.toString() : JSON.stringify(error);
        
        // Check for InvalidTxError with Payment type
        const isPaymentError = errorString.includes('InvalidTxError') && 
                              errorString.includes('"type": "Invalid"') && 
                              errorString.includes('"type": "Payment"');
        
        if (isPaymentError) {
          console.log('Payment error detected, showing faucet again');
          
          // Get the username from the login form
          const usernameInput = virtoConnect.shadowRoot?.querySelector('virto-input[name="username"]');
          const username = usernameInput?.value || '';
          
          if (username) {
            // Show the faucet confirmation again
            virtoConnect.showFaucetConfirmation(username);
          }
        }
      }
    };
    const handleRegisterSuccess = () => hideSpinner();
    const handleLoginSuccess = () => hideSpinner();
    
    const handleFaucetIframeReady = (event: CustomEvent) => {
      console.log('Faucet iframe ready:', event.detail);
      const { username, address, virtoConnectElement } = event.detail;
      
      // Get the container where we'll render the React component
      const container = virtoConnectElement.getFaucetContainer();
      if (!container) {
        console.error('Faucet container not found');
        return;
      }

      // Create React root and render the FaucetIframe component
      const root = ReactDOM.createRoot(container);
      
      const handleAccept = async () => {
        try {
          // Call the faucet method using the SDK
          const sdk = virtoConnect.sdk;
          if (!sdk) {
            throw new Error('SDK not available');
          }
          
          console.log('Calling addMember for user:', username);
          const faucetResult = await sdk.auth.addMember(username);
          console.log('Faucet successful:', faucetResult);
          
          showSuccessNotification("Welcome Bonus Processed!", "Your $100 welcome bonus has been successfully processed.");
          
          // Complete the flow after a short delay
          setTimeout(() => {
            root.unmount();
            virtoConnectElement.completeFaucetFlowFromParent(true, faucetResult);
          }, 1500);
          
          return { success: true };
          
        } catch (error) {
          console.error('Faucet failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to process welcome bonus';
          showErrorNotification("Welcome Bonus Failed", errorMessage);
          return { success: false, error: errorMessage };
        }
      };

      const handleDecline = () => {
        console.log('Faucet declined');
        root.unmount();
        virtoConnectElement.completeFaucetFlowFromParent(false);
      };

      // Render the FaucetIframe component
      root.render(
        <FaucetIframe
          username={username}
          address={address}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      );

      // Store the cleanup function
      virtoConnectElement.faucetCleanup = () => {
        root.unmount();
      };
    };

    virtoConnect.addEventListener('register-start', handleRegisterStart);
    virtoConnect.addEventListener('login-start', handleLoginStart);
    virtoConnect.addEventListener('register-error', handleRegisterError);
    virtoConnect.addEventListener('login-error', handleLoginError);
    virtoConnect.addEventListener('register-success', handleRegisterSuccess);
    virtoConnect.addEventListener('login-success', handleLoginSuccess);
    virtoConnect.addEventListener('faucet-iframe-ready', handleFaucetIframeReady);

    return () => {
      virtoConnect.removeEventListener('register-start', handleRegisterStart);
      virtoConnect.removeEventListener('login-start', handleLoginStart);
      virtoConnect.removeEventListener('register-error', handleRegisterError);
      virtoConnect.removeEventListener('login-error', handleLoginError);
      virtoConnect.removeEventListener('register-success', handleRegisterSuccess);
      virtoConnect.removeEventListener('login-success', handleLoginSuccess);
      virtoConnect.removeEventListener('faucet-iframe-ready', handleFaucetIframeReady);
      
      // Cleanup faucet listener if it exists
      if (virtoConnect.faucetCleanup) {
        virtoConnect.faucetCleanup();
      }
    };
  }, [showSpinner, hideSpinner, showSuccessNotification, showErrorNotification]);

  // Listen for connection status changes
  useEffect(() => {
    const handleProviderStatusChange = (event: CustomEvent) => {
      const status = event.detail;
      
      switch (status.type) {
        case 0: // CONNECTING
          setConnectionStatus('connecting');
          setConnectionMessage(`Connecting to ${status.uri}...`);
          break;
        case 1: // CONNECTED
          setConnectionStatus('connected');
          setConnectionMessage(`Connected to ${status.uri}`);
          break;
        case 2: // ERROR
          setConnectionStatus('error');
          let errorMessage = 'Unknown error';
          
          if (status.event) {
            if (status.event.type === 'timeout') {
              errorMessage = 'Connection timeout';
            } else if (status.event.message) {
              errorMessage = status.event.message;
            } else if (typeof status.event === 'string') {
              errorMessage = status.event;
            } 
          } else if (status.uri) {
            errorMessage = `Failed to connect to ${status.uri}`;
          }
          
          setLastError(errorMessage);
          setConnectionMessage(`Connection error: ${errorMessage}`);
          break;
        case 3: // CLOSE
          setConnectionStatus('disconnected');
          setConnectionMessage('Connection closed');
          break;
        default:
          setConnectionStatus('disconnected');
          setConnectionMessage('Disconnected');
      }
    };

    document.addEventListener('providerStatusChange', handleProviderStatusChange as EventListener);

    return () => {
      document.removeEventListener('providerStatusChange', handleProviderStatusChange as EventListener);
    };
  }, []);

  const handleAuthSuccess = (event: any) => {
    const username = event.username;
    const address = event.address;

    console.log('Login successful:', { username, address });

    const virtoConnect = document.getElementById('virtoConnect') as any;

    setUserSession({
      username,
      address,
      sdk: virtoConnect?.sdk
    });
    virtoConnect?.close();

    setIsAuthenticated(true);
    setCurrentAction(null);

    if (virtoConnect?.sdk) {
      loadBalance(virtoConnect.sdk);
    }

    showSuccessNotification("Welcome back!", "You're now connected to Virto. Choose an action below to get started.");

    const user = {
      profile: {
        id: username,
        name: username,
        displayName: username
      },
      metadata: {}
    };
    onAuthSuccess(user);
  };

  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
    setError(error);
    showErrorNotification("Authentication Error", error);
    onAuthError(error);
  };

  const loadBalance = async (sdk: any) => {
    if (!sdk || !userSession) return;

    try {
      setBalance('Loading...');
      console.log(sdk.auth.passkeysAuthenticator.userId)
      const {address} = await sdk.transfer.getUserInfo(sdk.auth.passkeysAuthenticator.userId);
      const balanceData = await sdk.transfer.getBalanceByUsername(sdk.auth.passkeysAuthenticator.userId);
      const balanceFormatted = sdk.transfer.formatAmount(balanceData.transferable, 10);
      console.log("balanceData", balanceData)
      setBalance(`${balanceFormatted} PAS`);
      setUserAddress(address);
    } catch (error) {
      console.error('Balance loading failed:', error);
      setBalance('Error loading balance');
      setUserAddress('Error loading');
      showErrorNotification("Balance Error", "Failed to load balance. Please try again.");
    }
  };

  const handleActionClick = (action: ActionType) => {
    setCurrentAction(action);
    setError('');

    if (action === 'transfer-balance') {
      const virtoConnect = document.getElementById('virtoConnect') as any;
      if (virtoConnect?.sdk) {
        loadBalance(virtoConnect.sdk);
      }
    }
  };

  const goBackToShortcuts = () => {
    setCurrentAction(null);
    setError('');
    setTransferRecipient('');
    setTransferAmount('');
    setMessage('Hello, world!');
    setBillPeriod('Jul 2025');
  };

  const handleTransferBalance = async () => {
    console.log("userSession", userSession)
    console.log("transferRecipient", transferRecipient)
    console.log("transferAmount", transferAmount)
    if (!userSession?.sdk || !transferRecipient.trim() || !transferAmount.trim()) {
      setError('Please fill in all fields');
      showErrorNotification("Validation Error", "Please fill in all fields");
      return;
    }

    const amount = parseFloat(transferAmount);
    if (amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      showErrorNotification("Validation Error", "Please enter a valid amount greater than 0");
      return;
    }

    setIsLoading(true);
    setError('');
    showSpinner('Processing transfer...');

    try {
      const sdk = userSession.sdk;
      let destinationAddress = transferRecipient;

      try {
        const resolvedAddress = await sdk.transfer.resolveUsernameToAddress(transferRecipient);
        if (resolvedAddress) {
          destinationAddress = resolvedAddress;
        }
      } catch (error) {
        console.log(`Could not resolve username "${transferRecipient}", treating as address`);
      }

      if (!sdk.transfer.isValidAddress(destinationAddress)) {
        setError('Invalid destination address format');
        showErrorNotification("Validation Error", "Invalid destination address format");
        return;
      }

      const amountInPlanck = sdk.transfer.parseAmount(transferAmount, 10);
      console.log("amountInPlanck", amountInPlanck)
      const balanceData = await sdk.transfer.getBalanceByUsername(sdk.auth.passkeysAuthenticator.userId);

      if (balanceData.transferable < amountInPlanck) {
        setError(`Insufficient balance. You have ${sdk.transfer.formatAmount(balanceData.transferable, 10)} PAS`);
        showErrorNotification("Insufficient Balance", `Insufficient balance. You have ${sdk.transfer.formatAmount(balanceData.transferable, 10)} PAS`);
        return;
      }

      console.log('Transfer details:', {
        dest: destinationAddress,
        value: amountInPlanck
      });

      const transferResult = await sdk.transfer.sendAsync(
        sdk.auth.sessionSigner,
        {
          dest: destinationAddress,
          value: amountInPlanck,
        }
      );

      console.log("transferResult", transferResult)

      if (transferResult.ok) {
        console.log('Transfer successful:', transferResult);
        setTransferRecipient('');
        setTransferAmount('');
        loadBalance(sdk);
        goBackToShortcuts();
      } else {
        const errorMsg = `Transfer failed: ${transferResult.error ? (typeof transferResult.error === 'string' ? transferResult.error : `Error Type: ${transferResult.error.type}, Value Type: ${transferResult.error.value?.type || 'Unknown'}`) : 'Unknown error'}`;
        console.warn(errorMsg)
      }
    } catch (error: any) {
      const errorMsg = `Transfer failed: ${error.message || 'Please try again'}`;
      console.warn(errorMsg)
    } finally {
      setIsLoading(false);
      hideSpinner();
    }
  };

  const handleSaveMessage = async () => {
    if (!userSession?.sdk || !message.trim()) {
      setError('Please enter a message to save');
      showErrorNotification("Validation Error", "Please enter a message to save");
      return;
    }

    setIsLoading(true);
    setError('');
    showSpinner('Saving message...');

    try {
      const sdk = userSession.sdk;

      const result = await sdk.system.makeRemarkAsync(
        sdk.auth.sessionSigner,
        { remark: message.trim() }
      );

      console.log("result", result)

      if (result.ok) {
        console.log('Message saved successfully:', result);
        setMessage('Hello, world!');
        goBackToShortcuts();
      } else {
        const errorMsg = `Failed to save message: ${result.error ? (typeof result.error === 'string' ? result.error : `Error Type: ${result.error.type}, Value Type: ${result.error.value?.type || 'Unknown'}`) : 'Unknown error'}`;
        console.warn(errorMsg)
      }
    } catch (error: any) {
      const errorMsg = `Failed to save message: ${error.message || 'Please try again'}`;
      console.warn(errorMsg)
    } finally {
      setIsLoading(false);
      hideSpinner();
    }
  };

  const handlePayServiceBill = async () => {
    if (!userSession?.sdk || !billPeriod.trim()) {
      setError('Please enter the bill period');
      showErrorNotification("Validation Error", "Please enter the bill period");
      return;
    }

    setIsLoading(true);
    setError('');
    showSpinner('Processing payment...');

    try {
      const sdk = userSession.sdk;
      const powerCompanyAddress = "5DS4XWXWzAimdj8GR5w1ZepsUZUUPN96YxL8LEaWa3GRUKfC";
      const billAmount = "0.1";
      const amountInPlanck = sdk.transfer.parseAmount(billAmount, 10);

      const transferExtrinsic = await sdk.transfer.createTransferExtrinsic({
        dest: powerCompanyAddress,
        value: amountInPlanck
      });

      const remarkExtrinsic = await sdk.system.createRemarkExtrinsic({
        remark: billPeriod.trim()
      });

      const batchResult = await sdk.utility.batchAllAsync(
        sdk.auth.sessionSigner,
        {
          calls: [transferExtrinsic, remarkExtrinsic]
        }
      );

      if (batchResult.ok) {
        console.log('Batch payment successful:', batchResult);
        setBillPeriod('Jul 2025');
        goBackToShortcuts();
      } else {
        const errorMsg = `Payment failed: ${batchResult.error ? (typeof batchResult.error === 'string' ? batchResult.error : `Error Type: ${batchResult.error.type}, Value Type: ${batchResult.error.value?.type || 'Unknown'}`) : 'Unknown error'}`;
        console.warn(errorMsg)
      }
    } catch (error: any) {
      const errorMsg = `Payment failed: ${error.message || 'Please try again'}`;
      console.warn(errorMsg)
    } finally {
      setIsLoading(false);
      hideSpinner();
    }
  };

  const copyExtrinsicToClipboard = async (extrinsicHex: string) => {
    try {
      console.log('Attempting to copy extrinsic hex:', extrinsicHex);
      await navigator.clipboard.writeText(extrinsicHex);
      showSuccessNotification("Extrinsic Copied!", "The extrinsic hexadecimal has been copied to your clipboard.");
    } catch (error) {
      console.error('Failed to copy extrinsic:', error);
      showErrorNotification("Copy Failed", "Failed to copy extrinsic to clipboard. Please try again.");
    }
  };

  const handleCopyTransferExtrinsic = async () => {
    const sdk = userSession?.sdk;

    if (!sdk) {
      setError('Please connect to Virto first');
      showErrorNotification("Connection Error", "Please connect to Virto first");
      return;
    }
    
    if (!transferRecipient.trim() || !transferAmount.trim()) {
      setError('Please fill in recipient and amount first');
      showErrorNotification("Validation Error", "Please fill in recipient and amount first");
      return;
    }

    try {
      let destinationAddress = transferRecipient;

      try {
        const resolvedAddress = await sdk.transfer.resolveUsernameToAddress(transferRecipient);
        if (resolvedAddress) {
          destinationAddress = resolvedAddress;
        }
      } catch (error) {
        console.log(`Could not resolve username "${transferRecipient}", treating as address`);
      }

      console.log('Creating transfer extrinsic with:', {
        dest: destinationAddress,
        value: sdk.transfer.parseAmount(transferAmount, 10)
      });

      const transferExtrinsic = await sdk.transfer.createTransferExtrinsic({
        dest: destinationAddress,
        value: sdk.transfer.parseAmount(transferAmount, 10)
      });

      console.log('Transfer extrinsic result:', transferExtrinsic);

      if (transferExtrinsic && transferExtrinsic.getEncodedData) {
        const encodedData = await transferExtrinsic.getEncodedData();
        const hexString = encodedData.asHex();
        copyExtrinsicToClipboard(hexString);
      } else {
        console.log('No getEncodedData function found:', transferExtrinsic);
        setError('Failed to generate extrinsic - no encoded data');
        showErrorNotification("Extrinsic Error", "Failed to generate extrinsic - no encoded data");
      }
    } catch (error) {
      console.error('Failed to create transfer extrinsic:', error);
      setError('Failed to generate extrinsic');
      showErrorNotification("Extrinsic Error", "Failed to generate extrinsic");
    }
    setError('');
  };

  const handleCopyRemarkExtrinsic = async () => {
    const sdk = userSession?.sdk;

    if (!sdk) {
      setError('Please connect to Virto first');
      showErrorNotification("Connection Error", "Please connect to Virto first");
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message first');
      showErrorNotification("Validation Error", "Please enter a message first");
      return;
    }
    
    try {
      console.log('Creating remark extrinsic with:', {
        message: message.trim()
      });

      const remarkExtrinsic = await sdk.system.createRemarkExtrinsic({
        remark: message.trim()
      });

      console.log('Remark extrinsic result:', remarkExtrinsic);

      if (remarkExtrinsic && remarkExtrinsic.getEncodedData) {
        const encodedData = await remarkExtrinsic.getEncodedData();
        const hexString = encodedData.asHex();
        copyExtrinsicToClipboard(hexString);
      } else {
        console.log('No getEncodedData function found:', remarkExtrinsic);
        setError('Failed to generate extrinsic - no encoded data');
        showErrorNotification("Extrinsic Error", "Failed to generate extrinsic - no encoded data");
      }
    } catch (error) {
      console.error('Failed to create remark extrinsic:', error);
      setError('Failed to generate extrinsic');
      showErrorNotification("Extrinsic Error", "Failed to generate extrinsic");
    }
    setError('');
  };

  const handleCopyBatchExtrinsic = async () => {
    const sdk = userSession?.sdk;

    if (!sdk) {
      setError('Please connect to Virto first');
      showErrorNotification("Connection Error", "Please connect to Virto first");
      return;
    }

    if (!billPeriod.trim()) {
      setError('Please enter the bill period first');
      showErrorNotification("Validation Error", "Please enter the bill period first");
      return;
    }

    try {
      const transferExtrinsic = await sdk.transfer.createTransferExtrinsic({
        dest: '5DS4XWXWzAimdj8GR5w1ZepsUZUUPN96YxL8LEaWa3GRUKfC',
        value: sdk.transfer.parseAmount('0.1', 10)
      });

      const remarkExtrinsic = await sdk.system.createRemarkExtrinsic({
        remark: billPeriod.trim()
      });

      try {
        const batchExtrinsic = await sdk.utility.createBatchAllExtrinsic({
          calls: [transferExtrinsic, remarkExtrinsic]
        });

        console.log("batchExtrinsic", batchExtrinsic)
        
        const batchEncoded = await batchExtrinsic.getEncodedData();
        const batchHex = batchEncoded.asHex();
        copyExtrinsicToClipboard(batchHex);
      } catch (batchError) {
        console.log("batchError", batchError)
        showErrorNotification(
          "Batch Extrinsic Not Available", 
          "Could not create complete batch extrinsic."
        );
      }
      
    } catch (error) {
      console.error('Failed to create batch extrinsic:', error);
      setError('Failed to generate batch extrinsic');
      showErrorNotification("Extrinsic Error", "Failed to generate batch extrinsic");
    }
    setError('');
  };

  const handleSendCustomExtrinsic = async (encodedCallHex: string) => {
    const sdk = userSession?.sdk;
    
    if (!sdk) {
      setError('Please connect to Virto first');
      showErrorNotification("Connection Error", "Please connect to Virto first");
      return;
    }

    setIsLoading(true);
    setError('');
    showSpinner('Sending transaction...');

    try {
      const result = await sdk.custom.submitCallAsync(
        sdk.auth.sessionSigner,
        {callDataHex: encodedCallHex}
      );

      console.log("result", result)

      if (result?.ok) {
        goBackToShortcuts();
      } else {
        const errorMsg = `Failed to send transaction: ${result?.error ? (typeof result.error === 'string' ? result.error : `Error Type: ${result.error.type}, Value Type: ${result.error.value?.type || 'Unknown'}`) : 'Unknown error'}`;
        console.warn(errorMsg)
      }
    } catch (err: any) {
      console.error('Custom transaction failed:', err);
      const errorMsg = `Failed to send transaction: ${err?.message || 'Please try again'}`;
      console.warn(errorMsg)
    } finally {
      setIsLoading(false);
      hideSpinner();
    }
  };

  return (
    <div id="demo-tab" className="tab-content">
      <div className={`connection-status-bar ${connectionStatus}`}>
        <div className="connection-status-indicator" />
        <span>
          {connectionStatus === 'connecting' && lastError ? 
            `Retrying connection... (Last error: ${lastError})` : 
            connectionMessage}
        </span>
      </div>

      <div className="actions-section-container">
        {!isAuthenticated && (
          <div className="how-it-works">
            <h4 className="section-title">How it works</h4>
            <div className="steps-flow">
              <div className="step-item">
                <div className="step-circle">1</div>
                <div className="step-content">
                  <h5>Connect</h5>
                  <p>Click "Connect to Virto" to register or sign in</p>
                </div>
              </div>
              <div className="step-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </div>
              <div className="step-item">
                <div className="step-circle">2</div>
                <div className="step-content">
                  <h5>Authenticate</h5>
                  <p>Use your passkey or biometric to sign in securely</p>
                </div>
              </div>
              <div className="step-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </div>
              <div className="step-item">
                <div className="step-circle">3</div>
                <div className="step-content">
                  <h5>Start Using</h5>
                  <p>Transfer tokens, sign transactions, and more</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div className="org-notice">
            <div className="org-notice__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}>
                <path d="M3 21v-8a2 2 0 0 1 2-2h4V7l5-3 5 3v4h1a2 2 0 0 1 2 2v8" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <div className="org-notice__content">
              <div className="org-notice__header">
                <h5 className="org-notice__title">You are registering to Test DAO</h5>
                <span className="org-notice__badge">Example organization</span>
              </div>
              <p className="org-notice__text">
                This demo registers your account within an example organization. You can replicate this flow for your own organization or DAO using Virto Connect.
              </p>
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div id="connect-section">
            <p className="connect-instruction">
              Click the button below to open the Virto Connect dialog and start using the available features
            </p>
            <div className="button-wrapper">
            </div>
          </div>
        )}

        <div style={{ display: isAuthenticated ? 'none' : 'block' }}>
          <VirtoConnect
            serverUrl = 'https://demo.virto.one/api'
            providerUrl="wss://testnet.kreivo.kippu.rocks"
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
          />
        </div>

        {isAuthenticated && currentAction === null && (
          <div id="extrinsic-section">
            <div className="actions-section-wrapper">
              <div className="actions-header">
                <h4 className="actions-title">Which example do you want to try?</h4>
                <p className="actions-subtitle">Choose an action to get started</p>
              </div>
              <div id="shortcuts-section" className="shortcuts-container">
                <div className="shortcuts-grid">
                  <div className="shortcut-card" onClick={() => handleActionClick('transfer-balance')}>
                    <div className="shortcut-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17l9.2-9.2M17 17H7v-10" />
                      </svg>
                    </div>
                    <h5>Transfer Balance</h5>
                    <p>Send PAS tokens to another person securely</p>
                  </div>

                  <div className="shortcut-card" onClick={() => handleActionClick('sign-extrinsic')}>
                    <div className="shortcut-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                      </svg>
                    </div>
                    <h5>Save Message</h5>
                    <p>Store your custom message on the blockchain</p>
                  </div>

                  <div className="shortcut-card" onClick={() => handleActionClick('transfer')}>
                    <div className="shortcut-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <path d="M8 14h.01" />
                        <path d="M12 14h.01" />
                        <path d="M16 14h.01" />
                      </svg>
                    </div>
                    <h5>Pay Service Bill</h5>
                    <p>Batch payment with blockchain receipt</p>
                  </div>

                  <div className="shortcut-card" onClick={() => handleActionClick('create-extrinsic')}>
                    <div className="shortcut-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    </div>
                    <h5>Custom Extrinsic</h5>
                    <p>Build and sign custom blockchain transactions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAuthenticated && currentAction !== null && (
          <div id="form-section" className="form-container">
            <div className="form-header">
              <button className="back-button" onClick={goBackToShortcuts}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h4 style={{ color: 'var(--dark-green)', margin: 0 }}>
                {currentAction === 'transfer-balance' && 'Transfer Balance'}
                {currentAction === 'sign-extrinsic' && 'Save Message to Blockchain'}
                {currentAction === 'transfer' && 'Pay Service Bill'}
                {currentAction === 'create-extrinsic' && 'Create Custom Extrinsic'}
              </h4>
            </div>


            {currentAction === 'create-extrinsic' && (
              <div className="extrinsic-container">
                <div className="extrinsic-description">
                  <p>Create and sign custom blockchain transactions. Choose the pallet, method, and parameters to build your extrinsic.</p>
                </div>
                <div className="extrinsic-content">
                  <Extrinsics 
                    onSend={handleSendCustomExtrinsic} 
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
          
      <NotificationContainer
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
      
      <Spinner
        isVisible={isSpinnerVisible}
        text={spinnerText}
      />
    </div>
  );
};

export default DemoTab; 