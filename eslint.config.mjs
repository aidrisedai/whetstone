import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Request: "readonly",
        Response: "readonly",
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        FormData: "readonly",
        navigator: "readonly",
        document: "readonly",
        window: "readonly",
        localStorage: "readonly",
        AudioContext: "readonly",
        SpeechRecognition: "readonly",
        webkitSpeechRecognition: "readonly",
        SpeechSynthesisUtterance: "readonly",
        HTMLAudioElement: "readonly",
        HTMLElement: "readonly",
        HTMLIFrameElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLDivElement: "readonly",
        Event: "readonly",
        MouseEvent: "readonly",
        KeyboardEvent: "readonly",
        InputEvent: "readonly",
        ReadableStream: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        Buffer: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        FileList: "readonly",
        SVGSVGElement: "readonly",
        SpeechSynthesisVoice: "readonly",
        React: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: { version: "19" },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      globals: { describe: "readonly", it: "readonly", expect: "readonly", beforeEach: "readonly" },
    },
  },
  {
    ignores: ["node_modules/", ".next/", "coverage/"],
  },
];
