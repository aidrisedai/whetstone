"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Whetstone] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="text-4xl">⚠️</span>
            <h1 className="font-display text-xl font-bold text-ink">Something went wrong</h1>
            <p className="max-w-sm text-sm text-muted">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-ember/40 hover:text-ink"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
