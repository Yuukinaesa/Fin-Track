// pages/index.js
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Portfolio from '../components/Portfolio';
import StockInput from '../components/StockInput';
import CryptoInput from '../components/CryptoInput';
import TransactionHistory from '../components/TransactionHistory';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../lib/authContext';
import { useRouter } from 'next/router';
import { collection, addDoc, query, orderBy, getDocs, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiLogOut, FiUser } from 'react-icons/fi';
import { debounce } from 'lodash';
import { calculatePortfolioValue, validateTransaction, isPriceDataAvailable, getRealPriceData } from '../lib/utils';

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

  // Add effect to update pending transactions when prices change
  useEffect(() => {
    const updatePendingTransactions = async () => {
      if (Object.keys(prices).length > 0 && exchangeRate) {
        const updatedTransactions = transactions.map(transaction => {
          if (transaction.isPending) {
            const priceData = prices[transaction.ticker || transaction.symbol];
            if (priceData) {
              return {
                ...transaction,
                isPending: false
              };
            }
          }
          return transaction;
        });

        if (JSON.stringify(updatedTransactions) !== JSON.stringify(transactions)) {
          setTransactions(updatedTransactions);
        }
      }
    };

    updatePendingTransactions();
  }, [prices, exchangeRate, transactions]);

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

  // Memoize formatPrice function
  const formatPrice = useCallback((value, currency = 'IDR') => {
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
  }, []);

  // Fetch exchange rate on component mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('/api/exchange-rate');
        
        if (!response.ok) {
          throw new Error(`Exchange rate API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.rate) {
          setExchangeRate(data.rate);
        } else {
          throw new Error('Invalid exchange rate data received');
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        // Set exchange rate to null to prevent invalid calculations
        setExchangeRate(null);
      }
    };

    // Fetch immediately on mount
    fetchExchangeRate();
    
    // Set up interval to fetch every 5 minutes
    const interval = setInterval(fetchExchangeRate, 300000);
    
    return () => clearInterval(interval);
  }, []);

  // Debounce price fetching
  const debouncedFetchPrices = useCallback(
    debounce(async () => {
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
        // Add error state handling here
      }
    }, 1000),
    [assets, exchangeRate]
  );

  // Fetch prices for assets
  useEffect(() => {
    if (assets.stocks.length > 0 || assets.crypto.length > 0) {
      debouncedFetchPrices();
      const interval = setInterval(debouncedFetchPrices, 900000); // Update every 15 minutes
      return () => clearInterval(interval);
    }
  }, [assets, exchangeRate, debouncedFetchPrices]);

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

  // Fungsi untuk mengupdate transaksi yang ada
  const updateTransaction = async (oldTransaction, newTransaction) => {
    if (!user) return;
    
    try {
      // Update di Firestore
      const transactionRef = doc(db, "users", user.uid, "transactions", oldTransaction.id);
      await updateDoc(transactionRef, {
        ...newTransaction,
        serverTimestamp: serverTimestamp()
      });
      
      // Update di state lokal
      setTransactions(prev => prev.map(tx => 
        tx.id === oldTransaction.id ? { ...newTransaction, id: tx.id } : tx
      ));
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

  // Update addTransaction function with validation
  const addTransaction = async (transaction) => {
    if (!user) return;
    
    try {
      // Validate transaction data
      validateTransaction(transaction);
      
      // Ensure valueIDR and valueUSD are always numeric values 
      const valueIDR = typeof transaction.valueIDR === 'number' ? transaction.valueIDR : 0;
      const valueUSD = typeof transaction.valueUSD === 'number' ? transaction.valueUSD : 0;
      
      // Format price for display
      const priceFormatted = transaction.priceFormatted || formatPrice(valueIDR, 'IDR');
      
      // Create clean transaction object
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
        priceFormatted: priceFormatted,
        isPending: transaction.isPending || false
      };
      
      // Add to Firestore
      const transactionsRef = collection(db, "users", user.uid, "transactions");
      const docRef = await addDoc(transactionsRef, {
        ...cleanTransaction,
        serverTimestamp: serverTimestamp()
      });
      
      // Add to local state with document ID
      const newTransaction = {
        ...cleanTransaction,
        id: docRef.id
      };
      
      setTransactions(prev => [newTransaction, ...prev]);
      return docRef.id;
    } catch (error) {
      console.error("Error adding transaction:", error);
      throw error; // Re-throw for error handling in parent functions
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

  // Update portfolio value calculation
  useEffect(() => {
    if (prices && exchangeRate) {
      const { totalValueIDR, totalValueUSD } = calculatePortfolioValue(assets, prices, exchangeRate);
      // Update any state or UI that depends on portfolio value
    }
  }, [assets, prices, exchangeRate]);

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
    
    // Check if price data and exchange rate are available
    if (isPriceDataAvailable(prices, stock.ticker) && exchangeRate) {
      try {
        validateExchangeRate(exchangeRate);
        const { valueIDR, valueUSD, price: priceVal } = getRealPriceData(
          prices, 
          stock.ticker, 
          stock.lots * (prices[stock.ticker].currency === 'IDR' ? 100 : 1),
          exchangeRate
        );
        
        // Create transaction with real data
        const transactionData = {
          type: 'buy',
          assetType: 'stock',
          ticker: stock.ticker,
          amount: stock.lots,
          valueIDR: valueIDR,
          valueUSD: valueUSD,
          price: priceVal,
          timestamp: new Date().toISOString(),
          priceFormatted: formatPrice(valueIDR, 'IDR'),
          isPending: false
        };
        
        addTransaction(transactionData);
        
        // Update portfolio
        if (existingStockIndex >= 0) {
          const updatedStocks = [...prev.stocks];
          updatedStocks[existingStockIndex] = {
            ...updatedStocks[existingStockIndex],
            lots: updatedStocks[existingStockIndex].lots + stock.lots,
            isPending: false
          };
          
          return {
            ...prev,
            stocks: updatedStocks
          };
        }
        
        return {
          ...prev,
          stocks: [...prev.stocks, { ...stock, isPending: false }]
        };
      } catch (error) {
        console.error('Error processing stock transaction:', error);
        // Create pending transaction if price data or exchange rate is not available
        const pendingTransaction = {
          type: 'buy',
          assetType: 'stock',
          ticker: stock.ticker,
          amount: stock.lots,
          valueIDR: 0,
          valueUSD: 0,
          price: 0,
          timestamp: new Date().toISOString(),
          priceFormatted: 'Menunggu data harga dan kurs...',
          isPending: true
        };
        
        addTransaction(pendingTransaction).then(transactionId => {
          if (!transactionId) return;
          
          // Try to fetch price data
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
              const { valueIDR, valueUSD, price: newPrice } = getRealPriceData(
                data.prices,
                stock.ticker,
                stock.lots * (data.prices[stock.ticker].currency === 'IDR' ? 100 : 1),
                exchangeRate
              );
              
              const updatedTransaction = {
                type: 'buy',
                assetType: 'stock',
                ticker: stock.ticker,
                amount: stock.lots,
                valueIDR: valueIDR,
                valueUSD: valueUSD,
                price: newPrice,
                timestamp: new Date().toISOString(),
                priceFormatted: formatPrice(valueIDR, 'IDR'),
                isPending: false
              };
              
              updateTransaction(pendingTransaction, updatedTransaction);
            }
          })
          .catch(error => {
            console.error('Error fetching stock price:', error);
          });
        });
        
        // Update portfolio with pending state
        if (existingStockIndex >= 0) {
          const updatedStocks = [...prev.stocks];
          updatedStocks[existingStockIndex] = {
            ...updatedStocks[existingStockIndex],
            lots: updatedStocks[existingStockIndex].lots + stock.lots,
            isPending: true
          };
          
          return {
            ...prev,
            stocks: updatedStocks
          };
        }
        
        return {
          ...prev,
          stocks: [...prev.stocks, { ...stock, isPending: true }]
        };
      }
    } else {
      // Create pending transaction if price data or exchange rate is not available
      const pendingTransaction = {
        type: 'buy',
        assetType: 'stock',
        ticker: stock.ticker,
        amount: stock.lots,
        valueIDR: 0,
        valueUSD: 0,
        price: 0,
        timestamp: new Date().toISOString(),
        priceFormatted: 'Menunggu data harga dan kurs...',
        isPending: true
      };
      
      addTransaction(pendingTransaction).then(transactionId => {
        if (!transactionId) return;
        
        // Try to fetch price data
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
            const { valueIDR, valueUSD, price: newPrice } = getRealPriceData(
              data.prices,
              stock.ticker,
              stock.lots * (data.prices[stock.ticker].currency === 'IDR' ? 100 : 1),
              exchangeRate
            );
            
            const updatedTransaction = {
              type: 'buy',
              assetType: 'stock',
              ticker: stock.ticker,
              amount: stock.lots,
              valueIDR: valueIDR,
              valueUSD: valueUSD,
              price: newPrice,
              timestamp: new Date().toISOString(),
              priceFormatted: formatPrice(valueIDR, 'IDR'),
              isPending: false
            };
            
            updateTransaction(pendingTransaction, updatedTransaction);
          }
        })
        .catch(error => {
          console.error('Error fetching stock price:', error);
        });
      });
      
      // Update portfolio with pending state
      if (existingStockIndex >= 0) {
        const updatedStocks = [...prev.stocks];
        updatedStocks[existingStockIndex] = {
          ...updatedStocks[existingStockIndex],
          lots: updatedStocks[existingStockIndex].lots + stock.lots,
          isPending: true
        };
        
        return {
          ...prev,
          stocks: updatedStocks
        };
      }
      
      return {
        ...prev,
        stocks: [...prev.stocks, { ...stock, isPending: true }]
      };
    }
  });
};
  
const addCrypto = (crypto) => {
  setAssets(prev => {
    // Normalisasi simbol jadi uppercase untuk perbandingan case-insensitive
    const normalizedNewSymbol = crypto.symbol.toUpperCase();
    
    const existingCryptoIndex = prev.crypto.findIndex(c => 
      c.symbol.toUpperCase() === normalizedNewSymbol
    );
    
    // Check if price data and exchange rate are available
    if (isPriceDataAvailable(prices, crypto.symbol) && exchangeRate) {
      try {
        validateExchangeRate(exchangeRate);
        const { valueIDR, valueUSD, price: priceVal } = getRealPriceData(
          prices,
          crypto.symbol,
          crypto.amount,
          exchangeRate
        );
        
        // Create transaction with real data
        const transactionData = {
          type: 'buy',
          assetType: 'crypto',
          symbol: crypto.symbol,
          amount: crypto.amount,
          valueIDR: valueIDR,
          valueUSD: valueUSD,
          price: priceVal,
          timestamp: new Date().toISOString(),
          priceFormatted: formatPrice(valueIDR, 'IDR'),
          isPending: false
        };
        
        addTransaction(transactionData);
        
        // Update portfolio
        if (existingCryptoIndex >= 0) {
          const updatedCrypto = [...prev.crypto];
          updatedCrypto[existingCryptoIndex] = {
            ...updatedCrypto[existingCryptoIndex],
            amount: updatedCrypto[existingCryptoIndex].amount + crypto.amount,
            isPending: false
          };
          
          return {
            ...prev,
            crypto: updatedCrypto
          };
        }
        
        return {
          ...prev,
          crypto: [...prev.crypto, { ...crypto, isPending: false }]
        };
      } catch (error) {
        console.error('Error processing crypto transaction:', error);
        // Create pending transaction if price data or exchange rate is not available
        const pendingTransaction = {
          type: 'buy',
          assetType: 'crypto',
          symbol: crypto.symbol,
          amount: crypto.amount,
          valueIDR: 0,
          valueUSD: 0,
          price: 0,
          timestamp: new Date().toISOString(),
          priceFormatted: 'Menunggu data harga dan kurs...',
          isPending: true
        };
        
        addTransaction(pendingTransaction).then(transactionId => {
          if (!transactionId) return;
          
          // Try to fetch price data
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
              const { valueIDR, valueUSD, price: newPrice } = getRealPriceData(
                data.prices,
                crypto.symbol,
                crypto.amount,
                exchangeRate
              );
              
              const updatedTransaction = {
                type: 'buy',
                assetType: 'crypto',
                symbol: crypto.symbol,
                amount: crypto.amount,
                valueIDR: valueIDR,
                valueUSD: valueUSD,
                price: newPrice,
                timestamp: new Date().toISOString(),
                priceFormatted: formatPrice(valueIDR, 'IDR'),
                isPending: false
              };
              
              updateTransaction(pendingTransaction, updatedTransaction);
            }
          })
          .catch(error => {
            console.error('Error fetching crypto price:', error);
          });
        });
        
        // Update portfolio with pending state
        if (existingCryptoIndex >= 0) {
          const updatedCrypto = [...prev.crypto];
          updatedCrypto[existingCryptoIndex] = {
            ...updatedCrypto[existingCryptoIndex],
            amount: updatedCrypto[existingCryptoIndex].amount + crypto.amount,
            isPending: true
          };
          
          return {
            ...prev,
            crypto: updatedCrypto
          };
        }
        
        return {
          ...prev,
          crypto: [...prev.crypto, { ...crypto, isPending: true }]
        };
      }
    } else {
      // Create pending transaction if price data or exchange rate is not available
      const pendingTransaction = {
        type: 'buy',
        assetType: 'crypto',
        symbol: crypto.symbol,
        amount: crypto.amount,
        valueIDR: 0,
        valueUSD: 0,
        price: 0,
        timestamp: new Date().toISOString(),
        priceFormatted: 'Menunggu data harga dan kurs...',
        isPending: true
      };
      
      addTransaction(pendingTransaction).then(transactionId => {
        if (!transactionId) return;
        
        // Try to fetch price data
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
            const { valueIDR, valueUSD, price: newPrice } = getRealPriceData(
              data.prices,
              crypto.symbol,
              crypto.amount,
              exchangeRate
            );
            
            const updatedTransaction = {
              type: 'buy',
              assetType: 'crypto',
              symbol: crypto.symbol,
              amount: crypto.amount,
              valueIDR: valueIDR,
              valueUSD: valueUSD,
              price: newPrice,
              timestamp: new Date().toISOString(),
              priceFormatted: formatPrice(valueIDR, 'IDR'),
              isPending: false
            };
            
            updateTransaction(pendingTransaction, updatedTransaction);
          }
        })
        .catch(error => {
          console.error('Error fetching crypto price:', error);
        });
      });
      
      // Update portfolio with pending state
      if (existingCryptoIndex >= 0) {
        const updatedCrypto = [...prev.crypto];
        updatedCrypto[existingCryptoIndex] = {
          ...updatedCrypto[existingCryptoIndex],
          amount: updatedCrypto[existingCryptoIndex].amount + crypto.amount,
          isPending: true
        };
        
        return {
          ...prev,
          crypto: updatedCrypto
        };
      }
      
      return {
        ...prev,
        crypto: [...prev.crypto, { ...crypto, isPending: true }]
      };
    }
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

  // Split state for better organization
  const [stocks, setStocks] = useState([]);
  const [crypto, setCrypto] = useState([]);

  // Update portfolio state management
  useEffect(() => {
    setStocks(assets.stocks);
    setCrypto(assets.crypto);
  }, [assets]);

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