// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web ships a wasm build…
config.resolver.assetExts.push('wasm');

// …and needs SharedArrayBuffer, which browsers only allow on cross-origin-isolated pages.
// (Web is used for quick smoke checks only; the product targets iPad and Android.)
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = config;
