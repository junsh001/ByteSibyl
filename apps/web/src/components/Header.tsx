import { Code2, GraduationCap, Languages, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';
import { t } from '../i18n';

export function Header() {
  const { locale, view, setView, toggleLocale, model, xp, hasKey } = useStore();
  return (
    <header className="flex items-center gap-3 h-12 px-4 border-b border-border bg-panel shrink-0">
      <div className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-accent text-white">
          <Zap size={16} strokeWidth={2.5} />
        </span>
        <span className="text-[15px] font-display tracking-tight">{t('appName', locale)}</span>
        <span className="hidden md:inline text-xs text-muted ml-1">{t('tagline', locale)}</span>
      </div>

      <div className="ml-4 flex items-center gap-1 rounded-lg bg-panel2 p-0.5 border border-border">
        <TabBtn active={view === 'code'} onClick={() => setView('code')} icon={<Code2 size={14} />}>
          {t('editor', locale)}
        </TabBtn>
        <TabBtn active={view === 'learn'} onClick={() => setView('learn')} icon={<GraduationCap size={14} />}>
          {t('learn', locale)}
        </TabBtn>
      </div>

      <div className="ml-auto flex items-center gap-3 text-xs text-muted">
        {!hasKey && <span className="text-warn">{t('keyMissing', locale)}</span>}
        <span className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-panel2 border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-ok" /> {model || 'deepseek'}
        </span>
        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-panel2 border border-border text-accent2">
          ⭐ {xp} {t('xp', locale)}
        </span>
        <button
          onClick={toggleLocale}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-panel2 border border-transparent hover:border-border transition"
          title="中文 / English"
        >
          <Languages size={14} /> {locale === 'zh' ? '中' : 'EN'}
        </button>
      </div>
    </header>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition',
        active ? 'bg-accent/12 text-accent' : 'text-muted hover:text-ink',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
