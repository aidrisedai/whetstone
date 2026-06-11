"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

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

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[Whetstone] Uncaught error:", error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-2xl">⚠️</p>
          <p className="font-display text-lg font-bold text-ink">Something went wrong</p>
          <p className="max-w-sm text-sm text-muted">{this.state.error.message}</p>
          <button
            type="button"
            onClick={this.handleReset}
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
