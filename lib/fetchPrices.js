// lib/fetchPrices.js
export async function fetchStockPrices(tickers) {
  if (!tickers || tickers.length === 0) return {};
  
  try {
    const result = {};
    
    // Map untuk melacak ticker yang sudah diproses (case-insensitive)
    const processedTickers = new Map();
    
    // Deteksi region berdasarkan ticker
    for (const ticker of tickers) {
      try {
        // Skip jika sudah diproses (case-insensitive)
        const tickerUpper = ticker.toUpperCase();
        if (processedTickers.has(tickerUpper)) {
          continue;
        }
        processedTickers.set(tickerUpper, true);
        
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
          apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}.JK?interval=1d`;
          console.log(`Fetching IDX stock data for ${ticker} from ${apiUrl}`);
        } else if (exchange === 'US' || exchange === 'NASDAQ' || exchange === 'NYSE' || (!exchange && /^[A-Z]{1,5}$/.test(normalizedSymbol))) {
          // US Markets - tidak perlu suffix untuk saham US
          apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}?interval=1d`;
          console.log(`Fetching US stock data for ${ticker} from ${apiUrl}`);
        } else {
          // General stock (gunakan simbol apa adanya)
          apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d`;
          console.log(`Fetching general stock data for ${ticker} from ${apiUrl}`);
        }
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          console.warn(`Could not fetch data for ${ticker}`);
          continue;
        }
        
        const data = await response.json();
        
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
          
          result[ticker] = {
            price,
            currency,
            change,
            lastUpdate: new Date().toLocaleString()
          };
        }
      } catch (tickerError) {
        console.error(`Error fetching data for ${ticker}:`, tickerError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching stock prices:', error);
    return {};
  }
}



export async function fetchCryptoPrices(symbols) {
  if (!symbols || symbols.length === 0) return {};
  
  try {
    // CoinGecko API provides reliable crypto data
    // Pre-defined mapping for common crypto symbols to CoinGecko IDs
    const commonSymbolsToIds = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'SOL': 'solana',
      'DOGE': 'dogecoin',
      'DOT': 'polkadot',
      'MATIC': 'polygon',
      'LTC': 'litecoin',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'AVAX': 'avalanche-2',
      'SHIB': 'shiba-inu',
    };
    
    // Split into supported and potentially unsupported symbols
    const supportedIds = [];
    const symbolMapping = {};
    
    for (const symbol of symbols) {
      let id = commonSymbolsToIds[symbol] || symbol.toLowerCase();
      supportedIds.push(id);
      symbolMapping[id] = symbol;
    }
    
    // Make the API call only if we have symbols to query
    const result = {};
    
    if (supportedIds.length > 0) {
      const idsParam = supportedIds.join(',');
      
      console.log(`Fetching crypto data for: ${idsParam}`);
      
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd,idr&include_24h_change=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Map results back to original symbols
          for (const id of supportedIds) {
            const symbol = symbolMapping[id];
            
            if (data[id]) {
              result[symbol] = {
                price: data[id].usd, // Store USD price as the primary price
                priceIDR: data[id].idr, // Also store IDR price directly from API
                currency: 'USD',
                change: data[id].usd_24h_change || 0,
                lastUpdate: new Date().toLocaleString()
              };
            }
          }
        } else {
          console.warn('Failed to fetch from CoinGecko API:', await response.text());
        }
      } catch (apiError) {
        console.error('Error calling CoinGecko API:', apiError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return {};
  }
}