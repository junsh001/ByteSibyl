import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import {
  Bot,
  Check,
  Files,
  GitBranch,
  Play,
  RotateCcw,
  Search,
  Square,
} from 'lucide-react';
import type {
  AgentRunId,
  AgentRunEvent,
  AgentSession,
  AgentShellEvent,
  ApprovalRequest,
  DiagnosticsResponse,
  EvalReport,
  EvalTask,
  HealthResponse,
  HookRecord,
  ModelProviderInfo,
  PatchProposal,
  ProductTask,
  ProjectRecord,
  SearchTextMatch,
  SelfRepairAttempt,
  ShellCommandResult,
  SkillInfo,
  SkillSelection,
  SubagentDefinition,
  SubagentRunSummary,
  SessionLogResponse,
  SessionTraceExport,
  TaskWorkspaceRecord,
  ToolDefinition,
  ToolResult,
  TodoItem,
  WorkspaceFileNode,
  WorkspaceInfo,
} from '@wac/shared';
import { api, connectSessionEvents } from './api';
import { countDiagnostics, formatDiagnosticTimestamp } from './features/diagnostics';
import { TodoPanel } from './features/todo-panel';
import { TraceViewer } from './features/trace-viewer';

const MAX_EDITABLE_BYTES = 256 * 1024;

interface OpenFileTab {
  path: string;
  originalContent: string;
  draftContent: string;
  readOnly: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'status' | 'tool' | 'command' | 'approval' | 'error';
  content: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [modelProvider, setModelProvider] = useState<ModelProviderInfo | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [activeTaskWorkspace, setActiveTaskWorkspace] = useState<TaskWorkspaceRecord | null>(null);
  const [repoPath, setRepoPath] = useState('.');
  const [branchName, setBranchName] = useState('');
  const [tree, setTree] = useState<WorkspaceFileNode | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
  const [evalTasks, setEvalTasks] = useState<EvalTask[]>([]);
  const [evalReport, setEvalReport] = useState<EvalReport | null>(null);
  const [evalRunning, setEvalRunning] = useState(false);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFileTab[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<SearchTextMatch[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [subagents, setSubagents] = useState<SubagentDefinition[]>([]);
  const [subagentSummary, setSubagentSummary] = useState<SubagentRunSummary | null>(null);
  const [currentSkill, setCurrentSkill] = useState<SkillSelection | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [toolResult, setToolResult] = useState<ToolResult | null>(null);
  const [shellCommand, setShellCommand] = useState('npm run typecheck');
  const [shellResult, setShellResult] = useState<ShellCommandResult | null>(null);
  const [shellRunning, setShellRunning] = useState(false);
  const [repairCommand, setRepairCommand] = useState('npm run typecheck');
  const [repairAttempt, setRepairAttempt] = useState<SelfRepairAttempt | null>(null);
  const [repairRunning, setRepairRunning] = useState(false);
  const [repairVerifying, setRepairVerifying] = useState(false);
  const [patchDraft, setPatchDraft] = useState('');
  const [patchProposal, setPatchProposal] = useState<PatchProposal | null>(null);
  const [patchQueue, setPatchQueue] = useState<PatchProposal[]>([]);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [agentPrompt, setAgentPrompt] = useState('修复当前工作区中的 TypeScript 错误');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentTask, setCurrentTask] = useState<ProductTask | null>(null);
  const [agentEvents, setAgentEvents] = useState<AgentRunEvent[]>([]);
  const [agentRunning, setAgentRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<AgentRunId | null>(null);
  const [session, setSession] = useState<AgentSession | null>(null);
  const [sessionLog, setSessionLog] = useState<SessionLogResponse | null>(null);
  const [sessionTrace, setSessionTrace] = useState<SessionTraceExport | null>(null);
  const [events, setEvents] = useState<AgentShellEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stopAgentStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    void Promise.all([
      api.health(),
      api.modelProviderStatus(),
      api.workspace(),
      api.projects(),
      api.sessions(),
      api.workspaceTree(),
      api.tools(),
      api.skills(),
      api.subagents(),
      api.diagnostics(),
      api.evalTasks(),
      api.todos(),
    ])
      .then(
        ([
          healthResult,
          providerResult,
          workspaceResult,
          projectResult,
          sessionResult,
          treeResult,
          toolResult,
          skillResult,
          subagentResult,
          diagnosticsResult,
          evalTaskResult,
          todoResult,
        ]) => {
          setHealth(healthResult);
          setModelProvider(providerResult.provider);
          setWorkspace(workspaceResult);
          setProjects(projectResult.projects);
          setActiveProject(
            projectResult.projects.find((item) => item.id === projectResult.activeProjectId) ?? null,
          );
          setTree(treeResult);
          setTools(toolResult.tools);
          setSkills(skillResult.skills);
          setSubagents(subagentResult.subagents);
          setDiagnostics(diagnosticsResult);
          setEvalTasks(evalTaskResult.tasks);
          setTodos(todoResult.todos);
          const latestSession = sessionResult.sessions[0] ?? null;
          if (latestSession) {
            setSession(latestSession);
            void refreshSessionLog(latestSession);
          }
          if (projectResult.activeProjectId && projectResult.activeWorkspaceId) {
            void api
              .taskWorkspace(projectResult.activeProjectId, projectResult.activeWorkspaceId)
              .then((result) => {
                setActiveProject(result.project);
                setActiveTaskWorkspace(result.workspace);
              })
              .catch(() => undefined);
          }
          const first = findFirstFile(treeResult);
          if (first) {
            void openFile(first.path);
          }
        },
      )
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    return connectSessionEvents(
      session.id,
      (event) => setEvents((current) => [event, ...current].slice(0, 20)),
      setError,
    );
  }, [session]);

