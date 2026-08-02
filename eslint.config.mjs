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
    // Vendored Claude Design export — not our code, not lintable.
    "web-designs/**",
    // Supabase CLI's local runtime state (edge-runtime bootstrap script etc).
    "supabase/.temp/**",
    // Standalone Plasmo project, own package.json/tsconfig/build, not part of this app.
    "extension/**",
  ]),
]);

export default eslintConfig;
