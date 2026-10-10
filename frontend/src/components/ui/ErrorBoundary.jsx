import React from 'react';
import { LuTriangleAlert, LuRefreshCw, LuHouse, LuChevronDown, LuChevronUp, LuCopy, LuCheck } from 'react-icons/lu';
import Button from './Button';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  copyTrace = () => {
    const trace = `Error: ${this.state.error?.message}\nStack: ${this.state.errorInfo?.componentStack || 'N/A'}`;
    navigator.clipboard?.writeText(trace);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      const isHighRetry = this.state.retryCount >= 3;

      return (
        <div
          className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center"
          role="alert"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 shadow-inner">
            <LuTriangleAlert className="h-8 w-8" />
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isHighRetry ? 'Application Error Persists' : 'Something went wrong in this view'}
          </h2>

          <p className="mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
            {isHighRetry
              ? 'We attempted to restore this screen multiple times. A software exception occurred. You can reload the page or navigate to your home dashboard.'
              : this.state.error?.message || 'An unexpected rendering error occurred. Please try again.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={this.handleRetry}
              icon={LuRefreshCw}
              className="shadow-sm font-bold"
            >
              Try again
            </Button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LuRefreshCw className="h-3.5 w-3.5" /> Reload page
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = '/')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LuHouse className="h-3.5 w-3.5" /> Back to Home
            </button>
          </div>

          {/* Diagnostic Trace Accordion */}
          <div className="mt-6 w-full max-w-md border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => this.setState({ showDetails: !this.state.showDetails })}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span>{this.state.showDetails ? 'Hide technical trace' : 'Show technical trace'}</span>
              {this.state.showDetails ? (
                <LuChevronUp className="h-3 w-3" />
              ) : (
                <LuChevronDown className="h-3 w-3" />
              )}
            </button>

            {this.state.showDetails && (
              <div className="mt-2 rounded-xl bg-slate-900 text-slate-200 p-3.5 text-left font-mono text-[10px] leading-relaxed overflow-x-auto shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                  <span className="text-slate-400 font-bold">Stack Details</span>
                  <button
                    type="button"
                    onClick={this.copyTrace}
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {this.state.copied ? (
                      <LuCheck className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <LuCopy className="h-3 w-3" />
                    )}
                    <span>{this.state.copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-rose-400 font-bold">{this.state.error?.toString()}</p>
                <pre className="text-slate-400 mt-1 whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack?.slice(0, 500) || 'No stack trace available'}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
