import { useEffect } from 'react';
import { useStore } from './store';
import { Header } from './components/Header';
import { CodeWorkspace } from './components/CodeWorkspace';
import { TutorialPanel } from './components/TutorialPanel';

export default function App() {
  const { ready, view, init } = useStore();

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="h-full grid place-items-center text-muted text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse2" /> Loading CodeForge…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 min-h-0">
        {view === 'code' ? <CodeWorkspace /> : <TutorialPanel />}
      </main>
    </div>
  );
}
