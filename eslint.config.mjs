import nextConfig from "eslint-config-next";

// The React Compiler rules included in eslint-config-next are experimental and
// produce false positives on legitimate patterns (timer-driven state resets,
// render-local counters, ref mutations). Keep only the two stable rules.
const EXPERIMENTAL_REACT_HOOKS_RULES = [
  "react-hooks/static-components",
  "react-hooks/use-memo",
  "react-hooks/preserve-manual-memoization",
  "react-hooks/incompatible-library",
  "react-hooks/immutability",
  "react-hooks/globals",
  "react-hooks/refs",
  "react-hooks/set-state-in-effect",
  "react-hooks/error-boundaries",
  "react-hooks/purity",
  "react-hooks/set-state-in-render",
  "react-hooks/unsupported-syntax",
  "react-hooks/config",
  "react-hooks/gating",
];

const overrides = {
  rules: Object.fromEntries(EXPERIMENTAL_REACT_HOOKS_RULES.map((r) => [r, "off"])),
};

const config = [...nextConfig, overrides];
export default config;
