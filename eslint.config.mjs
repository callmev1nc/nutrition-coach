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
  {
    rules: {
      // This app fetches data on mount with the standard
      // `useEffect(() => loadData())` pattern (where loadData calls setState)
      // across every page. The newer react-hooks/set-state-in-effect rule
      // flags that as an error, but it is a correct, working pattern here and
      // refactoring every page to a data library is out of scope. Disabled
      // deliberately; revisit when adopting SWR/React Query.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
