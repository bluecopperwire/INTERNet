import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught render error in React application:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            >
              !
            </div>
            <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: '0 0 0.5rem' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              An unexpected error occurred while displaying this page.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
