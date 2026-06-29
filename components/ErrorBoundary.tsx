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
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-ember px-4 py-2 text-sm font-medium text-white hover:bg-ember/90"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
