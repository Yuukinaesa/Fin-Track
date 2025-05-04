// test-currency-api.js
const fetch = require('node-fetch');

// Base URL for your API (when running the Next.js dev server)
const API_BASE_URL = 'http://localhost:3000/api';

// Test the exchange rate API
async function testExchangeRate() {
  try {
    console.log('Testing Exchange Rate API...');
    console.log(`Requesting: ${API_BASE_URL}/exchange-rate`);
    
    const response = await fetch(`${API_BASE_URL}/exchange-rate`);
    
    console.log('Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('\nExchange Rate API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.rate) {
      console.log(`\nUSD to IDR Exchange Rate: 1 USD = Rp ${data.rate.toLocaleString('id-ID')}`);
      console.log(`Source: ${data.source}`);
      console.log(`Timestamp: ${new Date(data.timestamp).toLocaleString()}`);
      
      // Basic validation
      if (data.rate < 10000 || data.rate > 20000) {
        console.warn('\nWARNING: Exchange rate seems unusual for USD/IDR (expected between ~10,000-20,000)');
      } else {
        console.log('\nExchange rate value is within expected range');
      }
    } else {
      console.error('\nERROR: No rate found in the response data');
    }
    
    return data;
  } catch (error) {
    console.error('\nExchange Rate API Test Failed:', error.message);
    return null;
  }
}

// Direct call to external API for comparison
async function testExternalAPI() {
  try {
    console.log('\n\nTesting External Exchange Rate API directly...');
    console.log('Requesting: https://api.exchangerate-api.com/v4/latest/USD');
    
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    console.log('Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('\nExternal API Response (sample):');
    
    // Just show a subset of the data to avoid cluttering the console
    const subset = {
      base: data.base,
      date: data.date,
      time_last_updated: data.time_last_updated,
      rates: {
        IDR: data.rates.IDR,
        EUR: data.rates.EUR,
        GBP: data.rates.GBP,
        JPY: data.rates.JPY
        // Only showing a few major currencies
      }
    };
    
    console.log(JSON.stringify(subset, null, 2));
    
    if (data.rates && data.rates.IDR) {
      console.log(`\nDirect External API - USD to IDR: 1 USD = Rp ${data.rates.IDR.toLocaleString('id-ID')}`);
    }
    
    return data;
  } catch (error) {
    console.error('\nExternal API Test Failed:', error.message);
    return null;
  }
}

// Run the tests
async function runTests() {
  console.log('=== Currency Exchange Rate API Test ===\n');
  
  // Test your Next.js API
  const yourApiData = await testExchangeRate();
  
  // Test external API directly for comparison
  const externalApiData = await testExternalAPI();
  
  // Compare results if both tests succeeded
  if (yourApiData?.rate && externalApiData?.rates?.IDR) {
    console.log('\n=== Comparison ===');
    console.log(`Your API:     1 USD = Rp ${yourApiData.rate.toLocaleString('id-ID')}`);
    console.log(`External API: 1 USD = Rp ${externalApiData.rates.IDR.toLocaleString('id-ID')}`);
    
    const difference = Math.abs(yourApiData.rate - externalApiData.rates.IDR);
    console.log(`Difference:   Rp ${difference.toLocaleString('id-ID')}`);
    
    if (difference === 0) {
      console.log('\nResult: ✅ Perfect match!');
    } else if (difference < 1) {
      console.log('\nResult: ✅ Very close match (difference < 1)');
    } else {
      console.log('\nResult: ⚠️ Values are different');
    }
  }
  
  console.log('\n=== Testing Complete ===');
}

// Execute the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
});