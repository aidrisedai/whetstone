import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      // These three rules are from the React 19 Compiler lint plugin and are
      // designed for codebases using `withReactCompiler`. This project does not
      // use the Compiler, and the rules produce false positives on valid patterns
      // (useMemo with Math.random, local counters in map, ref mutations, and
      // SSR-safe capability-detection in useEffect).
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
