import axios from 'axios';

async function testYahooFinance(symbol) {
  console.log(`\n========================================`);
  console.log(`Testing Yahoo Finance for: ${symbol}`);
  console.log(`========================================`);

  const yahooSymbolFormats = [
    `${symbol}.TW`,
    `${symbol}.TWO`,
    symbol,
    `${symbol}.TWO.TW`,
  ];

  for (const yahooSymbol of yahooSymbolFormats) {
    try {
      console.log(`\nTrying: ${yahooSymbol}`);
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        {
          params: {
            interval: '1d',
            range: '5d'
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
          },
          timeout: 20000
        }
      );

      console.log(`✅ Success! Status: ${response.status}`);
      
      if (response.data.chart?.result?.length > 0) {
        const result = response.data.chart.result[0];
        const meta = result.meta;
        const indicators = result.indicators;

        console.log(`\n📊 Meta Data:`);
        console.log(`   - regularMarketPrice: ${meta.regularMarketPrice}`);
        console.log(`   - chartPreviousClose: ${meta.chartPreviousClose}`);
        console.log(`   - previousClose: ${meta.previousClose}`);
        console.log(`   - currency: ${meta.currency}`);
        console.log(`   - exchangeTimezoneName: ${meta.exchangeTimezoneName}`);
        console.log(`   - symbol: ${meta.symbol}`);

        // Try to get price
        let price = null;
        
        if (meta.regularMarketPrice && typeof meta.regularMarketPrice === 'number') {
          price = meta.regularMarketPrice;
          console.log(`\n💰 Got price from regularMarketPrice: ${price}`);
        }
        else if (indicators?.quote?.[0]?.close) {
          const closes = indicators.quote[0].close;
          const validCloses = closes.filter(c => c !== null && typeof c === 'number');
          if (validCloses.length > 0) {
            price = validCloses[validCloses.length - 1];
            console.log(`\n💰 Got price from indicators (latest close): ${price}`);
          }
        }
        else if (meta.chartPreviousClose && typeof meta.chartPreviousClose === 'number') {
          price = meta.chartPreviousClose;
          console.log(`\n💰 Got price from chartPreviousClose: ${price}`);
        }
        else if (meta.previousClose && typeof meta.previousClose === 'number') {
          price = meta.previousClose;
          console.log(`\n💰 Got price from previousClose: ${price}`);
        }

        if (price !== null) {
          console.log(`\n🎉 SUCCESS! Price for ${symbol}: ${price}`);
          return { success: true, price, symbol: yahooSymbol };
        }
      }
    } catch (error) {
      console.log(`❌ Failed for ${yahooSymbol}:`, error.message);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
      }
    }
  }

  console.log(`\n❌ All approaches failed for ${symbol}`);
  return { success: false };
}

// Test some common Taiwan stocks
const testSymbols = ['0050', '2330', '00911', '2317', '0056'];

async function runTests() {
  console.log('🧪 Starting Yahoo Finance API tests...\n');
  
  const results = [];
  
  for (const symbol of testSymbols) {
    const result = await testYahooFinance(symbol);
    results.push({ symbol, ...result });
  }

  console.log(`\n\n========================================`);
  console.log(`📋 TEST SUMMARY`);
  console.log(`========================================`);
  for (const r of results) {
    if (r.success) {
      console.log(`✅ ${r.symbol}: $${r.price} (via ${r.symbol})`);
    } else {
      console.log(`❌ ${r.symbol}: Failed to get price`);
    }
  }
  console.log(`========================================`);
}

runTests().catch(console.error);
