// Learn more https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const sharedRoot = path.resolve(workspaceRoot, "shared");

const config = getDefaultConfig(projectRoot);

// Watch the shared/ directory that lives outside mobile/ so edits there
// trigger a rebuild, same contract as @shared/* in the web app's tsconfig.
config.watchFolders = [sharedRoot];

// Packages hoisted to the workspace root (npm workspaces) still need to
// resolve from inside mobile/.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];

config.resolver.extraNodeModules = {
  "@shared": sharedRoot
};

module.exports = config;
