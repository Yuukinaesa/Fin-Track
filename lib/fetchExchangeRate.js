// lib/fetchExchangeRate.js
export async function fetchExchangeRate() {
    try {
      // Menggunakan API kurs mata uang
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      
      if (!response.ok) {
        console.warn('Failed to fetch exchange rate');
        return null; // Return null alih-alih nilai default
      }
      
      const data = await response.json();
      if (!data.rates || !data.rates.IDR) {
        console.warn('Exchange rate data incomplete');
        return null;
      }
      
      return {
        rate: data.rates.IDR,
        source: 'Exchange Rate API',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return null; // Return null jika terjadi error
    }
  }