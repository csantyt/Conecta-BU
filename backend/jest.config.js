/** @type {import("jest").Config} */
const config = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  resolver: "<rootDir>/tests/jestResolver.cjs",
  forceExit: true,
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: false },
          target: "es2022",
        },
      },
    ],
  },
};

export default config;
