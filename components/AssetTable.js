// AssetTable.js
import { useState } from 'react';
import { FiEdit2, FiTrash2, FiCheck, FiX, FiArrowDown, FiArrowUp } from 'react-icons/fi';
import Modal from './Modal';

export default function AssetTable({ assets, prices, exchangeRate, type, onUpdate, onDelete, onSell = () => {}, loading = false }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [sellingIndex, setSellingIndex] = useState(null);
  const [sellAmount, setSellAmount] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  
  if (assets.length === 0) {
    return null;
  }
  
  const handleEditClick = (index, value) => {
    setEditingIndex(index);
    setEditValue(value.toString());
  };
  
  const handleSaveEdit = (index, asset) => {
    const updatedValue = parseFloat(editValue);
    
    if (isNaN(updatedValue) || updatedValue <= 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Error',
        message: 'Masukkan nilai yang valid',
        type: 'error'
      });
      return;
    }
    
    let updatedAsset;
    
    if (type === 'stock') {
      updatedAsset = { ...asset, lots: updatedValue };
    } else {
      updatedAsset = { ...asset, amount: updatedValue };
    }
    
    onUpdate(index, updatedAsset);
    setEditingIndex(null);
  };
  
  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleSellClick = (index, asset) => {
    setSellingIndex(index);
    // Default to half of current amount
    const currentAmount = type === 'stock' ? asset.lots : asset.amount;
    setSellAmount((currentAmount / 2).toString());
  };

  const handleSaveSell = (index, asset) => {
    const amountToSell = parseFloat(sellAmount);
    const currentAmount = type === 'stock' ? asset.lots : asset.amount;
    
    if (isNaN(amountToSell) || amountToSell <= 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Peringatan',
        message: 'Masukkan nilai yang valid',
        type: 'error'
      });
      return;
    }
    
    if (amountToSell > currentAmount) {
      setConfirmModal({
        isOpen: true,
        title: 'Peringatan',
        message: `Jumlah yang dijual tidak boleh melebihi jumlah yang dimiliki (${currentAmount})`,
        type: 'error'
      });
      return;
    }
    
    // Tampilkan konfirmasi penjualan
    const ticker = type === 'stock' ? asset.ticker : asset.symbol;
    const price = prices[ticker];
    let valueFormatted = '';
    
    if (price) {
      if (type === 'stock') {
        const shareCount = price.currency === 'IDR' ? amountToSell * 100 : amountToSell;
        const value = price.price * shareCount;
        const valueIDR = price.currency === 'USD' && exchangeRate ? value * exchangeRate : value;
        
        valueFormatted = valueIDR.toLocaleString('id-ID', {style: 'currency', currency: 'IDR'});
      } else {
        const valueUSD = amountToSell * price.price;
        const valueIDR = price.priceIDR ? amountToSell * price.priceIDR : exchangeRate ? valueUSD * exchangeRate : 0;
        
        valueFormatted = valueIDR.toLocaleString('id-ID', {style: 'currency', currency: 'IDR'});
      }
    }
    
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Penjualan',
      message: `Anda akan menjual ${amountToSell} ${type === 'stock' ? 'lot' : ''} ${ticker} ${valueFormatted ? `dengan nilai sekitar ${valueFormatted}` : ''}. Lanjutkan penjualan?`,
      type: 'warning',
      onConfirm: () => {
        onSell(index, asset, amountToSell);
        setSellingIndex(null);
        setConfirmModal(null);
      }
    });
  };
  
  const handleCancelSell = () => {
    setSellingIndex(null);
  };
  
  // Function to format price based on currency and exchange rate
  const formatPrice = (price, currency, inIDR = false) => {
    if (!price && price !== 0) return 'Tidak tersedia';
    
    if (currency === 'IDR' || inIDR) {
      return `Rp ${price.toLocaleString()}`;
    } else {
      return `$ ${price.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: currency === 'USD' ? 2 : 8
      })}`;
    }
  };
  
  const handleDeleteConfirm = (index, asset) => {
    const assetName = type === 'stock' ? asset.ticker : asset.symbol;
    
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: `Anda yakin ingin menghapus ${assetName} dari portfolio Anda?`,
      type: 'error',
      onConfirm: () => {
        onDelete(index);
        setConfirmModal(null);
      }
    });
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {type === 'stock' ? 'Kode Saham' : 'Simbol Kripto'}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {type === 'stock' ? 'Jumlah Lot' : 'Jumlah'}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Harga Asli
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
              Harga (IDR)
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Nilai Portfolio
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {assets.map((asset, index) => {
            const ticker = type === 'stock' ? asset.ticker : asset.symbol;
            const price = prices[ticker];
            
            let originalPrice = 0;
            let priceInIDR = 0;
            let assetValue = 0;
            let assetValueUSD = 0;
            let currency = '';
            
            if (price) {
              currency = price.currency;
              originalPrice = price.price;
              
              // For stocks
              if (type === 'stock') {
                // Jumlah saham sebenarnya = lot * 100 untuk IDX, atau langsung value untuk US (fractional)
                const shareCount = currency === 'IDR' ? asset.lots * 100 : asset.lots;
                
                if (currency === 'IDR') {
                  priceInIDR = originalPrice;
                  assetValue = originalPrice * shareCount;
                  assetValueUSD = exchangeRate ? assetValue / exchangeRate : 0;
                } else if (currency === 'USD' && exchangeRate) {
                  priceInIDR = originalPrice * exchangeRate;
                  assetValueUSD = originalPrice * shareCount;
                  assetValue = assetValueUSD * exchangeRate;
                }
              } 
              // For crypto
              else {
                if (price.priceIDR) {
                  priceInIDR = price.priceIDR;
                  assetValue = price.priceIDR * asset.amount;
                  assetValueUSD = price.price * asset.amount;
                } else if (exchangeRate) {
                  priceInIDR = originalPrice * exchangeRate;
                  assetValueUSD = originalPrice * asset.amount;
                  assetValue = assetValueUSD * exchangeRate;
                }
              }
            }
            
            return (
              <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-750 ${!price ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-8 w-8 rounded-md flex items-center justify-center ${
                      type === 'stock' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    }`}>
                      {ticker.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{ticker}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {type === 'stock' ? 'Saham' : 'Kripto'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {editingIndex === index ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-24 p-1 border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded text-right text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={editValue}
                      onChange={(e) => {
                        // Hanya terima angka dan titik desimal
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setEditValue(value);
                      }}
                    />
                  ) : (
                    <div className="text-sm text-gray-800 dark:text-white">
                      {typeof asset.lots === 'number' || typeof asset.amount === 'number'
                        ? (type === 'stock' 
                            ? asset.lots.toLocaleString(undefined, { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 8 
                              }) 
                            : asset.amount.toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 8 
                              })
                          )
                        : type === 'stock' ? asset.lots : asset.amount
                      }
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {price ? (
                    <div className="text-sm text-gray-800 dark:text-white">
                      {formatPrice(originalPrice, currency)}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {asset.isPending ? 'Menunggu data harga...' : (loading ? 'Memuat...' : 'Tidak tersedia')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right hidden lg:table-cell">
                  {price && priceInIDR ? (
                    <div className="text-sm text-gray-800 dark:text-white">
                      {formatPrice(priceInIDR, 'IDR')}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {asset.isPending ? 'Menunggu data harga...' : (loading ? 'Memuat...' : '-')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {price && (assetValue || assetValue === 0) ? (
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-white">
                        {formatPrice(assetValue, 'IDR')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPrice(assetValueUSD, 'USD')}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {asset.isPending ? 'Menunggu data harga...' : (loading ? 'Memuat...' : '-')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {editingIndex === index ? (
                    <div className="flex space-x-2 justify-center">
                      <button
                        onClick={() => handleSaveEdit(index, asset)}
                        className="bg-green-600 p-1.5 rounded text-white hover:bg-green-700"
                      >
                        <FiCheck className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-500 dark:bg-gray-600 p-1.5 rounded text-white hover:bg-gray-600 dark:hover:bg-gray-700"
                      >
                        <FiX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : sellingIndex === index ? (
                    <div className="flex flex-col space-y-2 items-center">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Jumlah:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-20 p-1 border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded text-right text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                          value={sellAmount}
                          onChange={(e) => {
                            // Hanya terima angka dan titik desimal
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setSellAmount(value);
                          }}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSaveSell(index, asset)}
                          className="bg-amber-600 p-1.5 rounded text-white hover:bg-amber-700"
                        >
                          <FiCheck className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={handleCancelSell}
                          className="bg-gray-500 dark:bg-gray-600 p-1.5 rounded text-white hover:bg-gray-600 dark:hover:bg-gray-700"
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex space-x-2 justify-center">
                      <button
                        onClick={() => handleEditClick(index, type === 'stock' ? asset.lots : asset.amount)}
                        className="bg-indigo-100 dark:bg-indigo-600/40 p-1.5 rounded text-indigo-600 dark:text-white hover:bg-indigo-200 dark:hover:bg-indigo-600"
                      >
                        <FiEdit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfirm(index, asset)}
                        className="bg-red-100 dark:bg-red-600/40 p-1.5 rounded text-red-600 dark:text-white hover:bg-red-200 dark:hover:bg-red-600"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleSellClick(index, asset)}
                        className="bg-amber-100 dark:bg-amber-600/40 px-2 py-1 rounded text-amber-600 dark:text-white hover:bg-amber-200 dark:hover:bg-amber-600 text-xs font-medium"
                      >
                        Jual Sebagian
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Confirmation Modal */}
      {confirmModal && (
        <Modal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          title={confirmModal.title}
          type={confirmModal.type}
        >
          <p>{confirmModal.message}</p>
          <div className="mt-4 flex justify-end space-x-2">
            {confirmModal.onConfirm && (
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-lg text-white font-medium ${
                  confirmModal.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Konfirmasi
              </button>
            )}
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
  );
}