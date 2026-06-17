import nextConfig from "eslint-config-next/core-web-vitals";

// The @typescript-eslint plugin is provided by eslint-config-next (index 1).
// Re-use it so we can add rules without re-declaring the plugin.
const tsPlugin = nextConfig.find((c) => c.plugins?.["@typescript-eslint"])?.plugins?.[
  "@typescript-eslint"
];

const hooksPlugin = nextConfig.find((c) => c.plugins?.["react-hooks"])?.plugins?.[
  "react-hooks"
];

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextConfig,
  ...(tsPlugin
    ? [
        {
          plugins: { "@typescript-eslint": tsPlugin },
          rules: { "@typescript-eslint/no-explicit-any": "error" },
        },
      ]
    : []),
  ...(hooksPlugin
    ? [
        {
          plugins: { "react-hooks": hooksPlugin },
          rules: {
            // Calling setState inside useEffect is the correct pattern for
            // browser-feature detection and syncing external state to React.
            "react-hooks/set-state-in-effect": "off",
            // These strict React 19 rules flag valid patterns:
            // - useRef property mutation (refs are explicitly mutable by design)
            // - local counter variables in .map() (widely accepted render pattern)
            "react-hooks/purity": "off",
            "react-hooks/immutability": "off",
          },
        },
      ]
    : []),
];

export default config;
