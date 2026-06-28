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
    const { error } = this.state;
    if (error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="font-display text-2xl font-bold text-ink">Something went wrong</h1>
          <p className="max-w-sm text-sm text-muted">{error.message}</p>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2.5 font-semibold text-base shadow-glow"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
