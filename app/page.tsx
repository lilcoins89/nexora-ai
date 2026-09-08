'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  Code2,
  Download,
  FolderGit2,
  GitBranch,
  Layers3,
  Menu,
  MoreHorizontal,
  Send,
  Settings2,
  Sparkles,
  TerminalSquare,
  Upload,
  Globe,
  X,
} from 'lucide-react'
import {
  ActivityItem,
  createWorkspace,
  downloadText,
  exportWorkspace,
  filesForStack,
  makeId,
  Message,
  parseWorkspace,
  WorkspaceState,
  workspaceStorageKey,
} from '@/lib/workspace'
import { type StackId } from '@/lib/stacks'

const modes = [
  { title: 'TypeScript', detail: 'Libraries, CLIs, types, Node services', icon: TerminalSquare, stackId: 'typescript' as StackId },
  { title: 'Python', detail: 'Scripts, APIs, data tools, packages', icon: Code2, stackId: 'python' as StackId },
  { title: 'React', detail: 'Components, hooks, client UIs', icon: Layers3, stackId: 'react' as StackId },
  { title: 'Next.js', detail: 'App Router, server components, APIs', icon: Sparkles, stackId: 'nextjs' as StackId },
  { title: 'Vite', detail: 'Fast SPA tooling with Vite + TS', icon: GitBranch, stackId: 'vite' as StackId },
  { title: 'Vue', detail: 'SFCs, Composition API, Vite + Vue', icon: Bot, stackId: 'vue' as StackId },
]

type Panel = 'chat' | 'files' | 'activity' | 'more'

