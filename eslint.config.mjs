import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  ...nextConfig,
  {
    rules: {
      // ── React Compiler rules (React 19 / eslint-plugin-react-hooks v6+) ──
      //
      // These rules target code that the React Compiler would reject, but many
      // of the patterns they flag are idiomatic and correct in a non-compiled
      // app. They are disabled here until the Compiler is opted in.

      // Flags Math.random / Date.now inside components. Fixed by moving to
      // module scope (done for Confetti). Left off for the remaining cases
      // (e.g. local render accumulators like `seen += 1` in Caption) which are
      // valid and don't cause real hydration issues.
      "react-hooks/purity": "off",

      // Flags direct mutations of useRef values and reassignment of plain
      // local variables during render. Both are correct JS patterns; useRef
      // mutations are explicitly what refs are for.
      "react-hooks/immutability": "off",

      // Flags setState() calls at the top level of a useEffect body. Many of
      // these are legitimate "sync React state from an external browser API"
      // patterns (feature detection, speech-recognition transcript sync,
      // browser-speech-synthesis state). The rule is too strict for them.
      "react-hooks/set-state-in-effect": "off",

      // ── Next.js false-positive ──
      // The no-page-custom-font rule targets pages/_document.js (Pages
      // Router). This project uses the App Router where next/font is loaded
      // correctly in layout.tsx.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
