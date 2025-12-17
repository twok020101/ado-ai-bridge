/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["**/test/unit/**/*.test.ts"],
	moduleFileExtensions: ["ts", "js"],
	coverageDirectory: "coverage",
	collectCoverageFrom: ["src/**/*.ts", "!src/test/**"],
	verbose: true,
	moduleNameMapper: {
		"^vscode$": "<rootDir>/test/unit/mocks/vscode.ts",
	},
};
