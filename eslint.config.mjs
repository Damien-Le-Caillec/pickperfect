import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Textes en français : les apostrophes dans le JSX sont volontaires
      "react/no-unescaped-entities": "off",
      // Images utilisateur de domaines arbitraires : next/image n'est pas adapté ici
      "@next/next/no-img-element": "off",
      // Chargement de données au montage (fetch puis setState) : pattern volontaire,
      // signalé en avertissement seulement
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
