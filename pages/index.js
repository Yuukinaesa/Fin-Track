// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Portfolio from '../components/Portfolio';
import StockInput from '../components/StockInput';
import CryptoInput from '../components/CryptoInput';
import TransactionHistory from '../components/TransactionHistory';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../lib/authContext';
import { useRouter } from 'next/router';
import { collection, addDoc, query, orderBy, getDocs, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiLogOut, FiUser } from 'react-icons/fi';

export default function Home() {
  const [assets, setAssets] = useState({
    stocks: [],
    crypto: []
  });
  const [activeTab, setActiveTab] = useState('portfolio'); // portfolio, add, history
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const { user, loading: authLoading, logout, getUserPortfolio, saveUserPortfolio } = useAuth();
  const router = useRouter();
  const [prices, setPrices] = useState({});
  const [exchangeRate, setExchangeRate] = useState(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading) {
        if (!user) {
          router.push('/login');
        } else {
          try {
            setLoading(true);
            const portfolio = await getUserPortfolio();
            setAssets(portfolio);
            
            // Tambahkan pengambilan data transaksi
            await fetchTransactions();
          } catch (error) {
            console.error("Error loading portfolio:", error);
          } finally {
            setLoading(false);
          }
        }
      }
    };

    checkAuth();
  }, [user, authLoading, router, getUserPortfolio]);

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

  // Fetch exchange rate on component mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('/api/exchange-rate');
        
        if (!response.ok) {
          console.warn(`Exchange rate API error: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        
        if (data.rate) {
          setExchangeRate(data.rate);
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
      }
    };

    fetchExchangeRate();
  }, []);

  // Fetch prices for assets
  useEffect(() => {
    const fetchPrices = async () => {
      const stockTickers = assets.stocks.map(stock => stock.ticker);
      const cryptoSymbols = assets.crypto.map(crypto => crypto.symbol);
      
      if (stockTickers.length === 0 && cryptoSymbols.length === 0) {
        return;
      }
      
      try {
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
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };

    if (assets.stocks.length > 0 || assets.crypto.length > 0) {
      fetchPrices();
      const interval = setInterval(fetchPrices, 300000); // Update every 5 minutes
      return () => clearInterval(interval);
    }
  }, [assets, exchangeRate]);

  // Fungsi untuk mengambil data transaksi dari Firestore
  const fetchTransactions = async () => {
    if (!user) return;
    
    try {
      setLoadingTransactions(true);
      const transactionsRef = collection(db, "users", user.uid, "transactions");
      const q = query(transactionsRef, orderBy("serverTimestamp", "desc"));
      const querySnapshot = await getDocs(q);
      
      const transactionsData = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp || doc.data().serverTimestamp?.toDate?.() || new Date()
        });
      });
      
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fungsi untuk menambahkan transaksi baru
  const addTransaction = async (transaction) => {
    if (!user) return;
    
    try {
      // Ensure valueIDR and valueUSD are always numeric values 
      const valueIDR = typeof transaction.valueIDR === 'number' ? transaction.valueIDR : 0;
      const valueUSD = typeof transaction.valueUSD === 'number' ? transaction.valueUSD : 0;
      
      // Format price for display
      const priceFormatted = transaction.priceFormatted || formatPrice(valueIDR, 'IDR');
      
      // Pastikan semua field ada dengan nilai default yang valid
      const cleanTransaction = {
        type: transaction.type || 'buy',
        assetType: transaction.assetType || 'unknown',
        ticker: transaction.ticker || transaction.symbol || 'UNKNOWN',
        symbol: transaction.symbol || transaction.ticker || 'UNKNOWN',
        amount: transaction.amount || 0,
        valueIDR: valueIDR,
        valueUSD: valueUSD,
        price: transaction.price || 0,
        timestamp: transaction.timestamp || new Date().toISOString(),
        priceFormatted: priceFormatted
      };
      
      // Tambahkan ke Firestore
      const transactionsRef = collection(db, "users", user.uid, "transactions");
      const docRef = await addDoc(transactionsRef, {
        ...cleanTransaction,
        serverTimestamp: serverTimestamp()
      });
      
      // Tambahkan ke state lokal dengan ID dokumen
      const newTransaction = {
        ...cleanTransaction,
        id: docRef.id
      };
      
      setTransactions(prev => [newTransaction, ...prev]);
      return docRef.id;
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  // Save portfolio to Firebase whenever it changes
  useEffect(() => {
    const savePortfolio = async () => {
      if (user && !loading && !authLoading) {
        await saveUserPortfolio(assets);
      }
    };

    savePortfolio();
  }, [assets, user, loading, authLoading, saveUserPortfolio]);

  // Functions for managing assets
// In index.js file
// Modified addStock function

const addStock = (stock) => {
  setAssets(prev => {
    // Normalisasi ticker jadi uppercase untuk perbandingan case-insensitive
    const normalizedNewTicker = stock.ticker.toUpperCase();
    
    const existingStockIndex = prev.stocks.findIndex(s => 
      s.ticker.toUpperCase() === normalizedNewTicker
    );
    
    // Get price data if available to include in transaction
    let valueIDR = 0;
    let valueUSD = 0;
    let priceVal = 0;
    
    if (prices && prices[stock.ticker]) {
      // If we have real price data, use it
      const price = prices[stock.ticker];
      const shareCount = price.currency === 'IDR' ? stock.lots * 100 : stock.lots;
      
      if (price.currency === 'IDR') {
        valueIDR = price.price * shareCount;
        valueUSD = exchangeRate ? valueIDR / exchangeRate : 0;
        priceVal = price.price;
      } else if (price.currency === 'USD' && exchangeRate) {
        valueUSD = price.price * shareCount;
        valueIDR = valueUSD * exchangeRate;
        priceVal = price.price;
      }
      
      // Create transaction data with real values
      const transactionData = {
        type: 'buy',
        assetType: 'stock',
        ticker: stock.ticker,
        amount: stock.lots,
        valueIDR: valueIDR,
        valueUSD: valueUSD,
        price: priceVal,
        timestamp: new Date().toISOString(),
        priceFormatted: formatPrice(valueIDR, 'IDR')
      };
      
      // Add transaction with real data
      addTransaction(transactionData);
    } else {
      // If price data isn't available yet, fetch it directly
      fetch('/api/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: [stock.ticker],
          crypto: [],
          exchangeRate: exchangeRate
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.prices && data.prices[stock.ticker]) {
          // Process the real price data and add transaction with updated values
          const price = data.prices[stock.ticker];
          const shareCount = price.currency === 'IDR' ? stock.lots * 100 : stock.lots;
          
          let newValueIDR = 0;
          let newValueUSD = 0;
          
          if (price.currency === 'IDR') {
            newValueIDR = price.price * shareCount;
            newValueUSD = exchangeRate ? newValueIDR / exchangeRate : 0;
          } else if (price.currency === 'USD' && exchangeRate) {
            newValueUSD = price.price * shareCount;
            newValueIDR = newValueUSD * exchangeRate;
          }
          
          // Create an updated transaction with real values
          const updatedTransaction = {
            type: 'buy',
            assetType: 'stock',
            ticker: stock.ticker,
            amount: stock.lots,
            valueIDR: newValueIDR,
            valueUSD: newValueUSD,
            price: price.price,
            timestamp: new Date().toISOString(),
            priceFormatted: formatPrice(newValueIDR, 'IDR')
          };
          
          // Add the transaction with real data
          addTransaction(updatedTransaction);
        } else {
          // If we still can't get price data, add a fallback transaction
          const estimatedPriceUSD = stock.ticker.includes(':JK') ? 5000 * exchangeRate : 50;
          const estimatedShareCount = stock.ticker.includes(':JK') ? stock.lots * 100 : stock.lots;
          const estimatedValueUSD = stock.ticker.includes(':JK') ? 
            (5000 * estimatedShareCount / exchangeRate) : 
            (estimatedPriceUSD * estimatedShareCount);
          const estimatedValueIDR = stock.ticker.includes(':JK') ? 
            (5000 * estimatedShareCount) : 
            (estimatedPriceUSD * estimatedShareCount * exchangeRate);
          
          const fallbackTransaction = {
            type: 'buy',
            assetType: 'stock',
            ticker: stock.ticker,
            amount: stock.lots,
            valueIDR: estimatedValueIDR,
            valueUSD: estimatedValueUSD,
            price: stock.ticker.includes(':JK') ? 5000 : estimatedPriceUSD,
            timestamp: new Date().toISOString(),
            priceFormatted: formatPrice(estimatedValueIDR, 'IDR')
          };
          
          addTransaction(fallbackTransaction);
        }
      })
      .catch(error => {
        console.error('Error fetching stock price:', error);
        
        // Add fallback transaction in case of error
        const estimatedPriceUSD = stock.ticker.includes(':JK') ? 5000 * exchangeRate : 50;
        const estimatedShareCount = stock.ticker.includes(':JK') ? stock.lots * 100 : stock.lots;
        const estimatedValueUSD = stock.ticker.includes(':JK') ? 
          (5000 * estimatedShareCount / exchangeRate) : 
          (estimatedPriceUSD * estimatedShareCount);
        const estimatedValueIDR = stock.ticker.includes(':JK') ? 
          (5000 * estimatedShareCount) : 
          (estimatedPriceUSD * estimatedShareCount * exchangeRate);
        
        const fallbackTransaction = {
          type: 'buy',
          assetType: 'stock',
          ticker: stock.ticker,
          amount: stock.lots,
          valueIDR: estimatedValueIDR,
          valueUSD: estimatedValueUSD,
          price: stock.ticker.includes(':JK') ? 5000 : estimatedPriceUSD,
          timestamp: new Date().toISOString(),
          priceFormatted: formatPrice(estimatedValueIDR, 'IDR')
        };
        
        addTransaction(fallbackTransaction);
      });
    }
    
    // Update portfolio
    if (existingStockIndex >= 0) {
      const updatedStocks = [...prev.stocks];
      updatedStocks[existingStockIndex] = {
        ...updatedStocks[existingStockIndex],
        lots: updatedStocks[existingStockIndex].lots + stock.lots
      };
      
      return {
        ...prev,
        stocks: updatedStocks
      };
    }
    
    return {
      ...prev,
      stocks: [...prev.stocks, stock]
    };
  });
};
  
const addCrypto = (crypto) => {
  setAssets(prev => {
    // Normalisasi simbol jadi uppercase untuk perbandingan case-insensitive
    const normalizedNewSymbol = crypto.symbol.toUpperCase();
    
    const existingCryptoIndex = prev.crypto.findIndex(c => 
      c.symbol.toUpperCase() === normalizedNewSymbol
    );
    
    // Get price data if available to include in transaction
    let valueIDR = 0;
    let valueUSD = 0;
    let priceVal = 0;
    
    if (prices && prices[crypto.symbol]) {
      const price = prices[crypto.symbol];
      
      valueUSD = price.price * crypto.amount;
      priceVal = price.price;
      
      if (price.priceIDR) {
        valueIDR = price.priceIDR * crypto.amount;
      } else if (exchangeRate) {
        valueIDR = valueUSD * exchangeRate;
      }
      
      // Create transaction data with real price
      const transactionData = {
        type: 'buy',
        assetType: 'crypto',
        symbol: crypto.symbol,
        amount: crypto.amount,
        valueIDR: valueIDR,
        valueUSD: valueUSD,
        price: priceVal,
        timestamp: new Date().toISOString(),
        priceFormatted: formatPrice(valueIDR, 'IDR')
      };
      
      // Add transaction with real data
      addTransaction(transactionData);
    } else {
      // If price data isn't available yet, fetch it directly
      fetch('/api/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: [],
          crypto: [crypto.symbol],
          exchangeRate: exchangeRate
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.prices && data.prices[crypto.symbol]) {
          // Process the real price data
          const price = data.prices[crypto.symbol];
          
          let newValueUSD = price.price * crypto.amount;
          let newValueIDR = 0;
          
          if (price.priceIDR) {
            newValueIDR = price.priceIDR * crypto.amount;
          } else if (exchangeRate) {
            newValueIDR = newValueUSD * exchangeRate;
          }
          
          // Create updated transaction with real values
          const updatedTransaction = {
            type: 'buy',
            assetType: 'crypto',
            symbol: crypto.symbol,
            amount: crypto.amount,
            valueIDR: newValueIDR,
            valueUSD: newValueUSD,
            price: price.price,
            timestamp: new Date().toISOString(),
            priceFormatted: formatPrice(newValueIDR, 'IDR')
          };
          
          // Add transaction with real data
          addTransaction(updatedTransaction);
        } else {
          // If we still can't get price data, add a fallback transaction
          const estimatedPrice = getEstimatedCryptoPrice(crypto.symbol);
          const estimatedValueUSD = estimatedPrice * crypto.amount;
          const estimatedValueIDR = exchangeRate ? estimatedValueUSD * exchangeRate : 0;
          
          const fallbackTransaction = {
            type: 'buy',
            assetType: 'crypto',
            symbol: crypto.symbol,
            amount: crypto.amount,
            valueIDR: estimatedValueIDR,
            valueUSD: estimatedValueUSD,
            price: estimatedPrice,
            timestamp: new Date().toISOString(),
            priceFormatted: formatPrice(estimatedValueIDR, 'IDR')
          };
          
          addTransaction(fallbackTransaction);
        }
      })
      .catch(error => {
        console.error('Error fetching crypto price:', error);
        
        // Add fallback transaction in case of error
        const estimatedPrice = getEstimatedCryptoPrice(crypto.symbol);
        const estimatedValueUSD = estimatedPrice * crypto.amount;
        const estimatedValueIDR = exchangeRate ? estimatedValueUSD * exchangeRate : 0;
        
        const fallbackTransaction = {
          type: 'buy',
          assetType: 'crypto',
          symbol: crypto.symbol,
          amount: crypto.amount,
          valueIDR: estimatedValueIDR,
          valueUSD: estimatedValueUSD,
          price: estimatedPrice,
          timestamp: new Date().toISOString(),
          priceFormatted: formatPrice(estimatedValueIDR, 'IDR')
        };
        
        addTransaction(fallbackTransaction);
      });
    }
    
    // Update portfolio
    if (existingCryptoIndex >= 0) {
      const updatedCrypto = [...prev.crypto];
      updatedCrypto[existingCryptoIndex] = {
        ...updatedCrypto[existingCryptoIndex],
        amount: updatedCrypto[existingCryptoIndex].amount + crypto.amount
      };
      
      return {
        ...prev,
        crypto: updatedCrypto
      };
    }
    
    return {
      ...prev,
      crypto: [...prev.crypto, crypto]
    };
  });
};
  
  // Helper to get estimated crypto price for placeholder when real data unavailable
  const getEstimatedCryptoPrice = (symbol) => {
    // Just a simple estimation for placeholder values
    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol === 'BTC') return 50000;
    if (upperSymbol === 'ETH') return 3000;
    if (upperSymbol === 'BNB') return 400;
    if (upperSymbol === 'SOL') return 100;
    return 1; // Default value for other cryptos
  };
  
  const updateStock = (index, updatedStock) => {
    setAssets(prev => {
      const updatedStocks = [...prev.stocks];
      updatedStocks[index] = updatedStock;
      return {
        ...prev,
        stocks: updatedStocks
      };
    });
  };
  
  const updateCrypto = (index, updatedCrypto) => {
    setAssets(prev => {
      const updatedCryptos = [...prev.crypto];
      updatedCryptos[index] = updatedCrypto;
      return {
        ...prev,
        crypto: updatedCryptos
      };
    });
  };
  
  const deleteStock = (index) => {
    setAssets(prev => ({
      ...prev,
      stocks: prev.stocks.filter((_, i) => i !== index)
    }));
  };
  
  const deleteCrypto = (index) => {
    setAssets(prev => ({
      ...prev,
      crypto: prev.crypto.filter((_, i) => i !== index)
    }));
  };

  // Function to handle stock sell action
  const handleSellStock = (index, asset, amountToSell, priceData) => {
    // Add sell transaction
    const transactionData = {
      type: 'sell',
      assetType: 'stock',
      ticker: asset.ticker,
      amount: amountToSell,
      valueIDR: priceData.valueIDR,
      valueUSD: priceData.valueUSD,
      price: priceData.price,
      timestamp: priceData.date,
      priceFormatted: formatPrice(priceData.valueIDR, 'IDR')
    };
    
    addTransaction(transactionData);
  };
  
  // Function to handle crypto sell action
  const handleSellCrypto = (index, asset, amountToSell, priceData) => {
    // Add sell transaction
    const transactionData = {
      type: 'sell',
      assetType: 'crypto',
      symbol: asset.symbol,
      amount: amountToSell,
      valueIDR: priceData.valueIDR,
      valueUSD: priceData.valueUSD,
      price: priceData.price,
      timestamp: priceData.date,
      priceFormatted: formatPrice(priceData.valueIDR, 'IDR')
    };
    
    addTransaction(transactionData);
  };

  // Main content - only shown if authenticated
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white transition-colors">
      <Head>
        <title>Fin•Track | Portfolio Dinamis</title>
        <meta name="description" content="Portfolio dinamis untuk melacak aset saham dan kripto" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      
      <main className="container mx-auto px-4 py-8 font-['Inter']">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
              Fin•Track
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Portfolio Dinamis Saham & Kripto</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mr-2">
              <button 
                onClick={() => setActiveTab('portfolio')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  activeTab === 'portfolio' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Portfolio
              </button>
              <button 
                onClick={() => setActiveTab('add')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  activeTab === 'add' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Tambah Aset
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  activeTab === 'history' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Riwayat
              </button>
            </div>
            
            <div className="flex items-center">
              <ThemeToggle />
              
              <div className="flex items-center ml-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
                <FiUser className="text-gray-500 dark:text-gray-400 mr-2" />
                <span className="truncate max-w-[100px] sm:max-w-[150px] text-gray-700 dark:text-gray-300">{user?.email}</span>
              </div>
              
              <button 
                onClick={logout}
                className="ml-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Logout"
              >
                <FiLogOut />
              </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
              <p>Memuat portfolio...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'add' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <StockInput onAdd={addStock} onComplete={() => setActiveTab('portfolio')} />
                <CryptoInput onAdd={addCrypto} onComplete={() => setActiveTab('portfolio')} />
              </div>
            ) : activeTab === 'portfolio' ? (
              <Portfolio 
                assets={assets} 
                onUpdateStock={updateStock}
                onUpdateCrypto={updateCrypto}
                onDeleteStock={deleteStock}
                onDeleteCrypto={deleteCrypto}
                onAddAsset={() => setActiveTab('add')}
                onSellStock={handleSellStock}
                onSellCrypto={handleSellCrypto}
              />
            ) : activeTab === 'history' ? (
              loadingTransactions ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                    <p>Memuat riwayat transaksi...</p>
                  </div>
                </div>
              ) : (
                <TransactionHistory 
                  transactions={transactions} 
                  userId={user?.uid}
                  onTransactionsUpdate={setTransactions}
                />
              )
            ) : null}
          </>
        )}
      </main>
      
      <footer className="container mx-auto px-4 py-6 text-center text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
        <p>© {new Date().getFullYear()} Fin•Track Portfolio Dinamis</p>
      </footer>
    </div>
  );
}