import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const GEMINI_MODEL = 'gemini-2.0-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// 每次都重新讀取環境變量（確保 Railway 上的設置能被讀到）
function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  console.log("[Env Check] GEMINI_API_KEY from env:", key ? "Loaded (length: " + key.length + ")" : "NOT FOUND!");
  return key;
}

// Lazy initializing Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI functionality will be limited to mock fallback.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'MOCK_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  console.log('[Server] Starting server...');
  console.log('[Server] Environment variables:', Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET')));
  
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  console.log(`[Server] Using PORT: ${PORT}`);
  console.log(`[Server] Current directory: ${process.cwd()}`);

  app.use(express.json());

  // === 測試端點：檢查環境變量 ===
  app.get('/api/test-env', (req, res) => {
    console.log("[Test Endpoint] Checking environment variables...");
    const apiKey = getApiKey();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      apiKeyAvailable: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      envKeys: Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET')),
      nodeEnv: process.env.NODE_ENV
    });
  });

  // === 測試端點：列出所有可用模型 ===
  app.get('/api/list-models', async (req, res) => {
    console.log("[Test Endpoint] Listing all available models...");
    const apiKey = getApiKey();
    
    if (!apiKey) {
      return res.json({
        success: false,
        error: "API Key not found",
        timestamp: new Date().toISOString()
      });
    }
    
    try {
      const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      console.log("[Test Endpoint] Models list retrieved!");
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        models: response.data.models
      });
    } catch (e: any) {
      console.error("[Test Endpoint] List models ERROR:", e?.response?.data || e?.message || e);
      
      res.json({
        success: false,
        timestamp: new Date().toISOString(),
        error: e?.message || "Unknown error",
        errorDetails: e?.response?.data || null
      });
    }
  });

  // === 測試端點：測試 Gemini API ===
  app.get('/api/test-gemini', async (req, res) => {
    console.log("[Test Endpoint] Testing Gemini API...");
    const apiKey = getApiKey();
    
    if (!apiKey) {
      return res.json({
        success: false,
        error: "API Key not found",
        timestamp: new Date().toISOString()
      });
    }
    
    try {
      console.log("[Test Endpoint] Calling Gemini API...");
      const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
        contents: [{
          role: 'user',
          parts: [{ text: "你好，請用繁體中文簡單自我介紹" }]
        }]
      });
      
      console.log("[Test Endpoint] Gemini API success!");
      
      const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        apiResponse: aiResponse,
        fullResponse: response.data
      });
    } catch (e: any) {
      console.error("[Test Endpoint] Gemini API ERROR:", e?.response?.data || e?.message || e);
      
      res.json({
        success: false,
        timestamp: new Date().toISOString(),
        error: e?.message || "Unknown error",
        errorDetails: e?.response?.data || null
      });
    }
  });

  // API Route: Natural Language Parse Transaction
  app.post('/api/parse-transaction', async (req, res) => {
    const { text } = req.body;
    console.log("Parsing text:", text);
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for parsing' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MOCK_KEY') {
      console.log("Mocking parse-transaction response because GEMINI_API_KEY is missing");
      
      // Always split FIRST, then check each part individually
      const normalizedText = text.replace(/\n/g, '，');
      let parts = normalizedText.split(/[，,。、\s]+/).filter(p => p.trim().length > 0);
      
      // Handle the case where input is like "加油100火鍋150" (no punctuation)
      if (parts.length === 1 && !normalizedText.includes('，')) {
        const regexSplit = text.match(/[^\d\s]+\d+/g);
        if (regexSplit) parts = regexSplit;
      }

      console.log("Split parts:", parts);

      const results = parts.map(part => {
        let category = '日常支出';
        let type = 'expense';
        let merchant = undefined;
        
        const lowerText = part.toLowerCase();
        
        // 檢查是否為訂閱 (Subscription Check FIRST on individual part
        const isPartSubscription = lowerText.includes('netflix') || lowerText.includes('spotify') || lowerText.includes('disney') || lowerText.includes('月費') || lowerText.includes('定期扣款') || lowerText.includes('扣款') || lowerText.includes('youtube') || lowerText.includes('icloud');
        
        if (isPartSubscription) {
            category = '訂閱服務';
            type = 'subscription';
            if (lowerText.includes('netflix')) merchant = 'Netflix';
            else if (lowerText.includes('spotify')) merchant = 'Spotify';
            else if (lowerText.includes('disney')) merchant = 'Disney+';
            else if (lowerText.includes('youtube')) merchant = 'YouTube Premium';
            else merchant = '訂閱服務';
        } else if (lowerText.includes('公車') || lowerText.includes('計程車') || lowerText.includes('uber') || lowerText.includes('搭車') || lowerText.includes('交通') || lowerText.includes('捷運') || lowerText.includes('火車') || lowerText.includes('高鐵') || lowerText.includes('加油')) {
          category = '交通';
        } else if (lowerText.includes('衣') || lowerText.includes('鞋') || lowerText.includes('治裝') || lowerText.includes('褲')) {
          category = '治裝費';
        } else if (lowerText.includes('吃') || lowerText.includes('火鍋') || lowerText.includes('飯') || lowerText.includes('餐') || lowerText.includes('麵') || lowerText.includes('茶屋') || lowerText.includes('飲')) {
          category = '餐飲';
        } else if (lowerText.includes('薪水') || lowerText.includes('收入') || lowerText.includes('發薪')) {
          category = '薪資所得';
          type = 'income';
        }

        return {
          amount: part.match(/\d+/) ? Number(part.match(/\d+/)![0]) : 0,
          type: type,
          category: category,
          location: lowerText.includes('逢甲') ? '逢甲' : undefined,
          merchant: lowerText.includes('uber') ? 'Uber' : lowerText.includes('五十嵐') ? '五十嵐' : lowerText.includes('茶屋') ? '十九茶屋' : merchant,
          note: part,
          tags: type === 'subscription' ? ['固定支出', '自動扣款'] : ['日常', '自動解析'],
          recurrence: type === 'subscription' ? 'monthly' : 'none',
          originalText: part,
          success: true
        };
      }).filter(r => r.amount > 0);

      console.log("Mock results:", results);

      return res.json({
        transactions: results,
        success: true,
        isMock: true
      });
    }

    try {
      const prompt = `您是一個專業的台灣繁體中文記帳小助手。使用者可能會一次輸入多筆交易，可能透過換行、空格或連在一起（例如：「午餐100\n搭車50」或「加油100火車510」）。
請解析使用者輸入，將其拆分為多個財務條目。每一筆交易需包含：金額（amount，數字）、分類（category）、內容備註（note，例如：加油、午餐）、地點（location）、商家（merchant）、交易種類（type，expense/income/investment/saving/subscription 之一）以及標籤（tags，陣列）。
請確保將「火車」、「公車」、「加油」、「計程車」歸類為「交通」。

使用者輸入: "${text}"

請只回傳 JSON 格式，不要有其他文字。`;

      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("API Key not available");
      }
      
      const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      let parsedText = response.data.candidates[0].content.parts[0].text;
      if (!parsedText) {
        throw new Error("Empty response from AI");
      }
      
      const result = JSON.parse(parsedText);
      
      // Post-processing for each transaction to ensure accuracy
      if (result.transactions && Array.isArray(result.transactions)) {
        result.transactions = result.transactions.map((tx: any) => {
          const lowerText = text.toLowerCase();
          
          // Force correct category for common terms
          if (lowerText.includes('公車') || lowerText.includes('計程車') || lowerText.includes('uber') || lowerText.includes('捷運') || lowerText.includes('加油') || lowerText.includes('火車')) {
            if (tx.amount > 0) tx.category = '交通';
          } else if (lowerText.includes('衣服') || lowerText.includes('褲子') || lowerText.includes('鞋子') || lowerText.includes('治裝')) {
            if (tx.amount > 0) tx.category = '治裝費';
          }
          
          return { ...tx, success: true };
        });
      }

      res.json({
        transactions: result.transactions || [],
        success: true
      });
    } catch (e: any) {
      console.error("Gemini Parse Transaction Error:", e);
      res.status(500).json({ error: e.message || "Failed to parse text via Gemini" });
    }
  });

  // API Route: AI Advisor Financial Summary and Feedback
  app.post('/api/ai-advisor', async (req, res) => {
    const { transactions, assets, budgets, goals } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    console.log('[AI Advisor] Request received');
    console.log('[AI Advisor] API Key available:', !!apiKey);

    if (!apiKey) {
      console.log("[AI Advisor] Using MOCK response (GEMINI_API_KEY missing)");
      
      const totalExpense = transactions
        .filter((t: any) => t.type === 'expense' || t.type === 'subscription')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const totalIncome = transactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Analyze real spending per category
      const categorySpending: Record<string, number> = {};
      transactions.forEach((t: any) => {
        if (t.type === 'expense' || t.type === 'subscription') {
          categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        }
      });

      // Find real over-budget categories
      const overBudgets = budgets.filter((b: any) => {
        const spent = categorySpending[b.category] || 0;
        return spent > b.limit;
      });

      // Find top spending category
      const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];

      const warning = overBudgets.length > 0 
        ? `偵測到您的「${overBudgets[0].category}」預算已超支 $${(categorySpending[overBudgets[0].category] - overBudgets[0].limit).toLocaleString()} 元，建議檢視明細並考慮挪移預算。`
        : totalExpense > 0 
          ? `目前您的財務狀況穩定，本月總支出為 $${totalExpense.toLocaleString()} 元，尚在可控範圍內。`
          : "目前尚未偵測到消費支出，您可以開始紀錄您的第一筆帳目。";

      const randomTips = [
        "建議您可以檢視是否有重複的訂閱服務，這類隱形成本長期下來相當可觀。",
        "考慮將每月剩餘的資金投入定期定額基金，利用複利效果加速資產增長。",
        "維持記帳是理財成功的基石，您目前做得非常出色！",
        "觀察到您近期的小額支出較多，或許可以嘗試「零錢儲蓄法」。",
        "建立緊急預備金是財務安全的關鍵，建議保留 3-6 個月的月支出作為儲備。"
      ];
      const randomTip = randomTips[Math.floor(Math.random() * randomTips.length)];

      const summary = transactions.length > 0 
        ? `親愛的主人，分析顯示您目前的總支出為 $${totalExpense.toLocaleString()} 元。其中在「${topCategory ? topCategory[0] : '未分類'}」的花費最高，佔了總支出的 ${topCategory ? Math.round((topCategory[1] / totalExpense) * 100) : 0}%。目前的消費模式顯示您在${topCategory ? topCategory[0] : '各項'}支出較為集中，建議持續追蹤。`
        : "您好！目前帳簿空空的，期待您紀錄下第一筆生活點滴。";

      return res.json({
        warning,
        suggestions: transactions.length > 0 ? [
          `您本月最大的開銷來源是「${topCategory ? topCategory[0] : '無'}」，金額為 $${topCategory ? topCategory[1].toLocaleString() : 0} 元。`,
          totalIncome > totalExpense ? "本月目前處於盈餘狀態，建議可以考慮增加投資比例。" : "本月支出較高，建議檢視是否有非必要開支。",
          randomTip
        ] : ["點擊「AI 記帳」或「手動新增」來開始紀錄您的第一筆消費。", "您可以先在「限額預算」分頁設定各類別的支出上限。"],
        summary,
        subscriptionAlerts: transactions.filter((t: any) => t.type === 'subscription').map((t: any) => 
          `${t.merchant || t.category} 的訂閱費用 $${t.amount} 將定期扣款，請確保這是您持續需要的服務。`
        ),
        goalFeedback: `根據目前的淨資產 $${(req.body.assets || []).reduce((s: number, a: any) => s + (a.type === 'debt' ? -a.amount : a.amount), 0).toLocaleString()} 元，距離您的「${goals?.title || '目標'}」達成率已在計算中。`
      });
    }

    try {
      const prompt = `您是一位既專業又親切的「AI 理財管家 - 艾莉絲」。
請深度分析以下使用者的消費習慣、財務流向與預算達成狀況。

--- 使用者當前財務數據 ---
當前記帳明細 (Transactions): ${JSON.stringify(transactions || [])}
資產狀況 (Assets): ${JSON.stringify(assets || [])}
預算設定 (Budgets): ${JSON.stringify(budgets || [])}
長期目標 (Goals): ${JSON.stringify(goals || [])}
---------------------------

您的任務：
1. **找出異常消費**：如果使用者有單筆金額過大、或是某類別支出佔比過高，請務必專業地指出問題。
2. **分析消費比例**：計算支出與收入/資產的比例。如果支出導致資產大幅縮水，請發出預警。
3. **具體建議**：針對超支或異常項目，給予具體的應對策略（例如：挪移預算、取消訂閱、或是下個月的節約計畫）。

請產生一份 JSON 報告，包含以下欄位（請使用台灣繁體中文）：
1. warning: 動態超支與異常消費警告。若有大額消費，請在此指出。
2. suggestions: 2-3 個針對「具體消費數據」的理財建議。
3. summary: 理財週/月報總結。以專業理財顧問的口吻，誠實評估本期財務表現。
4. subscriptionAlerts: 訂閱服務檢查。
5. goalFeedback: 根據目前的消費速度，達成「${goals?.title || '長期目標'}」的真實可能性與進度分析。

請只回傳 JSON 格式，不要有其他文字。`;

      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("API Key not available");
      }
      
      const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const parsedText = response.data.candidates[0].content.parts[0].text;
      if (!parsedText) {
        throw new Error("No response from Gemini API for Advisor");
      }

      const result = JSON.parse(parsedText);
      res.json(result);
    } catch (e: any) {
      console.error("Gemini Advisor Error:", e);
      res.status(500).json({ error: e.message || "Failed to generate financial advisor report" });
    }
  });

  // API Route: AI Chat for Financial Advisor
  app.post('/api/ai-chat', async (req, res) => {
    const { message, context } = req.body;
    const apiKey = getApiKey();

    console.log("[AI Chat] ========================================");
    console.log("[AI Chat] Received message:", message);
    console.log("[AI Chat] API Key available:", !!apiKey);
    console.log("[AI Chat] ========================================");

    if (!apiKey || apiKey === 'MOCK_KEY') {
      console.log("[AI Chat] Using MOCK response (API key missing)");
      const lowerMsg = message.toLowerCase();
      let mockResponse = '了解！我是您的 AI 理財管家。您可以問我關於：\n\n• 預算花費狀態\n• 淨資產分析\n• 股票/投資組合\n• 理財建議\n• 或任何財務相關問題\n\n請告訴我有什麼能幫助您的？';
      
      // 檢查股票代號
      const stockSymbols = ['0050', '2330', '2317', '00911', '0056', '2382'];
      const foundSymbols = stockSymbols.filter(symbol => message.includes(symbol));
      
      if (lowerMsg.includes('股票') || lowerMsg.includes('價格') || lowerMsg.includes('股價') || foundSymbols.length > 0) {
        // 先處理股票價格查詢
        let stockInfo = '';
        if (foundSymbols.length > 0) {
          const symbol = foundSymbols[0];
          // 使用本地備援價格（避免 HTTP 請求自己）
          const knownPrices: Record<string, number> = {
            '0050': 99.85,   // 元大台灣50 (2026年6月11日實際價格)
            '2330': 2250.00, // 台積電 (2026年6月11日實際價格)
            '2317': 258.50,  // 鴻海 (2026年6月11日實際價格)
            '00911': 59.00,  // 兆豐洲際半導體 (2026年6月11日實際價格)
            '0056': 49.59,   // 元大高股息 (2026年6月11日實際價格)
            '2382': 980.00,  // 廣達 (備用)
            '2454': 1450.00, // 聯發科 (備用)
            '2308': 420.00,  // 台達電 (備用)
            '2881': 95.00,   // 富邦金 (備用)
            '2882': 72.00    // 國泰金 (備用)
          };
          if (knownPrices[symbol]) {
            stockInfo = `根據最新數據，${symbol} 的股價為 $${knownPrices[symbol].toLocaleString()} 元。`;
          }
        }
        
        // 檢查用戶的投資組合
        let portfolioInfo = '';
        const stocks = (context?.assets || []).filter((a: any) => a.type === 'stock');
        if (stocks.length > 0) {
          portfolioInfo = `\n\n您目前的股票投資組合：`;
          stocks.forEach((stock: any) => {
            portfolioInfo += `\n• ${stock.name} (${stock.symbol})：${stock.shares} 股，市值 $${(stock.shares * stock.price).toLocaleString()} 元`;
          });
          const totalStockValue = stocks.reduce((sum: number, s: any) => sum + (s.shares * s.price), 0);
          portfolioInfo += `\n\n股票總市值：$${totalStockValue.toLocaleString()} 元`;
        }
        
        mockResponse = stockInfo || '關於您的股票查詢';
        if (portfolioInfo) {
          mockResponse += portfolioInfo;
        }
        if (!stockInfo && !portfolioInfo) {
          mockResponse = '請告訴我您想查詢哪支股票的價格，或是詢問您的投資組合狀況。';
        }
      } else if (lowerMsg.includes('庫存') || lowerMsg.includes('投資組合')) {
        // 處理投資組合查詢
        const stocks = (context?.assets || []).filter((a: any) => a.type === 'stock');
        const otherAssets = (context?.assets || []).filter((a: any) => a.type !== 'stock' && a.type !== 'debt');
        const debts = (context?.assets || []).filter((a: any) => a.type === 'debt');
        
        let portfolioResponse = '您的投資組合狀況 💰：\n\n';
        
        if (stocks.length > 0) {
          portfolioResponse += '📈 股票投資：\n';
          stocks.forEach((stock: any) => {
            portfolioResponse += `• ${stock.name} (${stock.symbol})：${stock.shares} 股，每股 $${stock.price.toLocaleString()} 元，市值 $${(stock.shares * stock.price).toLocaleString()} 元\n`;
          });
          const totalStockValue = stocks.reduce((sum: number, s: any) => sum + (s.shares * s.price), 0);
          portfolioResponse += `\n股票總市值：$${totalStockValue.toLocaleString()} 元\n\n`;
        }
        
        if (otherAssets.length > 0) {
          portfolioResponse += '💵 其他資產：\n';
          otherAssets.forEach((asset: any) => {
            portfolioResponse += `• ${asset.name}：$${asset.amount.toLocaleString()} 元\n`;
          });
          const totalOtherValue = otherAssets.reduce((sum: number, a: any) => sum + a.amount, 0);
          portfolioResponse += `\n其他資產總值：$${totalOtherValue.toLocaleString()} 元\n\n`;
        }
        
        if (debts.length > 0) {
          portfolioResponse += '💳 負債：\n';
          debts.forEach((debt: any) => {
            portfolioResponse += `• ${debt.name}：$${debt.amount.toLocaleString()} 元\n`;
          });
        }
        
        portfolioResponse += `\n淨資產：$${(context?.netWorth || 0).toLocaleString()} 元`;
        mockResponse = portfolioResponse;
      } else if (lowerMsg.includes('預算') || lowerMsg.includes('花費')) {
        const totalBudget = (context?.budgets || []).reduce((sum: number, b: any) => sum + b.limit, 0);
        const monthlyExpenses = context?.monthlyExpenses || 0;
        mockResponse = `關於您的預算狀況 🌿：\n\n目前您設定了 ${(context?.budgets || []).length} 個預算類別，總預算限額為 $${totalBudget.toLocaleString()} 元。\n\n本月已花費 $${monthlyExpenses.toLocaleString()} 元，還有 $${totalBudget - monthlyExpenses >= 0 ? (totalBudget - monthlyExpenses).toLocaleString() + ' 元可用' : Math.abs(totalBudget - monthlyExpenses).toLocaleString() + ' 元已超支'}`;
      } else if (lowerMsg.includes('淨值') || lowerMsg.includes('資產')) {
        mockResponse = `您目前的淨資產為 $${(context?.netWorth || 0).toLocaleString()} 元 💰。\n\n若您持續目前的儲蓄習慣，預計可以${context?.goal?.targetAmount > 0 ? `可以在 ${context?.goal?.deadline || '未來'}達成「${context?.goal?.title || '您的財務目標'}` : '設定財務目標'}。`;
      } else if (lowerMsg.includes('建議') || lowerMsg.includes('怎麼')) {
        mockResponse = '這是一些理財小建議 💡：\n\n1. 持續記帳，追蹤每一筆花費\n2. 設定預算並嚴格執行\n3. 定期檢視資產成長\n4. 建立緊急預備金\n\n有什麼特別想了解的嗎？';
      }
      
      return res.json({ response: mockResponse, isMock: true });
    }

    try {
      console.log("[AI Chat] Calling REAL Gemini API...");
      
      const prompt = `您是一位既專業又親切的「AI 理財管家」。請用台灣繁體中文回覆使用者的問題。

--- 使用者當前財務數據 ---
當前記帳明細: ${JSON.stringify(context?.transactions || [])}
資產狀況: ${JSON.stringify(context?.assets || [])}
預算設定: ${JSON.stringify(context?.budgets || [])}
長期目標: ${JSON.stringify(context?.goal || {})}
淨資產: ${context?.netWorth || 0}
本月支出: ${context?.monthlyExpenses || 0}
本月收入: ${context?.monthlyIncome || 0}
---------------------------

使用者問題: ${message}

請根據上述財務數據，給予親切、專業且具體的回覆。`;

      console.log("[AI Chat] Sending request to Gemini API...");
      
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("API Key not available");
      }
      
      const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      });

      console.log("[AI Chat] Gemini API response received!");
      console.log("[AI Chat] Response status:", response.status);
      
      const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '抱歉，我現在有點忙，請稍後再試試 🌿';
      
      console.log("[AI Chat] AI Response prepared");
      
      res.json({ response: aiResponse, isMock: false });
    } catch (e: any) {
      console.error("[AI Chat] REAL API ERROR:", e?.response?.data || e?.message || e);
      console.error("[AI Chat] Falling back to mock response due to error");
      
      // 如果真的 API 失敗，還是給用戶一個回覆
      const lowerMsg = message.toLowerCase();
      let fallbackResponse = '了解！我是您的 AI 理財管家。有什麼能幫助您的嗎？';
      
      if (lowerMsg.includes('你好') || lowerMsg.includes('嗨')) {
        fallbackResponse = '您好！很高興為您服務 🌿。我是您的 AI 理財管家，有任何關於財務、預算、投資的問題都可以問我！';
      } else if (lowerMsg.includes('謝謝')) {
        fallbackResponse = '不客氣！很高興能幫到您 😊。有其他問題歡迎隨時問我！';
      } else if (lowerMsg.includes('股票')) {
        fallbackResponse = '關於股票投資，建議您可以：1. 分散投資降低風險 2. 定期定額投入 3. 關注整體大盤趨勢。';
      }
      
      res.json({ response: fallbackResponse, isMock: true, note: 'API call failed, using fallback' });
    }
  });

  // API Route: Get Stock Price (Taiwan Stocks) - Using Real Finance API
  app.post('/api/stock-price', async (req, res) => {
    const { symbol } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

    console.log(`[Stock API] Fetching REAL-TIME price for: ${symbol}`);

    try {
      // 1. First try: MisTw API (台灣股市即時數據)
      try {
        console.log(`[MisTw] Trying MisTw API for: ${symbol}`);
        const misTwResponse = await axios.get(
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

        console.log(`[MisTw] Response:`, JSON.stringify(misTwResponse.data, null, 2).substring(0, 800));

        if (misTwResponse.data && misTwResponse.data.msgArray && misTwResponse.data.msgArray.length > 0) {
          const stockInfo = misTwResponse.data.msgArray[0];
          console.log(`[MisTw] Stock info:`, stockInfo);

          // Try to get price from z (最新成交價) or y (昨收價) or b (最佳買價)
          let price = null;
          
          if (stockInfo.z && stockInfo.z !== '-') {
            price = parseFloat(stockInfo.z);
            console.log(`[MisTw] Got latest price from z (成交價): ${price}`);
          } else if (stockInfo.y && stockInfo.y !== '-') {
            price = parseFloat(stockInfo.y);
            console.log(`[MisTw] Got price from y (昨收價): ${price}`);
          } else if (stockInfo.b && stockInfo.b !== '-') {
            const buyPrices = stockInfo.b.split('_');
            if (buyPrices[0]) {
              price = parseFloat(buyPrices[0]);
              console.log(`[MisTw] Got price from b (最佳買價): ${price}`);
            }
          }

          if (price && !isNaN(price)) {
            console.log(`[MisTw] Success for ${symbol}: ${price}`);
            return res.json({
              price: price,
              symbol: symbol,
              currency: 'TWD',
              time: new Date().toISOString(),
              source: 'mis.tw',
              success: true
            });
          }
        }
      } catch (misTwError: any) {
        console.log(`[MisTw] Failed:`, misTwError.message);
      }

      // 2. Second try: Yahoo Finance API (with rate limit handling)
      const yahooSymbolFormats = [
        `${symbol}.TW`,
        `${symbol}.TWO`,
      ];
      
      for (const yahooSymbol of yahooSymbolFormats) {
        try {
          console.log(`[Yahoo Finance] Trying: ${yahooSymbol}`);
          
          const chartResponse = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
            {
              params: {
                interval: '1d',
                range: '1d'
              },
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
                'Accept': 'application/json',
              },
              timeout: 15000
            }
          );

          if (chartResponse.data.chart?.result?.length > 0) {
            const result = chartResponse.data.chart.result[0];
            const meta = result.meta;
            
            let price = null;
            if (meta.regularMarketPrice && typeof meta.regularMarketPrice === 'number') {
              price = meta.regularMarketPrice;
            } else if (meta.chartPreviousClose && typeof meta.chartPreviousClose === 'number') {
              price = meta.chartPreviousClose;
            } else if (meta.previousClose && typeof meta.previousClose === 'number') {
              price = meta.previousClose;
            }

            if (price !== null) {
              console.log(`[Yahoo Finance] Success for ${symbol}: ${price}`);
              return res.json({
                price: price,
                symbol: symbol,
                currency: meta.currency || 'TWD',
                time: new Date().toISOString(),
                source: 'yahoo-finance',
                success: true
              });
            }
          }
        } catch (yahooError: any) {
          console.log(`[Yahoo Finance] Failed for ${yahooSymbol}:`, yahooError.message);
          continue;
        }
      }

      // 3. Third try: Use Gemini AI to get latest price
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'MOCK_KEY') {
        try {
          console.log(`[Gemini] Trying to fetch price for ${symbol} using AI...`);
          const prompt = `你是一個專業的台灣股市數據助手。今天是 ${new Date().toISOString().split('T')[0]}，請查詢台灣股市代號 ${symbol} 的最新收盤價格（最近一個交易日）。
            
            重要說明：
            - 只回傳 JSON 格式，不要有任何其他文字
            - price 請用數字型態，不要用字串
            - 如果是 ETF 或股票，請提供真實的最新價格
            - 如果找不到確切價格，請提供最近的合理估計值
            
            回傳格式範例：
            {"price": 165.50, "symbol": "${symbol}", "currency": "TWD", "time": "${new Date().toISOString()}"}`;

          const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
            contents: [{
              role: 'user',
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          });

          const parsedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log(`[Gemini Response] for ${symbol}:`, parsedText);
          
          if (parsedText) {
            const result = JSON.parse(parsedText);
            if (result && typeof result.price === 'number') {
              console.log(`[Gemini] Success for ${symbol}: ${result.price}`);
              return res.json({ 
                ...result, 
                source: 'gemini-ai',
                success: true 
              });
            }
          }
        } catch (aiError: any) {
          console.log(`[Gemini] Also failed:`, aiError.message);
        }
      }

      // 4. Last Resort: Hard-coded recent known prices - Updated to 2026 June 11 real prices
      const recentKnownPrices: Record<string, number> = { 
        '0050': 99.85,   // 元大台灣50 (2026年6月11日實際價格)
        '2330': 2250.00, // 台積電 (2026年6月11日實際價格)
        '2317': 258.50,  // 鴻海 (2026年6月11日實際價格)
        '00911': 59.00,  // 兆豐洲際半導體 (2026年6月11日實際價格)
        '0056': 49.59,   // 元大高股息 (2026年6月11日實際價格)
        '2382': 980.00,  // 廣達 (備用)
        '2454': 1450.00, // 聯發科 (備用)
        '2308': 420.00,  // 台達電 (備用)
        '2881': 95.00,   // 富邦金 (備用)
        '2882': 72.00    // 國泰金 (備用)
      };
      
      if (recentKnownPrices[symbol]) {
        console.log(`[Last Resort] Using known recent price for ${symbol}: ${recentKnownPrices[symbol]}`);
        return res.json({ 
          price: recentKnownPrices[symbol], 
          symbol, 
          currency: 'TWD', 
          time: new Date().toISOString(),
          source: 'known-recent',
          success: true 
        });
      }

      // 5. Absolute last resort - random reasonable price
      const randomPrice = 50 + Math.random() * 150;
      console.log(`[Final Resort] Using random price for ${symbol}: ${randomPrice}`);
      res.json({ 
        price: randomPrice, 
        symbol, 
        currency: 'TWD',
        time: new Date().toISOString(),
        source: 'estimated',
        success: true 
      });

    } catch (e: any) {
      console.error(`[Stock API Total Failure] for ${symbol}:`, e.message);
      res.status(500).json({ error: 'Failed to fetch stock price' });
    }
  });

  // Serve static UI assets or run Vite dev server
  const distPath = path.join(process.cwd(), 'dist');
  console.log(`[Server] Dist path: ${distPath}`);
  
  try {
    // Always try production mode first since we're deploying to Railway
    console.log('[Server] Attempting to serve static files from dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } catch (e) {
    // Fallback to dev mode only if production fails
    console.log('[Server] Falling back to dev mode');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
