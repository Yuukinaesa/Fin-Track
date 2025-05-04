import { useState } from 'react';

export default function StockInput({ onAdd, onComplete }) {
  const [ticker, setTicker] = useState('');
  const [lots, setLots] = useState('1');  // Ubah dari number ke string untuk mendukung angka desimal
  const [exchange, setExchange] = useState('JK');  // Default ke Indonesia market
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
    if (!ticker) {
      setError('Masukkan kode saham');
      return;
    }
    
    // Validasi jumlah (bisa berupa angka desimal)
    const lotsValue = parseFloat(lots);
    if (isNaN(lotsValue) || lotsValue <= 0) {
      setError('Masukkan jumlah yang valid (lebih dari 0)');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Format ticker berdasarkan exchange
      const formattedTicker = exchange ? `${ticker}:${exchange}` : ticker;
      
      onAdd({
        ticker: formattedTicker,
        lots: lotsValue,  // Simpan sebagai float
        type: 'stock',
        addedAt: new Date().toISOString()
      });
      
      setTicker('');
      setLots('1');
      
      // Opsional: pindah ke tab portfolio setelah tambah
      if (onComplete) onComplete();
      
    } catch (err) {
      setError('Gagal menambahkan saham');
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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Contoh: BBCA, TLKM untuk IDX - AAPL, MSFT, NVDA untuk US
          </p>
          {exchange === '' && (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              Untuk "Other", harap tambahkan notasi (.JK, .US) secara manual pada kode saham
            </p>
          )}
        </div>
        
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah Saham/Lot</label>
          <input
            type="text" // Ubah ke text untuk mendukung angka desimal dengan lebih baik
            inputMode="decimal" // Menampilkan keyboard numerik dengan desimal di mobile
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800 dark:text-white"
            value={lots}
            onChange={(e) => {
              // Hanya terima angka dan titik desimal
              const value = e.target.value.replace(/[^0-9.]/g, '');
              setLots(value);
            }}
            placeholder="Contoh: 1, 0.5, 0.257906872"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {exchange === 'JK' ? 
              'Untuk IDX: 1 lot = 100 lembar saham' : 
              'Untuk saham fractional, masukkan angka desimal (contoh: 0.257906872)'}
          </p>
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