export default function Page() {
  const [studioOpen, setStudioOpen] = useState(false)
  const [activeMode, setActiveMode] = useState(modes[3].title)
  const [githubConnected, setGithubConnected] = useState(false)
  const [netlifyConfigured, setNetlifyConfigured] = useState(false)
  const [workspace, setWorkspace] = useState(() => createWorkspace())
  const [busy, setBusy] = useState(false)
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced' | 'error'>('local')

  useEffect(() => {
    const saved = window.sessionStorage.getItem(workspaceStorageKey())
    if (saved) {
      const parsed = parseWorkspace(saved)
      if (parsed) setWorkspace(parsed)
    }
  }, [])

  useEffect(() => {
    fetch('/api/netlify')
      .then((r) => r.json())
      .then((data) => setNetlifyConfigured(Boolean(data.configured)))
      .catch(() => setNetlifyConfigured(false))
  }, [])

  useEffect(() => {
    window.sessionStorage.setItem(workspaceStorageKey(), JSON.stringify(workspace))
    const timer = window.setTimeout(async () => {
      setSyncState('syncing')
      try {
        const response = await fetch('/api/workspace', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: workspace.project.id,
            name: workspace.project.name,
            mode: workspace.project.mode,
            selectedFile: workspace.project.selectedFile,
            files: Object.fromEntries(workspace.files.map((file) => [file.path, file.content ?? ''])),
          }),
        })
        setSyncState(response.ok ? 'synced' : response.status === 401 ? 'local' : 'error')
      } catch {
        setSyncState('local')
      }
    }, 900)
    return () => window.clearTimeout(timer)
  }, [workspace])

  async function sendMessage(text: string) {
    const prompt = text.trim()
    if (!prompt || busy) return
    const userMessage = { id: makeId(), role: 'user' as const, text: prompt }
    setBusy(true)
    setWorkspace((current) => ({
      ...current,
      messages: [...current.messages, userMessage],
      activity: current.activity.map((item) =>
        item.id === 'direction'
          ? { ...item, title: 'Agent working', detail: 'Inspecting the workspace', state: 'active' }
          : item,
      ),
    }))

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode: activeMode,
          files: Object.fromEntries(workspace.files.map((file) => [file.path, file.content ?? ''])),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Agent request failed.')
      setWorkspace((current) => {
        const nextFiles = [...current.files]
        if (result.files && typeof result.files === 'object') {
          for (const [path, content] of Object.entries(result.files as Record<string, string>)) {
            const existing = nextFiles.find((file) => file.path === path)
            if (existing) {
              existing.content = content
              existing.status = 'changed'
            } else {
              nextFiles.push({ path, kind: path.split('.').pop() || 'file', status: 'changed', content })
            }
          }
        }
        return {
          ...current,
          messages: [
            ...current.messages,
            { id: makeId(), role: 'agent', text: result.message ?? 'The agent completed a run.' },
          ],
          files: nextFiles,
          validation: result.validation ?? null,
          runs: result.runId ? [...current.runs, { id: result.runId, prompt, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), status: result.validation?.ok === false ? 'failed' : 'completed', changedFiles: nextFiles.filter((file) => file.status === 'changed').map((file) => file.path), validation: result.validation }] : current.runs,
          activity: current.activity.map((item) =>
            item.id === 'direction'
              ? {
                  ...item,
                  title: 'Workspace updated',
                  detail: result.events?.join(' · ') || 'Agent completed the requested slice',
                  state: 'done',
                }
              : item,
          ),
        }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The agent could not complete this run.'
      setWorkspace((current) => ({
        ...current,
        messages: [...current.messages, { id: makeId(), role: 'agent', text: message }],
        activity: current.activity.map((item) =>
          item.id === 'direction'
            ? {
                ...item,
                title: 'Agent paused',
                detail: 'Check configuration and try again',
                state: 'waiting',
              }
            : item,
        ),
      }))
    } finally {
      setBusy(false)
    }
  }

  async function connectGithub() {
    try {
      const response = await fetch('/api/github')
      const data = await response.json()
      if (data.url) {
        setGithubConnected(true)
        window.location.href = data.url
        return
      }
      if (response.status === 401) {
        window.location.href = '/sign-in'
        return
      }
      setWorkspace((current) => ({
        ...current,
        messages: [
          ...current.messages,
          {
            id: makeId(),
            role: 'agent',
            text: data.error ?? 'GitHub connect is not configured for this deployment.',
          },
        ],
      }))
    } catch {
      setWorkspace((current) => ({
        ...current,
        messages: [
          ...current.messages,
          {
            id: makeId(),
            role: 'agent',
            text: 'GitHub connect failed. You can still export the workspace locally.',
          },
        ],
      }))
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {!studioOpen ? (
        <Landing
          onOpen={() => setStudioOpen(true)}
          onGithub={connectGithub}
          githubConnected={githubConnected}
          onMode={(mode) => {
            setActiveMode(mode)
            const stack = modes.find((m) => m.title === mode)
            if (stack?.stackId) {
              setWorkspace((current) => ({
                ...current,
                files: filesForStack(stack.stackId),
                messages: [
                  ...current.messages,
                  {
                    id: makeId(),
                    role: 'agent',
                    text: `Switched workspace to ${mode}. Seed files are ready — describe what to build.`,
                  },
                ],
              }))
            }
            setStudioOpen(true)
          }}
        />
      ) : (
        <Studio
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          workspace={workspace}
          setWorkspace={setWorkspace}
          onSend={sendMessage}
          busy={busy}
          onClose={() => setStudioOpen(false)}
          syncState={syncState}
          githubConnected={githubConnected}
          onGithub={connectGithub}
          netlifyConfigured={netlifyConfigured}
        />
      )}
    </main>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex items-center gap-4'}>
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-xl font-semibold tracking-tight text-primary-foreground">
        N
      </div>
      <span className="font-mono text-sm font-medium tracking-[0.38em] text-foreground">NEXORA</span>
    </div>
  )
}

function Landing({
  onOpen,
  onGithub,
  githubConnected,
  onMode,
}: {
  onOpen: () => void
  onGithub: () => void
  githubConnected: boolean
  onMode: (mode: string) => void
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Brand />
        <button
          className="touch-target rounded-full border border-border p-3 text-muted-foreground transition hover:bg-card hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>
      <section className="flex flex-1 flex-col justify-center py-16 sm:py-24">
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Autonomous build studio
        </p>
        <h1 className="max-w-3xl text-pretty font-serif text-[clamp(3.4rem,12vw,7.2rem)] leading-[0.92] tracking-[-0.06em] text-foreground">
          Build in conversation.
          <br />
          <span className="text-muted-foreground">Ship from your pocket.</span>
        </h1>
        <p className="mt-10 max-w-xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
          Build TypeScript, Python, React, Next.js, Vite, and Vue — from chat. Import GitHub, deploy to
          Netlify, export when ready.
        </p>
      </section>
      <section className="space-y-3" aria-label="Build modes">
        {modes.map(({ title, detail, icon: Icon }) => (
          <button
            key={title}
            onClick={() => onMode(title)}
            className="group flex min-h-[92px] w-full items-center justify-between rounded-[28px] border border-border bg-card px-6 text-left transition hover:border-foreground/30 hover:bg-secondary sm:px-8"
          >
            <span className="flex items-center gap-4">
              <Icon className="size-5 text-muted-foreground" />
              <span>
                <span className="block text-xl tracking-tight">{title}</span>
                <span className="mt-1 block text-base text-muted-foreground">{detail}</span>
              </span>
            </span>
            <ChevronRight className="size-7 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
          </button>
        ))}
      </section>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          onClick={onOpen}
          className="touch-target flex min-h-16 items-center justify-center rounded-full bg-primary px-6 text-lg text-primary-foreground transition hover:brightness-110"
        >
          <Sparkles className="mr-3 size-5" />
          Open studio
        </button>
        <button
          onClick={onGithub}
          className="touch-target flex min-h-16 items-center justify-center rounded-full border border-border bg-card px-6 text-lg transition hover:bg-secondary"
        >
          <GitBranch className="mr-3 size-5" />
          {githubConnected ? 'GitHub connected' : 'Import a GitHub repo'}
        </button>
      </div>
      <p className="mt-8 pb-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        TS · Python · React · Next.js · Vite · Vue
      </p>
    </div>
  )
}

