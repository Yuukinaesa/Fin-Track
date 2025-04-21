// pages/api/prices.js
import { fetchStockPrices, fetchCryptoPrices } from '../../lib/fetchPrices';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  
  const { stocks, crypto, exchangeRate } = req.body;
  
  try {
    // Buat Promise untuk fetch data secara parallel
    const stockPromise = stocks && stocks.length > 0 
      ? fetchStockPrices(stocks) 
      : Promise.resolve({});
      
    const cryptoPromise = crypto && crypto.length > 0 
      ? fetchCryptoPrices(crypto) 
      : Promise.resolve({});
    
    // Fetch data secara parallel untuk kecepatan
    const [stockPrices, cryptoPrices] = await Promise.all([
      stockPromise,
      cryptoPromise
    ]);
    
    // Gabungkan semua data harga
    const prices = {
      ...stockPrices,
      ...cryptoPrices
    };
    
    // Buat response
    const response = {
      prices,
      timestamp: new Date().toISOString(),
      statusMessage: 'Berhasil mengambil data terbaru'
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ 
      message: 'Gagal mengambil data harga',
      error: error.message,
      prices: {},
      timestamp: new Date().toISOString()
    });
  }
}