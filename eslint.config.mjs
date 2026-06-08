import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

// Minimal stubs so inline eslint-disable-next-line comments for Next.js /
// React plugins are recognized (the real plugins have peer-dep conflicts with
// this project's cutting-edge dependency versions).
const stubPlugin = (ruleNames) => ({
  rules: Object.fromEntries(ruleNames.map((n) => [n, { create: () => ({}) }])),
});

const nodeGlobals = {
  process: "readonly",
  Buffer: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
};

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  console: "readonly",
  fetch: "readonly",
  Request: "readonly",
  Response: "readonly",
  ReadableStream: "readonly",
  TextEncoder: "readonly",
  TextDecoder: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  localStorage: "readonly",
  AudioContext: "readonly",
  Blob: "readonly",
  File: "readonly",
  FileList: "readonly",
  FileReader: "readonly",
  HTMLAudioElement: "readonly",
  HTMLButtonElement: "readonly",
  HTMLDivElement: "readonly",
  HTMLInputElement: "readonly",
  HTMLIFrameElement: "readonly",
  HTMLTextAreaElement: "readonly",
  SVGSVGElement: "readonly",
  SpeechRecognition: "readonly",
  SpeechSynthesis: "readonly",
  SpeechSynthesisUtterance: "readonly",
  SpeechSynthesisVoice: "readonly",
};

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: { ...nodeGlobals, ...browserGlobals },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      // Stubs so inline eslint-disable-next-line comments don't error.
      "react-hooks": stubPlugin(["exhaustive-deps", "rules-of-hooks"]),
      react: stubPlugin(["no-danger"]),
      "@next/next": stubPlugin(["no-img-element", "no-html-link-for-pages"]),
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      // Stub rules from missing plugins — disabled, just need to be declared.
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
      "react/no-danger": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
];
