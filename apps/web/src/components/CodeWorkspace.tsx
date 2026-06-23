import { useCallback, useMemo, useState } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import { RotateCcw } from 'lucide-react';
import { useElementSize } from '../hooks/useElementSize';
import { ChatPanel } from './ChatPanel';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { TerminalPanel } from './TerminalPanel';
import { useStore } from '../store';

const COLS = 12;
const ROWS = 12;
const MARGIN = 10;
const PADDING = 12;
const STORAGE_KEY = 'wac.layout.v2';

/** Default arrangement — AI chat lives on the right. */
const DEFAULT_LAYOUT: Layout[] = [
  { i: 'files', x: 0, y: 0, w: 2, h: 12, minW: 2, minH: 3 },
  { i: 'editor', x: 2, y: 0, w: 7, h: 8, minW: 3, minH: 3 },
  { i: 'terminal', x: 2, y: 8, w: 7, h: 4, minW: 3, minH: 2 },
  { i: 'chat', x: 9, y: 0, w: 3, h: 12, minW: 3, minH: 4 },
];

const PANELS: Record<string, React.ReactNode> = {
  files: <FileTree />,
  editor: <CodeEditor />,
  terminal: <TerminalPanel />,
  chat: <ChatPanel />,
};

function loadLayout(): Layout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Layout[];
      // Only trust it if every expected panel is present.
      if (DEFAULT_LAYOUT.every((d) => parsed.some((p) => p.i === d.i))) return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LAYOUT;
}

export function CodeWorkspace() {
  const locale = useStore((s) => s.locale);
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const [layout, setLayout] = useState<Layout[]>(loadLayout);

  const rowHeight = useMemo(() => {
    const h = height || 800;
    return Math.max(24, (h - PADDING * 2 - (ROWS - 1) * MARGIN) / ROWS);
  }, [height]);

  const onLayoutChange = useCallback((next: Layout[]) => {
    setLayout(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLayout(DEFAULT_LAYOUT.map((l) => ({ ...l })));
  }, []);

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <button
        onClick={reset}
        title={locale === 'zh' ? '重置布局' : 'Reset layout'}
        className="absolute z-20 top-2 right-3 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted hover:text-ink bg-panel border border-border shadow-card"
      >
        <RotateCcw size={12} /> {locale === 'zh' ? '重置布局' : 'Reset'}
      </button>

      {width > 0 && (
        <GridLayout
          className="layout"
          layout={layout}
          cols={COLS}
          rowHeight={rowHeight}
          width={width}
          margin={[MARGIN, MARGIN]}
          containerPadding={[PADDING, PADDING]}
          compactType={null}
          preventCollision={false}
          allowOverlap={false}
          isBounded
          draggableHandle=".drag-handle"
          resizeHandles={['se']}
          onLayoutChange={onLayoutChange}
        >
          {layout.map((item) => (
            <div
              key={item.i}
              className="rounded-xl border border-border bg-panel overflow-hidden shadow-card"
            >
              {PANELS[item.i]}
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
