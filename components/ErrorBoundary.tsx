"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-forge-bg p-8">
            <div className="max-w-md rounded-2xl border border-red-800/40 bg-red-950/20 p-8 text-center">
              <div className="mb-4 text-4xl">⚠️</div>
              <h2 className="mb-2 text-lg font-semibold text-red-300">Something went wrong</h2>
              <p className="mb-6 text-sm text-red-400/80">{this.state.error.message}</p>
              <button
                onClick={() => this.setState({ error: null })}
                className="rounded-lg bg-red-800/40 px-4 py-2 text-sm text-red-200 hover:bg-red-800/60"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
