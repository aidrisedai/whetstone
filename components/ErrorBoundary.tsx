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
    console.error("[Whetstone] Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-base)] p-8">
          <div className="max-w-md text-center space-y-4">
            <p className="text-4xl">⚠️</p>
            <h1 className="text-xl font-bold text-[var(--color-ember)]">Something went wrong</h1>
            <p className="text-sm text-[var(--color-muted)]">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
            <button
              className="mt-4 px-5 py-2 rounded-lg bg-[var(--color-ember)] text-white text-sm font-semibold hover:opacity-90 transition"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
