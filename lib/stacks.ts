/** Supported build stacks for Nexora autonomous agent. */

export type StackId =
  | 'typescript'
  | 'python'
  | 'react'
  | 'nextjs'
  | 'vite'
  | 'vue'

export type StackMeta = {
  id: StackId
  title: string
  detail: string
  /** Default mode label shown in the studio */
  modeLabel: string
  /** Extensions the agent is expected to write for this stack */
  extensions: string[]
  /** Seed files when starting a blank workspace for this stack */
  seed: Record<string, string>
  /** Agent guidance appended to system instructions for this stack */
  guidance: string
}

export const STACKS: StackMeta[] = [
  {
    id: 'typescript',
    title: 'TypeScript',
    detail: 'Libraries, CLIs, types, and Node services',
    modeLabel: 'TypeScript',
    extensions: ['.ts', '.mts', '.cts', '.json', '.md'],
    seed: {
      'src/index.ts':
        "export function hello(name: string): string {\n  return `Hello, ${name}`\n}\n\nconsole.log(hello('Nexora'))\n",
      'tsconfig.json':
        '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "strict": true,\n    "outDir": "dist",\n    "rootDir": "src",\n    "declaration": true,\n    "skipLibCheck": true\n  },\n  "include": ["src"]\n}\n',
      'package.json':
        '{\n  "name": "nexora-typescript",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "build": "tsc",\n    "start": "node dist/index.js"\n  },\n  "devDependencies": {\n    "typescript": "^5.7.0"\n  }\n}\n',
      'README.md': '# TypeScript project\n\nScaffolded by Nexora.\n',
    },
    guidance:
      'Write idiomatic TypeScript with strict types. Prefer ESM, small pure functions, and clear module boundaries. Include tsconfig and package.json when scaffolding.',
  },
  {
    id: 'python',
    title: 'Python',
    detail: 'Scripts, APIs, data tools, and packages',
    modeLabel: 'Python',
    extensions: ['.py', '.toml', '.txt', '.md'],
    seed: {
      'main.py':
        'def main() -> None:\n    print("Hello from Nexora")\n\n\nif __name__ == "__main__":\n    main()\n',
      'requirements.txt': '# Add dependencies here\n',
      'pyproject.toml':
        '[project]\nname = "nexora-python"\nversion = "0.1.0"\nrequires-python = ">=3.11"\ndependencies = []\n',
      'README.md': '# Python project\n\nScaffolded by Nexora.\n',
    },
    guidance:
      'Write clean Python 3.11+ with type hints where useful. Prefer stdlib first, then well-known packages. Include requirements.txt or pyproject.toml. Never invent private APIs.',
  },
  {
    id: 'react',
    title: 'React',
    detail: 'Components, hooks, and client UIs',
    modeLabel: 'React',
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.css', '.json', '.md'],
    seed: {
      'src/App.tsx':
        "export default function App() {\n  return (\n    <main style={{ fontFamily: 'system-ui', padding: 24 }}>\n      <h1>Nexora React</h1>\n      <p>Edit src/App.tsx to get started.</p>\n    </main>\n  )\n}\n",
      'src/main.tsx':
        "import { createRoot } from 'react-dom/client'\nimport App from './App'\n\ncreateRoot(document.getElementById('root')!).render(<App />)\n",
      'index.html':
        '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Nexora React</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n',
      'package.json':
        '{\n  "name": "nexora-react",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  },\n  "dependencies": {\n    "react": "^19.0.0",\n    "react-dom": "^19.0.0"\n  },\n  "devDependencies": {\n    "@types/react": "^19.0.0",\n    "@types/react-dom": "^19.0.0",\n    "typescript": "^5.7.0",\n    "vite": "^6.0.0"\n  }\n}\n',
      'README.md': '# React project\n\nScaffolded by Nexora.\n',
    },
    guidance:
      'Build accessible React 19 components with TypeScript. Prefer function components and hooks. Keep state local unless sharing is required. Mobile-first CSS.',
  },
  {
    id: 'nextjs',
    title: 'Next.js',
    detail: 'App Router, server components, APIs',
    modeLabel: 'Next.js',
    extensions: ['.tsx', '.ts', '.css', '.json', '.md'],
    seed: {
      'app/page.tsx':
        "export default function Page() {\n  return (\n    <main style={{ fontFamily: 'system-ui', padding: 24 }}>\n      <h1>Nexora Next.js</h1>\n      <p>App Router starter.</p>\n    </main>\n  )\n}\n",
      'app/layout.tsx':
        "import type { ReactNode } from 'react'\n\nexport const metadata = { title: 'Nexora Next.js' }\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>{children}</body>\n    </html>\n  )\n}\n",
      'app/api/hello/route.ts':
        "export async function GET() {\n  return Response.json({ ok: true, message: 'Hello from Nexora' })\n}\n",
      'package.json':
        '{\n  "name": "nexora-nextjs",\n  "private": true,\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start"\n  },\n  "dependencies": {\n    "next": "^15.0.0",\n    "react": "^19.0.0",\n    "react-dom": "^19.0.0"\n  },\n  "devDependencies": {\n    "@types/node": "^22.0.0",\n    "@types/react": "^19.0.0",\n    "typescript": "^5.7.0"\n  }\n}\n',
      'tsconfig.json':
        '{\n  "compilerOptions": {\n    "target": "ES2017",\n    "lib": ["dom", "dom.iterable", "esnext"],\n    "allowJs": true,\n    "skipLibCheck": true,\n    "strict": true,\n    "noEmit": true,\n    "module": "esnext",\n    "moduleResolution": "bundler",\n    "jsx": "preserve",\n    "incremental": true,\n    "plugins": [{ "name": "next" }],\n    "paths": { "@/*": ["./*"] }\n  },\n  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],\n  "exclude": ["node_modules"]\n}\n',
      'README.md': '# Next.js project\n\nScaffolded by Nexora (App Router).\n',
    },
    guidance:
      'Use Next.js App Router. Prefer Server Components by default; mark client components with "use client" only when needed. Put API routes under app/api. TypeScript strict. Mobile-first UI.',
  },
  {
    id: 'vite',
    title: 'Vite',
    detail: 'Fast SPA tooling with Vite + TS',
    modeLabel: 'Vite',
    extensions: ['.tsx', '.ts', '.css', '.html', '.json', '.md'],
    seed: {
      'index.html':
        '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Nexora Vite</title>\n  </head>\n  <body>\n    <div id="app"></div>\n    <script type="module" src="/src/main.ts"></script>\n  </body>\n</html>\n',
      'src/main.ts':
        "const app = document.querySelector<HTMLDivElement>('#app')!\napp.innerHTML = `<h1>Nexora Vite</h1><p>Edit src/main.ts</p>`\n",
      'vite.config.ts':
        "import { defineConfig } from 'vite'\n\nexport default defineConfig({\n  server: { port: 5173 },\n})\n",
      'package.json':
        '{\n  "name": "nexora-vite",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "preview": "vite preview"\n  },\n  "devDependencies": {\n    "typescript": "^5.7.0",\n    "vite": "^6.0.0"\n  }\n}\n',
      'tsconfig.json':
        '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "ESNext",\n    "moduleResolution": "Bundler",\n    "strict": true,\n    "lib": ["ES2022", "DOM"]\n  },\n  "include": ["src"]\n}\n',
      'README.md': '# Vite project\n\nScaffolded by Nexora.\n',
    },
    guidance:
      'Use Vite for fast local dev. Prefer TypeScript entrypoints, ESM, and minimal config. When pairing with React or Vue, keep framework files in src/ and configure the matching Vite plugin.',
  },
  {
    id: 'vue',
    title: 'Vue',
    detail: 'SFCs, Composition API, Vite + Vue',
    modeLabel: 'Vue',
    extensions: ['.vue', '.ts', '.css', '.html', '.json', '.md'],
    seed: {
      'src/App.vue':
        '<script setup lang="ts">\nconst title = "Nexora Vue"\n</script>\n\n<template>\n  <main class="page">\n    <h1>{{ title }}</h1>\n    <p>Edit src/App.vue to get started.</p>\n  </main>\n</template>\n\n<style scoped>\n.page {\n  font-family: system-ui, sans-serif;\n  padding: 1.5rem;\n}\n</style>\n',
      'src/main.ts':
        "import { createApp } from 'vue'\nimport App from './App.vue'\n\ncreateApp(App).mount('#app')\n",
      'index.html':
        '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Nexora Vue</title>\n  </head>\n  <body>\n    <div id="app"></div>\n    <script type="module" src="/src/main.ts"></script>\n  </body>\n</html>\n',
      'vite.config.ts':
        "import { defineConfig } from 'vite'\nimport vue from '@vitejs/plugin-vue'\n\nexport default defineConfig({\n  plugins: [vue()],\n})\n",
      'package.json':
        '{\n  "name": "nexora-vue",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  },\n  "dependencies": {\n    "vue": "^3.5.0"\n  },\n  "devDependencies": {\n    "@vitejs/plugin-vue": "^5.0.0",\n    "typescript": "^5.7.0",\n    "vite": "^6.0.0"\n  }\n}\n',
      'README.md': '# Vue project\n\nScaffolded by Nexora (Composition API).\n',
    },
    guidance:
      'Use Vue 3 Composition API with <script setup lang="ts">. Prefer single-file components. Pair with Vite and @vitejs/plugin-vue. Keep templates accessible and mobile-friendly.',
  },
]

