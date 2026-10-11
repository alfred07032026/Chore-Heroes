// Dynamic layer over app.json.
// Release builds (EAS "preview" and "production" profiles) block Android's network
// permissions entirely, so the shipped app physically cannot make network requests.
// Development builds and local `expo run` keep them: the dev client must reach Metro.
const RELEASE_VARIANTS = ['preview', 'production'];

module.exports = ({ config }) => {
  if (!RELEASE_VARIANTS.includes(process.env.APP_VARIANT)) {
    return config;
  }
  return {
    ...config,
    android: {
      ...config.android,
      blockedPermissions: [
        ...(config.android?.blockedPermissions ?? []),
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
      ],
    },
  };
};
