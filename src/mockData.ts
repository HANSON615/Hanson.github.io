import { Transaction, AssetItem, FinancialGoal, BudgetConfig } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_ASSET_ITEMS: AssetItem[] = [];

export const INITIAL_BUDGET_CONFIGS: BudgetConfig[] = [
  { category: '餐飲', limit: 8000 },
  { category: '手搖飲/外送', limit: 800 },
  { category: '交通', limit: 3000 },
  { category: '社交娛樂', limit: 1500 },
  { category: '訂閱服務', limit: 1000 },
  { category: '治裝費', limit: 2000 }
];

// 用 targetAmount === 0 來表示「沒有設定目標」
export const INITIAL_GOAL: FinancialGoal = {
  title: '',
  targetAmount: 0,
  currentSaved: 0,
  deadline: ''
};
