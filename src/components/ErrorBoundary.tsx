import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Something went wrong. Don't worry, it's not your fault!";
      let errorDetail = error?.message || "";

      // Try to parse Firestore JSON error if it exists
      try {
        if (errorDetail.startsWith('{')) {
          const parsed = JSON.parse(errorDetail);
          if (parsed.error) {
            errorDetail = parsed.error;
            if (errorDetail.includes('insufficient permissions')) {
              errorMessage = "Access Denied. You might not have permission to perform this action.";
            }
          }
        }
      } catch (e) {
        // Not a JSON error, keep original
      }

      return (
        <div className="min-h-screen bg-[#0a0a2e] flex items-center justify-center p-4 font-sans text-white">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full glass-modal rounded-3xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-black uppercase tracking-widest mb-4">System Glitch</h1>
            <p className="text-white/60 mb-6 leading-relaxed">
              {errorMessage}
            </p>

            {errorDetail && (
              <div className="bg-black/40 rounded-2xl p-4 mb-8 text-left border border-white/5">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Error Details</p>
                <p className="text-xs font-mono text-red-400/80 break-all leading-relaxed">
                  {errorDetail}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95"
              >
                <RefreshCcw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
