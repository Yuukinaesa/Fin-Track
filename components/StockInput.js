import { useState } from 'react';

export default function StockInput({ onAdd, onComplete, exchangeRate }) {
  const [ticker, setTicker] = useState('');
  const [lots, setLots] = useState('1');
  const [exchange, setExchange] = useState('JK');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const popularStocks = [
    { ticker: 'BBCA', name: 'Bank Central Asia', exchange: 'JK' },
    { ticker: 'BBRI', name: 'Bank Rakyat Indonesia', exchange: 'JK' },
    { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'US' },
    { ticker: 'MSFT', name: 'Microsoft', exchange: 'US' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'US' },
    { ticker: 'TSLA', name: 'Tesla', exchange: 'US' },
  ];
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate input
      if (!ticker || !lots) {
        throw new Error('Stock code and lot amount must be filled');
      }

      // Validate lots is a positive number
      const lotsNum = parseFloat(lots);
      if (isNaN(lotsNum) || lotsNum <= 0) {
        throw new Error('Lot amount must be greater than 0');
      }

      // Format tickers based on exchange
      let tickersToTry;
      if (exchange === 'US') {
        tickersToTry = [`${ticker.trim().toUpperCase()}.US`];
      } else if (exchange === 'JK') {
        tickersToTry = [`${ticker.trim().toUpperCase()}.JK`];
      } else {
        // Auto: try raw, .JK, .US
        const base = ticker.trim().toUpperCase();
        tickersToTry = [base, `${base}.JK`, `${base}.US`];
      }
      console.log('Submitting tickers:', tickersToTry, 'Exchange:', exchange);

      // Debounce submit button
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 1500);

      // Fetch current stock price
      const response = await fetch('/api/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: tickersToTry,
          crypto: [],
          exchangeRate: exchangeRate
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch stock price (HTTP ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('API returned prices:', data.prices);
      let stockPrice = null;
      let usedTicker = null;
      // Try each ticker in order
      for (const t of tickersToTry) {
        if (data.prices[t] && data.prices[t].price) {
          stockPrice = data.prices[t];
          usedTicker = t;
          break;
        }
      }
      // Fallback: prefer full match with .JK or .US
      if (!stockPrice && exchange === '') {
        const baseTicker = ticker.trim().toUpperCase();
        const foundKey = Object.keys(data.prices).find(key => (key.toUpperCase() === `${baseTicker}.JK` || key.toUpperCase() === `${baseTicker}.US`) && data.prices[key] && data.prices[key].price);
        if (foundKey) {
          stockPrice = data.prices[foundKey];
          usedTicker = foundKey;
          console.log('Fallback matched ticker:', foundKey);
        }
      }
      console.log('Used ticker for price:', usedTicker);
      if (!stockPrice) {
        throw new Error('Stock price data not found or API limit reached. Please check the code and try again later.');
      }

      // Calculate values based on real-time price
      const sharesPerLot = 100; // 1 lot = 100 saham
      const totalShares = lotsNum * sharesPerLot;
      
      let valueIDR, valueUSD;
      
      if (stockPrice.currency === 'IDR') {
        valueIDR = stockPrice.price * totalShares;
        valueUSD = exchangeRate ? valueIDR / exchangeRate : 0;
      } else {
        valueUSD = stockPrice.price * totalShares;
        valueIDR = exchangeRate ? valueUSD * exchangeRate : 0;
      }

      // Create stock object with calculated values
      const stockData = {
        ticker: ticker.toUpperCase(),
        lots: lotsNum,
        valueIDR: valueIDR,
        valueUSD: valueUSD,
        currency: stockPrice.currency,
        price: stockPrice.price,
        shares: totalShares,
        type: 'stock',
        addedAt: new Date().toISOString()
      };

      console.log('Submitting stock data:', stockData);
      await onAdd(stockData);
      
      // Reset form
      setTicker('');
      setLots('1');
      setExchange('JK');
      
      // Show success message
      setSuccess('Stock successfully added');
      setTimeout(() => setSuccess(null), 3000);
      
      // Call onComplete if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuickAdd = (stock) => {
    setTicker(stock.ticker);
    setExchange(stock.exchange);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Tambah Saham</h2>
      
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-200 px-3 py-2 rounded-lg text-sm">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Kode Saham</label>
          <input
            type="text"
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800 dark:text-white"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Contoh: BBCA, AAPL, NVDA"
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Exchange/Market</label>
          <select
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800 dark:text-white"
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
          >
            <option value="JK">Indonesia (IDX)</option>
            <option value="US">US Markets (NASDAQ/NYSE)</option>
            <option value="">Other (auto-detect)</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah Lot</label>
          <input
            type="text"
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800 dark:text-white"
            value={lots}
            onChange={(e) => setLots(e.target.value)}
            placeholder="Contoh: 1, 0.5"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? 'Menambahkan...' : 'Tambah Saham'}
        </button>
      </form>
      
      <div className="mt-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Pilihan Cepat</p>
        <div className="flex flex-wrap gap-2">
          {popularStocks.map(stock => (
            <button
              key={stock.ticker}
              onClick={() => handleQuickAdd(stock)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {stock.ticker} ({stock.exchange})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}