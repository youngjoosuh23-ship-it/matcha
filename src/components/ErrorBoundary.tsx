import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] caught:', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/20 backdrop-blur-sm font-sans px-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-3">
            <p className="font-bold text-zinc-800">채팅 로딩 오류</p>
            <p className="text-xs text-red-500 font-mono break-all">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="w-full py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: '#1a2418' }}
            >
              닫기
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
