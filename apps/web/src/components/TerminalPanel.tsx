import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalSquare, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import { DragHandle } from './DragHandle';

export function TerminalPanel() {
  const { registerTerminal, runCommand, locale } = useStore();
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const lineRef = useRef('');

  useEffect(() => {
    if (!hostRef.current) return;
    const term = new Terminal({
      fontSize: 12.5,
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      cursorBlink: true,
      theme: {
        background: '#ffffff',
        foreground: '#2c2925',
        cursor: '#2f6f57',
        selectionBackground: '#e6e0d4',
        brightBlack: '#9a9389',
        cyan: '#2f6f57',
        red: '#b3402f',
        yellow: '#b07d12',
      },
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const prompt = () => term.write('\x1b[90m$\x1b[0m ');
    term.writeln('\x1b[36mCodeForge sandbox terminal\x1b[0m — type a command and press Enter.');
    prompt();

    const sink = (s: string) => {
      term.write(s);
    };
    registerTerminal(sink);

    term.onData((data) => {
      const code = data.charCodeAt(0);
      if (data === '\r') {
        const cmd = lineRef.current.trim();
        term.write('\r\n');
        lineRef.current = '';
        if (cmd) {
          void runCommand(cmd).then(prompt);
        } else {
          prompt();
        }
      } else if (code === 127) {
        if (lineRef.current.length > 0) {
          lineRef.current = lineRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (code >= 32) {
        lineRef.current += data;
        term.write(data);
      }
    });

    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(hostRef.current);

    return () => {
      ro.disconnect();
      registerTerminal(null);
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full bg-panel">
      <div className="flex items-center gap-2 h-8 px-3 border-b border-border text-xs text-muted shrink-0">
        <DragHandle />
        <TerminalSquare size={13} /> {t('terminal', locale)}
        <button
          className="ml-auto hover:text-ink"
          onClick={() => {
            termRef.current?.clear();
          }}
          title="clear"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div ref={hostRef} className="flex-1 min-h-0 overflow-hidden" />
    </div>
  );
}
