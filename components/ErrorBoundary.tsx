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
        <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-100 p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl">⚒️</div>
            <h1 className="text-xl font-semibold text-amber-400">Something broke in the forge</h1>
            <p className="text-stone-400 text-sm">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-sm font-medium transition-colors"
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
