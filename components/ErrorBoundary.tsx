"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
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
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-4xl">⚡</div>
          <h2 className="font-display text-2xl font-bold text-ink">Something went wrong</h2>
          <p className="max-w-sm text-sm text-muted">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-ember/40 hover:text-ink"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
