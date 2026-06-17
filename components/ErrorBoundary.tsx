"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0d10] p-8 text-center text-[#eaedf2]">
            <p className="text-4xl">⚠️</p>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="max-w-sm text-sm text-[#9ba3af]">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-2 rounded-lg bg-[#ff6b35] px-5 py-2 text-sm font-semibold text-[#0b0d10]"
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
