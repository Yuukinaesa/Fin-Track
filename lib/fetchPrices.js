// lib/fetchPrices.js
export async function fetchStockPrices(tickers) {
  if (!tickers || tickers.length === 0) return {};
  
  try {
    const result = {};
    
    // Map untuk melacak ticker yang sudah diproses (case-insensitive)
    const processedTickers = new Map();
    // Simple in-memory cache for this request
    const fetchCache = {};
    
    // Deteksi region berdasarkan ticker
    for (const ticker of tickers) {
      try {
        // Skip jika sudah diproses (case-insensitive)
        const tickerUpper = ticker.toUpperCase();
        if (processedTickers.has(tickerUpper)) {
          continue;
        }
        processedTickers.set(tickerUpper, true);
        // Use cache if available
        if (fetchCache[tickerUpper]) {
          result[ticker] = fetchCache[tickerUpper];
          continue;
        }
        
        let symbol = ticker;
        let exchange = '';
        
        // Auto-detect exchange/region berdasarkan format
        // Format: SYMBOL:EXCHANGE atau SYMBOL.EXCHANGE
        if (ticker.includes(':')) {
          [symbol, exchange] = ticker.split(':');
        } else if (ticker.includes('.')) {
          [symbol, exchange] = ticker.split('.');
        }
        
        // Normalisasi simbol untuk menghindari masalah case-sensitivity
        const normalizedSymbol = symbol.toUpperCase();
        
        // Tentukan endpoint dan format symbol berdasarkan exchange
        let apiUrl = '';
        if (exchange === 'JK' || (!exchange && normalizedSymbol.length <= 4 && normalizedSymbol === symbol.toUpperCase())) {
          // Indonesia (IDX)
          apiUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}.JK?interval=1d`;
          console.log(`Fetching IDX stock data for ${ticker} from ${apiUrl}`);
        } else if (ticker.toUpperCase().endsWith('.US') || ticker.toUpperCase().endsWith(':US')) {
          // US Markets - use only the symbol before .US or :US
          const baseSymbol = ticker.split(/[:.]/)[0].toUpperCase();
          apiUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${baseSymbol}?interval=1d`;
          console.log(`Fetching US stock data for ${ticker} (base symbol: ${baseSymbol}) from ${apiUrl}`);
        } else if (exchange === 'US' || exchange === 'NASDAQ' || exchange === 'NYSE' || (!exchange && /^[A-Z]{1,5}$/.test(normalizedSymbol))) {
          apiUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}?interval=1d`;
          console.log(`Fetching US stock data for ${ticker} from ${apiUrl}`);
        } else {
          // General stock (gunakan simbol apa adanya)
          apiUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d`;
          console.log(`Fetching general stock data for ${ticker} from ${apiUrl}`);
        }
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.warn(`Could not fetch data for ${ticker} from ${apiUrl} - status: ${response.status}`);
          continue;
        }
        const data = await response.json();
        console.log('API URL:', apiUrl);
        console.log('API Response:', JSON.stringify(data));
        if (data.chart && 
            data.chart.result && 
            data.chart.result[0] && 
            data.chart.result[0].meta && 
            data.chart.result[0].meta.regularMarketPrice) {
          const price = data.chart.result[0].meta.regularMarketPrice;
          const currency = data.chart.result[0].meta.currency || 'USD';
          // Get price change if available
          let change = 0;
          if (data.chart.result[0].meta.previousClose) {
            const prevClose = data.chart.result[0].meta.previousClose;
            change = ((price - prevClose) / prevClose) * 100;
          }
          // Always use the original ticker as the key
          result[ticker] = {
            price,
            currency,
            change,
            lastUpdate: new Date().toLocaleString()
          };
        }
        // After successful fetch and result assignment:
        if (result[ticker]) {
          fetchCache[tickerUpper] = result[ticker];
        }
      } catch (tickerError) {
        console.error(`Error fetching data for ${ticker}:`, tickerError);
      }
    }
    console.log('Requested tickers:', tickers);
    console.log('Result keys:', Object.keys(result));
    return result;
  } catch (error) {
    console.error('Error fetching stock prices:', error);
    return {};
  }
}

export async function fetchCryptoPrices(symbols) {
  if (!symbols || symbols.length === 0) return {};
  
  try {
    const result = {};
    
    // Fetch all crypto prices in parallel
    const pricePromises = symbols.map(async (symbol) => {
      try {
        // Fetch price and 24h change in a single request
        const response = await fetch(
          `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbol}&tsyms=USD`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.RAW && data.RAW[symbol] && data.RAW[symbol].USD) {
          const priceData = data.RAW[symbol].USD;
          const price = priceData.PRICE;
          const change = priceData.CHANGEPCT24HOUR;
          
          result[symbol] = {
            price,
            currency: 'USD',
            change,
            lastUpdate: new Date().toLocaleString()
          };
        } else {
          console.warn(`No price data available for ${symbol}`);
        }
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
      }
    });
    
    // Wait for all promises to complete
    await Promise.all(pricePromises);
    
    return result;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return {};
  }
}

export async function fetchExchangeRate() {
  try {
    console.log('Attempting to fetch exchange rate...');
    
    // Mengambil data kurs dari Exchange Rates API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error(`Gagal mengambil data kurs: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.conversion_rates || !data.conversion_rates.IDR) {
      throw new Error('Data kurs USD/IDR tidak ditemukan');
    }
    
    const rate = data.conversion_rates.IDR;
    
    if (isNaN(rate)) {
      throw new Error('Format kurs tidak valid');
    }
    
    console.log('Berhasil mengambil kurs:', rate);
    return rate;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}