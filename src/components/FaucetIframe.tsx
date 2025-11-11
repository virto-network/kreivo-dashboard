import React, { useState, useEffect } from 'react';

interface FaucetIframeProps {
  username: string;
  address: string;
  onAccept: () => Promise<{ success: boolean; error?: string }>;
  onDecline: () => void;
}

const FaucetIframe: React.FC<FaucetIframeProps> = ({
  onAccept,
  onDecline
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Listen for messages from parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'faucet-error') {
        setError(event.data.message || 'Failed to process welcome bonus');
        setIsLoading(false);
      } else if (event.data.type === 'faucet-success') {
        setSuccess(true);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleAccept = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    
    const result = await onAccept();
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to process welcome bonus');
    }
    
    setIsLoading(false);
  };

  const handleDecline = () => {
    if (isLoading) return;
    onDecline();
  };

  return (
    <>
      <style>
        {`
          .faucet-container {
            margin: 0;
            padding: 1.5rem;
            font-family: 'Outfit', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100%;
            text-align: center;
            box-sizing: border-box;
            background: white;
            flex: 1;
          }

          .faucet-title {
            color: #006B0A;
            margin: 0 0 1rem 0;
            font-size: clamp(1.25rem, 4vw, 1.5rem);
            font-weight: 700;
            letter-spacing: -0.02em;
          }

          .faucet-description {
            color: darkslategray;
            margin: 0 0 0.75rem 0;
            line-height: 1.5;
            font-size: clamp(0.875rem, 3vw, 1rem);
            max-width: 100%;
            font-weight: 500;
          }

          .faucet-benefit-note {
            color: #64748b;
            margin: 0 0 1.5rem 0;
            font-size: clamp(0.75rem, 2.5vw, 0.85rem);
            line-height: 1.4;
            max-width: 100%;
            font-style: italic;
            opacity: 0.9;
          }

          .faucet-amount {
            color: #24AF37;
            font-size: clamp(1.5rem, 6vw, 2rem);
            font-weight: 700;
            margin: 0 0 1.5rem 0;
            text-shadow: 0 2px 4px rgba(36, 175, 55, 0.2);
          }

          .faucet-question {
            font-weight: 600;
            margin: 0 0 1rem 0;
            color: #006B0A;
            font-size: clamp(0.875rem, 3vw, 1rem);
          }

          .faucet-error {
            color: #dc2626;
            margin: 1rem 0;
            padding: 0.75rem;
            background: #fee2e2;
            border-radius: 8px;
            font-size: clamp(0.8rem, 3vw, 0.9rem);
            animation: shake 0.5s ease-in-out;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            border: 1px solid #fecaca;
            font-weight: 500;
          }

          .faucet-buttons {
            display: flex;
            gap: 0.75rem;
            margin-top: 1.5rem;
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
          }

          .faucet-button {
            padding: 0.75rem 1.25rem;
            border: none;
            border-radius: 8px;
            font-family: inherit;
            font-size: clamp(0.8rem, 3vw, 0.9rem);
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 100px;
            flex: 0 1 auto;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .faucet-button:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          .faucet-button-decline {
            background: #f8fafc;
            color: #475569;
            border: 1px solid #e2e8f0;
          }

          .faucet-button-decline:hover:not(:disabled) {
            background: #f1f5f9;
            border-color: #cbd5e1;
            transform: translateY(-1px);
          }

          .faucet-button-accept {
            background: #24AF37;
            color: white;
            box-shadow: 0 4px 16px rgba(36, 175, 55, 0.25);
            min-width: 120px;
          }

          .faucet-button-accept:hover:not(:disabled) {
            background: #006B0A;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(36, 175, 55, 0.35);
          }

          .faucet-button-accept.success {
            background: #059669;
          }

          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }

          @media (max-width: 480px) {
            .faucet-container {
              padding: 1.25rem;
            }
            
            .faucet-buttons {
              flex-direction: column;
              align-items: center;
              gap: 0.5rem;
            }
            
            .faucet-button {
              width: 100%;
              max-width: 200px;
            }
          }
        `}
      </style>
      
      <div className="faucet-container">
        <h3 className="faucet-title">
          Welcome Bonus!
        </h3>
        
        <p className="faucet-description">
          Congratulations! Claim your starter tokens and premium membership.
        </p>
        
        <p className="faucet-benefit-note">
          ✨ Bonus: With membership, transaction fees are free – You can verify this by checking your balance after any transaction
        </p>
        
        <div className="faucet-amount">
          10 PAS
        </div>
        
        <p className="faucet-question">
          Ready to activate your account benefits?
        </p>

        {error && (
          <div className="faucet-error">
            {error}
          </div>
        )}

        <div className="faucet-buttons">
          <button
            onClick={handleDecline}
            disabled={isLoading}
            className="faucet-button faucet-button-decline"
          >
            Maybe Later
          </button>
          
          <button
            onClick={handleAccept}
            disabled={isLoading || success}
            className={`faucet-button faucet-button-accept ${success ? 'success' : ''}`}
          >
            {success ? '✅ Activated!' : isLoading ? 'Processing...' : 'Claim Benefits'}
          </button>
        </div>
      </div>
    </>
  );
};

export default FaucetIframe; 