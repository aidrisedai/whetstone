"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-4xl">⚠️</p>
          <p className="font-display text-lg font-bold text-ink">Something went wrong</p>
          <p className="max-w-sm text-sm text-muted">{error.message}</p>
          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-ember/40 hover:text-ink"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
