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
        throw new Error('Kode saham dan jumlah lot harus diisi');
      }

      // Validate lots is a positive number
      const lotsNum = parseFloat(lots);
      if (isNaN(lotsNum) || lotsNum <= 0) {
        throw new Error('Jumlah lot harus lebih dari 0');
      }

      // Format ticker based on exchange
      const formattedTicker = exchange ? `${ticker}:${exchange}` : ticker;
      
      // Fetch current stock price
      const response = await fetch('/api/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: [formattedTicker],
          crypto: [],
          exchangeRate: exchangeRate
        }),
      });
      
      if (!response.ok) {
        throw new Error('Gagal mengambil harga saham');
      }

      const data = await response.json();
      const stockPrice = data.prices[formattedTicker];
      
      if (!stockPrice || !stockPrice.price) {
        throw new Error('Data harga saham tidak valid');
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
      setSuccess('Saham berhasil ditambahkan');
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