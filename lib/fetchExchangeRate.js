// lib/fetchExchangeRate.js
export async function fetchExchangeRate() {
    try {
      // Menggunakan API kurs mata uang
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rate: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.rates || !data.rates.IDR) {
        throw new Error('Exchange rate data incomplete');
      }
      
      const rate = data.rates.IDR;
      
      // Validasi nilai kurs
      if (isNaN(rate) || rate <= 0) {
        throw new Error('Invalid exchange rate value');
      }
      
      // Validasi range kurs (10,000 - 20,000 IDR per USD)
      if (rate < 10000 || rate > 20000) {
        throw new Error('Exchange rate out of expected range');
      }
      
      return {
        rate,
        source: 'Exchange Rate API',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      throw error; // Propagate error instead of returning null
    }
}