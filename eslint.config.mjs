import tseslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import { importX } from "eslint-plugin-import-x";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefreshModule from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";

const tsFiles = ["src/**/*.{ts,tsx}"];
const reactFiles = ["src/react/**/*.tsx"];
const reactRefresh = reactRefreshModule.default ?? reactRefreshModule;

const scopeConfig = (config, files) => ({
	...config,
	files,
});

export default [
	{
		ignores: ["**/*.d.ts", "dist", "vditor"],
	},
	...tseslint.configs["flat/recommended"].map((config) => scopeConfig(config, tsFiles)),
	{
		files: tsFiles,
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		plugins: {
			"import-x": importX,
			"unused-imports": unusedImports,
		},
		settings: {
			...importX.flatConfigs.typescript.settings,
		},
		rules: {
			"unused-imports/no-unused-imports": "error",
			"@typescript-eslint/no-var-requires": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-require-imports": "off",
			"@typescript-eslint/no-this-alias": "off"
		},
	},
	scopeConfig(reactPlugin.configs.flat.recommended, reactFiles),
	scopeConfig(reactPlugin.configs.flat["jsx-runtime"], reactFiles),
	scopeConfig(reactHooks.configs.flat.recommended, reactFiles),
	scopeConfig(reactRefresh.configs.recommended, reactFiles),
	{
		files: reactFiles,
		settings: {
			react: {
				version: "19.2",
			},
		},
		rules: {
			"unused-imports/no-unused-imports": "error",
			"react/jsx-no-target-blank": "off",
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
		},
	},
];
