// Dynamic layer over app.json.
// Release builds (preview / production) block Android's network permissions entirely,
// so the shipped app physically cannot make network requests. Development builds keep
// them because the dev client must talk to the Metro bundler.
module.exports = ({ config }) => {
  const isDevBuild = process.env.APP_VARIANT === 'development';
  if (isDevBuild) {
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
