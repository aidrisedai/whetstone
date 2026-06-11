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
    console.error("[Whetstone] Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <div className="max-w-md">
            <div className="mb-4 text-5xl">⚡</div>
            <h2 className="font-display text-2xl font-bold text-ink">Something shorted out</h2>
            <p className="mt-2 text-sm text-muted">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-6 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2.5 font-semibold text-base shadow-glow"
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
