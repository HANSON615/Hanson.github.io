import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      console.log('LocalStorage cleared');
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F0EFE7] flex items-center justify-center p-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full border border-white/50 shadow-xl">
            <div className="text-center">
              <div className="text-6xl mb-4">😅</div>
              <h1 className="text-2xl font-bold text-[#2D3A24] mb-4">
                哎呀，出了點小問題！
              </h1>
              <p className="text-[#4F5D4A] mb-6">
                別擔心，這個我們已經處理好了。
              </p>
              {this.state.error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-6 text-sm">
                  {this.state.error.message}
                </div>
              )}
              <button
                onClick={this.handleReset}
                className="bg-[#4F5D4A] hover:bg-[#3D4A38] text-white px-6 py-3 rounded-lg transition-colors"
              >
                重置並繼續使用
              </button>
              <p className="text-xs text-gray-400 mt-4">
                這會清除所有本地資料並重新開始
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
