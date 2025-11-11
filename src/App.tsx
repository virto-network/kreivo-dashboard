import { Routes, Route } from 'react-router-dom';

// Declare custom virto elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'virto-connect': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        id?: string;
        server?: string;
        'provider-url'?: string;
        style?: React.CSSProperties;
      };
      'virto-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        id?: string;
        label?: string;
        variant?: string;
        disabled?: boolean;
        loading?: boolean;
        onClick?: (event: React.MouseEvent<HTMLElement>) => void;
      };
      'virto-input': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        id?: string;
        type?: string;
        placeholder?: string;
        value?: string;
        disabled?: boolean;
        label?: string;
        onInput?: (event: any) => void;
      };
    }
  }
}
import TransactionAlertContainer from '@/components/TransactionAlertContainer';
import Header from '@/components/Header';
import { useTransactionListener } from '@/hooks/useTransactionListener';
import type { User } from '@/types/auth.types';
import BlockDetail from '@/pages/Explorer/BlockDetail';
import Initiatives from '@/pages/Initiatives';
import Payments from '@/pages/Payments';
import Marketplace from '@/pages/Marketplace';
import Communities from '@/pages/Communities';
import Discussions from '@/pages/Discussions';
import Index from '@/pages/Index';
import './App.css';



function App() {
  // Initialize transaction listener
  useTransactionListener();

  const handleAuthSuccess = (user: User) => {
    console.log('Authentication successful:', user);
  };

  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
  };

  return (
    <div className="app">
      <Header onAuthSuccess={handleAuthSuccess} onAuthError={handleAuthError} />
      
      <div className="container">
        <div className="content-section" id="content-section">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explorer/:blockNumber" element={<BlockDetail />} />
            <Route path="/initiatives" element={<Initiatives />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/discussions" element={<Discussions />} />
          </Routes>
        </div>

        {/* @ts-ignore */}
        <virto-connect
          id="previewVirtoConnect"
          server="https://demo.virto.one/api"
          provider-url="wss://testnet.kreivo.kippu.rocks"
          style={{ display: 'none' }}
        />

        <TransactionAlertContainer />
      </div>
    </div>
  );
}

export default App; 