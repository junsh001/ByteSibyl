import type { Locale } from '@wac/shared';

type Dict = Record<string, { zh: string; en: string }>;

export const STRINGS: Dict = {
  appName: { zh: 'CodeForge', en: 'CodeForge' },
  tagline: { zh: 'AI 结对编程 · 边玩边学 Agent', en: 'AI pair-programming · learn agents by playing' },
  chat: { zh: '对话', en: 'Chat' },
  editor: { zh: '编辑器', en: 'Editor' },
  terminal: { zh: '终端', en: 'Terminal' },
  learn: { zh: '学习闯关', en: 'Learn' },
  send: { zh: '发送', en: 'Send' },
  stop: { zh: '停止', en: 'Stop' },
  agentMode: { zh: 'Agent 模式', en: 'Agent mode' },
  askMode: { zh: '只问不改', en: 'Ask only' },
  reasoning: { zh: '深度思考', en: 'Reasoning' },
  thinking: { zh: '思考中…', en: 'Thinking…' },
  acting: { zh: '执行中…', en: 'Acting…' },
  run: { zh: '运行', en: 'Run' },
  save: { zh: '保存', en: 'Save' },
  saved: { zh: '已保存', en: 'Saved' },
  files: { zh: '文件', en: 'Files' },
  newProject: { zh: '新建项目', en: 'New project' },
  inputPlaceholder: {
    zh: '让 AI 帮你写代码、运行并验证…（Enter 发送，Shift+Enter 换行）',
    en: 'Ask the AI to build, run, and verify code… (Enter to send, Shift+Enter for newline)',
  },
  emptyChatTitle: { zh: '开始你的第一次 AI 编程', en: 'Start your first AI coding session' },
  emptyChatBody: {
    zh: '试试：用 Node 写一个猜数字小游戏并运行它。',
    en: 'Try: build a number-guessing game in Node and run it.',
  },
  lessons: { zh: '课程', en: 'Lessons' },
  xp: { zh: '经验', en: 'XP' },
  locked: { zh: '未解锁', en: 'Locked' },
  completed: { zh: '已通关', en: 'Completed' },
  startLesson: { zh: '开始', en: 'Start' },
  checkTask: { zh: '检查我的作业', en: 'Check my work' },
  hint: { zh: '提示', en: 'Hint' },
  checking: { zh: '批改中…', en: 'Grading…' },
  passed: { zh: '通过 🎉', en: 'Passed 🎉' },
  failed: { zh: '再试试', en: 'Try again' },
  lessonDone: { zh: '恭喜通关！', en: 'Lesson complete!' },
  backToLessons: { zh: '返回课程', en: 'Back to lessons' },
  noFileOpen: { zh: '从左侧选择一个文件，或让 AI 帮你创建。', en: 'Pick a file on the left, or let the AI create one.' },
  keyMissing: {
    zh: '⚠ 服务端未配置 DeepSeek API Key（deepseek_KEY）。',
    en: '⚠ Server has no DeepSeek API key (deepseek_KEY) configured.',
  },
};

let current: Locale = (localStorage.getItem('locale') as Locale) ?? 'zh';

export function getLocale(): Locale {
  return current;
}
export function setLocale(l: Locale) {
  current = l;
  localStorage.setItem('locale', l);
}
export function t(key: keyof typeof STRINGS, locale: Locale = current): string {
  return STRINGS[key]?.[locale] ?? key;
}
