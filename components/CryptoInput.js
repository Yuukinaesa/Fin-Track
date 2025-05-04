import { useState } from 'react';

export default function CryptoInput({ onAdd, onComplete }) {
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const popularCryptos = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'Binance Coin' },
    { symbol: 'XRP', name: 'Ripple' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'SOL', name: 'Solana' }
  ];
  
  const fetchCryptoPrice = async (symbol) => {
    try {
      const response = await fetch(
        `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbol}&tsyms=USD`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.RAW && data.RAW[symbol] && data.RAW[symbol].USD) {
        return data.RAW[symbol].USD.PRICE;
      }
      
      throw new Error('No price data available');
    } catch (error) {
      console.error('Error fetching crypto price:', error);
      throw error;
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symbol) {
      setError('Masukkan simbol kripto');
      return;
    }
    
    // Validasi jumlah
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Masukkan jumlah yang valid (lebih dari 0)');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch current price
      const price = await fetchCryptoPrice(symbol.toUpperCase());
      
      onAdd({
        symbol: symbol.toUpperCase(),
        amount: amountValue,
        price: price,
        type: 'crypto',
        addedAt: new Date().toISOString()
      });
      
      setSymbol('');
      setAmount('');
      
      // Opsional: pindah ke tab portfolio setelah tambah
      if (onComplete) onComplete();
      
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('Gagal menambahkan kripto: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuickAdd = (crypto) => {
    setSymbol(crypto.symbol);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Tambah Kripto</h2>
      
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Simbol Kripto</label>
          <input
            type="text"
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800 dark:text-white"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Contoh: BTC, ETH, SOL"
          />
        </div>
        
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah</label>
          <input
            type="text"
            inputMode="decimal"
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800 dark:text-white"
            value={amount}
            onChange={(e) => {
              // Hanya terima angka dan titik desimal
              const value = e.target.value.replace(/[^0-9.]/g, '');
              setAmount(value);
            }}
            placeholder="Contoh: 0.05, 0.00123456, 100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Untuk kripto, masukkan jumlah dengan presisi yang diinginkan (contoh: 0.00123456)
          </p>
        </div>
        
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? 'Menambahkan...' : 'Tambah Kripto'}
        </button>
      </form>
      
      <div className="mt-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Pilihan Cepat</p>
        <div className="flex flex-wrap gap-2">
          {popularCryptos.map(crypto => (
            <button
              key={crypto.symbol}
              onClick={() => handleQuickAdd(crypto)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {crypto.symbol}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 