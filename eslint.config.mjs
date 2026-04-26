import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Project overrides: keep lint useful (bugs), not blocking on stylistic/react-hooks ideology rules.
  {
    rules: {
      // These trigger on common Next.js patterns (redirects, bootstrap loads, etc.).
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",

      // This repo uses static/public pages + plain anchors in several places.
      "@next/next/no-html-link-for-pages": "off",

      // Allow gradual typing improvements without blocking builds.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