  const sessionLabel = useMemo(() => {
    if (!session) return '尚未创建 Session';
    return `${session.title} · ${session.status} · ${session.id.slice(0, 8)}`;
  }, [session]);

  const latestContextSummary = useMemo(() => {
    for (let index = agentEvents.length - 1; index >= 0; index -= 1) {
      const event = agentEvents[index];
      if (event?.type === 'agent.context_summary') return event.summary;
    }
    const persisted = sessionLog?.runs
      .flatMap((run) => run.events)
      .filter((event) => event.type === 'agent.context_summary')
      .at(-1);
    return persisted?.type === 'agent.context_summary' ? persisted.summary : null;
  }, [agentEvents, sessionLog]);

  const recentHooks = useMemo(() => sessionLog?.hooks.slice(-5).reverse() ?? [], [sessionLog]);
  const blockedHookCount = useMemo(
    () => sessionLog?.hooks.filter((hook) => hook.status === 'blocked').length ?? 0,
    [sessionLog],
  );

  const patchFlowHint = useMemo(() => {
    if (!selectedFile) return '先在左侧选择文件。';
    if (!patchProposal) return '可以直接生成 Diff Preview，或请求审批时自动生成。';
    if (patchProposal.status === 'blocked') return 'Guardrails 已拦截该 Patch。';
    if (patchProposal.status === 'waiting_approval') return '等待批准或拒绝。';
    if (patchProposal.status === 'approved') return '已批准，可以应用 Patch。';
    if (patchProposal.status === 'applied') return 'Patch 已应用到 workspace 文件。';
    if (patchProposal.status === 'rejected') return '审批已拒绝，请重新生成 Patch Proposal。';
    if (patchProposal.status === 'discarded') return 'Patch Proposal 已丢弃，请重新生成。';
    return 'Patch Proposal 已生成，可以请求审批。';
  }, [patchProposal, selectedFile]);

  const activeOpenFile = useMemo(
    () => (selectedFile ? openFiles.find((file) => file.path === selectedFile.path) ?? null : null),
    [openFiles, selectedFile],
  );

  const isEditorDirty = activeOpenFile
    ? activeOpenFile.draftContent !== activeOpenFile.originalContent
    : false;

  const visibleChatMessages = useMemo(() => chatMessages.slice(-24), [chatMessages]);

  async function createSession() {
    setError(null);
    const result = await api.createSession('Product P3-P5 Coding Task');
    setSession(result.session);
    setSessionLog(null);
    setSessionTrace(null);
    setCurrentTask(null);
    setChatMessages([]);
    setEvents([{ type: 'session.created', session: result.session }]);
  }

  async function refreshSessionLog(targetSession = session) {
    if (!targetSession) return;
    const [logResult, traceResult] = await Promise.all([
      api.sessionLog(targetSession.id),
      api.sessionTrace(targetSession.id),
    ]);
    setSession(logResult.session);
    setSessionLog(logResult);
    setSessionTrace(traceResult);
    const latestTask = logResult.tasks?.at(-1) ?? null;
    setCurrentTask(latestTask);
    setChatMessages(rehydrateChatMessages(logResult));
  }

  async function refreshDiagnostics() {
    setError(null);
    setDiagnosticsLoading(true);
    try {
      setDiagnostics(await api.diagnostics());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiagnosticsLoading(false);
    }
  }

  async function openFile(path: string) {
    setError(null);
    const existing = openFiles.find((file) => file.path === path);
    if (existing) {
      setSelectedFile({ path: existing.path, content: existing.originalContent });
      setPatchDraft(existing.draftContent);
      setPatchProposal(patchQueue.find((proposal) => proposal.path === existing.path) ?? null);
      setApproval(null);
      return;
    }
    const result = await api.readWorkspaceFile(path);
    const readOnly = byteLength(result.content) > MAX_EDITABLE_BYTES;
    setSelectedFile(result);
    setOpenFiles((current) => {
      const existing = current.find((file) => file.path === result.path);
      if (existing) return current;
      return [
        ...current,
        {
          path: result.path,
          originalContent: result.content,
          draftContent: result.content,
          readOnly,
        },
      ].slice(-8);
    });
    setPatchDraft(result.content);
    setPatchProposal(null);
    setApproval(null);
  }

