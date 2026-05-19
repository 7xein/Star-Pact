module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest", {
      jsc: {
        parser: { syntax: "typescript", tsx: true },
        target: "es2022",
      },
      module: { type: "commonjs" },
    }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@prisma/client)/)",
  ],
};