export function stackByModeLabel(mode: string): StackMeta | undefined {
  const normalized = mode.trim().toLowerCase()
  return STACKS.find(
    (stack) =>
      stack.modeLabel.toLowerCase() === normalized ||
      stack.id === normalized ||
      stack.title.toLowerCase() === normalized,
  )
}

export function detectStackFromPrompt(prompt: string): StackMeta | undefined {
  const p = prompt.toLowerCase()
  if (/\bnext(\.?js)?\b/.test(p) || /app router/.test(p)) return STACKS.find((s) => s.id === 'nextjs')
  if (/\bvue\b|nuxt/.test(p)) return STACKS.find((s) => s.id === 'vue')
  if (/\bvite\b/.test(p) && !/\bvue\b/.test(p) && !/\breact\b/.test(p)) return STACKS.find((s) => s.id === 'vite')
  if (/\breact\b/.test(p)) return STACKS.find((s) => s.id === 'react')
  if (/\bpython\b|\.py\b|fastapi|flask|django/.test(p)) return STACKS.find((s) => s.id === 'python')
  if (/\btypescript\b|\bts\b|node(\.?js)? service|express/.test(p)) return STACKS.find((s) => s.id === 'typescript')
  return undefined
}

export function kindFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    tsx: 'tsx',
    ts: 'ts',
    jsx: 'jsx',
    js: 'js',
    vue: 'vue',
    py: 'py',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'md',
    toml: 'toml',
    txt: 'txt',
    mts: 'ts',
    cts: 'ts',
  }
  return map[ext] || 'file'
}
