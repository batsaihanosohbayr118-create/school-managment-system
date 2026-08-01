// Learn more https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const sharedRoot = path.resolve(workspaceRoot, "shared");

const config = getDefaultConfig(projectRoot);

// Watch the shared/ directory that lives outside mobile/ so edits there
// trigger a rebuild, same contract as @shared/* in the web app's tsconfig.
// Appended, not assigned: getDefaultConfig() already populates watchFolders
// with its own npm-workspace detection, and overwriting that (rather than
// adding to it) is what expo-doctor's Metro config check warns against.
config.watchFolders = [...(config.watchFolders ?? []), sharedRoot];

// Packages hoisted to the workspace root (npm workspaces) still need to
// resolve from inside mobile/.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];

config.resolver.extraNodeModules = {
  "@shared": sharedRoot
};

// The web app at the workspace root also depends on react/react-dom, so
// npm's hoisting can leave a second copy in the root node_modules. A
// package resolved from there (e.g. @react-navigation/native, which isn't
// nested under mobile/node_modules) then requires *that* React instead of
// mobile's — two React copies loaded in one bundle, which breaks hooks with
// "Invalid hook call". extraNodeModules alone doesn't fix this: it's only
// consulted when the normal lookup *fails*, and the root copy is a
// successful (if wrong) resolution for anything not nested under mobile/.
// Force it: resolve react/react-dom as if the request always originated
// from mobile/ itself, so hierarchical lookup finds mobile's copy first
// regardless of which file actually did the requiring.
const singletonPackages = ["react", "react-dom"];
// Subpaths (react-dom/client, react/jsx-runtime, ...) are separate moduleName
// strings, not "react"/"react-dom" — a plain Set.has() missed them, so
// react-dom/client (used by the web entry point) still escaped to root's
// copy while react itself was correctly forced to mobile's, mismatching the
// two at runtime ("Incompatible React versions").
function isSingletonModule(moduleName) {
  return singletonPackages.some((pkg) => moduleName === pkg || moduleName.startsWith(`${pkg}/`));
}
// A fake file *inside* projectRoot, not projectRoot itself: Metro's resolver
// does path.dirname(originModulePath) to find the requesting directory, so
// passing the directory itself would resolve one level too high.
const originModulePath = path.join(projectRoot, "metro.config.js");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isSingletonModule(moduleName)) {
    return context.resolveRequest({ ...context, originModulePath }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
