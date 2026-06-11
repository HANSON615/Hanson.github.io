import axios from 'axios';

async function testMisTwAPI(symbol) {
  console.log(`\n========================================`);
  console.log(`Testing Mis.tw API for: ${symbol}`);
  console.log(`========================================`);

  try {
    const response = await axios.get(
      `https://mis.twse.com.tw/stock/api/getStockInfo.jsp`,
      {
        params: {
          ex_ch: `tse_${symbol}.tw|otc_${symbol}.tw`,
          json: 1,
          delay: 0
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://mis.twse.com.tw/stock/index.jsp'
        },
        timeout: 15000
      }
    );

    console.log(`✅ Success! Status: ${response.status}`);
    console.log(`\n📊 Response:`, JSON.stringify(response.data, null, 2));

    if (response.data && response.data.msgArray && response.data.msgArray.length > 0) {
      const stockInfo = response.data.msgArray[0];
      console.log(`\n📈 Stock Info:`, stockInfo);

      let price = null;
      
      if (stockInfo.z && stockInfo.z !== '-') {
        price = parseFloat(stockInfo.z);
        console.log(`\n💰 Got latest price from z (成交價): ${price}`);
      } else if (stockInfo.y && stockInfo.y !== '-') {
        price = parseFloat(stockInfo.y);
        console.log(`\n💰 Got price from y (昨收價): ${price}`);
      } else if (stockInfo.b && stockInfo.b !== '-') {
        const buyPrices = stockInfo.b.split('_');
        if (buyPrices[0]) {
          price = parseFloat(buyPrices[0]);
          console.log(`\n💰 Got price from b (最佳買價): ${price}`);
        }
      }

      if (price && !isNaN(price)) {
        console.log(`\n🎉 SUCCESS! Price for ${symbol}: ${price}`);
        return { success: true, price, symbol };
      }
    }
  } catch (error) {
    console.log(`❌ Failed:`, error.message);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
  }

  console.log(`\n❌ Failed to get price for ${symbol}`);
  return { success: false };
}

// Test some common Taiwan stocks
const testSymbols = ['0050', '2330', '00911', '2317', '0056'];

async function runTests() {
  console.log('🧪 Starting Mis.tw API tests...\n');
  
  const results = [];
  
  for (const symbol of testSymbols) {
    const result = await testMisTwAPI(symbol);
    results.push({ symbol, ...result });
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n\n========================================`);
  console.log(`📋 TEST SUMMARY`);
  console.log(`========================================`);
  for (const r of results) {
    if (r.success) {
      console.log(`✅ ${r.symbol}: $${r.price}`);
    } else {
      console.log(`❌ ${r.symbol}: Failed to get price`);
    }
  }
  console.log(`========================================`);
}

runTests().catch(console.error);
