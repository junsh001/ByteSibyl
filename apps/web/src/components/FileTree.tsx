import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import type { FileNode } from '@wac/shared';
import { useStore } from '../store';
import { t } from '../i18n';
import { DragHandle } from './DragHandle';

export function FileTree() {
  const { files, openPath, openFile, refreshFiles, locale } = useStore();
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-2 h-9 px-3 border-b border-border text-xs font-medium text-muted">
        <DragHandle />
        {t('files', locale)}
        <button onClick={() => void refreshFiles()} className="ml-auto hover:text-ink" title="refresh">
          <RefreshCw size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1 text-[13px]">
        {files?.children?.length ? (
          files.children.map((n) => (
            <Node key={n.path} node={n} depth={0} openPath={openPath} onOpen={openFile} />
          ))
        ) : (
          <div className="px-3 py-2 text-xs text-muted/70">—</div>
        )}
      </div>
    </div>
  );
}

function Node({
  node,
  depth,
  openPath,
  onOpen,
}: {
  node: FileNode;
  depth: number;
  openPath: string | null;
  onOpen: (p: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const pad = { paddingLeft: 8 + depth * 12 };
  if (node.type === 'dir') {
    return (
      <div>
        <button
          style={pad}
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 w-full py-[3px] pr-2 hover:bg-panel2 text-left text-muted"
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {open ? <FolderOpen size={13} className="text-accent2" /> : <Folder size={13} className="text-accent2" />}
          <span className="truncate text-ink/85">{node.name}</span>
        </button>
        {open && node.children?.map((c) => (
          <Node key={c.path} node={c} depth={depth + 1} openPath={openPath} onOpen={onOpen} />
        ))}
      </div>
    );
  }
  return (
    <button
      style={pad}
      onClick={() => onOpen(node.path)}
      className={clsx(
        'flex items-center gap-1.5 w-full py-[3px] pr-2 text-left hover:bg-panel2',
        openPath === node.path ? 'bg-accent/12 text-accent' : 'text-ink/85',
      )}
    >
      <File size={13} className="text-muted ml-3.5 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
