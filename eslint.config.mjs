import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Dropdown: không dùng <select> mặc định của browser — dùng component có sẵn.
  {
    files: ["**/*.{jsx,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXOpeningElement[name.name='select']",
          message:
            "Không dùng <select> mặc định. Dùng SearchableSelect (@/components/ui/SearchableSelect) hoặc FilterSearchableSelect / FilterMultiSelect (@/components/ui/filters).",
        },
      ],
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