function Studio({
  activeMode,
  setActiveMode,
  workspace,
  setWorkspace,
  onSend,
  busy,
  onClose,
  syncState,
  githubConnected,
  onGithub,
  netlifyConfigured,
}: {
  activeMode: string
  setActiveMode: (value: string) => void
  workspace: WorkspaceState
  setWorkspace: React.Dispatch<React.SetStateAction<WorkspaceState>>
  onSend: (text: string) => void
  busy: boolean
  onClose: () => void
  syncState: 'local' | 'syncing' | 'synced' | 'error'
  githubConnected: boolean
  onGithub: () => void
  netlifyConfigured: boolean
}) {
  const [panel, setPanel] = useState<Panel>('chat')
  const [message, setMessage] = useState('')
  const [deploying, setDeploying] = useState(false)
  const selectedFile = workspace.project.selectedFile ?? workspace.files[0]?.path ?? 'app/page.tsx'
  const selectedWorkspaceFile = useMemo(() => workspace.files.find((file) => file.path === selectedFile) ?? workspace.files[0], [workspace.files, selectedFile])

  function submit() {
    if (busy) return
    onSend(message)
    setMessage('')
  }

  function exportProject() {
    downloadText('nexora-workspace.txt', exportWorkspace(workspace.files))
  }

  async function publishProject() {
    if (!githubConnected) {
      onGithub()
      return
    }
    const name = window.prompt('Repository name', 'nexora-project')
    if (!name) return
    const response = await fetch('/api/github', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'publish',
        name,
        files: Object.fromEntries(workspace.files.map((file) => [file.path, file.content ?? ''])),
      }),
    })
    const result = await response.json()
    if (result.repositoryUrl) window.open(result.repositoryUrl, '_blank', 'noopener,noreferrer')
    setWorkspace((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: makeId(),
          role: 'agent',
          text: result.repositoryUrl
            ? `Published ${result.files} files to ${result.repositoryUrl}.`
            : result.error ?? 'GitHub publishing failed.',
        },
      ],
    }))
  }

  async function deployToNetlify() {
    if (deploying) return
    const name = window.prompt('Netlify site name', `nexora-${Date.now().toString(36)}`)
    if (!name) return
    setDeploying(true)
    try {
      const response = await fetch('/api/netlify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'deploy',
          name,
          files: Object.fromEntries(workspace.files.map((file) => [file.path, file.content ?? ''])),
        }),
      })
      const result = await response.json()
      if (result.siteUrl || result.deployUrl) {
        window.open(result.siteUrl || result.deployUrl, '_blank', 'noopener,noreferrer')
      }
      setWorkspace((current) => ({
        ...current,
        messages: [
          ...current.messages,
          {
            id: makeId(),
            role: 'agent',
            text: result.ok
              ? `Deployed ${result.files} files to Netlify (${result.team}). Live: ${result.siteUrl || result.deployUrl}`
              : result.error ?? 'Netlify deploy failed.',
          },
        ],
        activity: current.activity.map((item) =>
          item.id === 'direction'
            ? {
                ...item,
                title: result.ok ? 'Netlify deploy ready' : 'Netlify deploy paused',
                detail: result.ok
                  ? result.siteUrl || result.deployUrl || 'Site created'
                  : result.extensionsUrl || 'Check NETLIFY_AUTH_TOKEN',
                state: result.ok ? 'done' : 'waiting',
              }
            : item,
        ),
      }))
    } catch {
      setWorkspace((current) => ({
        ...current,
        messages: [
          ...current.messages,
          {
            id: makeId(),
            role: 'agent',
            text: 'Netlify deploy failed. Set NETLIFY_AUTH_TOKEN for team agricoin8-debug.',
          },
        ],
      }))
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col bg-background lg:h-screen lg:overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <div className="flex items-center gap-5">
          <Brand compact />
          <span className="hidden border-l border-border pl-5 text-sm text-muted-foreground sm:block">
            Untitled build
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full bg-secondary px-3 py-2 font-mono text-xs text-muted-foreground sm:flex">
            <CircleDot className="size-3 text-emerald-400" />
            {busy ? 'Agent working' : 'Agent online'}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:px-3">
            <span className={`size-1.5 rounded-full ${syncState === 'synced' ? 'bg-primary' : syncState === 'error' ? 'bg-destructive' : 'bg-muted-foreground'}`} />
            <span className="hidden sm:inline">{syncState === 'syncing' ? 'Syncing' : syncState === 'synced' ? 'Neon synced' : syncState === 'error' ? 'Sync error' : 'Local mode'}</span>
            <span className="sm:hidden">{syncState === 'synced' ? 'Synced' : syncState === 'syncing' ? 'Sync' : 'Local'}</span>
          </span>
          <button
            onClick={onClose}
            className="touch-target rounded-full p-3 text-muted-foreground hover:bg-secondary"
            aria-label="Close studio"
          >
            <X size={19} />
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          className={`${panel === 'files' ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-b border-border p-4 lg:flex lg:w-64 lg:border-b-0 lg:border-r`}
        >
          <div className="mb-7 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Workspace</span>
            <button className="rounded-lg p-2 hover:bg-secondary" aria-label="Workspace settings">
              <Settings2 size={16} />
            </button>
          </div>
          <button className="mb-5 flex w-full items-center gap-3 rounded-xl bg-secondary p-3 text-left text-sm">
            <FolderGit2 className="size-4 text-muted-foreground" />
            <span className="truncate">{activeMode}</span>
            <MoreHorizontal className="ml-auto size-4 text-muted-foreground" />
          </button>
          <p className="mb-3 px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Files</p>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {workspace.files.map((file) => (
              <button
                key={file.path}
                onClick={() => setWorkspace((current) => ({ ...current, project: { ...current.project, selectedFile: file.path } }))}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                  file.path === selectedFile
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <Code2 className="size-4 shrink-0" />
                <span className="truncate">{file.path}</span>
              </button>
            ))}
          </div>
          {selectedWorkspaceFile ? (
            <div className="mt-5 flex min-h-48 flex-col rounded-2xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{selectedWorkspaceFile.path}</span>
                <span className="text-[10px] text-muted-foreground">editable</span>
              </div>
              <textarea
                value={selectedWorkspaceFile.content ?? ''}
                onChange={(event) => setWorkspace((current) => ({ ...current, files: current.files.map((file) => file.path === selectedWorkspaceFile.path ? { ...file, content: event.target.value, status: 'changed' } : file) }))}
                className="min-h-40 flex-1 resize-none bg-transparent font-mono text-xs leading-5 text-foreground outline-none"
                aria-label={`Edit ${selectedWorkspaceFile.path}`}
              />
            </div>
          ) : null}
          <div className="mt-8 space-y-2 border-t border-border pt-5">
            <button onClick={exportProject} className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-3 text-sm hover:bg-secondary">
              <Download className="size-4" />
              Download workspace
            </button>
            <button onClick={onGithub} className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-3 text-sm hover:bg-secondary">
              <GitBranch className="size-4" />
              {githubConnected ? 'GitHub connected' : 'Connect GitHub'}
            </button>
            <button onClick={deployToNetlify} disabled={deploying} className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-3 text-sm hover:bg-secondary disabled:opacity-50">
              <Globe className="size-4" />
              {deploying ? 'Deploying…' : netlifyConfigured ? 'Deploy to Netlify' : 'Configure Netlify'}
            </button>
          </div>
        </aside>
        <section className={`${panel === 'chat' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col border-b border-border lg:flex lg:border-b-0 lg:border-r`}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Stack</p>
              <select
                value={activeMode}
                onChange={(event) => {
                  const next = event.target.value
                  setActiveMode(next)
                  const stack = modes.find((m) => m.title === next)
                  if (stack?.stackId) {
                    setWorkspace((current) => ({
                      ...current,
                      files: filesForStack(stack.stackId),
                      messages: [
                        ...current.messages,
                        {
                          id: makeId(),
                          role: 'agent',
                          text: `Stack set to ${next}. Workspace seeded with ${next} starter files.`,
                        },
                      ],
                    }))
                  }
                }}
                className="mt-1 bg-transparent text-sm outline-none"
              >
                {modes.map((mode) => (
                  <option key={mode.title} className="bg-background" value={mode.title}>
                    {mode.title}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={publishProject} className="touch-target rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-secondary">
              <Upload className="mr-2 inline size-4" />
              Publish
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-end overflow-y-auto p-4 sm:p-7">
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="agent-live flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Bot size={19} />
              </div>
              <div>
                <p className="text-sm font-medium">Nexora agent</p>
                <p className="text-xs text-muted-foreground">{busy ? 'Planning, writing, testing…' : `${activeMode} · ready`}</p>
              </div>
              <Check className="ml-auto size-4 text-primary" />
            </div>
            <div className="space-y-5">
              {workspace.messages.map((item) => (
                <div
                  key={item.id}
                  className={
                    item.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-3 text-sm text-background'
                      : 'max-w-[92%] rounded-2xl rounded-bl-md bg-card px-4 py-3 text-sm leading-6 text-foreground'
                  }
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-border p-4 sm:p-6">
            <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                    event.preventDefault()
                    submit()
                  }
                }}
                rows={2}
                placeholder={`Describe a ${activeMode} project to build…`}
                disabled={busy}
                className="min-h-14 w-full resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="font-mono text-[10px] text-muted-foreground">Shift + Enter for a new line</span>
                <button onClick={submit} disabled={busy || !message.trim()} className="touch-target flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:brightness-110 disabled:opacity-40" aria-label="Send message">
                  <Send size={17} />
                </button>
              </div>
            </div>
          </div>
        </section>
        <aside className={`${panel === 'activity' || panel === 'more' ? 'flex' : 'hidden'} w-full shrink-0 flex-col p-5 xl:flex xl:w-80`}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Live activity</p>
            <span className="size-2 rounded-full bg-primary" />
          </div>
          <div className="mt-6 space-y-5">
            {workspace.activity.map((item) => (
              <Activity key={item.id} item={item} />
            ))}
          </div>
          <div className="mt-10 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-medium">Bring your repo</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Connect GitHub to import context or export this build into a new public repository.</p>
              <button onClick={onGithub} className="mt-4 flex w-full items-center justify-center rounded-xl bg-foreground py-3 text-sm text-background">
                <Upload className="mr-2 size-4" />
                {githubConnected ? 'Repository ready' : 'Connect GitHub'}
              </button>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-medium">Ship on Netlify</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Deploy this workspace to team <span className="font-mono text-xs">agricoin8-debug</span>.
              </p>
              <button onClick={deployToNetlify} disabled={deploying} className="mt-4 flex w-full items-center justify-center rounded-xl border border-border py-3 text-sm hover:bg-secondary disabled:opacity-50">
                <Globe className="mr-2 size-4" />
                {deploying ? 'Deploying…' : netlifyConfigured ? 'Deploy to Netlify' : 'Set NETLIFY_AUTH_TOKEN'}
              </button>
              <a href="https://app.netlify.com/teams/agricoin8-debug/extensions" target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs text-muted-foreground underline">
                Open team extensions
              </a>
            </div>
          </div>
        </aside>
      </div>
      <nav className="grid h-16 shrink-0 grid-cols-4 border-t border-border bg-background lg:hidden">
        <NavItem active={panel === 'chat'} onClick={() => setPanel('chat')} icon={<Sparkles />} label="Build" />
        <NavItem active={panel === 'files'} onClick={() => setPanel('files')} icon={<FolderGit2 />} label="Files" />
        <NavItem active={panel === 'activity'} onClick={() => setPanel('activity')} icon={<CircleDot />} label="Activity" />
        <NavItem active={panel === 'more'} onClick={() => setPanel('more')} icon={<MoreHorizontal />} label="More" />
      </nav>
    </div>
  )
}

function Activity({ item }: { item: ActivityItem }) {
  return (
    <div className="flex gap-3">
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${item.state === 'done' ? 'bg-secondary text-foreground' : 'border border-border text-muted-foreground'}`}>
        <CircleDot className={`size-4 ${item.state === 'active' ? 'animate-pulse text-primary' : ''}`} />
      </div>
      <div>
        <p className="text-sm">{item.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
      </div>
    </div>
  )
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 text-[10px] ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
      {icon}
      <span>{label}</span>
    </button>
  )
}
