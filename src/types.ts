export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'expense' | 'income' | 'investment' | 'saving' | 'subscription';
  amount: number;
  category: string;
  location?: string;
  tags?: string[];
  merchant?: string;
  note?: string;
  recurrence?: 'none' | 'weekly' | 'monthly' | 'yearly';
  sourceText?: string;
}

export interface AssetItem {
  id: string;
  name: string;
  type: 'saving' | 'investment' | 'debt' | 'stock';
  amount: number; // For stock, this will be the calculated value (shares * currentPrice)
  quantity?: number; // Number of shares (for stock type)
  symbol?: string; // Stock symbol/code (for stock type)
  growthRate?: number; // annual growth rate %
  note?: string;
}

export interface FinancialGoal {
  title: string;
  targetAmount: number;
  currentSaved: number;
  deadline?: string;
}

export interface BudgetConfig {
  category: string;
  limit: number;
}

export interface ParseResult {
  amount: number;
  type: 'expense' | 'income' | 'investment' | 'saving' | 'subscription';
  category: string;
  location?: string;
  tags?: string[];
  merchant?: string;
  recurrence?: 'none' | 'weekly' | 'monthly' | 'yearly';
  originalText?: string;
  success: boolean;
  error?: string;
}

export interface AdvisorResponse {
  warning?: string; // Overspending warning
  suggestions: string[]; // List of specific recommendations
  summary: string; // Weekly/Monthly report style summary
  subscriptionAlerts?: string[]; // Alert about potential unused subscriptions
  goalFeedback?: string; // Feedback on financial goals progress
}
