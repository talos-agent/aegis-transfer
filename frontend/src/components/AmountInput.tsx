'use client'

import React, { useState, useEffect } from 'react'
import { TokenInfo } from '@/lib/contract'
import { usePriceData } from '@/lib/price'

interface AmountInputProps {
  amount: string;
  onAmountChange: (amount: string) => void;
  selectedToken: TokenInfo;
  label?: string;
  placeholder?: string;
}

export function AmountInput({ 
  amount, 
  onAmountChange, 
  selectedToken, 
  label = "Amount",
  placeholder 
}: AmountInputProps) {
  const [isUsdMode, setIsUsdMode] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(amount);
  const { priceData, isLoading: isPriceLoading, error: priceError } = usePriceData();

  const isEth = selectedToken.address === '0x0000000000000000000000000000000000000000';
  const showUsdToggle = isEth && priceData;

  useEffect(() => {
    const savedMode = localStorage.getItem('aegis-usd-mode');
    if (savedMode === 'true' && showUsdToggle) {
      setIsUsdMode(true);
    }
  }, [showUsdToggle]);

  useEffect(() => {
    if (showUsdToggle) {
      localStorage.setItem('aegis-usd-mode', isUsdMode.toString());
    }
  }, [isUsdMode, showUsdToggle]);

  useEffect(() => {
    if (!showUsdToggle) {
      setDisplayAmount(amount);
      return;
    }

    if (isUsdMode && priceData) {
      const ethAmount = parseFloat(amount || '0');
      const usdAmount = ethAmount * priceData.usd;
      setDisplayAmount(usdAmount > 0 ? usdAmount.toFixed(2) : '');
    } else {
      setDisplayAmount(amount);
    }
  }, [amount, isUsdMode, priceData, showUsdToggle]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayAmount(value);

    if (!showUsdToggle || !priceData) {
      onAmountChange(value);
      return;
    }

    if (isUsdMode) {
      const usdAmount = parseFloat(value || '0');
      const ethAmount = usdAmount / priceData.usd;
      onAmountChange(ethAmount > 0 ? ethAmount.toString() : '');
    } else {
      onAmountChange(value);
    }
  };

  const toggleMode = () => {
    if (!showUsdToggle || !priceData) return;
    
    const currentValue = parseFloat(displayAmount || '0');
    if (currentValue > 0) {
      if (isUsdMode) {
        const ethAmount = currentValue / priceData.usd;
        setDisplayAmount(ethAmount.toString());
      } else {
        const usdAmount = currentValue * priceData.usd;
        setDisplayAmount(usdAmount.toFixed(2));
      }
    }
    setIsUsdMode(!isUsdMode);
  };

  const getConversionDisplay = () => {
    if (!showUsdToggle || !priceData || !displayAmount) return null;
    
    const value = parseFloat(displayAmount);
    if (value <= 0) return null;

    if (isUsdMode) {
      const ethAmount = value / priceData.usd;
      return `≈ ${ethAmount.toFixed(6)} ETH`;
    } else {
      const usdAmount = value * priceData.usd;
      return `≈ $${usdAmount.toFixed(2)} USD`;
    }
  };

  const getCurrentSymbol = () => {
    if (isUsdMode && showUsdToggle) return 'USD';
    return selectedToken.symbol;
  };

  const getCurrentPlaceholder = () => {
    if (isUsdMode && showUsdToggle) return '100.00';
    return placeholder || (selectedToken.symbol === 'ETH' ? '0.1' : '100');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-foreground">
          {label} ({getCurrentSymbol()})
        </label>
        {showUsdToggle && (
          <button
            type="button"
            onClick={toggleMode}
            className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            disabled={isPriceLoading}
          >
            {isPriceLoading ? '...' : isUsdMode ? 'Switch to ETH' : 'Switch to USD'}
          </button>
        )}
      </div>
      
      <div className="relative">
        <input
          type="number"
          step={isUsdMode ? "0.01" : (selectedToken.decimals === 18 ? "0.001" : "0.01")}
          value={displayAmount}
          onChange={handleInputChange}
          placeholder={getCurrentPlaceholder()}
          className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
          required
        />
        
        {isUsdMode && showUsdToggle && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
            $
          </div>
        )}
      </div>

      {showUsdToggle && (
        <div className="mt-2 text-xs text-muted-foreground">
          {priceError ? (
            <span className="text-red-500">Price unavailable</span>
          ) : isPriceLoading ? (
            <span>Loading price...</span>
          ) : (
            <>
              {getConversionDisplay() && (
                <span>{getConversionDisplay()}</span>
              )}
              {priceData && (
                <span className="ml-2">
                  1 ETH = ${priceData.usd.toFixed(2)}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
