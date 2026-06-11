import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  MapPin, 
  Tag, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Compass, 
  BookOpen, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  DollarSign, 
  Wallet, 
  Percent, 
  PieChart, 
  Info, 
  Check, 
  X, 
  Activity, 
  Bell,
  ArrowUpRight,
  TrendingDown,
  CalendarCheck2,
  BrainCircuit,
  ArrowRight,
  Pencil,
  Send,
  MessageCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  INITIAL_TRANSACTIONS, 
  INITIAL_ASSET_ITEMS, 
  INITIAL_BUDGET_CONFIGS, 
  INITIAL_GOAL 
} from './mockData';
import { Transaction, AssetItem, FinancialGoal, BudgetConfig, AdvisorResponse } from './types';

export default function App() {
  // --- Persistent State ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const local = localStorage.getItem('morandi_transactions_v2');
    return local ? JSON.parse(local) : INITIAL_TRANSACTIONS;
  });

  const [assets, setAssets] = useState<AssetItem[]>(() => {
    const local = localStorage.getItem('morandi_assets_v2');
    return local ? JSON.parse(local) : INITIAL_ASSET_ITEMS;
  });

  const [budgets, setBudgets] = useState<BudgetConfig[]>(() => {
    const local = localStorage.getItem('morandi_budgets');
    let savedBudgets = local ? JSON.parse(local) : null;
    
    // 確保新的預算類別被加入（餐飲、交通）
    if (savedBudgets) {
      const hasFoodBudget = savedBudgets.some((b: BudgetConfig) => b.category === '餐飲');
      const hasTransportBudget = savedBudgets.some((b: BudgetConfig) => b.category === '交通');
      
      if (!hasFoodBudget) {
        savedBudgets.push({ category: '餐飲', limit: 8000 });
      }
      if (!hasTransportBudget) {
        savedBudgets.push({ category: '交通', limit: 3000 });
      }
      return savedBudgets;
    }
    
    return INITIAL_BUDGET_CONFIGS;
  });

  const [goal, setGoal] = useState<FinancialGoal>(() => {
    const local = localStorage.getItem('morandi_goal_v2');
    return local ? JSON.parse(local) : INITIAL_GOAL;
  });

  // --- UI Control States ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'assets' | 'budgets' | 'chat'>('dashboard');
  
  // --- AI Chat States ---
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; text: string; time: string }>>([
    {
      role: 'ai',
      text: '您好！我是您的 AI 理財管家 🌿。我可以幫您分析財務狀況、提供預算建議，或回答任何關於記帳的問題。請告訴我有什麼能幫助您的？',
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [miniChatInput, setMiniChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isMiniChatExpanded, setIsMiniChatExpanded] = useState(false);
  
  // --- Original Input States ---
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isAdvising, setIsAdvising] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Stock Price State
  const [stockPrices, setStockPrices] = useState<Record<string, number>>({});
  const [isFetchingStock, setIsFetchingStock] = useState(false);

  // Budget Alert State
  const [budgetAlert, setBudgetAlert] = useState<{
    isOpen: boolean;
    category: string;
    amount: number;
    limit: number;
    suggestion: string;
  } | null>(null);

  // Budget Reallocation State
  const [showReallocation, setShowReallocation] = useState(false);
  const [reallocFrom, setReallocFrom] = useState('');
  const [reallocTo, setReallocTo] = useState('');
  const [reallocAmount, setReallocAmount] = useState(0);

  // Ledger Filter
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'expense' | 'subscription'>('all');

  // Manual Transaction Form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTx, setManualTx] = useState<Partial<Transaction>>({
    date: new Date().toISOString().substring(0, 10),
    type: 'expense',
    amount: 0,
    category: '日常支出',
    location: '',
    merchant: '',
    tags: [],
    recurrence: 'none',
    note: ''
  });
  const [manualTagInput, setManualTagInput] = useState('');

  // Asset Form State
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<AssetItem>>({
    name: '',
    type: 'saving',
    amount: 0,
    quantity: 0,
    symbol: '',
    growthRate: 0,
    note: ''
  });

  // Budget Form State
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{ originalCategory: string; category: string; limit: number } | null>(null);
  const [newBudget, setNewBudget] = useState<Partial<BudgetConfig>>({
    category: '',
    limit: 0
  });

  // Goal Form State
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editedGoal, setEditedGoal] = useState<FinancialGoal>({ ...goal });

  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Transaction Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editTagInput, setEditTagInput] = useState('');

  // 安全的數據處理函數
  const safeAdvisorReport = (data: any): AdvisorResponse => {
    return {
      warning: data?.warning || "",
      suggestions: Array.isArray(data?.suggestions) ? data.suggestions : ["點擊「AI 記帳」或「手動新增」來開始紀錄您的第一筆消費。"],
      summary: data?.summary || "",
      subscriptionAlerts: Array.isArray(data?.subscriptionAlerts) ? data.subscriptionAlerts : [],
      goalFeedback: data?.goalFeedback || ""
    };
  };

  // AI Advisor Diagnostic Result Buffer
  const [advisorReport, setAdvisorReport] = useState<AdvisorResponse | null>(() => {
    try {
      const local = localStorage.getItem('morandi_advisor_report_v2');
      if (local) {
        const parsed = JSON.parse(local);
        return safeAdvisorReport(parsed);
      }
    } catch (e) {
      console.warn("Failed to parse advisor report from localStorage, resetting");
      localStorage.removeItem('morandi_advisor_report_v2');
    }
    return null;
  });

  // --- Local Syncing Effects ---
  useEffect(() => {
    // Initial advisor update if no report exists
    if (!advisorReport) {
      triggerAdvisorUpdate();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('morandi_transactions_v2', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('morandi_assets_v2', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('morandi_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('morandi_goal_v2', JSON.stringify(goal));
  }, [goal]);

  useEffect(() => {
    if (advisorReport) {
      localStorage.setItem('morandi_advisor_report_v2', JSON.stringify(advisorReport));
    }
  }, [advisorReport]);

  // --- Stock Price Fetching ---
  const fetchStockPrices = async (symbols: string[], forceRefresh = false) => {
    if (symbols.length === 0) return;
    setIsFetchingStock(true);
    console.log("Attempting to fetch symbols:", symbols, "forceRefresh:", forceRefresh);
    try {
      const newPrices: Record<string, number> = { ...stockPrices };
      
      // Fallback local data for common symbols to ensure immediate display
      const localStockMap: Record<string, number> = {
        '0050': 99.85,   // 元大台灣50 (2026年6月11日實際價格)
        '2330': 2250.00, // 台積電 (2026年6月11日實際價格)
        '2317': 258.50,  // 鴻海 (2026年6月11日實際價格)
        '00911': 59.00,  // 兆豐洲際半導體 (2026年6月11日實際價格)
        '0056': 49.59,   // 元大高股息 (2026年6月11日實際價格)
        '2454': 1450.00, // 聯發科 (備用)
        '2382': 980.00,  // 廣達 (備用)
        '2308': 420.00,  // 台達電 (備用)
        '2881': 95.00,   // 富邦金 (備用)
        '2882': 72.00    // 國泰金 (備用)
      };

      for (const symbol of symbols) {
        // 如果不是強制刷新且已有價格，則跳過
        if (!forceRefresh && stockPrices[symbol]) {
          continue;
        }
        
        try {
          console.log(`Fetching price for ${symbol}...`);
          const res = await fetch('/api/stock-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
          });
          
          if (res.ok) {
            const data = await res.json();
            newPrices[symbol] = data.price;
            console.log(`Fetched ${symbol}: ${data.price} (source: ${data.source})`);
          } else {
            console.log(`API failed for ${symbol}, using fallback`);
            // Use local fallback if API fails
            if (localStockMap[symbol]) {
              newPrices[symbol] = localStockMap[symbol];
            }
          }
        } catch (err) {
          console.error(`Fetch failed for ${symbol}, using fallback:`, err);
          if (localStockMap[symbol]) {
            newPrices[symbol] = localStockMap[symbol];
          }
        }
      }
      setStockPrices(newPrices);
    } catch (err) {
      console.error("Critical error in fetchStockPrices:", err);
    } finally {
      setIsFetchingStock(false);
    }
  };

  // 手動刷新所有股價
  const refreshAllStockPrices = () => {
    const stockSymbols = assets
      .filter(a => a.type === 'stock' && a.symbol)
      .map(a => a.symbol as string);
    
    const uniqueSymbols: string[] = Array.from(new Set(stockSymbols));
    if (uniqueSymbols.length > 0) {
      fetchStockPrices(uniqueSymbols, true);
    }
  };

   // Auto-fetch stock prices when assets change
   useEffect(() => {
     const stockSymbols = assets
       .filter(a => a.type === 'stock' && a.symbol)
       .map(a => a.symbol as string);
     
     const uniqueSymbols: string[] = Array.from(new Set(stockSymbols));
     if (uniqueSymbols.length > 0) {
       // Filter out symbols we ALREADY have prices for to avoid infinite loops/flicker
       const symbolsToFetch = uniqueSymbols.filter(s => !stockPrices[s]);
       if (symbolsToFetch.length > 0) {
         fetchStockPrices(symbolsToFetch);
       }
     }
   }, [assets]); 

  // --- Calculation Formulas ---
  // Financial calculation: Total assets
  const totalSavings = assets.filter(a => a.type === 'saving').reduce((sum, item) => sum + item.amount, 0);
  
  const totalInvestments = assets.filter(a => a.type === 'investment').reduce((sum, item) => sum + item.amount, 0);
  
  const totalStocks = assets.filter(a => a.type === 'stock').reduce((sum, item) => {
    const price = stockPrices[item.symbol || ''] || 0;
    const value = (item.quantity || 0) * price;
    return sum + value;
  }, 0);

  const totalDebts = assets.filter(a => a.type === 'debt').reduce((sum, item) => sum + item.amount, 0);
  const netWorth = totalSavings + totalInvestments + totalStocks - totalDebts;

  // Generate 6-phase timeline based on user's goal
  const generateTimelinePhases = () => {
    const startDate = new Date('2026-06-10');
    const phases = [];
    
    // Use user's goal deadline if available, otherwise default to 3 years
    const endDate = goal.deadline ? new Date(goal.deadline) : new Date(startDate);
    if (!goal.deadline) {
      endDate.setFullYear(endDate.getFullYear() + 3);
    }
    
    // Calculate total months difference
    const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth());
    
    // Calculate target amount - using user's example: 60, 120, 180, 240, 300
    const targetAmount = goal.targetAmount || 3000000;
    const amountIncrement = (targetAmount - netWorth) / 5; // 5 increments for 6 phases
    
    // Calculate average monthly growth rate from assets
    const totalAssets = totalSavings + totalInvestments + totalStocks;
    const weightedGrowthRate = assets.length > 0 
      ? assets.reduce((sum, asset) => {
          const assetValue = asset.type === 'stock' 
            ? (asset.quantity || 0) * (stockPrices[asset.symbol || ''] || 0)
            : asset.amount;
          const weight = totalAssets > 0 ? assetValue / totalAssets : 0;
          return sum + (asset.growthRate || 5) * weight;
        }, 0)
      : 5; // Default 5% annual growth if no assets
    
    const monthlyGrowthRate = (1 + weightedGrowthRate / 100) ** (1 / 12);
    
    // Generate 6 distinct phases with clear dates
    const dates = [
      new Date(2026, 5, 10),  // Phase 1: Jun 10, 2026 (啟動)
      new Date(startDate),    // Phase 2
      new Date(startDate),    // Phase 3
      new Date(startDate),    // Phase 4
      new Date(startDate),    // Phase 5
      new Date(endDate)       // Phase 6: end date (300萬)
    ];
    
    // Calculate intermediate dates - equally spaced
    dates[1].setMonth(dates[1].getMonth() + Math.round(totalMonths * 0.2));
    dates[2].setMonth(dates[2].getMonth() + Math.round(totalMonths * 0.4));
    dates[3].setMonth(dates[3].getMonth() + Math.round(totalMonths * 0.6));
    dates[4].setMonth(dates[4].getMonth() + Math.round(totalMonths * 0.8));
    
    for (let i = 0; i < 6; i++) {
      const date = dates[i];
      
      // Calculate months passed for growth calculation
      const monthsPassed = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const projectedNetWorth = netWorth * Math.pow(monthlyGrowthRate, monthsPassed);
      
      // Calculate target for this phase - phase 0 is current net worth, phase 5 is targetAmount
      let phaseTargetAmount: number;
      if (i === 0) {
        phaseTargetAmount = Math.round(netWorth);
      } else if (i === 5) {
        phaseTargetAmount = targetAmount;
      } else {
        // Using user's example: 60, 120, 180, 240萬 (if target is 300萬)
        if (targetAmount === 3000000) {
          const targets = [600000, 1200000, 1800000, 2400000];
          phaseTargetAmount = targets[i - 1];
        } else {
          // For other targets, calculate proportionally
          phaseTargetAmount = Math.round(netWorth + i * amountIncrement);
        }
      }
      
      const progressPercent = targetAmount > 0 
        ? Math.min(Math.round((projectedNetWorth / targetAmount) * 100), 100)
        : 0;
      const phaseTargetProgress = targetAmount > 0 
        ? Math.min(Math.round((phaseTargetAmount / targetAmount) * 100), 100)
        : 0;
      
      // Format date as YYYY-MM-DD
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      phases.push({
        index: i,
        date: formattedDate,
        label: i === 0 ? '啟動' : formattedDate,
        projectedNetWorth: Math.round(projectedNetWorth),
        phaseTargetAmount: phaseTargetAmount,
        progressPercent,
        phaseTargetProgress,
        isToday: i === 0,
        isTargetReached: progressPercent >= 100,
        isPhaseTargetMet: projectedNetWorth >= phaseTargetAmount
      });
    }
    
    return phases;
  };

  const timelinePhases = generateTimelinePhases();

  // Let savings auto-update the target goal progress
  const percentOfGoal = goal.targetAmount > 0 ? Math.min(Math.round((netWorth / goal.targetAmount) * 100), 100) : 0;

  // Month Spending calculation: Filter transaction date in the current mocked month (2026-06)
  const monthlyExpenses = transactions
    .filter(t => (t.type === 'expense' || t.type === 'subscription') && t.date.startsWith('2026-06'))
    .reduce((sum, current) => sum + current.amount, 0);

  const monthlyIncome = transactions
    .filter(t => t.type === 'income' && t.date.startsWith('2026-06'))
    .reduce((sum, current) => sum + current.amount, 0);

  // Category aggregate spending
  const getCategorySpending = (categoryName: string) => {
    const filtered = transactions.filter(t => {
      // 檢查類型
      if (t.type !== 'expense' && t.type !== 'subscription') return false;
      
      // 檢查日期（當前月份）
      const currentMonth = '2026-06';
      if (!t.date.startsWith(currentMonth)) return false;
      
      // 檢查分類匹配 - 更簡單的邏輯
      const txCatLower = t.category.toLowerCase();
      const budgetCatLower = categoryName.toLowerCase();
      return txCatLower.includes(budgetCatLower) || budgetCatLower.includes(txCatLower);
    });
    
    const total = filtered.reduce((sum, t) => sum + t.amount, 0);
    console.log(`Category ${categoryName}:`, filtered.length, 'transactions, total:', total);
    
    return total;
  };

  // --- AI Chat Handler ---
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    
    // 加入用戶訊息
    const newUserMessage = {
      role: 'user' as const,
      text: userMessage,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsChatLoading(true);
    
    try {
      // 準備財務數據給 AI
      const financialContext = {
        transactions,
        assets,
        budgets,
        goal,
        netWorth,
        monthlyExpenses,
        monthlyIncome
      };
      
      // 呼叫 AI 回覆（模擬或真實 API
      // 先嘗試用真實 API，如果失敗就用模擬回覆
      let aiResponse = '';
      let isMockResponse = false;
      try {
        console.log('[Frontend] Calling /api/ai-chat...');
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userMessage,
            context: financialContext
          })
        });
        
        console.log('[Frontend] API Response Status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('[Frontend] API Response Data:', data);
          aiResponse = data.response || data.message || '';
          isMockResponse = data.isMock === true;
        } else {
          const errorText = await res.text();
          console.error('[Frontend] API Error Response:', errorText);
          throw new Error('API 失敗: ' + res.status);
        }
      } catch (error) {
        console.error('[Frontend] API Call Failed:', error);
        // 模擬回覆
        aiResponse = generateMockChatResponse(userMessage, financialContext);
        isMockResponse = true;
      }
      
      // 加入 AI 回覆
      const displayText = aiResponse;
      
      const newAiMessage = {
        role: 'ai' as const,
        text: displayText,
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatMessages(prev => [...prev, newAiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'ai' as const,
        text: '抱歉，我現在有點忙，請稍後再試試 🌿',
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- Mini Chat Handler ---
  const handleMiniChatSend = async () => {
    if (!miniChatInput.trim() || isChatLoading) return;
    
    const userMessage = miniChatInput.trim();
    setMiniChatInput('');
    
    // 加入用戶訊息
    const newUserMsg = {
      role: 'user' as const,
      text: userMessage,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages(prev => [...prev, newUserMsg]);
    setIsChatLoading(true);
    
    try {
      // 準備財務數據給 AI
      const financialContext = {
        transactions,
        assets,
        budgets,
        goal,
        netWorth,
        monthlyExpenses,
        monthlyIncome
      };
      
      // 呼叫真實 AI API
      let aiResponse = '';
      let isMockResponse = false;
      try {
        console.log('[Frontend] Calling /api/ai-chat...');
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userMessage,
            context: financialContext
          })
        });
        
        console.log('[Frontend] API Response Status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('[Frontend] API Response Data:', data);
          aiResponse = data.response || data.message || '';
          isMockResponse = data.isMock === true;
        } else {
          const errorText = await res.text();
          console.error('[Frontend] API Error Response:', errorText);
          throw new Error('API 失敗: ' + res.status);
        }
      } catch (error) {
        console.error('[Frontend] API Call Failed:', error);
        // 如果API失敗，使用模擬回覆作為後備
        aiResponse = generateMockChatResponse(userMessage, financialContext);
        isMockResponse = true;
      }
      
      // 加入 AI 回覆
      const displayText = aiResponse;
      
      const newAiMsg = {
        role: 'ai' as const,
        text: displayText,
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatMessages(prev => [...prev, newAiMsg]);
      setIsChatLoading(false);
    } catch (error) {
      console.error('Mini chat error:', error);
      const errorMessage = {
        role: 'ai' as const,
        text: '抱歉，我現在有點忙，請稍後再試試 🌿',
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMessage]);
      setIsChatLoading(false);
    }
  };

  // 模擬 AI 回覆函數
  const generateMockChatResponse = (userMessage: string, context: any) => {
    const lowerMsg = userMessage.toLowerCase();
    
    // 處理股票/庫存相關問題
    if (lowerMsg.includes('股票') || lowerMsg.includes('庫存') || lowerMsg.includes('持股')) {
      const stocks = assets.filter(a => a.type === 'stock');
      if (stocks.length === 0) {
        return '您目前沒有持有任何股票 👀。\n\n您可以在「資產及目標」頁面添加您的股票投資！';
      }
      
      let stockInfo = '您目前持有的股票 📊：\n\n';
      stocks.forEach(stock => {
        const price = stockPrices[stock.symbol || ''] || 0;
        const value = price > 0 ? (stock.quantity || 0) * price : (stock.amount || 0);
        stockInfo += `• ${stock.name || stock.symbol} (${stock.symbol || 'N/A'})\n`;
        if (stock.quantity) {
          stockInfo += `  持有數量：${stock.quantity} 股\n`;
        }
        if (price > 0) {
          stockInfo += `  目前股價：$${price.toLocaleString()}\n`;
        }
        stockInfo += `  市值：$${value.toLocaleString()}\n\n`;
      });
      
      stockInfo += `總股票資產價值：$${totalStocks.toLocaleString()} 元\n\n`;
      stockInfo += `您可以在「資產及目標」頁面管理您的投資組合！`;
      return stockInfo;
    }
    
    // 處理資產相關問題
    if (lowerMsg.includes('淨值') || lowerMsg.includes('資產')) {
      let assetInfo = `您目前的淨資產為 $${netWorth.toLocaleString()} 元 💰\n\n`;
      assetInfo += `資產明細：\n`;
      assetInfo += `• 存款儲蓄：$${totalSavings.toLocaleString()} 元\n`;
      assetInfo += `• 股票投資：$${totalStocks.toLocaleString()} 元\n`;
      assetInfo += `• 其他投資：$${totalInvestments.toLocaleString()} 元\n`;
      assetInfo += `• 負債：-$${totalDebts.toLocaleString()} 元\n\n`;
      
      if (goal.targetAmount > 0) {
        const progress = Math.min(100, Math.round((netWorth / goal.targetAmount) * 100));
        assetInfo += `關於您的財務目標「${goal.title}」：\n`;
        assetInfo += `• 目標金額：$${goal.targetAmount.toLocaleString()} 元\n`;
        assetInfo += `• 目前進度：${progress}%\n`;
        if (goal.deadline) {
          assetInfo += `• 預計達成：${goal.deadline}\n`;
        }
      }
      
      return assetInfo;
    }
    
    // 關鍵字判斷
    if (lowerMsg.includes('預算') || lowerMsg.includes('花費')) {
      const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
      return `關於您的預算狀況 🌿：\n\n目前您設定了 ${budgets.length} 個預算類別，總預算限額為 $${totalBudget.toLocaleString()} 元。\n\n本月已花費 $${monthlyExpenses.toLocaleString()} 元，還有 $${totalBudget - monthlyExpenses >= 0 ? (totalBudget - monthlyExpenses).toLocaleString() + ' 元可用' : Math.abs(totalBudget - monthlyExpenses).toLocaleString() + ' 元已超支'}`;
    }
    
    if (lowerMsg.includes('建議') || lowerMsg.includes('怎麼')) {
      return '這是一些理財小建議 💡：\n\n1. 持續記帳，追蹤每一筆花費\n2. 設定預算並嚴格執行\n3. 定期檢視資產成長\n4. 建立緊急預備金\n\n有什麼特別想了解的嗎？';
    }
    
    if (lowerMsg.includes('謝謝') || lowerMsg.includes('感謝')) {
      return '不客氣！很高興能幫助您 🌿。如果還有其他問題，歡迎隨時問我！';
    }
    
    // 預設回覆
    return '了解！我是您的 AI 理財管家。您可以問我關於：\n\n• 預算花費狀態\n• 淨資產分析\n• 股票/投資組合\n• 理財建議\n• 或任何財務相關問題\n\n請告訴我有什麼能幫助您的？';
  };

  // --- Handlers & API integrations ---

  // Check if a new transaction exceeds budget
  const checkBudget = (tx: Transaction, currentTxs: Transaction[]) => {
    if (tx.type !== 'expense' && tx.type !== 'subscription') return;
    
    const budget = budgets.find(b => tx.category.includes(b.category) || b.category.includes(tx.category));
    if (budget) {
      const currentSpending = currentTxs
        .filter(t => (t.type === 'expense' || t.type === 'subscription') && (t.category.includes(budget.category) || budget.category.includes(t.category)) && t.date.startsWith('2026-06'))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalAfter = currentSpending + tx.amount;
      if (totalAfter > budget.limit) {
        setBudgetAlert({
          isOpen: true,
          category: budget.category,
          amount: totalAfter,
          limit: budget.limit,
          suggestion: `偵測到你這個月的「${budget.category}」預算已超支 ${totalAfter - budget.limit} 元。建議調整接下來的聚餐計畫，或者從其他預算科目挪移資金。`
        });
      }
    }
  };

  // Standard LLM parser for input
  const handleParseText = async (textToParse: string) => {
    if (!textToParse.trim()) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const res = await fetch('/api/parse-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textToParse })
      });
      if (!res.ok) throw new Error('解析失敗，請重新嘗試。');
      const data = await res.json();
      
      if (data.success && data.transactions && Array.isArray(data.transactions)) {
        const newTransactions: Transaction[] = data.transactions.map((txData: any, index: number) => ({
          id: `tx-${Date.now()}-${index}`,
          date: new Date().toISOString().substring(0, 10),
          type: txData.type || 'expense',
          amount: txData.amount || 0,
          category: txData.category || '未分類',
          location: txData.location || undefined,
          tags: txData.tags || [],
          merchant: txData.merchant || undefined,
          note: txData.note || txData.originalText || textToParse,
          recurrence: txData.recurrence || 'none',
          sourceText: textToParse
        }));

        const updatedTxs = [...newTransactions, ...transactions];
        setTransactions(updatedTxs);
        setInputText('');
        
        // 1. Check for Budget Alerts for each new transaction
        newTransactions.forEach(tx => checkBudget(tx, transactions));
        
        // 2. Check for New Categories (simplified: only check the first new category for now)
        const firstTx = newTransactions[0];
        if (firstTx) {
          const categoryExists = budgets.some(b => firstTx.category.includes(b.category) || b.category.includes(firstTx.category));
          if ((firstTx.type === 'expense' || firstTx.type === 'subscription') && !categoryExists && firstTx.category !== '未分類') {
            showConfirm(
              '發現新分類', 
              `理財小精靈辨識到新分類「${firstTx.category}」，是否要為其建立預算帳戶？`, 
              () => {
                setNewBudget({ category: firstTx.category, limit: 1000 });
                setShowBudgetForm(true);
              }
            );
          }
        }

        // Trigger auto AI Diagnostic update
        triggerAdvisorUpdate(updatedTxs, assets, budgets, goal);
      } else {
        setParseError(data.error || '無法辨識資訊，請手動輸入');
      }
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || '連線伺服器失敗，回到備用方案');
    } finally {
      setIsParsing(false);
    }
  };

  // AI Advisor report update handler
  const triggerAdvisorUpdate = async (
    currentTxs = transactions,
    currentAssets = assets,
    currentBudgets = budgets,
    currentGoal = goal
  ) => {
    setIsAdvising(true);
    try {
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactions: currentTxs,
          assets: currentAssets,
          budgets: currentBudgets,
          goals: currentGoal
        })
      });
      if (!res.ok) throw new Error("理財小精靈診斷失敗。");
      const data = await res.json();
      setAdvisorReport(safeAdvisorReport(data));
    } catch (err) {
      console.error("Advisor request fail:", err);
    } finally {
      setIsAdvising(false);
    }
  };

  // Manual Transaction Add
  const handleAddManualTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTx.amount || manualTx.amount <= 0) return;
    
    const newTx: Transaction = {
      id: 'tx-' + Date.now(),
      date: manualTx.date || new Date().toISOString().substring(0, 10),
      type: (manualTx.type as any) || 'expense',
      amount: Number(manualTx.amount),
      category: manualTx.category || '其他',
      location: manualTx.location || undefined,
      merchant: manualTx.merchant || undefined,
      tags: manualTx.tags || [],
      note: manualTx.note || '',
      recurrence: manualTx.recurrence || 'none',
      sourceText: '手動輸入'
    };

    const updated = [newTx, ...transactions];
    setTransactions(updated);
    setShowManualForm(false);
    
    // Check for Budget Alert
    checkBudget(newTx, transactions);
    
    // Reset state
    setManualTx({
      date: new Date().toISOString().substring(0, 10),
      type: 'expense',
      amount: 0,
      category: '日常支出',
      location: '',
      merchant: '',
      tags: [],
      recurrence: 'none',
      note: ''
    });
    setManualTagInput('');
    triggerAdvisorUpdate(updated, assets, budgets, goal);
  };

  const addManualTag = () => {
    if (manualTagInput.trim()) {
      setManualTx(prev => ({
        ...prev,
        tags: [...(prev.tags || []), manualTagInput.trim()]
      }));
      setManualTagInput('');
    }
  };

  const removeManualTag = (idx: number) => {
    setManualTx(prev => ({
      ...prev,
      tags: (prev.tags || []).filter((_, i) => i !== idx)
    }));
  };

  // Asset Actions
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name && newAsset.type !== 'stock') return;
    if (newAsset.type === 'stock' && (!newAsset.symbol || !newAsset.quantity)) return;

    const added: AssetItem = {
      id: 'asset-' + Date.now(),
      name: newAsset.type === 'stock' ? `${newAsset.symbol} 股票` : newAsset.name || '',
      type: newAsset.type as any,
      amount: newAsset.type === 'stock' ? 0 : Number(newAsset.amount || 0),
      quantity: newAsset.type === 'stock' ? Number(newAsset.quantity) : undefined,
      symbol: newAsset.type === 'stock' ? newAsset.symbol : undefined,
      growthRate: newAsset.growthRate ? Number(newAsset.growthRate) : undefined,
      note: newAsset.note || undefined
    };

    const updated = [...assets, added];
    setAssets(updated);
    setShowAssetForm(false);
    setNewAsset({ name: '', type: 'saving', amount: 0, quantity: 0, symbol: '', growthRate: 0, note: '' });
    triggerAdvisorUpdate(transactions, updated, budgets, goal);
  };

  // Custom confirm triggering helper
  const showConfirm = (title: string, message: string, onConfirmClick: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirmClick();
        setConfirmDialog(p => ({ ...p, isOpen: false }));
      }
    });
  };

  const handleDeleteAsset = (id: string) => {
    showConfirm('確定移除此資產明細？', '移除此項資產明細後，系統將重新計算您的淨值與儲蓄目標進度。', () => {
      const updated = assets.filter(a => a.id !== id);
      setAssets(updated);
      triggerAdvisorUpdate(transactions, updated, budgets, goal);
    });
  };

  // Budget Actions
  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.category || !newBudget.limit) return;

    const added: BudgetConfig = {
      category: newBudget.category,
      limit: Number(newBudget.limit)
    };

    const updated = [...budgets, added];
    setBudgets(updated);
    setShowBudgetForm(false);
    setNewBudget({ category: '', limit: 0 });
    triggerAdvisorUpdate(transactions, assets, updated, goal);
  };

  const handleUpdateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;

    const updated = budgets.map(b => 
      b.category === editingBudget.originalCategory 
        ? { category: editingBudget.category, limit: editingBudget.limit } 
        : b
    );

    setBudgets(updated);
    setEditingBudget(null);
    triggerAdvisorUpdate(transactions, assets, updated, goal);
  };

  const handleDeleteBudget = (category: string) => {
    showConfirm('確定移除預算限制？', `您確定要移除「${category}」的限額預算設定嗎？`, () => {
      const updated = budgets.filter(b => b.category !== category);
      setBudgets(updated);
      triggerAdvisorUpdate(transactions, assets, updated, goal);
    });
  };

  // Goal Update Action
  const handleUpdateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setGoal(editedGoal);
    setIsEditingGoal(false);
    triggerAdvisorUpdate(transactions, assets, budgets, editedGoal);
  };

  // Budget Reallocation Logic
  const handleReallocateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reallocFrom || !reallocTo || reallocAmount <= 0) return;

    const updatedBudgets = budgets.map(b => {
      if (b.category === reallocFrom) {
        return { ...b, limit: b.limit - reallocAmount };
      }
      if (b.category === reallocTo) {
        return { ...b, limit: b.limit + reallocAmount };
      }
      return b;
    });

    setBudgets(updatedBudgets);
    setShowReallocation(false);
    setReallocFrom('');
    setReallocTo('');
    setReallocAmount(0);
    triggerAdvisorUpdate(transactions, assets, updatedBudgets, goal);
  };

  // Delete Transaction Action
  const handleDeleteTx = (id: string) => {
    showConfirm('確定要刪除此筆記帳明細嗎？', '刪除後此筆明細將永遠消失，系統將自動倒扣與更新您本月的預算與累計收支。', () => {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      triggerAdvisorUpdate(updated, assets, budgets, goal);
    });
  };

  // Edit Transaction Handlers
  const handleStartEditTx = (tx: Transaction) => {
    setEditingTransaction({ ...tx });
    setEditTagInput('');
  };

  const handleSaveEditTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    
    const updated = transactions.map(t => t.id === editingTransaction.id ? editingTransaction : t);
    setTransactions(updated);
    setEditingTransaction(null);
    triggerAdvisorUpdate(updated, assets, budgets, goal);
  };

  return (
    <div id="morandi-app" className="min-h-screen bg-[#F0F2EB] text-[#33392F] flex">
      
      {/* 1. SIDEBAR LEFT (Decorative Editorial Art Column from "Editorial Aesthetic" theme instructions) */}
      <aside className="hidden md:flex w-20 bg-[#E3E7DA] border-r border-[#4F5D4A]/10 flex-col justify-between items-center py-10 text-center shrink-0">
        <div className="writing-mode-vertical text-[11px] font-sans font-semibold tracking-[0.3em] text-[#4F5D4A] uppercase select-none transform rotate-180">
          ESTABLISHED 2026
        </div>
        
        <div className="w-[1px] h-32 bg-[#4F5D4A] opacity-20"></div>
        
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 rounded-full border border-[#4F5D4A]/20 flex items-center justify-center text-xs font-serif font-semibold text-[#4F5D4A]">
            01
          </div>
          <p className="writing-mode-vertical text-[10px] tracking-[0.2em] font-sans font-medium text-[#8E9B85] uppercase">
            CHROMA ARCHIVE
          </p>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER (Editorial Titlebar Layout) */}
        <header className="border-b border-[#4F5D4A]/10 bg-[#eaece6]/60 backdrop-blur-md px-6 py-4 md:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-40">
          <div>
            <div className="text-[12px] uppercase tracking-[3px] text-[#A69C7D] font-bold">Issue No. 001 — Living Sage</div>
            <h1 className="text-3xl font-serif tracking-wide text-[#4F5D4A] mt-1 flex items-center gap-2">
              SAGE AI 記帳管家 <span className="text-sm font-sans px-2.5 py-0.5 bg-[#4F5D4A] text-[#F0F2EB] rounded-full uppercase tracking-widest scale-90">Beta</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-xs font-medium tracking-widest uppercase transition-all duration-300 border ${
                activeTab === 'dashboard' 
                  ? 'bg-[#4F5D4A] text-white border-[#4F5D4A] shadow-sm' 
                  : 'bg-white/60 hover:bg-[#E3E7DA] text-[#4F5D4A] border-transparent'
              }`}
            >
              智慧儀表板
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 text-xs font-medium tracking-widest uppercase transition-all duration-300 border ${
                activeTab === 'ledger' 
                  ? 'bg-[#4F5D4A] text-white border-[#4F5D4A] shadow-sm' 
                  : 'bg-white/60 hover:bg-[#E3E7DA] text-[#4F5D4A] border-transparent'
              }`}
            >
              流水記帳簿
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-4 py-2 text-xs font-medium tracking-widest uppercase transition-all duration-300 border ${
                activeTab === 'assets' 
                  ? 'bg-[#4F5D4A] text-white border-[#4F5D4A] shadow-sm' 
                  : 'bg-white/60 hover:bg-[#E3E7DA] text-[#4F5D4A] border-transparent'
              }`}
            >
              資產及目標
            </button>
            <button
              onClick={() => setActiveTab('budgets')}
              className={`px-4 py-2 text-xs font-medium tracking-widest uppercase transition-all duration-300 border ${
                activeTab === 'budgets' 
                  ? 'bg-[#4F5D4A] text-white border-[#4F5D4A] shadow-sm' 
                  : 'bg-white/60 hover:bg-[#E3E7DA] text-[#4F5D4A] border-transparent'
              }`}
            >
              限額預算
            </button>
          </div>
        </header>

        {/* WORKSPACE MIDDLE BODY */}
        <main className="flex-1 overflow-y-auto px-4 md:px-10 py-8 max-w-[1400px] w-full mx-auto">
          
          {/* TOP AI PARSER BLOCK & QUICK PRESETS (Always visible as premium feature banner) */}
          <section className="mb-10 bg-white border border-[#4F5D4A]/10 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            
            {/* The Input Arena */}
            <div className="p-6 md:p-8 lg:col-span-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 px-1.5 bg-[#E3E7DA] rounded text-[#4F5D4A]">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <span className="text-[12px] uppercase tracking-wider text-[#8E9B85] font-bold">Generative LLM Space</span>
                </div>
                <h2 className="text-xl md:text-2xl font-serif text-[#4F5D4A] mb-3">
                  自然語言模糊記帳
                </h2>
                <p className="text-xs text-[#6B7267] mb-5 leading-relaxed">
                  完全流暢記帳。只需輸入中文描述，如：
                  <span className="italic block font-medium text-[#4F5D4A] my-1">
                    「剛剛和朋友在逢甲吃小火鍋，我付了 350 元」
                  </span> 
                  或「今天發薪水 45000 元」，
                  理財小精靈會自動解析金額、大類、地點並同步建立對應財務欄位。
                </p>

                {/* Natural Speech / Text Form */}
                <div className="relative">
                  <textarea
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="請輸入或語音轉寫：「今天在 UberEats 訂外送手搖飲花了 $160 元，用信用卡扣款...」"
                    className="w-full text-sm p-4 pr-24 border border-[#4F5D4A]/15 bg-[#F7F9F6] focus:outline-none focus:border-[#4F5D4A] focus:ring-1 focus:ring-[#4F5D4A]/50 rounded-xl transition duration-200 resize-none font-sans"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleParseText(inputText);
                      }
                    }}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    {inputText.trim() && (
                      <button 
                        onClick={() => setInputText('')}
                        className="p-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleParseText(inputText)}
                      disabled={isParsing || !inputText.trim()}
                      className="px-4 py-2 bg-[#4F5D4A] hover:bg-[#3F513D] disabled:bg-gray-300 text-white rounded-lg text-xs font-medium tracking-wider flex items-center gap-1.5 transition duration-150"
                    >
                      {isParsing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          解析中..
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-3.5 h-3.5" />
                          AI 記帳
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {parseError && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>

            </div>

            {/* AI理財專員 Chat Feature */}
            <div className={`bg-[#8E9B85] text-white p-6 md:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${isMiniChatExpanded ? 'lg:col-span-12' : 'lg:col-span-4'}`}>
              <div className="absolute right-0 bottom-0 text-[120px] font-serif font-extrabold text-[#4F5D4A]/10 pointer-events-none select-none">
                AI
              </div>
              
              <div className="z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] tracking-[4px] uppercase opacity-75 font-bold">AI Financial Advisor</span>
                    <h3 className="text-2xl font-serif mt-2 leading-snug">AI理財專員</h3>
                  </div>
                  <button
                    onClick={() => setIsMiniChatExpanded(!isMiniChatExpanded)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {isMiniChatExpanded ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Chat Messages */}
                <div className={`bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl p-3 mb-4 overflow-y-auto transition-all duration-300 ${isMiniChatExpanded ? 'max-h-[400px]' : 'max-h-[200px]'}`}>
                  {chatMessages.slice(isMiniChatExpanded ? -10 : -3).map((msg, idx) => (
                    <div key={idx} className={`mb-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block px-3 py-1.5 rounded-lg ${
                        isMiniChatExpanded ? 'text-sm' : 'text-xs'
                      } ${
                        msg.role === 'user' 
                          ? 'bg-white/20 text-white' 
                          : 'bg-[#4F5D4A]/30 text-white'
                      }`}>
                        {msg.text}
                      </div>
                      <div className={`text-[9px] opacity-60 mt-1`}>{msg.time}</div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className={`opacity-75 animate-pulse ${isMiniChatExpanded ? 'text-sm' : 'text-xs'}`}>
                      思考中...
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={miniChatInput}
                    onChange={(e) => setMiniChatInput(e.target.value)}
                    placeholder="問我關於理財的問題..."
                    className={`w-full p-3 pr-20 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/50 ${isMiniChatExpanded ? 'text-sm' : 'text-xs'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleMiniChatSend();
                      }
                    }}
                  />
                  <button
                    onClick={handleMiniChatSend}
                    disabled={isChatLoading || !miniChatInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/20 hover:bg-white/30 disabled:bg-white/10 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

          </section>

          {/* DYNAMIC TAB OUTLINE SCENES */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT & CENTER PARTS: Ledger aggregates + Asset overview */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                
                {/* 1. NET WORTH SUMMARY & DYNAMIC GOAL TRACKER */}
                <div className="bg-white border border-[#4F5D4A]/10 p-6 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#8E9B85] font-bold">Your Portfolio Net Worth</span>
                      <h2 className="text-3xl font-serif text-[#4F5D4A] mt-1">
                        ${netWorth.toLocaleString()} <span className="text-xs font-sans text-[#6B7267] font-normal italic">TWD</span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-gray-400 block tracking-wider uppercase">存款儲蓄</span>
                        <span className="text-sm font-semibold text-[#556c52]">${totalSavings.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block tracking-wider uppercase">股票價值</span>
                        <span className="text-sm font-semibold text-amber-600">${totalStocks.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block tracking-wider uppercase">其他投資</span>
                        <span className="text-sm font-semibold text-[#8E9B85]">${totalInvestments.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block tracking-wider uppercase">債務貸款</span>
                        <span className="text-sm font-semibold text-rose-800">${totalDebts.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Goal Progress Bar - 只有設定目標時才顯示 */}
                  {goal.targetAmount > 0 && (
                    <div className="border-t border-[#4F5D4A]/5 pt-6">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium bg-[#A69C7D]/20 text-[#8E9B85] px-2 py-0.5 rounded-md">
                            長期規劃
                          </span>
                          <span className="text-sm font-serif font-bold text-[#4F5D4A]">{goal.title}</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-[#4F5D4A]">{percentOfGoal}%</span>
                      </div>

                      {/* Progress slider line */}
                      <div className="w-full h-2.5 bg-[#F0F2EB] rounded-full overflow-hidden relative">
                        <div 
                          className="h-full bg-[#728a6f] rounded-full transition-all duration-1000"
                          style={{ width: `${percentOfGoal}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-[#6B7267] mt-2 mb-6">
                        <span>當前預計總值: <strong className="text-[#4F5D4A]">{netWorth.toLocaleString()}</strong></span>
                        <span>目標金額: <strong className="text-[#4F5D4A]">{goal.targetAmount.toLocaleString()}</strong></span>
                        {goal.deadline && <span>期限: {goal.deadline}</span>}
                      </div>

                      {/* Goal Timeline/Trend Visualization */}
                      <div className="bg-[#F7F9F6] p-4 rounded-2xl border border-[#4F5D4A]/5">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-[#8E9B85]">
                            {goal.deadline ? '目標6階段預測' : '三年6階段目標達成預測'}
                          </span>
                          <TrendingUp className="w-3.5 h-3.5 text-[#8E9B85]" />
                        </div>
                        
                        <div className="relative pt-8 pb-4 overflow-x-auto">
                          <div className="flex justify-between items-start relative z-10 min-w-[1500px] px-4">
                            {/* Timeline horizontal line - behind all dots */}
                            <div className="absolute top-10 left-4 right-4 h-[2px] bg-gray-200 z-0"></div>
                            
                            {timelinePhases.map((phase, idx) => {
                              const dotSizeClass = phase.isToday ? 'w-5 h-5' : 'w-4 h-4';
                              let dotColorClass = 'bg-gray-300';
                              if (phase.isPhaseTargetMet) {
                                dotColorClass = 'bg-[#728a6f]';
                              } else if (phase.isToday) {
                                dotColorClass = 'bg-[#4F5D4A]';
                              } else if (idx < timelinePhases.findIndex(p => p.isPhaseTargetMet)) {
                                dotColorClass = 'bg-[#8E9B85]';
                              }
                              
                              let textColorClass = 'text-gray-500';
                              if (phase.isPhaseTargetMet) {
                                textColorClass = 'text-[#728a6f]';
                              } else if (phase.isToday) {
                                textColorClass = 'text-[#4F5D4A]';
                              }
                              
                              return (
                                <div key={phase.index} className="flex flex-col items-center min-w-[160px] relative z-10">
                                  <div className={`${dotSizeClass} rounded-full mb-4 ring-4 ring-white shadow-sm ${dotColorClass}`}></div>
                                  <span className="text-xs font-medium text-gray-600 text-center mb-3">{phase.label}</span>
                                  <div className="bg-white/80 rounded-lg p-3 border border-gray-100 shadow-sm w-full">
                                    <div className="text-center mb-2">
                                      <span className="text-xs text-gray-400 uppercase tracking-wide">目標</span>
                                      <p className={`text-sm font-bold ${textColorClass}`}>
                                        {phase.phaseTargetAmount.toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className={`text-xs font-bold ${textColorClass}`}>
                                        {phase.phaseTargetProgress}%
                                      </p>
                                    </div>
                                  </div>
                                  {phase.isPhaseTargetMet && (
                                    <span className="text-xs text-[#728a6f] font-bold mt-3 bg-green-50 px-2 py-1 rounded-full">✓ 達成</span>
                                  )}
                                  {!phase.isPhaseTargetMet && phase.projectedNetWorth > 0 && (
                                    <span className="text-xs text-amber-600 font-bold mt-3 bg-amber-50 px-2 py-1 rounded-full">待追趕</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <p className="text-[10px] text-[#8E9B85] mt-3 text-center italic">
                          * 根據您當前淨資產 {netWorth.toLocaleString()} 與資產成長率，預測{goal.deadline ? '至目標截止日期' : '未來3年'}的淨值增長軌跡
                        </p>
                      </div>

                      {/* AI Feedback on dynamic long-term goal */}
                      {advisorReport?.goalFeedback && (
                        <div className="mt-4 bg-[#F0F2EB]/60 p-3 rounded-xl border border-[#4F5D4A]/5 text-xs text-[#556c52] leading-relaxed flex items-start gap-2">
                          <span className="text-base select-none mt-0.5">🌱</span>
                          <div>
                            <p className="font-semibold text-[#4F5D4A] mb-0.5">目標進度分析</p>
                            <p>{advisorReport.goalFeedback}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subscription specific items list - 這個無論有沒有目標都顯示 */}
                  {transactions.filter(t => t.type === 'subscription').length > 0 && (
                    <div className="mt-6 pt-6 border-t border-[#4F5D4A]/10">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#8E9B85] mb-4 block">偵測到的訂閱服務</span>
                      <div className="space-y-3">
                        {transactions.filter(t => t.type === 'subscription').map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#4F5D4A]/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#F0F2EB] flex items-center justify-center text-[#4F5D4A]">
                              <RefreshCw className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#4F5D4A]">{sub.merchant || sub.category}</p>
                              <p className="text-[10px] text-[#8E9B85]">每月定期扣款</p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#4F5D4A]">${sub.amount}</span>
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. RECENT SAGE TRANSACTIONS */}
                <div className="bg-white border border-[#4F5D4A]/10 p-6 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#8E9B85] font-bold">Transaction Ledgers</span>
                      <h3 className="text-lg font-serif text-[#4F5D4A]">最新記帳流水</h3>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowManualForm(true)}
                        className="p-1 px-3 bg-[#F0F2EB] hover:bg-[#E3E7DA] text-[#4F5D4A] border border-[#293628]/10 text-xs rounded-lg flex items-center gap-1 transition duration-150 font-medium"
                      >
                        <Plus className="w-3 h-3" />手動新增
                      </button>
                      <button 
                        onClick={() => setActiveTab('ledger')}
                        className="p-1 px-3 bg-white hover:bg-[#F0F2EB] text-[#8E9B85] border border-[#8E9B85]/20 text-xs rounded-lg transition duration-150"
                      >
                        看全部
                      </button>
                    </div>
                  </div>

                  {/* Manual Form Overlay Modal */}
                  {showManualForm && (
                    <div className="mb-6 p-5 border border-[#4F5D4A]/15 bg-[#F4F6F3] rounded-xl relative">
                      <button 
                        onClick={() => setShowManualForm(false)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <h4 className="text-sm font-serif font-bold text-[#4F5D4A] mb-3">手動新增流水筆記</h4>
                      <form onSubmit={handleAddManualTransaction} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-gray-500 mb-1">交易類型</label>
                          <select 
                            value={manualTx.type}
                            onChange={(e) => setManualTx(prev => ({ ...prev, type: e.target.value as any }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                          >
                            <option value="expense">一般支出 (Expense)</option>
                            <option value="income">薪資/收入 (Income)</option>
                            <option value="investment">定期投資/理財 (Investment)</option>
                            <option value="saving">固定存款餘額 (Saving)</option>
                            <option value="subscription">固定扣款訂閱 (Subscription)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">日期 (YYYY-MM-DD)</label>
                          <input 
                            type="date"
                            value={manualTx.date}
                            onChange={(e) => setManualTx(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">金額 (TWD)</label>
                          <input 
                            type="number"
                            placeholder="例如 350"
                            value={manualTx.amount || ''}
                            onChange={(e) => setManualTx(prev => ({ ...prev, amount: Number(e.target.value) }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">分類類別</label>
                          <input 
                            type="text"
                            placeholder="例如：餐飲/午餐、手搖飲、社交娛樂、房租"
                            value={manualTx.category || ''}
                            onChange={(e) => setManualTx(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">商家名稱 (選填)</label>
                          <input 
                            type="text"
                            placeholder="例如：五十嵐、富邦證券、Netflix"
                            value={manualTx.merchant || ''}
                            onChange={(e) => setManualTx(prev => ({ ...prev, merchant: e.target.value }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">地點名稱 (選填)</label>
                          <input 
                            type="text"
                            placeholder="例如：逢甲、信義區、線上"
                            value={manualTx.location || ''}
                            onChange={(e) => setManualTx(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-gray-500 mb-1">備註/描述</label>
                          <input 
                            type="text"
                            placeholder="請填入備忘記事"
                            value={manualTx.note || ''}
                            onChange={(e) => setManualTx(prev => ({ ...prev, note: e.target.value }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-gray-500 mb-1">標籤設定 (按 Enter 或按新增)</label>
                          <div className="flex gap-2 mb-1.5">
                            <input 
                              type="text"
                              placeholder="例如：晚餐、朋友慶祝、固定支出"
                              value={manualTagInput}
                              onChange={(e) => setManualTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addManualTag();
                                }
                              }}
                              className="flex-1 p-2 bg-white border border-gray-300 rounded"
                            />
                            <button 
                              type="button"
                              onClick={addManualTag}
                              className="px-3 bg-[#4F5D4A] hover:bg-[#3F513D] text-white rounded text-xs"
                            >
                              加入
                            </button>
                          </div>
                          {manualTx.tags && manualTx.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {manualTx.tags.map((tag, idx) => (
                                <span key={idx} className="bg-[#E3E7DA] text-[#4F5D4A] px-2 py-0.5 rounded-full flex items-center gap-1">
                                  {tag}
                                  <X className="w-3 h-3 hover:text-red-700 cursor-pointer" onClick={() => removeManualTag(idx)} />
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="sm:col-span-2 flex justify-end gap-2 mt-4">
                          <button 
                            type="button" 
                            onClick={() => setShowManualForm(false)}
                            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50"
                          >
                            取消
                          </button>
                          <button 
                            type="submit"
                            className="px-4 py-2 bg-[#4F5D4A] text-white hover:bg-[#3F513D] rounded shadow-sm font-semibold text-xs tracking-wider"
                          >
                            確認並送出記帳
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Transaction Rows - Filtered to exclude subscriptions for a cleaner dashboard */}
                  <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto pr-1">
                    {transactions.filter(t => t.type !== 'subscription').length === 0 ? (
                      <div className="py-10 text-center text-gray-400 text-xs">
                        目前尚無一般流水帳。請使用上方 AI 記帳或建立手動筆數。
                      </div>
                    ) : (
                      transactions.filter(t => t.type !== 'subscription').slice(0, 10).map((item) => (
                        <div key={item.id} className="py-3 flex justify-between items-center group transition">
                          <div className="flex items-start gap-3 min-w-0">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-lg ${
                              item.type === 'income' ? 'bg-[#728a6f]/10 text-[#556c52]' :
                              item.type === 'subscription' ? 'bg-indigo-50 text-indigo-700' :
                              item.type === 'investment' ? 'bg-amber-50 text-amber-700' :
                              'bg-gray-100 text-[#4F5D4A]'
                            }`}>
                              {item.type === 'income' ? '💰' : item.type === 'subscription' ? '🔄' : item.type === 'investment' ? '📈' : '🍵'}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#4F5D4A] flex items-center gap-1.5 flex-wrap">
                                {item.merchant && <span className="opacity-75 font-serif font-bold text-sm">{item.merchant}</span>}
                                <span className="text-gray-400 font-normal">({item.category})</span>
                              </p>
                              {item.note && <p className="text-xs text-gray-500 mt-0.5 truncate">{item.note}</p>}
                              
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {item.location && (
                                  <span className="text-[10px] text-[#8E9B85] bg-[#F0F2EB] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" /> {item.location}
                                  </span>
                                )}
                                {item.tags && item.tags.map((tag, i) => (
                                  <span key={i} className="text-[10px] text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <Tag className="w-2.5 h-2.5 opacity-60" /> {tag}
                                  </span>
                                ))}
                                {item.recurrence && item.recurrence !== 'none' && (
                                  <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded uppercase font-semibold">
                                    定期: {item.recurrence}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-4 flex items-center gap-3">
                            <div className="text-xs shrink-0">
                              <span className={`font-mono text-sm font-bold block ${
                                item.type === 'income' ? 'text-[#556c52]' : 'text-gray-700'
                              }`}>
                                {item.type === 'income' ? '+' : '-'}${item.amount.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-gray-400 block">{item.date}</span>
                            </div>
                            
                            <button
                              onClick={() => handleStartEditTx(item)}
                              className="text-[#8E9B85] hover:text-[#556c52] p-1.5 hover:bg-[#F0F2EB] rounded-lg transition duration-150"
                              title="修改"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteTx(item.id)}
                              className="text-[#8E9B85] hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition duration-150"
                              title="刪除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT PARTS: AI Sage, Budgets limits, and Subscription checks */}
              <div className="lg:col-span-4 flex flex-col gap-8">
                
                {/* 1. SAGE THE ADVISOR (理財小精靈專區 - 莫蘭迪綠色服飾小精靈形象) */}
                <div className="bg-[#E4ECE6] border border-[#728a6f]/20 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-[#728a6f]/5 rounded-bl-full pointer-events-none"></div>
                  
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="text-2xl animate-bounce">🧚‍♂️</span>
                    <div>
                      <h3 className="font-serif font-bold text-base text-[#4F5D4A]">理財小精靈 - 艾莉絲</h3>
                      <p className="text-[10px] uppercase tracking-widest text-[#728a6f] font-semibold">AI SAGE COMPANION</p>
                    </div>
                  </div>

                  <div className="text-xs bg-white/70 tracking-wide rounded-xl p-4 border border-white leading-relaxed text-[#33392F]">
                    {isAdvising ? (
                      <div className="py-12 text-center flex flex-col items-center gap-3">
                        <RefreshCw className="w-6 h-6 text-[#728a6f] animate-spin" />
                        <span className="text-xs font-mono text-[#4F5D4A]">小精靈診斷中，請稍候...</span>
                        <span className="text-[10px] text-gray-400">正在分析本月記帳與預算安全度</span>
                      </div>
                    ) : (
                      <>
                        <p className="mb-2 italic leading-relaxed">
                          {advisorReport?.summary ? `"${advisorReport.summary}"` : "「歡迎使用 Sage 記帳管家。請開始記帳，我將為您提供即時的財務分析建議。」"}
                        </p>
                        
                        {/* Warnings dynamically injected */}
                        {advisorReport?.warning && (
                          <div className="mt-3 bg-amber-50 border border-amber-200/50 p-2.5 rounded-lg text-[11px] text-amber-800 font-medium">
                            <span className="font-bold flex items-center gap-1 text-xs mb-1">
                              ⚠️ 智慧警告：
                            </span>
                            {advisorReport.warning}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => triggerAdvisorUpdate()}
                      disabled={isAdvising}
                      className="w-full py-2 bg-[#556c52] hover:bg-[#3f513d] text-white rounded-lg text-xs font-medium tracking-wider flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <BrainCircuit className="w-3.5 h-3.5" />
                      重新呼叫精靈分析
                    </button>
                  </div>
                </div>

                {/* 2. INSTANT BUDGET CHECK (即時消費限額預算 - OCR: "動態超支預警") */}
                <div className="bg-white border border-[#4F5D4A]/10 p-6 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#8E9B85] font-bold">Monthly Budgets</span>
                      <h4 className="text-sm font-serif font-bold text-[#4F5D4A]">限額預算超支檢視</h4>
                    </div>
                    <button
                      onClick={() => setActiveTab('budgets')}
                      className="text-xs text-[#8E9B85] hover:text-[#4F5D4A] hover:underline"
                    >
                      調整額度
                    </button>
                  </div>

                  <div className="space-y-4">
                    {budgets.map((b, idx) => {
                      const spending = getCategorySpending(b.category);
                      const percent = Math.min(Math.round((spending / b.limit) * 100), 100);
                      const isDanger = percent >= 85;

                      return (
                        <div key={idx} className="text-xs">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-medium">{b.category}</span>
                            <span className="text-gray-400">
                              <strong className={`${isDanger ? 'text-red-700' : 'text-[#4F5D4A]'}`}>${spending}</strong> / ${b.limit} (TWD)
                            </span>
                          </div>
                          
                          <div className="w-full h-1.5 bg-[#F0F2EB] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                percent >= 100 ? 'bg-red-800' : percent >= 80 ? 'bg-[#B6AD90]' : 'bg-[#93a890]'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          {percent >= 85 && (
                            <div className="mt-1 text-[10px] text-red-800 bg-red-50 p-1.5 rounded flex items-center gap-1 border border-red-100">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>已超支警告！建議從治裝或固定項挪移預算配合。</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. SUBSCRIPTIONS DETECTOR (潛在訂閱服務抓漏 - OCR: "續約前一週提醒") */}
                <div className="bg-white border border-[#4F5D4A]/10 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarCheck2 className="w-4 h-4 text-[#8E9B85]" />
                    <h4 className="text-sm font-serif font-bold text-[#4F5D4A]">自動訂閱抓漏提醒</h4>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
                    智慧抓漏引擎正即時掃描 Spotify、Netflix、iCloud 等固定週期費用。下期扣款前一週向您發出警告：
                  </p>

                  <div className="space-y-3">
                    {Array.isArray(advisorReport?.subscriptionAlerts) && advisorReport.subscriptionAlerts.map((alert, idx) => (
                      <div key={idx} className="p-3 bg-rose-50 border border-rose-100 text-[11px] text-rose-800 rounded-xl leading-relaxed">
                        <div className="flex gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <span>{alert}</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* List active recurring subscriptions */}
                    <div className="bg-[#F0F2EB]/50 p-2.5 rounded-lg border border-[#4F5D4A]/5">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1">
                        常規訂閱簿:
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {transactions.filter(t => t.type === 'subscription').map((sub) => (
                          <div key={sub.id} className="flex justify-between items-center text-[10px] text-[#4F5D4A]">
                            <span>• {sub.merchant || sub.category} / {sub.recurrence}</span>
                            <span className="font-mono font-semibold">${sub.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TABLE PAGE: LEDGERS */}
          {activeTab === 'ledger' && (
            <div className="bg-white border border-[#4F5D4A]/10 p-6 md:p-8 rounded-2xl shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#8E9B85] font-bold">Ledger Archive</span>
                  <h2 className="text-2xl font-serif text-[#4F5D4A] mt-1">流水明細流水簿</h2>
                </div>
                <div className="flex gap-2">
                  <div className="flex bg-[#F0F2EB] rounded-lg p-1 mr-4">
                    <button 
                      onClick={() => setLedgerFilter('all')}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition ${ledgerFilter === 'all' ? 'bg-white text-[#4F5D4A] shadow-sm' : 'text-[#8E9B85] hover:text-[#4F5D4A]'}`}
                    >
                      全部
                    </button>
                    <button 
                      onClick={() => setLedgerFilter('expense')}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition ${ledgerFilter === 'expense' ? 'bg-white text-[#4F5D4A] shadow-sm' : 'text-[#8E9B85] hover:text-[#4F5D4A]'}`}
                    >
                      一般消費
                    </button>
                    <button 
                      onClick={() => setLedgerFilter('subscription')}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition ${ledgerFilter === 'subscription' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[#8E9B85] hover:text-[#4F5D4A]'}`}
                    >
                      自動訂閱
                    </button>
                  </div>
                  <button
                    onClick={() => setShowManualForm(true)}
                    className="px-4 py-2 bg-[#4F5D4A] text-white hover:bg-[#3F513D] text-xs font-semibold rounded-lg transition"
                  >
                    + 手動記帳
                  </button>
                </div>
              </div>

              {/* Comprehensive List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">日期</th>
                      <th className="py-3 px-4">交易類目</th>
                      <th className="py-3 px-4">大類與說明</th>
                      <th className="py-3 px-4">地點 / 標籤</th>
                      <th className="py-3 px-4">來源/備註</th>
                      <th className="py-3 px-4 text-right">金額 (TWD)</th>
                      <th className="py-3 px-4 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions
                      .filter(item => {
                        if (ledgerFilter === 'all') return true;
                        if (ledgerFilter === 'expense') return item.type !== 'subscription';
                        if (ledgerFilter === 'subscription') return item.type === 'subscription';
                        return true;
                      })
                      .map((item) => (
                      <tr key={item.id} className="hover:bg-[#F0F2EB]/30 transition duration-150">
                        <td className="py-3.5 px-4 font-mono">{item.date}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            item.type === 'income' ? 'bg-emerald-50 text-emerald-800' :
                            item.type === 'subscription' ? 'bg-indigo-50 text-indigo-800' :
                            item.type === 'investment' ? 'bg-amber-50 text-amber-800' :
                            item.type === 'saving' ? 'bg-cyan-50 text-cyan-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900">{item.merchant || item.category}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{item.category}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {item.location && (
                              <span className="bg-[#E3E7DA] text-[#4F5D4A] text-[9px] px-1.5 py-0.5 rounded flex items-center">
                                {item.location}
                              </span>
                            )}
                            {item.tags && item.tags.map((tag, idx) => (
                              <span key={idx} className="border border-gray-200 text-gray-500 text-[9px] px-1.5 py-0.5 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="max-w-[180px] truncate text-gray-500" title={item.note || item.sourceText}>
                            {item.note || item.sourceText}
                          </p>
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${
                          item.type === 'income' ? 'text-[#556c52]' : 'text-gray-800'
                        }`}>
                          {item.type === 'income' ? '+' : '-'}${item.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleStartEditTx(item)}
                              className="p-1 text-gray-400 hover:text-[#556c52] rounded transition"
                              title="修改"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTx(item.id)}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                              title="刪除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STATS/ASSETS PAGE: PORTFOLIO */}
          {activeTab === 'assets' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Asset list manager */}
              <div className="lg:col-span-8 bg-white border border-[#4F5D4A]/10 p-6 md:p-8 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#8E9B85] font-bold">Investments & Savings Master</span>
                    <h2 className="text-2xl font-serif text-[#4F5D4A] mt-1">資產部位 & 儲蓄清冊</h2>
                  </div>
                  <div className="flex gap-2">
                    {assets.some(a => a.type === 'stock') && (
                      <button
                        onClick={refreshAllStockPrices}
                        disabled={isFetchingStock}
                        className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                      >
                        {isFetchingStock ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        刷新股價
                      </button>
                    )}
                    <button
                      onClick={() => setShowAssetForm(true)}
                      className="px-4 py-2 bg-[#4F5D4A] text-white hover:bg-[#3F513D] text-xs font-semibold rounded-lg transition"
                    >
                      + 新增資產帳戶
                    </button>
                  </div>
                </div>

                {/* Add Asset Form Modal */}
                {showAssetForm && (
                  <form onSubmit={handleAddAsset} className="mb-6 p-5 border border-dashed border-[#8E9B85]/40 bg-[#F4F6F3] rounded-xl text-xs gap-4 grid grid-cols-1 sm:grid-cols-2 relative">
                    <button 
                      type="button"
                      onClick={() => setShowAssetForm(false)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div>
                      <label className="block text-gray-500 mb-1">資產類別</label>
                      <select 
                        value={newAsset.type}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded"
                      >
                        <option value="saving">一般存款活儲 (Saving)</option>
                        <option value="investment">證券投資部位 (Investment)</option>
                        <option value="stock">股票持股 (Stock)</option>
                        <option value="debt">負債/貸款攤還 (Debt)</option>
                      </select>
                    </div>

                    {newAsset.type === 'stock' ? (
                      <>
                        <div>
                          <label className="block text-gray-500 mb-1">股票代號</label>
                          <input 
                            type="text"
                            placeholder="例如：0050"
                            value={newAsset.symbol || ''}
                            onChange={(e) => setNewAsset(prev => ({ ...prev, symbol: e.target.value }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">持有股數</label>
                          <input 
                            type="number"
                            placeholder="例如：1000"
                            value={newAsset.quantity || ''}
                            onChange={(e) => setNewAsset(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                            required
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-gray-500 mb-1">資產/管道名稱</label>
                          <input 
                            type="text"
                            placeholder="例如：台幣高利存摺、美金定存"
                            value={newAsset.name}
                            onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">當前金額 (TWD)</label>
                          <input 
                            type="number"
                            placeholder="例如：600000"
                            value={newAsset.amount || ''}
                            onChange={(e) => setNewAsset(prev => ({ ...prev, amount: Number(e.target.value) }))}
                            className="w-full p-2 bg-white border border-gray-300 rounded"
                            required
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-gray-500 mb-1">預期年化收益/利息率 % (如無則不填)</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="例如：12.5"
                        value={newAsset.growthRate || ''}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, growthRate: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-gray-500 mb-1">其他備忘事項說明</label>
                      <textarea 
                        rows={2}
                        placeholder="補充說明事項..."
                        value={newAsset.note || ''}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, note: e.target.value }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded resize-none"
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                      <button 
                        type="button" 
                        onClick={() => setShowAssetForm(false)}
                        className="px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50"
                      >
                        取消
                      </button>
                      <button 
                        type="submit"
                        className="px-3 py-1.5 bg-[#4F5D4A] text-white rounded font-semibold"
                      >
                        確認建立帳戶
                      </button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-gray-100">
                  {assets.map((item) => (
                    <div key={item.id} className="py-4 flex justify-between items-center group">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            item.type === 'saving' ? 'bg-[#728a6f]' : item.type === 'investment' ? 'bg-[#8E9B85]' : item.type === 'stock' ? 'bg-amber-600' : 'bg-red-800'
                          }`}></span>
                          <span className="font-serif font-bold text-base text-[#4F5D4A]">{item.name}</span>
                          {item.type === 'stock' && item.symbol && (
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                              <TrendingUp className="w-3 h-3" />
                              <span className="text-[10px] font-bold">
                                {stockPrices[item.symbol] ? (
                                  `即時價: $${stockPrices[item.symbol]}`
                                ) : isFetchingStock ? (
                                  <span className="flex items-center gap-1">
                                    <RefreshCw className="w-2 h-2 animate-spin" />
                                    獲取中
                                  </span>
                                ) : (
                                  '尚未獲取價格'
                                )}
                              </span>
                            </div>
                          )}
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider bg-gray-50 px-1.5 py-0.5 rounded-md font-mono">
                            {item.type}
                          </span>
                        </div>
                        {item.note && <p className="text-xs text-gray-400 mt-1 pl-4">{item.note}</p>}
                        {item.growthRate !== undefined && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#556c52] pl-4 mt-1">
                            <TrendingUp className="w-3.5 h-3.5 text-[#728a6f]" />
                            <span>預期成長年息率 {item.growthRate}%</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <span className={`text-base font-bold ${item.type === 'debt' ? 'text-red-800' : 'text-[#4F5D4A]'}`}>
                            {item.type === 'debt' ? '-' : ''}$
                            {item.type === 'stock' 
                              ? ((item.quantity || 0) * (stockPrices[item.symbol || ''] || 0)).toLocaleString() 
                              : item.amount.toLocaleString()} TWD
                          </span>
                          {item.type === 'stock' && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {item.quantity?.toLocaleString()} 股 × ${stockPrices[item.symbol || ''] || 0}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteAsset(item.id)}
                          className="text-gray-300 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition"
                          title="刪除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goal Editor Block */}
              <div className="lg:col-span-4 bg-white border border-[#4F5D4A]/10 p-6 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-serif font-bold text-base text-[#4F5D4A]">更新財務安全目標</h3>
                  {!isEditingGoal && (
                    <button
                      onClick={() => {
                        setEditedGoal({ ...goal });
                        setIsEditingGoal(true);
                      }}
                      className="text-xs text-[#8E9B85] hover:text-[#4F5D4A]"
                    >
                      修改設定
                    </button>
                  )}
                </div>

                {isEditingGoal ? (
                  <form onSubmit={handleUpdateGoal} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-gray-500 mb-1">目標主體</label>
                      <input 
                        type="text"
                        value={editedGoal.title}
                        onChange={(e) => setEditedGoal(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">目標所需金額 (TWD)</label>
                      <input 
                        type="number"
                        value={editedGoal.targetAmount}
                        onChange={(e) => setEditedGoal(prev => ({ ...prev, targetAmount: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">計畫截止期限 (選填)</label>
                      <input 
                        type="date"
                        value={editedGoal.deadline || ''}
                        onChange={(e) => setEditedGoal(prev => ({ ...prev, deadline: e.target.value }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button 
                        type="button"
                        onClick={() => setIsEditingGoal(false)}
                        className="px-3 py-1.5 border border-gray-300 bg-white rounded"
                      >
                        取消
                      </button>
                      <button 
                        type="submit"
                        className="px-3 py-1.5 bg-[#4F5D4A] text-white rounded font-semibold"
                      >
                        儲存變更
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="p-4 bg-[#F4F6F3] rounded-xl border border-[#4F5D4A]/5 mb-4">
                      <span className="text-[10px] text-gray-400 tracking-wider block uppercase mb-1">當前規劃事項</span>
                      <p className="text-sm font-serif font-bold text-[#4F5D4A]">{goal.title}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200/50">
                        <div>
                          <span className="text-[9px] text-gray-400 block">所需金額</span>
                          <span className="font-mono text-xs font-semibold">${goal.targetAmount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block">截止日期</span>
                          <span className="font-mono text-xs font-semibold">{goal.deadline || '無特定期限'}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      💡 提示：你的儲蓄淨資產（台幣利潤＋股票投資部位－政府就學貸款負債等）會自動回饋在此目標進度。
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* BUDGET CONFIGS PAGE */}
          {activeTab === 'budgets' && (
            <div className="bg-white border border-[#4F5D4A]/10 p-6 md:p-8 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#8E9B85] font-bold">Budgets Limit Master</span>
                  <h2 className="text-2xl font-serif text-[#4F5D4A] mt-1">智慧類別預算主控盤</h2>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowReallocation(true)}
                    className="px-4 py-2 bg-[#F0F2EB] hover:bg-[#E3E7DA] text-[#4F5D4A] border border-[#293628]/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> 預算挪移
                  </button>
                  <button
                    onClick={() => setShowBudgetForm(true)}
                    className="px-4 py-2 bg-[#4F5D4A] text-white hover:bg-[#3F513D] text-xs font-semibold rounded-lg transition"
                  >
                    + 設定類別上限
                  </button>
                </div>
              </div>

              {/* Edit Budget Form Inline modal */}
              {editingBudget && (
                <form onSubmit={handleUpdateBudget} className="mb-6 p-4 border border-[#4F5D4A]/30 bg-[#F4F6F3] rounded-xl text-xs gap-3 grid grid-cols-1 sm:grid-cols-2 relative shadow-sm">
                  <button 
                    type="button"
                    onClick={() => setEditingBudget(null)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="sm:col-span-2 border-b border-[#4F5D4A]/10 pb-2 mb-1">
                    <span className="font-bold text-[#4F5D4A]">修改預算項目：{editingBudget.originalCategory}</span>
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">大類名稱</label>
                    <input 
                      type="text"
                      placeholder="例如：手搖飲/外送"
                      value={editingBudget.category}
                      onChange={(e) => setEditingBudget(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                      className="w-full p-2 bg-white border border-gray-300 rounded focus:border-[#4F5D4A] outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">月額度限額上限 (TWD)</label>
                    <input 
                      type="number"
                      placeholder="例如：5000"
                      value={editingBudget.limit || ''}
                      onChange={(e) => setEditingBudget(prev => prev ? ({ ...prev, limit: Number(e.target.value) }) : null)}
                      className="w-full p-2 bg-white border border-gray-300 rounded focus:border-[#4F5D4A] outline-none"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <button 
                      type="button" 
                      onClick={() => setEditingBudget(null)}
                      className="px-3 py-1.5 border border-gray-300 bg-white rounded hover:bg-gray-50 transition"
                    >
                      取消
                    </button>
                    <button 
                      type="submit"
                      className="px-3 py-1.5 bg-[#556c52] text-white rounded font-semibold hover:bg-[#3f513d] transition shadow-sm"
                    >
                      儲存修改
                    </button>
                  </div>
                </form>
              )}

              {/* Add Budget Form Inline modal */}
              {showBudgetForm && (
                <form onSubmit={handleAddBudget} className="mb-6 p-4 border border-dashed border-[#8E9B85]/40 bg-[#F4F6F3] rounded-xl text-xs gap-3 grid grid-cols-1 sm:grid-cols-2 relative">
                  <button 
                    type="button"
                    onClick={() => setShowBudgetForm(false)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div>
                    <label className="block text-gray-500 mb-1">大類名稱</label>
                    <input 
                      type="text"
                      placeholder="例如：手搖飲/外送、餐飲/晚餐、治裝費"
                      value={newBudget.category}
                      onChange={(e) => setNewBudget(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-2 bg-white border border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">月額度限額上限 (TWD)</label>
                    <input 
                      type="number"
                      placeholder="例如：5000"
                      value={newBudget.limit || ''}
                      onChange={(e) => setNewBudget(prev => ({ ...prev, limit: Number(e.target.value) }))}
                      className="w-full p-2 bg-white border border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <button 
                      type="button" 
                      onClick={() => setShowBudgetForm(false)}
                      className="px-3 py-1.5 border border-gray-300 bg-white rounded"
                    >
                      取消
                    </button>
                    <button 
                      type="submit"
                      className="px-3 py-1.5 bg-[#4F5D4A] text-white rounded font-semibold"
                    >
                      建立預算
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {budgets.map((b, idx) => {
                  const spent = getCategorySpending(b.category);
                  const remains = b.limit - spent;
                  const ratio = Math.min((spent / b.limit) * 100, 100);

                  return (
                    <div key={idx} className="p-5 border border-gray-100 rounded-xl relative hover:border-[#4F5D4A]/10 transition">
                      <div className="absolute right-3 top-3 flex gap-2">
                        <button
                          onClick={() => setEditingBudget({ originalCategory: b.category, category: b.category, limit: b.limit })}
                          className="text-gray-300 hover:text-[#556c52] transition"
                          title="修改"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(b.category)}
                          className="text-gray-300 hover:text-rose-600 transition"
                          title="刪除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="font-serif font-bold text-base text-[#4F5D4A] mb-1">{b.category}</p>
                      
                      <div className="flex justify-between items-center text-xs mt-3">
                        <span className="text-[#8E9B85] font-medium">
                          預算限額: <strong>${b.limit.toLocaleString()}</strong> 元
                        </span>
                        <span className="text-gray-400">
                          本月累計: <strong className={spent > b.limit ? 'text-red-700' : 'text-[#4F5D4A]'}>${spent.toLocaleString()}</strong> 元
                        </span>
                      </div>

                      <div className="w-full h-2 bg-[#F0F2EB] rounded-full overflow-hidden mt-2 relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${spent > b.limit ? 'bg-red-800' : 'bg-[#728a6f]'}`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px] mt-2 text-gray-500">
                        <span>預算配比 {Math.round(ratio)}%</span>
                        {remains >= 0 ? (
                          <span className="text-[#556c52]">尚餘可用 ${remains.toLocaleString()} 元</span>
                        ) : (
                          <span className="text-rose-700 font-semibold">超支額度 ${Math.abs(remains).toLocaleString()} 元</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}



        </main>

        {/* FOOTER (Editorial layout detail) */}
        <footer className="border-t border-[#4F5D4A]/10 py-6 px-10 text-xs flex flex-col md:flex-row justify-between items-center gap-4 bg-[#F0F2EB] text-[#6B7267]">
          <div>🌿 Sage Bookkeeping & Financial Journal Studio</div>
          <div>Muted Morandi Green Aesthetic & Professional Private Banker Advisor</div>
          <div>Vol. IV — Page 2026</div>
        </footer>

      </div>

      {/* 2. CUSTOM CONFIRM MODAL (Morandi Green Theme) */}
      {confirmDialog.isOpen && (
        <div id="confirm-modal-overlay" className="fixed inset-0 z-50 bg-[#33392F]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div id="confirm-modal-box" className="bg-white border border-[#4F5D4A]/10 max-w-sm w-full rounded-2xl shadow-xl overflow-hidden p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif font-bold text-base text-[#4F5D4A]">
                  {confirmDialog.title}
                </h3>
                <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-gray-150">
              <button 
                id="confirm-modal-cancel"
                type="button" 
                onClick={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F0F2EB] text-[#4F5D4A] hover:bg-[#E3E7DA] transition duration-155"
              >
                取消
              </button>
              <button 
                id="confirm-modal-action"
                type="button" 
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition duration-155 shadow-sm"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TRANSACTION EDIT MODAL (Morandi Green Theme) */}
      {editingTransaction && (
        <div id="edit-modal-overlay" className="fixed inset-0 z-50 bg-[#33392F]/45 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div id="edit-modal-box" className="bg-white border border-[#4F5D4A]/15 max-w-md w-full rounded-2xl shadow-2xl p-6 relative my-8">
            <button 
              id="edit-modal-close"
              type="button"
              onClick={() => setEditingTransaction(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-650 transition p-1 rounded-lg hover:bg-[#F0F2EB]"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2.5 mb-5 border-b border-gray-100 pb-3">
              <Pencil className="w-5 h-5 text-[#728a6f]" />
              <div>
                <h3 className="font-serif font-bold text-base text-[#4F5D4A]">修改記帳明細</h3>
                <p className="text-[10px] text-[#8E9B85] tracking-widest uppercase font-semibold">EDITING TRANSACTION DETAILS</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditTransaction} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">記錄日期</label>
                  <input 
                    id="edit-tx-date"
                    type="date"
                    value={editingTransaction.date}
                    onChange={(e) => setEditingTransaction(prev => prev ? ({ ...prev, date: e.target.value }) : null)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#728a6f]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">收支種類</label>
                  <select 
                    id="edit-tx-type"
                    value={editingTransaction.type}
                    onChange={(e) => setEditingTransaction(prev => prev ? ({ ...prev, type: e.target.value as any }) : null)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#728a6f]"
                  >
                    <option value="expense">支出 (Expense)</option>
                    <option value="income">收入 (Income)</option>
                    <option value="subscription">固定訂閱 (Subscription)</option>
                    <option value="investment">投資投入 (Investment)</option>
                    <option value="saving">儲蓄存入 (Saving)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-550 mb-1 font-medium">金額 (TWD)</label>
                  <input 
                    id="edit-tx-amount"
                    type="number"
                    value={editingTransaction.amount}
                    onChange={(e) => setEditingTransaction(prev => prev ? ({ ...prev, amount: Number(e.target.value) }) : null)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-[#4F5D4A] outline-none focus:border-[#728a6f]"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-gray-550 mb-1 font-medium">大類類目</label>
                  <input 
                    id="edit-tx-category"
                    type="text"
                    placeholder="如：日常支出、餐飲社交..."
                    value={editingTransaction.category}
                    onChange={(e) => setEditingTransaction(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#728a6f]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">交易商戶 (選填)</label>
                  <input 
                    id="edit-tx-merchant"
                    type="text"
                    placeholder="如：全家、Spotify"
                    value={editingTransaction.merchant || ''}
                    onChange={(e) => setEditingTransaction(prev => prev ? ({ ...prev, merchant: e.target.value || undefined }) : null)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#728a6f]"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">交易地點 (選填)</label>
                  <input 
                    id="edit-tx-location"
                    type="text"
                    placeholder="如：逢甲 KTV、台北"
                    value={editingTransaction.location || ''}
                    onChange={(e) => setEditingTransaction(prev => prev ? ({ ...prev, location: e.target.value || undefined }) : null)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#728a6f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">週期型設定</label>
                <select 
                  id="edit-tx-recurrence"
                  value={editingTransaction.recurrence || 'none'}
                  onChange={(e) => setEditingTransaction(prev => prev ? ({ ...prev, recurrence: e.target.value as any }) : null)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#728a6f]"
                >
                  <option value="none">單次消費 (None)</option>
                  <option value="weekly">每週定期自動 (Weekly)</option>
                  <option value="monthly">每月定期自動 (Monthly)</option>
                  <option value="yearly">每年定期自動 (Yearly)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">詳細備忘備註欄</label>
                <textarea 
                  id="edit-tx-note"
                  rows={2}
                  placeholder="補充記帳備忘..."
                  value={editingTransaction.note || ''}
                  onChange={(e) => setEditingTransaction(prev => prev ? ({ ...prev, note: e.target.value }) : null)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg resize-none outline-none focus:border-[#728a6f]"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">標籤管理</label>
                <div className="flex gap-1.5 mb-2 flex-wrap min-h-[30px] border border-gray-100 p-2 rounded-lg bg-gray-50/50">
                  {editingTransaction.tags && editingTransaction.tags.length > 0 ? (
                    editingTransaction.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] bg-white border border-gray-200 text-gray-650 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                        #{tag}
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingTransaction(prev => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                tags: (prev.tags || []).filter((_, idx) => idx !== i)
                              };
                            });
                          }}
                          className="hover:text-red-500 font-bold ml-0.5 text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-[10px] italic">尚未加入任何標籤</span>
                  )}
                </div>
                
                <div className="flex gap-1.5">
                  <input 
                    id="edit-tx-tag-input"
                    type="text"
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    placeholder="自訂標籤，按 Enter 鍵或右側按鈕新增"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (editTagInput.trim()) {
                          setEditingTransaction(prev => {
                            if (!prev) return null;
                            const currentTags = prev.tags || [];
                            if (currentTags.includes(editTagInput.trim())) return prev;
                            return {
                              ...prev,
                              tags: [...currentTags, editTagInput.trim()]
                            };
                          });
                          setEditTagInput('');
                        }
                      }
                    }}
                    className="flex-1 p-2 bg-white border border-gray-250 rounded-lg outline-none focus:border-[#728a6f]"
                  />
                  <button 
                    id="edit-tx-add-tag-btn"
                    type="button"
                    onClick={() => {
                      if (editTagInput.trim()) {
                        setEditingTransaction(prev => {
                          if (!prev) return null;
                          const currentTags = prev.tags || [];
                          if (currentTags.includes(editTagInput.trim())) return prev;
                          return {
                            ...prev,
                            tags: [...currentTags, editTagInput.trim()]
                          };
                        });
                        setEditTagInput('');
                      }
                    }}
                    className="px-3 bg-[#F0F2EB] text-[#4F5D4A] hover:bg-[#E3E7DA] rounded-lg transition font-semibold"
                  >
                    新增
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <button 
                  id="edit-tx-cancel"
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2 border border-gray-300 bg-white text-gray-750 rounded-lg hover:bg-gray-50 flex items-center justify-center font-medium"
                >
                  取消
                </button>
                <button 
                  id="edit-tx-save"
                  type="submit"
                  className="px-5 py-2 bg-[#556c52] hover:bg-[#3f513d] text-white rounded-lg font-semibold shadow flex items-center justify-center"
                >
                  儲存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. BUDGET ALERT MODAL */}
      {budgetAlert && budgetAlert.isOpen && (
        <div className="fixed inset-0 bg-[#33392F]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-rose-100 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-2xl font-serif text-center text-[#4F5D4A] mb-2">預算超支警示</h3>
            <p className="text-center text-[#8E9B85] text-sm mb-6 leading-relaxed">
              {budgetAlert.suggestion}
            </p>
            <div className="bg-[#FDF2F2] p-4 rounded-2xl mb-8 flex justify-between items-center border border-rose-50">
              <div className="text-center flex-1">
                <span className="block text-[10px] uppercase tracking-wider text-rose-400 font-bold mb-1">當前支出</span>
                <span className="text-xl font-mono font-bold text-rose-600">${budgetAlert.amount.toLocaleString()}</span>
              </div>
              <div className="w-[1px] h-8 bg-rose-100"></div>
              <div className="text-center flex-1">
                <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">預算限額</span>
                <span className="text-xl font-mono font-bold text-[#4F5D4A]">${budgetAlert.limit.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setReallocTo(budgetAlert.category);
                  setBudgetAlert(null);
                  setShowReallocation(true);
                }}
                className="w-full py-3.5 bg-[#4F5D4A] hover:bg-[#3F513D] text-white rounded-xl text-sm font-bold tracking-widest transition duration-150 shadow-md"
              >
                立即挪移預算
              </button>
              <button
                onClick={() => setBudgetAlert(null)}
                className="w-full py-3.5 bg-white hover:bg-gray-50 text-[#8E9B85] border border-gray-100 rounded-xl text-sm font-bold tracking-widest transition duration-150"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. BUDGET REALLOCATION MODAL */}
      {showReallocation && (
        <div className="fixed inset-0 bg-[#33392F]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#F0F2EB] rounded-3xl shadow-2xl max-w-md w-full p-8 border border-[#4F5D4A]/10 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif text-[#4F5D4A]">預算智慧挪移</h3>
              <button onClick={() => setShowReallocation(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleReallocateBudget} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8E9B85] mb-2">從這個分類挪出</label>
                  <select
                    value={reallocFrom}
                    onChange={(e) => setReallocFrom(e.target.value)}
                    className="w-full p-4 bg-white border border-[#4F5D4A]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5D4A]/20"
                    required
                  >
                    <option value="">請選擇來源分類</option>
                    {budgets.map(b => (
                      <option key={b.category} value={b.category}>{b.category} (餘額: ${b.limit - getCategorySpending(b.category)})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center py-2">
                  <div className="w-10 h-10 rounded-full bg-[#E3E7DA] flex items-center justify-center text-[#4F5D4A]">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8E9B85] mb-2">挪移到這個分類</label>
                  <select
                    value={reallocTo}
                    onChange={(e) => setReallocTo(e.target.value)}
                    className="w-full p-4 bg-white border border-[#4F5D4A]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5D4A]/20"
                    required
                  >
                    <option value="">請選擇目標分類</option>
                    {budgets.map(b => (
                      <option key={b.category} value={b.category}>{b.category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8E9B85] mb-2">挪移金額</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4F5D4A] font-bold">$</span>
                    <input
                      type="number"
                      value={reallocAmount || ''}
                      onChange={(e) => setReallocAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-4 pl-8 bg-white border border-[#4F5D4A]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5D4A]/20"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#4F5D4A] hover:bg-[#3F513D] text-white rounded-xl text-sm font-bold tracking-widest transition duration-150 shadow-md flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> 確認挪移
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
