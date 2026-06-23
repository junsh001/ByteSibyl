import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Loader2,
  Lock,
  Sparkles,
  Trophy,
} from 'lucide-react';
import clsx from 'clsx';
import type { Lesson, LessonProgress } from '@wac/shared';
import { useStore } from '../store';
import { t } from '../i18n';
import { Markdown } from './Markdown';

export function TutorialPanel() {
  const { lessons, progress, xp, locale } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const byId = new Map(progress.map((p) => [p.lessonId, p]));
  const open = lessons.find((l) => l.id === openId);

  if (open) {
    return <LessonView lesson={open} progress={byId.get(open.id)} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="text-accent" size={22} />
          <h1 className="text-2xl font-display font-semibold text-ink">{locale === 'zh' ? '搭一个你自己的 Agent' : 'Build Your Own Agent'}</h1>
        </div>
        <p className="text-sm text-muted mb-6 max-w-xl">
          {locale === 'zh'
            ? '5 关，从一句提示词到一个能自主调用工具的 agent。每关都在右边真实地写代码，由 AI 批改。'
            : '5 lessons, from a single prompt to a tool-using agent. Each one has you write real code on the right, graded by AI.'}
        </p>

        <div className="flex items-center gap-2 mb-6 text-sm">
          <Trophy className="text-accent2" size={16} />
          <span className="font-medium text-accent2">{xp}</span>
          <span className="text-muted">{t('xp', locale)}</span>
        </div>

        <div className="space-y-3">
          {lessons.map((lesson) => {
            const p = byId.get(lesson.id);
            const status = p?.status ?? 'locked';
            return (
              <button
                key={lesson.id}
                disabled={status === 'locked'}
                onClick={() => setOpenId(lesson.id)}
                className={clsx(
                  'group flex items-center gap-4 w-full text-left rounded-xl border p-4 transition',
                  status === 'locked'
                    ? 'border-border bg-panel/40 opacity-60 cursor-not-allowed'
                    : 'border-border bg-panel hover:border-accent/50 hover:bg-panel2',
                )}
              >
                <div
                  className={clsx(
                    'grid place-items-center w-10 h-10 rounded-xl shrink-0 font-semibold',
                    status === 'completed'
                      ? 'bg-ok/15 text-ok'
                      : status === 'locked'
                        ? 'bg-panel2 text-muted'
                        : 'bg-accent/15 text-accent',
                  )}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 size={20} />
                  ) : status === 'locked' ? (
                    <Lock size={16} />
                  ) : (
                    lesson.order
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[15px]">{lesson.title[locale]}</span>
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-panel2 text-accent2 border border-border">
                      {lesson.concept}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-0.5 truncate">{lesson.summary[locale]}</div>
                </div>
                <div className="text-xs text-muted shrink-0 flex items-center gap-2">
                  <span>+{lesson.xp} XP</span>
                  <span>·</span>
                  <span>{lesson.minutes}m</span>
                  {status !== 'locked' && (
                    <ChevronRight size={16} className="group-hover:translate-x-0.5 transition" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LessonView({
  lesson,
  progress,
  onBack,
}: {
  lesson: Lesson;
  progress?: LessonProgress;
  onBack: () => void;
}) {
  const { locale } = useStore();
  const done = new Set(progress?.completedTaskIds ?? []);

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-4">
          <ArrowLeft size={14} /> {t('backToLessons', locale)}
        </button>
        <div className="flex items-center gap-2 mb-4">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/15 text-accent font-semibold">
            {lesson.order}
          </span>
          <h1 className="text-xl font-display font-semibold text-ink">{lesson.title[locale]}</h1>
        </div>

        <article className="rounded-xl border border-border bg-panel p-5 mb-5">
          <Markdown>{lesson.body[locale]}</Markdown>
        </article>

        <div className="space-y-3">
          {lesson.tasks.map((task) => (
            <TaskCard
              key={task.id}
              lessonId={lesson.id}
              taskId={task.id}
              instruction={task.instruction}
              hint={task.hint}
              done={done.has(task.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  lessonId,
  taskId,
  instruction,
  hint,
  done,
}: {
  lessonId: string;
  taskId: string;
  instruction: string;
  hint?: string;
  done: boolean;
}) {
  const { checkTask, locale } = useStore();
  const [busy, setBusy] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; feedback: string; celebrate?: boolean } | null>(
    done ? { passed: true, feedback: '' } : null,
  );

  const run = async () => {
    setBusy(true);
    try {
      const res = await checkTask(lessonId, taskId);
      setResult({ passed: res.passed, feedback: res.feedback, celebrate: res.lessonCompleted });
    } catch (e) {
      setResult({ passed: false, feedback: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const passed = result?.passed ?? false;

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 transition',
        passed ? 'border-ok/40 bg-ok/5' : 'border-border bg-panel',
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={clsx('mt-0.5 shrink-0', passed ? 'text-ok' : 'text-muted')}>
          {passed ? <CheckCircle2 size={18} /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-current" />}
        </div>
        <div className="flex-1 text-sm">{instruction}</div>
      </div>

      {result && (result.feedback || result.celebrate) && (
        <div
          className={clsx(
            'mt-3 ml-7 rounded-lg px-3 py-2 text-xs',
            passed ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger',
          )}
        >
          {result.celebrate && (
            <div className="font-semibold mb-1 flex items-center gap-1">
              <Trophy size={13} /> {t('lessonDone', locale)}
            </div>
          )}
          {result.feedback}
        </div>
      )}

      <div className="mt-3 ml-7 flex items-center gap-2">
        {!passed && (
          <button
            onClick={run}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg text-xs font-medium hover:brightness-110 disabled:opacity-50 transition"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {busy ? t('checking', locale) : t('checkTask', locale)}
          </button>
        )}
        {hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted hover:text-warn transition"
          >
            <Lightbulb size={13} /> {t('hint', locale)}
          </button>
        )}
      </div>
      {showHint && hint && <div className="mt-2 ml-7 text-xs text-warn/90">{hint}</div>}
    </div>
  );
}
