import { useState, useEffect } from 'react';
import AssetTable from './AssetTable';
import { FiRefreshCw, FiPlusCircle, FiTrendingUp, FiDollarSign, FiActivity, FiAlertCircle } from 'react-icons/fi';

export default function Portfolio({ 
  assets, 
  onUpdateStock, 
  onUpdateCrypto, 
  onDeleteStock, 
  onDeleteCrypto,
  onAddAsset,
  onSellStock,
  onSellCrypto
}) {
  const [prices, setPrices] = useState({});
  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeRateSource, setExchangeRateSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [lastExchangeRateUpdate, setLastExchangeRateUpdate] = useState('');
  const [error, setError] = useState(null);
  const [exchangeRateError, setExchangeRateError] = useState(null);
  const [activeAssetTab, setActiveAssetTab] = useState('all'); // 'all', 'stocks', 'crypto'
  
  // Helper function to format price
  const formatPrice = (value, currency = 'IDR') => {
    try {
      if (value === undefined || value === null || isNaN(value) || value === 0) {
        return currency === 'IDR' ? 'Rp 0' : '$ 0';
      }
      
      if (currency === 'IDR') {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 2
        }).format(value);
      } else {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 8
        }).format(value);
      }
    } catch (error) {
      console.error('Error formatting price:', error);
      return value.toString();
    }
  };
  
  // Handle sell functionality
  const handleSellStock = (index, asset, amountToSell) => {
    // Calculate price data for the sell transaction
    let priceData = {
      price: 0,
      valueIDR: 0,
      valueUSD: 0,
      date: new Date().toISOString()
    };
    
    if (prices && prices[asset.ticker]) {
      const price = prices[asset.ticker];
      const shareCount = price.currency === 'IDR' ? amountToSell * 100 : amountToSell;
      
      if (price.currency === 'IDR') {
        const totalValue = price.price * shareCount;
        priceData = {
          price: price.price,
          valueIDR: totalValue,
          valueUSD: exchangeRate ? totalValue / exchangeRate : 0,
          date: new Date().toISOString()
        };
      } else if (price.currency === 'USD' && exchangeRate) {
        const totalValueUSD = price.price * shareCount;
        priceData = {
          price: price.price,
          valueIDR: totalValueUSD * exchangeRate,
          valueUSD: totalValueUSD,
          date: new Date().toISOString()
        };
      }
    } else {
      // Fallback values if price data isn't available
      if (asset.ticker.includes(':JK')) {
        // Assume IDR price for JK stocks
        const estimatedPriceIDR = 5000; // placeholder for price per share
        priceData = {
          price: estimatedPriceIDR,
          valueIDR: estimatedPriceIDR * amountToSell * 100, // 100 shares per lot
          valueUSD: exchangeRate ? (estimatedPriceIDR * amountToSell * 100) / exchangeRate : 0,
          date: new Date().toISOString()
        };
      } else {
        // Assume USD price for other stocks
        const estimatedPriceUSD = 50; // placeholder
        priceData = {
          price: estimatedPriceUSD,
          valueUSD: estimatedPriceUSD * amountToSell,
          valueIDR: exchangeRate ? estimatedPriceUSD * amountToSell * exchangeRate : 0,
          date: new Date().toISOString()
        };
      }
    }
    
    // Jumlah yang tersisa setelah penjualan
    const remainingAmount = asset.lots - amountToSell;
    
    if (remainingAmount <= 0) {
      // Jika menjual semua, sama dengan menghapus aset
      onDeleteStock(index);
    } else {
      // Jika hanya menjual sebagian, update jumlah yang tersisa
      const updatedAsset = { ...asset, lots: remainingAmount };
      onUpdateStock(index, updatedAsset);
    }
    
    // Call the parent component's sell function
    if (onSellStock) {
      onSellStock(index, asset, amountToSell, priceData);
    }
  };

  const handleSellCrypto = (index, asset, amountToSell) => {
    // Calculate price data for the sell transaction
    let priceData = {
      price: 0,
      valueIDR: 0,
      valueUSD: 0,
      date: new Date().toISOString()
    };
    
    if (prices && prices[asset.symbol]) {
      const price = prices[asset.symbol];
      const valueUSD = price.price * amountToSell;
      
      priceData = {
        price: price.price,
        valueIDR: price.priceIDR 
          ? price.priceIDR * amountToSell 
          : (exchangeRate ? valueUSD * exchangeRate : 0),
        valueUSD: valueUSD,
        date: new Date().toISOString()
      };
    } else {
      // Fallback if no price data
      // Estimate based on common crypto values
      const estimatedPriceUSD = getEstimatedCryptoPrice(asset.symbol);
      const valueUSD = estimatedPriceUSD * amountToSell;
      
      priceData = {
        price: estimatedPriceUSD,
        valueUSD: valueUSD,
        valueIDR: exchangeRate ? valueUSD * exchangeRate : 0,
        date: new Date().toISOString()
      };
    }
    
    // Jumlah yang tersisa setelah penjualan
    const remainingAmount = asset.amount - amountToSell;
    
    if (remainingAmount <= 0) {
      // Jika menjual semua, sama dengan menghapus aset
      onDeleteCrypto(index);
    } else {
      // Jika hanya menjual sebagian, update jumlah yang tersisa
      const updatedAsset = { ...asset, amount: remainingAmount };
      onUpdateCrypto(index, updatedAsset);
    }
    
    // Call the parent component's sell function
    if (onSellCrypto) {
      onSellCrypto(index, asset, amountToSell, priceData);
    }
  };
  
  // Helper to get estimated crypto price for placeholder
  const getEstimatedCryptoPrice = (symbol) => {
    // Just a simple estimation for placeholder values
    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol === 'BTC') return 50000;
    if (upperSymbol === 'ETH') return 3000;
    if (upperSymbol === 'BNB') return 400;
    if (upperSymbol === 'SOL') return 100;
    return 1; // Default value for other cryptos
  };

  // Di dalam fungsi fetchExchangeRate di components/Portfolio.js
  const fetchExchangeRate = async () => {
    try {
      setLoadingExchangeRate(true);
      setExchangeRateError(null);
      
      const response = await fetch('/api/exchange-rate');
      
      if (!response.ok) {
        console.warn(`Exchange rate API error: ${response.status}`);
        setExchangeRate(null);
        setExchangeRateSource('');
        setExchangeRateError(`Gagal memperbarui kurs mata uang (${response.status})`);
        return;
      }
      
      const data = await response.json();
      
      if (data.rate) {
        setExchangeRate(data.rate);
        setExchangeRateSource(data.source || 'Exchange Rate API');
        setLastExchangeRateUpdate(new Date(data.timestamp).toLocaleString());
      } else {
        setExchangeRate(null);
        setExchangeRateSource('');
        setExchangeRateError('Data kurs mata uang tidak tersedia');
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      setExchangeRate(null);
      setExchangeRateSource('');
      setExchangeRateError(`Gagal memperbarui kurs: ${error.message}`);
    } finally {
      setLoadingExchangeRate(false);
    }
  };
    
  const fetchPrices = async () => {
    const stockTickers = assets.stocks.map(stock => stock.ticker);
    const cryptoSymbols = assets.crypto.map(crypto => crypto.symbol);
    
    if (stockTickers.length === 0 && cryptoSymbols.length === 0) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: stockTickers,
          crypto: cryptoSymbols,
          exchangeRate: exchangeRate
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setPrices(data.prices);
      setLastUpdate(new Date().toLocaleString());
      setError(null);
    } catch (error) {
      console.error('Error fetching prices:', error);
      setError(`Gagal memperbarui data harga: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch exchange rate immediately and periodically
  useEffect(() => {
    fetchExchangeRate();
    const interval = setInterval(fetchExchangeRate, 900000); // Update every 15 minutes
    
    return () => clearInterval(interval);
  }, []);
  
  // Fetch asset prices when assets change or on demand
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 900000); // Update every 15 minutes
    
    return () => clearInterval(interval);
  }, [assets, exchangeRate]);
  
  const handleRefresh = () => {
    fetchExchangeRate();
    fetchPrices();
  };
  
  const calculateTotals = () => {
    let totalStocksOriginal = 0;
    let totalStocksIDR = 0;
    let totalStocksUSD = 0;
    let totalCryptoUSD = 0;
    let totalCryptoIDR = 0;
    let totalStocksWithPrices = 0;
    let totalCryptoWithPrices = 0;
    let avgDayChange = 0;
    let totalAssetsWithChange = 0;
    
    // Hitung total saham
    assets.stocks.forEach(stock => {
      if (prices[stock.ticker]) {
        const price = prices[stock.ticker];
        const shareCount = price.currency === 'IDR' ? stock.lots * 100 : stock.lots;
        
        if (price.currency === 'IDR') {
          totalStocksOriginal += price.price * shareCount;
          totalStocksIDR += price.price * shareCount;
          totalStocksUSD += exchangeRate ? (price.price * shareCount) / exchangeRate : 0;
        } else if (price.currency === 'USD' && exchangeRate) {
          totalStocksOriginal += price.price * shareCount;
          totalStocksIDR += price.price * shareCount * exchangeRate;
          totalStocksUSD += price.price * shareCount;
        }
        
        // Hitung rata-rata perubahan harian
        if (price.change !== undefined) {
          avgDayChange += price.change;
          totalAssetsWithChange++;
        }
        
        totalStocksWithPrices++;
      }
    });
    
    // Hitung total kripto
    assets.crypto.forEach(crypto => {
      if (prices[crypto.symbol]) {
        const price = prices[crypto.symbol];
        
        totalCryptoUSD += price.price * crypto.amount;
        
        if (price.priceIDR) {
          totalCryptoIDR += price.priceIDR * crypto.amount;
        } else if (exchangeRate) {
          totalCryptoIDR += price.price * crypto.amount * exchangeRate;
        }
        
        // Hitung rata-rata perubahan harian
        if (price.change !== undefined) {
          avgDayChange += price.change;
          totalAssetsWithChange++;
        }
        
        totalCryptoWithPrices++;
      }
    });
    
    const totalIDR = totalStocksIDR + totalCryptoIDR;
    const totalUSD = totalStocksUSD + totalCryptoUSD;
    
    // Hitung rata-rata perubahan harian
    avgDayChange = totalAssetsWithChange > 0 ? avgDayChange / totalAssetsWithChange : 0;
    
    const stocksPercent = totalIDR > 0 ? (totalStocksIDR / totalIDR) * 100 : 0;
    const cryptoPercent = totalIDR > 0 ? (totalCryptoIDR / totalIDR) * 100 : 0;
    
    return {
      totalIDR,
      totalUSD,
      totalStocksIDR,
      totalStocksUSD,
      totalCryptoIDR,
      totalCryptoUSD,
      stocksPercent,
      cryptoPercent,
      totalStocksWithPrices,
      totalCryptoWithPrices,
      totalStocks: assets.stocks.length,
      totalCrypto: assets.crypto.length,
      avgDayChange
    };
  };
  
  const totals = calculateTotals();
  
  return (
    <div className="space-y-6">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Portfolio</h3>
            <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded-lg">
              <FiDollarSign className="text-blue-500 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">Rp {totals.totalIDR.toLocaleString()}</p>
          <div className="flex justify-between items-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              $ {totals.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {totals.avgDayChange !== 0 && (
              <p className={`text-sm font-medium ${
                totals.avgDayChange > 0 
                  ? 'text-green-500 dark:text-green-400' 
                  : 'text-red-500 dark:text-red-400'
              }`}>
                {totals.avgDayChange > 0 ? '+' : ''}{totals.avgDayChange.toFixed(2)}%
              </p>
            )}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Saham</h3>
            <div className="bg-green-100 dark:bg-green-500/20 p-2 rounded-lg">
              <FiTrendingUp className="text-green-500 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">Rp {totals.totalStocksIDR.toLocaleString()}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            $ {totals.totalStocksUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full" 
              style={{ width: `${totals.stocksPercent}%` }}
            ></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{totals.stocksPercent.toFixed(1)}% dari portfolio</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Kripto</h3>
            <div className="bg-purple-100 dark:bg-purple-500/20 p-2 rounded-lg">
              <FiActivity className="text-purple-500 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">Rp {totals.totalCryptoIDR.toLocaleString()}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            $ {totals.totalCryptoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full" 
              style={{ width: `${totals.cryptoPercent}%` }}
            ></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{totals.cryptoPercent.toFixed(1)}% dari portfolio</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Kurs USD/IDR</h3>
            <div className="bg-orange-100 dark:bg-orange-500/20 p-2 rounded-lg">
              <FiDollarSign className="text-orange-500 dark:text-orange-400" />
            </div>
          </div>
          {exchangeRate ? (
            <>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">Rp {exchangeRate.toLocaleString()}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {exchangeRateSource}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Diperbarui: {lastExchangeRateUpdate || 'N/A'}
              </p>
            </>
          ) : (
            <div className="text-center py-3">
              <p className="text-gray-500 dark:text-gray-400">
                {loadingExchangeRate ? 'Memuat data kurs...' : 'Data kurs tidak tersedia'}
              </p>
              <button 
                onClick={fetchExchangeRate}
                className="mt-2 text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Coba lagi
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between md:items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Daftar Aset</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {assets.stocks.length + assets.crypto.length} aset dalam portfolio Anda
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setActiveAssetTab('all')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  activeAssetTab === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setActiveAssetTab('stocks')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  activeAssetTab === 'stocks' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Saham
              </button>
              <button
                onClick={() => setActiveAssetTab('crypto')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  activeAssetTab === 'crypto' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Kripto
              </button>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition"
              title="Refresh data"
            >
              <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={onAddAsset}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition"
              title="Tambah aset"
            >
              <FiPlusCircle />
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {loading && assets.stocks.length + assets.crypto.length > 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Memperbarui data harga...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Info panel for data loading */}
            {!loading && Object.keys(prices).length < (assets.stocks.length + assets.crypto.length) && (
              <div className="mx-6 mt-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-200 px-3 py-2 rounded-lg text-sm flex items-start">
                <FiAlertCircle className="mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p>Jika data harga belum tersedia. Silakan tunggu atau klik tombol refresh untuk memperbarui data.</p>
                  <p className="mt-1">Data yang ditampilkan adalah data real-time. Jika data masih belum ditampilkan, mohon menunggu 1 menit karena terdapat limit.</p>
                </div>
              </div>
            )}
            
            {(activeAssetTab === 'all' || activeAssetTab === 'stocks') && (
              <div className={`${activeAssetTab === 'all' ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                {assets.stocks.length > 0 ? (
                  <AssetTable 
                    assets={assets.stocks} 
                    prices={prices} 
                    exchangeRate={exchangeRate}
                    type="stock"
                    onUpdate={onUpdateStock}
                    onDelete={onDeleteStock}
                    onSell={handleSellStock}
                    loading={loading}
                  />
                ) : activeAssetTab === 'stocks' ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    <p>Belum ada saham yang ditambahkan</p>
                    <button 
                      onClick={onAddAsset}
                      className="mt-2 inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <FiPlusCircle className="mr-1" /> Tambah Saham
                    </button>
                  </div>
                ) : null}
              </div>
            )}
            
            {(activeAssetTab === 'all' || activeAssetTab === 'crypto') && (
              <div>
                {assets.crypto.length > 0 ? (
                  <AssetTable 
                    assets={assets.crypto} 
                    prices={prices} 
                    exchangeRate={exchangeRate}
                    type="crypto"
                    onUpdate={onUpdateCrypto}
                    onDelete={onDeleteCrypto}
                    onSell={handleSellCrypto}
                    loading={loading}
                  />
                ) : activeAssetTab === 'crypto' ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    <p>Belum ada kripto yang ditambahkan</p>
                    <button 
                      onClick={onAddAsset}
                      className="mt-2 inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <FiPlusCircle className="mr-1" /> Tambah Kripto
                    </button>
                  </div>
                ) : null}
              </div>
            )}
            
            {assets.stocks.length === 0 && assets.crypto.length === 0 && (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                  <FiDollarSign className="text-2xl text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Portfolio Kosong</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Mulai tambahkan aset saham atau kripto ke portfolio Anda</p>
                <button 
                  onClick={onAddAsset}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition inline-flex items-center"
                >
                  <FiPlusCircle className="mr-2" /> Tambah Aset
                </button>
              </div>
            )}
          </>
        )}
        
        {lastUpdate && assets.stocks.length + assets.crypto.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs flex justify-between">
            <span>Terakhir diperbarui: {lastUpdate}</span>
            {!loading && <button 
              onClick={handleRefresh}
              className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Refresh sekarang
            </button>}
          </div>
        )}
      </div>
    </div>
  );
}