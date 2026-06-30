"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Whetstone] Unhandled error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-ember-soft to-ember-deep text-2xl shadow-glow">
            ⚡
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Something went sideways</h1>
            <p className="mt-2 text-sm text-muted">
              An unexpected error occurred. Refresh the page to start a new session.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-ember-deep px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-opacity hover:opacity-90"
          >
            Refresh
          </button>
          {process.env.NODE_ENV === "development" && (
            <pre className="max-w-xl overflow-auto rounded-lg border border-line bg-surface p-4 text-left font-mono text-xs text-muted">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