  function closeFile(path: string) {
    setOpenFiles((current) => current.filter((file) => file.path !== path));
    if (selectedFile?.path !== path) return;
    const next = openFiles.find((file) => file.path !== path);
    if (next) {
      setSelectedFile({ path: next.path, content: next.originalContent });
      setPatchDraft(next.draftContent);
      setPatchProposal(patchQueue.find((proposal) => proposal.path === next.path) ?? null);
    } else {
      setSelectedFile(null);
      setPatchDraft('');
      setPatchProposal(null);
    }
    setApproval(null);
  }

  function updateEditorDraft(value: string | undefined) {
    if (!selectedFile || value === undefined) return;
    setPatchDraft(value);
    setOpenFiles((current) =>
      current.map((file) =>
        file.path === selectedFile.path ? { ...file, draftContent: value } : file,
      ),
    );
  }

  function resetEditorDraft() {
    if (!activeOpenFile) return;
    setPatchDraft(activeOpenFile.originalContent);
    setOpenFiles((current) =>
      current.map((file) =>
        file.path === activeOpenFile.path
          ? { ...file, draftContent: activeOpenFile.originalContent }
          : file,
      ),
    );
  }

  async function createPatchPreview() {
    if (!selectedFile) return;
    setError(null);
    try {
      const result = await createPatchPreviewForSelectedFile();
      setPatchProposal(result.proposal);
      setPatchQueue((current) => upsertPatchProposal(current, result.proposal));
      setApproval(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function createPatchPreviewForSelectedFile() {
    if (!selectedFile) throw new Error('请选择文件后再生成 Patch Preview。');
    const activeSession =
      session ?? (await api.createSession('Product P3-P5 Coding Task')).session;
    setSession(activeSession);
    const result = await api.createPatchPreview({
      sessionId: activeSession.id,
      path: selectedFile.path,
      updatedContent: patchDraft,
    });
    await refreshSessionLog(activeSession);
    return result;
  }

  async function discardPatch() {
    if (!patchProposal) return;
    setError(null);
    try {
      const result = await api.discardPatch(patchProposal.id);
      setPatchProposal(result.proposal);
      setPatchQueue((current) => upsertPatchProposal(current, result.proposal));
      setApproval(null);
      await refreshSessionLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function requestPatchApproval() {
    if (!selectedFile) return;
    setError(null);
    try {
      const proposal =
        patchProposal && ['proposed', 'blocked'].includes(patchProposal.status)
          ? patchProposal
          : (await createPatchPreviewForSelectedFile()).proposal;
      setPatchProposal(proposal);
      const result = await api.requestPatchApproval(proposal.id);
      setPatchProposal(result.proposal);
      setPatchQueue((current) => upsertPatchProposal(current, result.proposal));
      setApproval(result.approval ?? null);
      setChatMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-approval`,
          role: 'approval',
          content: result.approval
            ? `已请求审批：${proposal.path}`
            : `审批策略：${result.decision.reason}`,
        },
      ]);
      if (result.decision.effect === 'deny') {
        const message = result.decision.violations.map((violation) => violation.message).join(' ');
        setError(message || result.decision.reason);
      }
      await refreshSessionLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function approvePatch() {
    if (!approval) return;
    setError(null);
    try {
      const result = await api.approvePatch(approval.id);
      setPatchProposal(result.proposal);
      setPatchQueue((current) => upsertPatchProposal(current, result.proposal));
      setApproval(result.approval);
      setChatMessages((current) => [
        ...current,
        { id: `${Date.now()}-approved`, role: 'approval', content: `已批准 Patch：${result.proposal.path}` },
      ]);
      await refreshSessionLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function rejectPatch() {
    if (!approval) return;
    setError(null);
    try {
      const result = await api.rejectPatch(approval.id);
      setPatchProposal(result.proposal);
      setPatchQueue((current) => upsertPatchProposal(current, result.proposal));
      setApproval(result.approval);
      setChatMessages((current) => [
        ...current,
        { id: `${Date.now()}-rejected`, role: 'approval', content: `已拒绝 Patch：${result.proposal.path}` },
      ]);
      await refreshSessionLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function applyPatch() {
    if (!patchProposal) return;
    setError(null);
    try {
      const result = await api.applyPatch(patchProposal.id);
      setPatchProposal(result.proposal);
      setPatchQueue((current) => upsertPatchProposal(current, result.proposal));
      setPatchDraft(result.content);
      if (selectedFile?.path === result.proposal.path) {
        setSelectedFile({ path: result.proposal.path, content: result.content });
      }
      setOpenFiles((current) =>
        current.map((file) =>
          file.path === result.proposal.path
            ? { ...file, originalContent: result.content, draftContent: result.content }
            : file,
        ),
      );
      await refreshSessionLog();
      setChatMessages((current) => [
        ...current,
        { id: `${Date.now()}-applied`, role: 'approval', content: `已应用 Patch：${result.proposal.path}` },
      ]);
      setTree(await api.workspaceTree());
      await refreshDiagnostics();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function search() {
    setError(null);
    if (!searchQuery.trim()) {
      setSearchMatches([]);
      return;
    }
    const result = await api.searchWorkspace(searchQuery);
    setSearchMatches(result.matches);
  }

  async function runReadTool() {
    if (!selectedFile) return;
    setError(null);
    const result = await api.runTool({
      name: 'read_file',
      input: { path: selectedFile.path },
    });
    setToolResult(result);
  }

  async function runShellCommand() {
    setError(null);
    setShellRunning(true);
    try {
      const activeSession =
        session ?? (await api.createSession('Product P3-P5 Coding Task')).session;
      setSession(activeSession);
      const result = await api.runShellCommand({
        sessionId: activeSession.id,
        taskId: currentTask?.id,
        command: shellCommand,
        timeoutMs: 10_000,
      });
      setShellResult(result.result);
      setChatMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-command`,
          role: 'command',
          content: `命令 ${result.result.command} ${result.result.status}${result.result.exitCode === undefined ? '' : ` exit=${result.result.exitCode}`}`,
        },
      ]);
      await refreshSessionLog(activeSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setShellRunning(false);
    }
  }

  async function sendMessage() {
    const message = agentPrompt.trim();
    if (!message) return;
    setError(null);
    setAgentEvents([]);
    setAgentRunning(true);
    setSubagentSummary(null);
    setCurrentRunId(null);
    setChatMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: 'user', content: message },
    ]);
    setAgentPrompt('');
    try {
      const activeSession =
        session ?? (await api.createSession('Product P3-P5 Coding Task')).session;
      setSession(activeSession);
      stopAgentStreamRef.current = api.runAgent(
        {
          sessionId: activeSession.id,
          taskId: currentTask?.status === 'completed' || currentTask?.status === 'failed' ? undefined : currentTask?.id,
          workspaceId: activeTaskWorkspace?.id,
          message,
          maxIterations: 6,
        },
        (event) => {
          setAgentEvents((current) => [...current, event]);
          if (event.type === 'agent.status') {
            setChatMessages((current) => [
              ...current,
              { id: `${Date.now()}-status`, role: 'status', content: event.message },
            ]);
          }
          if (event.type === 'agent.message') {
            setChatMessages((current) => [
              ...current,
              { id: `${Date.now()}-assistant`, role: 'assistant', content: event.content },
            ]);
          }
          if (event.type === 'agent.error') {
            setChatMessages((current) => [
              ...current,
              { id: `${Date.now()}-error`, role: 'error', content: event.message },
            ]);
          }
          if (event.type === 'agent.done') {
            setChatMessages((current) => [
              ...current,
              { id: `${Date.now()}-done`, role: 'status', content: `完成：${event.finishReason}` },
            ]);
          }
          if (event.type === 'agent.run_created') {
            setSession(event.session);
            setCurrentRunId(event.run.id);
          }
          if (event.type === 'agent.tool_call') {
            setChatMessages((current) => [
              ...current,
              { id: `${Date.now()}-tool-call`, role: 'tool', content: `调用工具 ${event.call.name}` },
            ]);
          }
          if (event.type === 'agent.tool_result') {
            setChatMessages((current) => [
              ...current,
              {
                id: `${Date.now()}-tool-result`,
                role: 'tool',
                content: event.result.ok
                  ? `工具 ${event.result.name} 完成`
                  : `工具 ${event.result.name} 失败：${event.result.error ?? 'unknown error'}`,
              },
            ]);
          }
          if (event.type === 'agent.model_call') {
            setChatMessages((current) => [
              ...current,
              {
                id: `${Date.now()}-model`,
                role: 'status',
                content: `模型 ${event.call.provider}/${event.call.model} ${event.call.status} ${event.call.latencyMs}ms`,
              },
            ]);
          }
          if (event.type === 'agent.todo_updated') {
            setTodos(event.todos);
          }
          if (event.type === 'agent.skill_selected') {
            setCurrentSkill(event.selection);
          }
          if (event.type === 'agent.subagent_summary') {
            setSubagentSummary(event.summary);
          }
          if (event.type === 'agent.done' || event.type === 'agent.error') {
            setAgentRunning(false);
            setCurrentRunId(null);
            stopAgentStreamRef.current = null;
            void refreshSessionLog(activeSession);
          }
        },
        (message) => {
          setAgentRunning(false);
          setError(message);
          setChatMessages((current) => [
            ...current,
            { id: `${Date.now()}-stream-error`, role: 'error', content: message },
          ]);
          setCurrentRunId(null);
          stopAgentStreamRef.current = null;
        },
      );
    } catch (err) {
      setAgentRunning(false);
      setCurrentRunId(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function cancelAgent() {
    if (!currentRunId) return;
    setError(null);
    try {
      await api.cancelRun(currentRunId);
    } catch (err) {
      setAgentRunning(false);
      stopAgentStreamRef.current?.();
      stopAgentStreamRef.current = null;
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function startSelfRepair() {
    setError(null);
    setRepairRunning(true);
    try {
      const activeSession =
        session ?? (await api.createSession('Product P3-P5 Coding Task')).session;
      setSession(activeSession);
      const result = await api.startSelfRepair({
        sessionId: activeSession.id,
        command: repairCommand,
      });
      setSession(result.session);
      setShellResult(result.commandResult);
      setRepairAttempt(result.repair);
      if (result.proposal) {
        setPatchProposal(result.proposal);
        setApproval(result.approval ?? null);
        if (result.proposal.updatedContent !== undefined) {
          const file = await api.readWorkspaceFile(result.proposal.path);
          setSelectedFile(file);
          setPatchDraft(result.proposal.updatedContent);
          setOpenFiles((current) => upsertOpenFile(current, {
            path: file.path,
            originalContent: file.content,
            draftContent: result.proposal?.updatedContent ?? file.content,
            readOnly: byteLength(file.content) > MAX_EDITABLE_BYTES,
          }));
        }
      }
      await refreshSessionLog(result.session);
      await refreshDiagnostics();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRepairRunning(false);
    }
  }

  async function verifySelfRepair() {
    if (!session) return;
    setError(null);
    setRepairVerifying(true);
    try {
      const result = await api.verifySelfRepair({
        sessionId: session.id,
        command: repairCommand,
        patchId: patchProposal?.id,
      });
      setShellResult(result.commandResult);
      setRepairAttempt(result.repair);
      await refreshSessionLog(session);
      await refreshDiagnostics();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRepairVerifying(false);
    }
  }

  async function runEvaluation() {
    setError(null);
    setEvalRunning(true);
    try {
      const result = await api.runEval();
      setEvalReport(result.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEvalRunning(false);
    }
  }

  async function createProject() {
    setError(null);
    try {
      const result = await api.createProject({
        repoPath,
        name: repoPath.split('/').filter(Boolean).at(-1),
      });
      const list = await api.projects();
      setProjects(list.projects);
      setActiveProject(result.project);
      setActiveTaskWorkspace(null);
      setBranchName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function createTaskWorkspace() {
    if (!activeProject) return;
    setError(null);
    try {
      const result = await api.createTaskWorkspace(activeProject.id, {
        branchName: branchName.trim() || undefined,
      });
      setActiveProject(result.project);
      setActiveTaskWorkspace(result.workspace);
      const [workspaceResult, treeResult, diagnosticsResult] = await Promise.all([
        api.workspace(),
        api.workspaceTree(),
        api.diagnostics(),
      ]);
      setWorkspace(workspaceResult);
      setTree(treeResult);
      setDiagnostics(diagnosticsResult);
      setSelectedFile(null);
      setPatchDraft('');
      setOpenFiles([]);
      setPatchProposal(null);
      setPatchQueue([]);
      setApproval(null);
      const first = findFirstFile(treeResult);
      if (first) void openFile(first.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="vscode-shell">
      <header className="vscode-titlebar">
        <div className="window-controls" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="titlebar-title">
          <strong>ByteSibyl</strong>
          <span>{activeProject?.name ?? workspace?.rootName ?? 'No project'}</span>
        </div>
        <div className="status-group">
          <span className={health?.ok ? 'status-dot ok' : 'status-dot'} />
          <span>{health ? health.phase : '连接 Server 中'}</span>
        </div>
      </header>

      <main className="vscode-workbench">
        <nav className="activity-bar" aria-label="Primary">
          <button className="active" type="button" title="Explorer">
            <Files size={20} />
          </button>
          <button type="button" title="Search">
            <Search size={20} />
          </button>
          <button type="button" title="Source Control">
            <GitBranch size={20} />
          </button>
          <button type="button" title="Assistant">
            <Bot size={20} />
          </button>
        </nav>

        <aside className="explorer-sidebar">
          <div className="sidebar-heading">
            <span>EXPLORER</span>
            <small>{tree ? `${countFiles(tree)} files` : 'loading'}</small>
          </div>
          <section className="workspace-card">
            <strong>{workspace?.rootName ?? 'Workspace'}</strong>
            <span>{activeTaskWorkspace?.branch ?? 'no isolated branch'}</span>
          </section>
          <div className="workspace-tools">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void search();
              }}
              placeholder="Search"
            />
            <button type="button" onClick={() => void search()} title="Search">
              <Search size={14} />
            </button>
          </div>
          <div className="tree-scroll">
            {tree ? (
              <FileTreeNode node={tree} selectedPath={selectedFile?.path} onOpen={openFile} />
            ) : (
              <div className="empty-state">加载中...</div>
            )}
          </div>
          {searchMatches.length > 0 ? (
            <details className="sidebar-results" open>
              <summary>Search Results</summary>
              <div className="search-results">
                {searchMatches.map((match) => (
                  <button
                    type="button"
                    key={`${match.path}:${match.line}:${match.column}`}
                    onClick={() => void openFile(match.path)}
                  >
                    <strong>{match.path}</strong>
                    <span>
                      {match.line}:{match.column} {match.snippet}
                    </span>
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </aside>

        <section className="editor-group">
          <div className="editor-tabs">
            {openFiles.length === 0 ? (
              <span>Open a file from Explorer</span>
            ) : (
              openFiles.map((file) => (
                <button
                  type="button"
                  key={file.path}
                  className={selectedFile?.path === file.path ? 'active' : ''}
                  onClick={() => void openFile(file.path)}
                >
                  <span>{file.path.split('/').at(-1) ?? file.path}</span>
                  {file.draftContent !== file.originalContent ? <strong>●</strong> : null}
                  <i
                    onClick={(event) => {
                      event.stopPropagation();
                      closeFile(file.path);
                    }}
                  >
                    ×
                  </i>
                </button>
              ))
            )}
          </div>
          <div className="editor-breadcrumb">
            <span>{selectedFile?.path ?? 'No file selected'}</span>
            <small>
              {activeOpenFile
                ? `${activeOpenFile.draftContent.split(/\r?\n/).length} lines${isEditorDirty ? ' · unsaved draft' : ''}${activeOpenFile.readOnly ? ' · read-only' : ''}`
                : 'Monaco Editor'}
            </small>
          </div>
          <div className="editor-toolbar">
            <button type="button" disabled={!selectedFile || activeOpenFile?.readOnly} onClick={() => void createPatchPreview()}>
              Review Changes
            </button>
            <button type="button" disabled={!isEditorDirty} onClick={resetEditorDraft}>
              <RotateCcw size={13} />
              Discard Draft
            </button>
            <button type="button" disabled={!selectedFile} onClick={() => void requestPatchApproval()}>
              Request Approval
            </button>
            <button type="button" disabled={!approval || approval.status !== 'pending'} onClick={() => void approvePatch()}>
              <Check size={13} />
              Approve
            </button>
            <button type="button" disabled={!patchProposal || patchProposal.status !== 'approved'} onClick={() => void applyPatch()}>
              Apply
            </button>
            <span>{patchFlowHint}</span>
          </div>
          <div className="monaco-shell">
            {activeOpenFile ? (
              <Editor
                key={activeOpenFile.path}
                value={activeOpenFile.draftContent}
                defaultLanguage={languageForPath(activeOpenFile.path)}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  readOnly: activeOpenFile.readOnly,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
                onChange={updateEditorDraft}
              />
            ) : (
              <div className="editor-empty">Select a file to start editing.</div>
            )}
          </div>
        </section>

        <aside className="assistant-sidebar">
          <header className="assistant-header">
            <div>
              <strong>ByteSibyl Chat</strong>
              <span>{currentTask?.status ?? session?.status ?? 'ready'}</span>
            </div>
            <button type="button" onClick={() => void createSession()} title="New chat">
              +
            </button>
          </header>

          <section className="assistant-context">
            <div>
              <span>Workspace</span>
              <strong>{activeProject?.name ?? '未绑定项目'}</strong>
            </div>
            <small>{activeTaskWorkspace?.changedFiles.length ?? 0} changed</small>
            <details>
              <summary>Project setup</summary>
              <input
                value={repoPath}
                onChange={(event) => setRepoPath(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void createProject();
                }}
                placeholder="Git repo path"
              />
              <input
                value={branchName}
                onChange={(event) => setBranchName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void createTaskWorkspace();
                }}
                placeholder="Branch name optional"
              />
              <div className="project-actions">
                <button type="button" onClick={() => void createProject()}>
                  Bind
                </button>
                <button type="button" disabled={!activeProject} onClick={() => void createTaskWorkspace()}>
                  Isolate
                </button>
              </div>
            </details>
          </section>

          <section className="assistant-thread" aria-label="AI conversation">
            {visibleChatMessages.length === 0 ? (
              <div className="assistant-empty">
                Ask ByteSibyl to inspect, edit, or validate this isolated workspace. Tool calls,
                commands, approvals, and results will appear here.
              </div>
            ) : (
              visibleChatMessages.map((message) => (
                <div className={`chat-bubble ${message.role}`} key={message.id}>
                  {message.content}
                </div>
              ))
            )}
          </section>

          <footer className="chat-composer">
            <textarea
              id="agent-prompt"
              value={agentPrompt}
              onChange={(event) => setAgentPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  void sendMessage();
                }
              }}
              rows={4}
              placeholder="Ask ByteSibyl..."
            />
            <div className="compose-actions">
              <button type="button" disabled={agentRunning || !agentPrompt.trim()} onClick={() => void sendMessage()}>
                <Play size={14} />
                {agentRunning ? 'Thinking' : 'Send'}
              </button>
              <button type="button" disabled={!agentRunning || !currentRunId} onClick={() => void cancelAgent()}>
                <Square size={13} />
                Stop
              </button>
            </div>
          </footer>
        </aside>

        <section className="workbench-panel">
          <details className="panel-section">
            <summary>
              <span>Problems & Logs</span>
              <small>{error ? '1 error' : `${sessionLog?.runs.length ?? 0} runs`}</small>
            </summary>
            <div className="log-stream">
              {error ? <div className="log-line error">Error: {error}</div> : null}
              {events.map((event, index) => (
                <div className="log-line" key={`${event.type}-${index}`}>
                  {event.type === 'session.created'
                    ? `session.created ${event.session.id}`
                    : `${event.type} ${event.message}`}
                </div>
              ))}
              {agentEvents.map((event, index) => (
                <div className="log-line" key={`agent-${index}`}>
                  {formatAgentEvent(event)}
                </div>
              ))}
              {sessionLog?.commands.slice(-5).map((command) => (
                <div className="log-line muted" key={command.id}>
                  command {command.id.slice(0, 8)} {command.status} {command.command}
                </div>
              ))}
              {sessionLog?.modelCalls.slice(-5).map((call) => (
                <div className="log-line muted" key={call.id}>
                  model {call.id.slice(0, 8)} {call.provider}/{call.model} {call.status}{' '}
                  {call.latencyMs}ms
                </div>
              ))}
            </div>
          </details>

          <details className="panel-section">
            <summary>
              <span>Review Changes</span>
              <small>
                {patchProposal
                  ? `${patchProposal.path} +${patchProposal.additions} -${patchProposal.deletions}`
                  : 'no proposal'}
              </small>
            </summary>
            {patchQueue.length > 0 ? (
              <div className="patch-queue">
                {patchQueue.map((proposal) => (
                  <button
                    type="button"
                    key={proposal.id}
                    className={patchProposal?.id === proposal.id ? 'active' : ''}
                    onClick={() => {
                      setPatchProposal(proposal);
                      void openFile(proposal.path);
                    }}
                  >
                    <span>{proposal.path}</span>
                    <strong>{proposal.status}</strong>
                  </button>
                ))}
              </div>
            ) : null}
            {patchProposal ? (
              <div className="diff-editor-shell">
                <DiffEditor
                  key={patchProposal.id}
                  original={
                    openFiles.find((file) => file.path === patchProposal.path)?.originalContent ??
                    selectedFile?.content ??
                    ''
                  }
                  modified={patchProposal.updatedContent ?? patchDraft}
                  language={languageForPath(patchProposal.path)}
                  theme="vs-light"
                  options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            ) : (
              <div className="diff-empty">Generate a review from an editor draft to inspect changes.</div>
            )}
          </details>
        </section>
      </main>

      <footer className="vscode-statusbar">
        <span>
          <GitBranch size={13} />
          {activeTaskWorkspace?.branch ?? 'no-workspace'}
        </span>
        <span>{selectedFile?.path ?? 'No file'}</span>
        <span>{modelProvider ? `${modelProvider.provider}/${modelProvider.model}` : 'model loading'}</span>
      </footer>
    </div>
  );
}

function FileTreeNode({
  node,
  selectedPath,
  onOpen,
  depth = 0,
}: {
  node: WorkspaceFileNode;
  selectedPath?: string;
  onOpen: (path: string) => Promise<void>;
  depth?: number;
}) {
  if (node.type === 'dir') {
    return (
      <div>
        {node.path ? (
          <div className="tree-row folder" style={{ paddingLeft: 8 + depth * 14 }}>
            {node.name}
          </div>
        ) : null}
        {node.children?.map((child) => (
          <FileTreeNode
            key={child.path || child.name}
            node={child}
            selectedPath={selectedPath}
            onOpen={onOpen}
            depth={node.path ? depth + 1 : depth}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={node.path === selectedPath ? 'tree-row file selected' : 'tree-row file'}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={() => void onOpen(node.path)}
    >
      {node.name}
    </button>
  );
}

function findFirstFile(node: WorkspaceFileNode): WorkspaceFileNode | null {
  if (node.type === 'file') return node;
  for (const child of node.children ?? []) {
    const found = findFirstFile(child);
    if (found) return found;
  }
  return null;
}

function countFiles(node: WorkspaceFileNode): number {
  if (node.type === 'file') return 1;
  return (node.children ?? []).reduce((total, child) => total + countFiles(child), 0);
}

function upsertOpenFile(files: OpenFileTab[], next: OpenFileTab): OpenFileTab[] {
  const exists = files.some((file) => file.path === next.path);
  if (!exists) return [...files, next].slice(-8);
  return files.map((file) => (file.path === next.path ? next : file));
}

function upsertPatchProposal(proposals: PatchProposal[], next: PatchProposal): PatchProposal[] {
  const exists = proposals.some((proposal) => proposal.id === next.id);
  if (!exists) return [...proposals, next].slice(-12);
  return proposals.map((proposal) => (proposal.id === next.id ? next : proposal));
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function languageForPath(path: string): string {
  const ext = path.split('.').at(-1)?.toLowerCase();
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    case 'yml':
    case 'yaml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

function rehydrateChatMessages(log: SessionLogResponse): ChatMessage[] {
  const taskMessages =
    log.tasks
      ?.flatMap((task) =>
        task.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        })),
      )
      .slice(-80) ?? [];
  if (taskMessages.length > 0) return taskMessages;

  return log.runs
    .flatMap((run) =>
      run.events.flatMap((event): ChatMessage[] => {
        if (event.type === 'agent.message') {
          return [{ id: `${run.id}-message-${event.content.length}`, role: 'assistant', content: event.content }];
        }
        if (event.type === 'agent.status') {
          return [{ id: `${run.id}-status-${event.message.length}`, role: 'status', content: event.message }];
        }
        if (event.type === 'agent.tool_call') {
          return [{ id: `${run.id}-tool-call-${event.call.name}`, role: 'tool', content: `调用工具 ${event.call.name}` }];
        }
        if (event.type === 'agent.tool_result') {
          return [
            {
              id: `${run.id}-tool-result-${event.result.name}-${event.result.startedAt}`,
              role: 'tool',
              content: event.result.ok
                ? `工具 ${event.result.name} 完成`
                : `工具 ${event.result.name} 失败：${event.result.error ?? 'unknown error'}`,
            },
          ];
        }
        if (event.type === 'agent.error') {
          return [{ id: `${run.id}-error-${event.message.length}`, role: 'error', content: event.message }];
        }
        if (event.type === 'agent.done') {
          return [{ id: `${run.id}-done`, role: 'status', content: `任务停止：${event.finishReason}` }];
        }
        return [];
      }),
    )
    .slice(-80);
}

function formatAgentEvent(event: AgentRunEvent): string {
  switch (event.type) {
    case 'agent.run_created':
      return `agent.run_created session=${event.session.id.slice(0, 8)} run=${event.run.id.slice(0, 8)}`;
    case 'agent.status':
      return `agent.status ${event.message}`;
    case 'agent.iteration':
      return `agent.iteration ${event.iteration}/${event.maxIterations}`;
    case 'agent.context_summary':
      return `context_summary budget=${event.summary.budget.usedChars}/${event.summary.budget.maxChars} files=${event.summary.relevantFiles.length} diagnostics=${event.summary.diagnostics.length} truncated=${event.summary.budget.truncated}`;
    case 'agent.todo_updated':
      return `todo_updated ${event.reason} active=${event.todos.find((todo) => todo.status === 'in_progress')?.title ?? 'none'}`;
    case 'agent.skill_selected':
      return `skill_selected ${event.selection.skill.name} ${event.selection.reason}`;
    case 'agent.subagent_summary':
      return `subagent_summary ${event.summary.summaries.map((item) => `${item.role}:${item.permission}`).join(' ')}`;
    case 'agent.model_call':
      return `model_call ${event.call.provider}/${event.call.model} ${event.call.status} ${event.call.latencyMs}ms`;
    case 'agent.message':
      return `assistant ${event.content}`;
    case 'agent.tool_call':
      return `tool_call ${event.call.name} ${JSON.stringify(event.call.input)}`;
    case 'agent.tool_result':
      return `tool_result ${event.result.name} ok=${event.result.ok} hooks=${event.result.hooks?.length ?? 0}`;
    case 'agent.error':
      return `agent.error ${event.message}`;
    case 'agent.done':
      return `agent.done ${event.finishReason}`;
  }
}

function formatHookRecord(hook: HookRecord): string {
  const summary = hook.summary ? ` summary=${hook.summary}` : '';
  return `${hook.id.slice(0, 8)} ${hook.status} ${hook.phase}/${hook.hookName} ${hook.subject}${summary}`;
}
