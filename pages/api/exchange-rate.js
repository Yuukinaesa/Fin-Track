// pages/api/exchange-rate.js
export default async function handler(req, res) {
    try {
      // Menggunakan API kurs mata uang
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      
      if (!response.ok) {
        throw new Error(`External API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.rates || !data.rates.IDR) {
        return res.status(404).json({ 
          message: 'Exchange rate data for IDR not found',
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(200).json({
        rate: data.rates.IDR,
        source: 'Exchange Rate API',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      res.status(500).json({ 
        message: 'Failed to fetch exchange rate data',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }