import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Brain,
  CheckCircle2,
  ChevronRight,
  FileEdit,
  FilePlus2,
  FileText,
  FolderTree,
  Loader2,
  Search,
  Square,
  Terminal as TermIcon,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import type { ToolName } from '@wac/shared';
import { useStore, type ChatTurn, type ToolEntry } from '../store';
import { t } from '../i18n';
import { Markdown } from './Markdown';
import { DragHandle } from './DragHandle';

const TOOL_ICON: Record<ToolName, React.ReactNode> = {
  list_dir: <FolderTree size={13} />,
  read_file: <FileText size={13} />,
  write_file: <FilePlus2 size={13} />,
  edit_file: <FileEdit size={13} />,
  search: <Search size={13} />,
  run: <TermIcon size={13} />,
  finish: <CheckCircle2 size={13} />,
};

export function ChatPanel() {
  const { chat, running, phase, locale, send, stop, mode, setMode, reasoning, setReasoning, hasKey } =
    useStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat, phase]);

  const doSend = () => {
    if (!input.trim() || running) return;
    send(input);
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 h-9 px-3 border-b border-border text-xs font-medium text-muted shrink-0">
        <DragHandle />
        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        {t('chat', locale)}
        {running && (
          <span className="ml-auto flex items-center gap-1 text-accent animate-pulse2">
            <Loader2 size={12} className="animate-spin" />
            {phase === 'acting' ? t('acting', locale) : t('thinking', locale)}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {chat.length === 0 && <EmptyState />}
        {chat.map((turn) => (
          <TurnView key={turn.id} turn={turn} locale={locale} />
        ))}
      </div>

      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center gap-2 mb-2 text-[11px]">
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as 'agent' | 'ask')}
            options={[
              { value: 'agent', label: t('agentMode', locale) },
              { value: 'ask', label: t('askMode', locale) },
            ]}
          />
          <button
            onClick={() => setReasoning(!reasoning)}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded-md border transition',
              reasoning
                ? 'border-accent2/50 text-accent2 bg-accent2/10'
                : 'border-border text-muted hover:text-ink',
            )}
          >
            <Brain size={12} /> {t('reasoning', locale)}
          </button>
        </div>
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-panel2 focus-within:border-accent/60 transition px-3 py-2">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                doSend();
              }
            }}
            rows={1}
            disabled={!hasKey}
            placeholder={t('inputPlaceholder', locale)}
            className="flex-1 resize-none bg-transparent outline-none text-sm placeholder:text-muted/70 max-h-40"
          />
          {running ? (
            <button
              onClick={stop}
              className="grid place-items-center w-8 h-8 rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition shrink-0"
              title={t('stop', locale)}
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={doSend}
              disabled={!input.trim() || !hasKey}
              className="grid place-items-center w-8 h-8 rounded-lg bg-accent text-bg disabled:opacity-30 hover:brightness-110 transition shrink-0"
              title={t('send', locale)}
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const locale = useStore((s) => s.locale);
  return (
    <div className="h-full grid place-items-center text-center px-6 animate-fade-in">
      <div>
        <div className="mx-auto mb-3 grid place-items-center w-12 h-12 rounded-2xl bg-accent/10 text-accent">
          <Brain size={24} />
        </div>
        <div className="text-sm font-medium text-ink">{t('emptyChatTitle', locale)}</div>
        <div className="text-xs text-muted mt-1.5 max-w-[240px]">{t('emptyChatBody', locale)}</div>
      </div>
    </div>
  );
}

function TurnView({ turn, locale }: { turn: ChatTurn; locale: 'zh' | 'en' }) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-accent/15 border border-accent/20 px-3.5 py-2 text-sm whitespace-pre-wrap break-words">
          {turn.text}
        </div>
      </div>
    );
  }
  return (
    <div className="animate-fade-in space-y-2">
      {turn.reasoning && <Reasoning text={turn.reasoning} locale={locale} />}
      {turn.tools.map((tool) => (
        <ToolChip key={tool.id} tool={tool} />
      ))}
      {turn.text && (
        <div className="rounded-2xl rounded-bl-md bg-panel2 border border-border px-3.5 py-2.5">
          <Markdown>{turn.text}</Markdown>
        </div>
      )}
      {turn.status === 'streaming' && !turn.text && turn.tools.length === 0 && !turn.reasoning && (
        <div className="flex gap-1 px-2">
          <Dot /> <Dot /> <Dot />
        </div>
      )}
    </div>
  );
}

function Reasoning({ text, locale }: { text: string; locale: 'zh' | 'en' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-accent2/20 bg-accent2/5 text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-accent2"
      >
        <ChevronRight size={12} className={clsx('transition', open && 'rotate-90')} />
        <Brain size={12} /> {locale === 'zh' ? '思考过程' : 'Reasoning'}
      </button>
      {open && (
        <div className="px-3 pb-2 text-muted whitespace-pre-wrap max-h-48 overflow-y-auto">{text}</div>
      )}
    </div>
  );
}

function ToolChip({ tool }: { tool: ToolEntry }) {
  const label = tool.summary ?? describeArgs(tool.name, tool.args);
  return (
    <div className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-panel2/60 border border-border">
      <span className="text-muted">{TOOL_ICON[tool.name]}</span>
      <span className="font-mono text-[11px] text-accent">{tool.name}</span>
      <span className="text-muted truncate flex-1">{label}</span>
      {tool.status === 'running' && <Loader2 size={12} className="animate-spin text-accent" />}
      {tool.status === 'ok' && <CheckCircle2 size={13} className="text-ok" />}
      {tool.status === 'fail' && <XCircle size={13} className="text-danger" />}
    </div>
  );
}

function describeArgs(name: ToolName, args: Record<string, unknown>): string {
  if (name === 'run') return String(args.command ?? '');
  if (name === 'search') return String(args.query ?? '');
  return String(args.path ?? '');
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex rounded-md bg-panel2 border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'px-2 py-0.5 rounded text-[11px] transition',
            value === o.value ? 'bg-accent/12 text-accent' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Dot = () => <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse2" />;
