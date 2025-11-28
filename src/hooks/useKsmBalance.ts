import { useEffect, useState } from 'react';
import { chainClient$ } from '@/state/chains/chain.state';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { kreivo } from '@polkadot-api/descriptors';

export interface KsmBalance {
  free: bigint;
  reserved: bigint;
  frozen: bigint;
}

export interface WalletData {
  ksmBalance: bigint;
  dusdBalance: number;
  totalUsdValue: number;
  ksmPrice: number;
  isLoading: boolean;
  error: string | null;
}

const getKsmPrice = async (): Promise<number> => {
  try {
    const response = await fetch('https://sapi.coincarp.com/api/v1/his/coin/trend?code=kusama&type=s');
    const data = await response.json();

    if (data?.code === 200 && Array.isArray(data.data) && data.data.length > 0) {
      const latestData = data.data[data.data.length - 1];
      console.log('Latest data:', latestData);
      if (latestData[1]) {
        const price = parseFloat(latestData[1]);
        console.log('KSM price:', price);
        return price;
      }
    }

    throw new Error('Invalid price response format');
  } catch (error) {
    console.error('Error fetching KSM price:', error);
    return 30.0;
  }
};

const getAccountAddress = (): string | null => {
  const storedAddress = localStorage.getItem('virto_account_address');
  if (storedAddress) {
    return storedAddress;
  }

  return null;
};

export const useKsmBalance = (): WalletData => {
  const [ksmBalance, setKsmBalance] = useState<bigint>(BigInt(0));
  const [dusdBalance, setDusdBalance] = useState<number>(0);
  const [ksmPrice, setKsmPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchBalance = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const accountAddress = getAccountAddress();

        if (!accountAddress) {
          if (mounted) {
            setKsmBalance(BigInt(0));
            setIsLoading(false);
          }
          return;
        }

        localStorage.setItem('virto_account_address', accountAddress);

        const price = await getKsmPrice();
        console.log('KSM price:', price);
        if (mounted) {
          setKsmPrice(price);
        }

        const { client } = await firstValueFrom(
          chainClient$.pipe(take(1))
        );

        if (!client) {
          throw new Error('Chain client not available');
        }

        const typedApi = client.getTypedApi(kreivo);

        const accountData = await typedApi.query.System.Account.getValue(accountAddress).catch((err: any) => {
          console.error('Error querying account balance:', err);
          return null;
        });

        if (!accountData) {
          if (mounted) {
            setKsmBalance(BigInt(0));
            setIsLoading(false);
          }
          return;
        }

        const balance = accountData.data.free;

        let dusdAmount = 0;
        try {
          const assetId = { type: "Sibling" as const, value: { id: 1000, pallet: 50, index: 50000002 } };
          console.log('Querying DUSD balance with assetId:', assetId, 'address:', accountAddress);

          const dusdAccountData = await typedApi.query.Assets.Account.getValue(assetId, accountAddress).catch((err: any) => {
            console.error('Error querying DUSD balance:', err);
            return null;
          });

          if (dusdAccountData) {
            console.log('DUSD account data structure:', dusdAccountData);
            const dusdBalance = dusdAccountData.balance;

            dusdAmount = Number(dusdBalance);
            console.log('DUSD balance from storage:', dusdAmount, 'raw:', dusdBalance.toString());
          } else {
            console.log('No DUSD balance found for account');
          }
        } catch (err) {
          console.error('Error fetching DUSD balance from storage:', err);
        }

        if (mounted) {
          setKsmBalance(balance);
          setDusdBalance(dusdAmount);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Error fetching KSM balance:', err);
        if (mounted) {
          setError(err.message || 'Failed to fetch balance');
          setIsLoading(false);
        }
      }
    };

    fetchBalance();

    const interval = setInterval(fetchBalance, 30000);

    const handleAuthChange = () => {
      fetchBalance();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'virto_connected_user' || e.key === 'virto_account_address' || e.key === 'lastUserId') {
        fetchBalance();
      }
    };

    document.addEventListener('virto-auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('virto-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const ksmAmount = Number(ksmBalance) / 1e12; // KSM has 12 decimals
  const ksmUsdValue = ksmAmount * ksmPrice;
  const totalUsdValue = ksmUsdValue + dusdBalance;

  return {
    ksmBalance,
    dusdBalance,
    totalUsdValue,
    ksmPrice,
    isLoading,
    error,
  };
};

