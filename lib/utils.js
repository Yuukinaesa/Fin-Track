// lib/utils.js

// Helper function to validate exchange rate
export const validateExchangeRate = (rate) => {
  if (!rate || typeof rate !== 'number' || rate <= 0) {
    throw new Error('Invalid exchange rate');
  }
  return true;
};

// Helper function to calculate portfolio value
export const calculatePortfolioValue = (assets, prices, exchangeRate) => {
  let totalValueIDR = 0;
  let totalValueUSD = 0;

  // Validate exchange rate
  validateExchangeRate(exchangeRate);

  // Calculate stocks value
  assets.stocks.forEach(stock => {
    const price = prices[stock.ticker];
    if (price) {
      const shareCount = price.currency === 'IDR' ? stock.lots * 100 : stock.lots;
      if (price.currency === 'IDR') {
        totalValueIDR += price.price * shareCount;
        totalValueUSD += (price.price * shareCount) / exchangeRate;
      } else if (price.currency === 'USD') {
        totalValueUSD += price.price * shareCount;
        totalValueIDR += price.price * shareCount * exchangeRate;
      }
    }
  });

  // Calculate crypto value
  assets.crypto.forEach(crypto => {
    const price = prices[crypto.symbol];
    if (price) {
      if (price.priceIDR) {
        totalValueIDR += price.priceIDR * crypto.amount;
        totalValueUSD += (price.priceIDR * crypto.amount) / exchangeRate;
      } else {
        totalValueUSD += price.price * crypto.amount;
        totalValueIDR += price.price * crypto.amount * exchangeRate;
      }
    }
  });

  return {
    totalValueIDR,
    totalValueUSD
  };
};

// Helper function to validate transaction data
export const validateTransaction = (transaction) => {
  const requiredFields = ['type', 'assetType', 'amount'];
  const missingFields = requiredFields.filter(field => !transaction[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  if (transaction.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  
  return true;
};

// Helper function to check if price data is available
export const isPriceDataAvailable = (prices, symbol) => {
  return prices && prices[symbol] && prices[symbol].price > 0;
};

// Helper function to get real price data
export const getRealPriceData = (prices, symbol, amount, exchangeRate) => {
  const price = prices[symbol];
  if (!price) {
    throw new Error(`Price data not available for ${symbol}`);
  }

  // Validate exchange rate
  validateExchangeRate(exchangeRate);

  let valueIDR = 0;
  let valueUSD = 0;

  if (price.currency === 'IDR') {
    valueIDR = price.price * amount;
    valueUSD = valueIDR / exchangeRate;
  } else if (price.currency === 'USD') {
    valueUSD = price.price * amount;
    valueIDR = valueUSD * exchangeRate;
  }

  return {
    valueIDR,
    valueUSD,
    price: price.price
  };
}; 