import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import stylistic from "@stylistic/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

export default defineConfig([
  // TypeScript core rules
  ...tseslint.configs.recommended,
  // React best practices
  pluginReact.configs.flat.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "@stylistic": stylistic,
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: false,
      },
    },
    rules: {
      "@stylistic/indent": ["error", 2],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
  // Allow @ts-nocheck temporarily for migration files
  "@typescript-eslint/ban-ts-comment": ["error", { "ts-nocheck": false }],
    },
    settings: {
      react: { version: "detect" },
    },
  },
  eslintConfigPrettier,
]);
