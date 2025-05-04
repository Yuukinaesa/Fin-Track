// components/TransactionHistory.js
import { useState, useEffect } from 'react';
import { FiClock, FiArrowUp, FiArrowDown, FiDownload, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import Modal from './Modal';
import { doc, deleteDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import React from 'react';
import PropTypes from 'prop-types';

export default function TransactionHistory({ transactions = [], userId, onTransactionsUpdate }) {
  const [filteredTransactions, setFilteredTransactions] = useState(transactions);
  const [filter, setFilter] = useState('all'); // all, buy, sell
  const [confirmModal, setConfirmModal] = useState(null);
  const [loadingStates, setLoadingStates] = useState({
    exchangeRate: false,
    stockPrices: false,
    cryptoPrices: false,
    transactions: false
  });
  
  useEffect(() => {
    if (filter === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(tx => tx.type === filter));
    }
  }, [filter, transactions]);
  
  // Format tanggal ke format lokal
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    // CSV header with extended columns
    let csvContent = "Date,Type,Asset,Symbol,Amount,Value (IDR),Value (USD)\n";
    
    // Add each transaction
    filteredTransactions.forEach(tx => {
      // Clean the price format to remove non-breaking space character
      let cleanPriceIDR = '-';
      let cleanPriceUSD = '-';
      
      if (tx.priceFormatted) {
        // Remove currency symbol, non-breaking spaces, and normalize number format
        cleanPriceIDR = tx.priceFormatted
          .replace(/Rp\s*/, '') // Remove Rp and any spaces after it
          .replace(/\xA0/g, '') // Remove non-breaking spaces (the Â character)
          .trim();
      }
      
      if (tx.valueIDR) {
        cleanPriceIDR = tx.valueIDR.toLocaleString('id-ID').replace(/\./g, ',');
      }
      
      if (tx.valueUSD) {
        cleanPriceUSD = tx.valueUSD.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
      
      const row = [
        new Date(tx.timestamp).toLocaleDateString('id-ID'),
        tx.type === 'buy' ? 'Beli' : 'Jual',
        tx.assetType === 'stock' ? 'Saham' : 'Kripto',
        tx.ticker || tx.symbol,
        tx.amount,
        cleanPriceIDR,
        cleanPriceUSD
      ];
      
      // Escape any commas in the data and join with commas
      csvContent += row.map(item => `"${item}"`).join(',') + '\n';
    });
    
    // Create download link with UTF-8 BOM to ensure proper encoding
    const BOM = '\uFEFF'; // UTF-8 BOM
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transaksi_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Function to format currency nicely
  const formatCurrency = (value, currency) => {
    if (value === undefined || value === null || isNaN(value) || value === 0) {
      return '-';
    }
    
    try {
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
      console.error('Error formatting currency:', error);
      return value.toString();
    }
  };
  
  // Delete a single transaction
  const handleDeleteTransaction = async (id) => {
    try {
      if (!userId) return;
      
      const transactionRef = doc(db, "users", userId, "transactions", id);
      await deleteDoc(transactionRef);
      
      // Update local state
      if (onTransactionsUpdate) {
        onTransactionsUpdate(prev => prev.filter(tx => tx.id !== id));
      }
      
      setConfirmModal(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Gagal menghapus transaksi");
    }
  };
  
  // Delete all transactions
  const handleDeleteAllTransactions = async () => {
    try {
      if (!userId) return;
      
      const batch = writeBatch(db);
      const transactionsToDelete = filter === 'all' ? transactions : filteredTransactions;
      
      transactionsToDelete.forEach(tx => {
        const docRef = doc(db, "users", userId, "transactions", tx.id);
        batch.delete(docRef);
      });
      
      await batch.commit();
      
      // Update local state
      if (onTransactionsUpdate) {
        if (filter === 'all') {
          onTransactionsUpdate([]);
        } else {
          onTransactionsUpdate(prev => prev.filter(tx => tx.type !== filter));
        }
      }
      
      setConfirmModal(null);
    } catch (error) {
      console.error("Error deleting all transactions:", error);
      alert("Gagal menghapus semua transaksi");
    }
  };
  
  const confirmDeleteTransaction = (id, symbol) => {
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: `Anda yakin ingin menghapus transaksi ${symbol}?`,
      type: 'error',
      onConfirm: () => handleDeleteTransaction(id)
    });
  };
  
  const confirmDeleteAllTransactions = () => {
    const message = filter === 'all' 
      ? 'Anda yakin ingin menghapus semua riwayat transaksi?' 
      : `Anda yakin ingin menghapus semua riwayat transaksi ${filter === 'buy' ? 'pembelian' : 'penjualan'}?`;
      
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Hapus Semua',
      message,
      type: 'error',
      onConfirm: handleDeleteAllTransactions
    });
  };
  
  // Bisa ditambahkan retry mechanism untuk fetch data yang gagal
  const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };
  
  // Bisa ditambahkan validasi lebih ketat untuk data harga
  const validatePriceData = (price) => {
    if (!price || typeof price !== 'object') return false;
    if (!price.price || price.price <= 0) return false;
    if (!price.currency || !['IDR', 'USD'].includes(price.currency)) return false;
    return true;
  };
  
  // Bisa ditambahkan caching untuk mengurangi API calls
  const cache = new Map();
  const getCachedData = async (key, fetchFn) => {
    if (cache.has(key)) {
      const { data, timestamp } = cache.get(key);
      if (Date.now() - timestamp < 5 * 60 * 1000) return data;
    }
    const data = await fetchFn();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  };
  
  // Bisa ditambahkan error boundary untuk menangkap error yang tidak terduga
  const ErrorBoundary = ({ children }) => {
    const [hasError, setHasError] = useState(false);
    
    useEffect(() => {
      const handleError = (error) => {
        console.error('Error in TransactionHistory:', error);
        setHasError(true);
      };
      
      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, []);
    
    if (hasError) {
      return (
        <div className="p-4 text-center text-red-500">
          Terjadi kesalahan. Silakan refresh halaman.
        </div>
      );
    }
    
    return children;
  };
  
  // Bisa ditambahkan memoization untuk mencegah re-render yang tidak perlu
  const MemoizedTransactionItem = React.memo(({ transaction, onDelete }) => {
    // ... existing transaction item code ...
  });
  
  // Bisa ditambahkan PropTypes untuk validasi props
  TransactionHistory.propTypes = {
    transactions: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['buy', 'sell']).isRequired,
      ticker: PropTypes.string,
      symbol: PropTypes.string,
      amount: PropTypes.number.isRequired,
      valueIDR: PropTypes.number,
      valueUSD: PropTypes.number,
      timestamp: PropTypes.string.isRequired,
      isPending: PropTypes.bool
    })).isRequired,
    userId: PropTypes.string.isRequired,
    onTransactionsUpdate: PropTypes.func.isRequired
  };
  
  return (
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Riwayat Transaksi</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {transactions.length} transaksi tercatat
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilter('buy')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'buy' 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Beli
              </button>
              <button
                onClick={() => setFilter('sell')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'sell' 
                    ? 'bg-amber-600 text-white' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Jual
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {filteredTransactions.length > 0 && (
                <>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center justify-center px-3 py-1 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                  >
                    <FiDownload className="mr-1" /> Export CSV
                  </button>
                  <button
                    onClick={confirmDeleteAllTransactions}
                    className="flex items-center justify-center px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-lg text-sm text-red-700 dark:text-red-300"
                  >
                    <FiTrash2 className="mr-1" /> Hapus Semua
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {filteredTransactions.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTransactions.map((transaction, index) => {
              // Calculate and format value for both buy and sell transactions
              const amountLabel = transaction.assetType === 'stock' 
                ? `${transaction.amount} lot` 
                : `${transaction.amount} ${transaction.symbol || ''}`;
              
              // Format IDR and USD values ensuring we're using numeric values when available
              const valueIDR = typeof transaction.valueIDR === 'number' && transaction.valueIDR > 0
                ? formatCurrency(transaction.valueIDR, 'IDR')
                : (transaction.priceFormatted && transaction.priceFormatted !== '0' 
                  ? transaction.priceFormatted 
                  : '-');
                
              const valueUSD = typeof transaction.valueUSD === 'number' && transaction.valueUSD > 0
                ? formatCurrency(transaction.valueUSD, 'USD')
                : '-';
              
              return (
                <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-md flex items-center justify-center ${
                        transaction.type === 'buy' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        {transaction.type === 'buy' ? <FiArrowDown className="h-5 w-5" /> : <FiArrowUp className="h-5 w-5" />}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {transaction.type === 'buy' ? 'Pembelian' : 'Penjualan'} {transaction.ticker || transaction.symbol}
                          {transaction.isPending && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                              Menunggu data harga
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(transaction.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="text-right mr-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {transaction.type === 'buy' ? '+' : '-'} {amountLabel}
                        </div>
                        
                        {/* Display IDR value consistently for both buy and sell */}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.isPending ? 'Menunggu data harga...' : valueIDR}
                        </div>
                        
                        {/* Display USD value for both buy and sell */}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.isPending ? '-' : valueUSD}
                        </div>
                      </div>
                      
                      <button
                        aria-label={`Delete transaction for ${transaction.ticker || transaction.symbol}`}
                        onClick={() => confirmDeleteTransaction(transaction.id, transaction.ticker || transaction.symbol)}
                        className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <FiClock className="text-2xl text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Tidak Ada Transaksi</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Belum ada riwayat transaksi {filter !== 'all' && `tipe ${filter === 'buy' ? 'pembelian' : 'penjualan'}`}</p>
          </div>
        )}
        
        {/* Confirmation Modal */}
        {confirmModal && (
          <Modal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal(null)}
            title={confirmModal.title}
            type={confirmModal.type}
          >
            <div className="flex items-start">
              <div className="mr-3 mt-0.5 text-red-500 dark:text-red-400">
                <FiAlertTriangle size={24} />
              </div>
              <p>{confirmModal.message}</p>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium"
              >
                Hapus
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-800 dark:text-white font-medium"
              >
                Batal
              </button>
            </div>
          </Modal>
        )}
      </div>
    </ErrorBoundary>
  );
}