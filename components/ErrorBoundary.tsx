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
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="max-w-md rounded-xl border border-warn/40 bg-warn/10 p-6 text-center">
            <p className="mb-2 font-display text-lg font-bold text-ink">Something went wrong</p>
            <p className="mb-4 text-sm text-muted">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:border-ember/40 hover:text-ink"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
