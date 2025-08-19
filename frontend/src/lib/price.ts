import { useState, useEffect, useCallback } from 'react';

export interface PriceData {
  usd: number;
  lastUpdated: number;
}

export async function fetchEthPrice(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.ethereum.usd;
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    throw error;
  }
}

export function usePriceData() {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      setError(null);
      const price = await fetchEthPrice();
      setPriceData({
        usd: price,
        lastUpdated: Date.now()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    
    const interval = setInterval(fetchPrice, 30000);
    
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return { priceData, isLoading, error, refetch: fetchPrice };
}
