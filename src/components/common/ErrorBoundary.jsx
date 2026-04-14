import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const errorData = JSON.parse(this.state.error.message);
        if (errorData.error && errorData.error.includes('permission-denied')) {
          errorMessage = "You don't have permission to access this data. Please try logging in again.";
        }
      } catch (e) {
        // Not a JSON error message
      }

      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 text-center space-y-4 bg-surface border border-border rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary">Application Error</h2>
          <p className="text-text-secondary max-w-md">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-2"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
