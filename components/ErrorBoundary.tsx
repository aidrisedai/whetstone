"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

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
    console.error("Whetstone caught an unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="text-4xl">⚠️</div>
            <h2 className="font-display text-xl font-bold text-ink">Something went wrong</h2>
            <p className="max-w-sm text-sm text-muted">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2 text-sm font-bold text-white shadow-glow"
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
