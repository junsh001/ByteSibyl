import Editor from '@monaco-editor/react';
import { Play, Save } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import { DragHandle } from './DragHandle';

const LANG: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  py: 'python',
  md: 'markdown',
  html: 'html',
  css: 'css',
  sh: 'shell',
  yml: 'yaml',
  yaml: 'yaml',
};

function langFor(path: string | null): string {
  if (!path) return 'plaintext';
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return LANG[ext] ?? 'plaintext';
}

function runCommandFor(path: string): string | null {
  if (path.endsWith('.js')) return `node ${path}`;
  if (path.endsWith('.py')) return `python3 ${path}`;
  if (path.endsWith('.ts')) return `npx -y tsx ${path}`;
  if (path.endsWith('.sh')) return `bash ${path}`;
  return null;
}

export function CodeEditor() {
  const { openPath, openContent, dirty, setOpenContent, saveFile, locale, runCommand } = useStore();
  const runnable = openPath ? runCommandFor(openPath) : null;

  return (
    <div className="flex flex-col h-full bg-panel min-w-0">
      <div className="flex items-center gap-2 h-9 px-3 border-b border-border text-xs shrink-0">
        <DragHandle />
        {openPath ? (
          <>
            <span className="font-mono text-ink/85">{openPath}</span>
            {dirty && <span className="w-1.5 h-1.5 rounded-full bg-warn" title="unsaved" />}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => void saveFile()}
                disabled={!dirty}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-border text-muted hover:text-ink disabled:opacity-40 transition"
              >
                <Save size={12} /> {dirty ? t('save', locale) : t('saved', locale)}
              </button>
              {runnable && (
                <button
                  onClick={async () => {
                    if (dirty) await saveFile();
                    void runCommand(runnable);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-ok/15 text-ok hover:bg-ok/25 transition"
                >
                  <Play size={12} fill="currentColor" /> {t('run', locale)}
                </button>
              )}
            </div>
          </>
        ) : (
          <span className="text-muted">{t('editor', locale)}</span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {openPath ? (
          <Editor
            theme="light"
            language={langFor(openPath)}
            value={openContent}
            onChange={(v) => setOpenContent(v ?? '')}
            options={{
              fontSize: 13,
              fontFamily: 'JetBrains Mono, Menlo, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 12 },
              smoothScrolling: true,
              tabSize: 2,
              automaticLayout: true,
            }}
          />
        ) : (
          <div className="h-full grid place-items-center text-sm text-muted">{t('noFileOpen', locale)}</div>
        )}
      </div>
    </div>
  );
}
