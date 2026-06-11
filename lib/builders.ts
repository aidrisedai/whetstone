/**
 * The "connected AI builder" Whetstone exports a sharpened prompt to. Each
 * target is a deep link that prefills the builder with the refined prompt.
 * Operators pick the default via WHETSTONE_BUILDER and can additionally wire a
 * server-to-server BUILDER_WEBHOOK_URL for a true automatic hand-off.
 */
export interface BuilderTarget {
  key: string;
  name: string;
  tagline: string;
  buildUrl: (prompt: string) => string;
}

export const BUILDERS: Record<string, BuilderTarget> = {
  bolt: {
    key: "bolt",
    name: "Bolt.new",
    tagline: "Prompt-to-app, right in the browser",
    buildUrl: (p) => `https://bolt.new/?prompt=${encodeURIComponent(p)}`,
  },
  v0: {
    key: "v0",
    name: "v0",
    tagline: "Generative UI by Vercel",
    buildUrl: (p) => `https://v0.dev/chat?q=${encodeURIComponent(p)}`,
  },
  lovable: {
    key: "lovable",
    name: "Lovable",
    tagline: "Build full-stack apps by chatting",
    buildUrl: (p) => `https://lovable.dev/?prompt=${encodeURIComponent(p)}`,
  },
  claude: {
    key: "claude",
    name: "Claude",
    tagline: "Build it with Claude",
    buildUrl: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
  },
};

export function getBuilder(key?: string | null): BuilderTarget {
  return (key && BUILDERS[key]) || BUILDERS.bolt;
}

export function activeBuilder(): BuilderTarget {
  return getBuilder(process.env.WHETSTONE_BUILDER);
}
