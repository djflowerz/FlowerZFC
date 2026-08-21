import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Component:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a14] text-white p-6">
          <div className="max-w-md w-full bg-[#131320] border border-[#1e1e32] rounded-2xl p-8 text-center space-y-4 shadow-2xl">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
              Something went wrong
            </h2>
            <p className="text-xs text-gray-400">
              {this.state.error?.message || 'An unexpected error occurred while rendering the page.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
              className="w-full py-3 rounded-xl text-sm font-bold text-black bg-[#00b341] hover:opacity-90 transition-all"
            >
              Reload FlowerZFC
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
