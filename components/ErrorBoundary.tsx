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

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-5xl">⚠️</div>
          <h2 className="font-display text-2xl font-bold text-ink">Something went wrong</h2>
          <p className="max-w-md text-sm text-muted">{this.state.error.message}</p>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2.5 font-semibold text-base shadow-glow transition-transform hover:scale-[1.02]"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
