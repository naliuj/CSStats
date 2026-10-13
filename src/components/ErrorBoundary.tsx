import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Shown in the message, e.g. "the dashboard". */
  what: string;
  onClear: () => void;
  /** Changing this (say, after an edit or undo) clears the error and tries again. */
  resetKey?: unknown;
}

/**
 * Keeps one bad view from blanking the app. The file is restored on every load, so without this a
 * crash would come straight back after reloading, with no way to clear it.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null; key: unknown }> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: { error: Error | null; key: unknown }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="card crash" role="alert">
        <h2>Something went wrong showing {this.props.what}.</h2>
        <p className="muted">
          This is a bug in CSStats, not a problem with your file. Your data is untouched. <code>{error.message}</code>
        </p>
        <div className="crash-actions">
          <button type="button" className="primary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button type="button" className="ghost" onClick={this.props.onClear}>
            Clear data
          </button>
        </div>
      </div>
    );
  }
}
