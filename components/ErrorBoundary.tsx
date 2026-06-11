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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Whetstone] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-base p-8 text-ink">
          <div className="max-w-md rounded-2xl border border-warn/30 bg-warn/10 p-6 text-center">
            <p className="mb-2 font-display text-lg font-bold text-warn">Something went wrong</p>
            <p className="mb-4 text-sm text-muted">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-lg bg-ember px-4 py-2 text-sm font-bold text-white"
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
