# Building & installing Chore Heroes

This guide is for the app owner. It covers exactly what to do to get an **Android APK** and an
**iPad build on TestFlight** using Expo's cloud build service (EAS). No Mac or Android Studio is
needed — builds run in Expo's cloud.

> Commands below use `eas …`. Install the CLI once with `npm install -g eas-cli`, or prefix
> every command with `npx eas-cli@latest` instead.

---

## 0. One-time prerequisites

1. Install **Node.js 22 LTS** (or newer) and **git**.
2. Get the code and install dependencies:
   ```bash
   git clone <your repo URL> chore-heroes
   cd chore-heroes
   npm ci
   npm run verify        # typecheck + lint + tests — should all pass
   ```
3. **Choose your app identifiers now** (they can't be changed after you publish). Edit
   `app.json` and replace the placeholders with your own reverse-domain name:
   - `expo.ios.bundleIdentifier`: `com.choreheroes.app` → e.g. `com.yourname.choreheroes`
   - `expo.android.package`: `com.choreheroes.app` → e.g. `com.yourname.choreheroes`
4. Add a support e-mail at the bottom of `PRIVACY.md`.

## 1. Create an Expo account and access token

1. Sign up (free) at **https://expo.dev/signup**.
2. Log in from your terminal:
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. Link this project to your account (this writes `expo.extra.eas.projectId` into `app.json`
   and should be committed):
   ```bash
   eas init
   git add app.json && git commit -m "Link EAS project"
   ```
4. **Create an `EXPO_TOKEN`** (needed for CI or any non-interactive build):
   - expo.dev → click your avatar → **Account settings → Access tokens → Create token**.
   - Copy it once and store it as a secret, e.g. in your shell:
     ```bash
     export EXPO_TOKEN=paste-your-token-here
     ```
     or as a GitHub Actions secret named `EXPO_TOKEN`. With `EXPO_TOKEN` set, `eas` commands
     run without `eas login`.

## 2. Android APK (for testing on any Android tablet/phone)

```bash
eas build --profile preview --platform android
```

- First run only: answer **Yes** to "Generate a new Android Keystore?" — EAS stores it safely
  for you. (Keep using EAS so every future build is signed with the same key.)
- When the build finishes (≈10–20 min) you get a link and a QR code.
- On the Android device: open the link (or scan the QR), download the `.apk`, and allow
  "Install unknown apps" for your browser when prompted. Then open **Chore Heroes**.

The `preview` profile produces an installable **APK** with internal distribution. The release
build has no Internet permission at all — that's intentional (see PRIVACY.md).

## 3. Apple Developer Program (required for iPad)

1. Enroll at **https://developer.apple.com/programs/enroll/** (US$99/year). Use the Apple ID
   you want to own the app. Individual enrollment is fine.
2. Wait for the approval e-mail (usually within 48 hours). You can't build for iPad until
   it's active.

## 4. iPad build → TestFlight

```bash
eas build --platform ios
```

- This uses the **production** profile (the default). EAS asks you to log in with your Apple
  ID, then creates the distribution certificate and provisioning profile for you — answer
  **Yes** to the prompts.
- When it's done, submit the build to App Store Connect / TestFlight:
  ```bash
  eas submit --platform ios --latest
  ```
  The first time, EAS creates the app record in App Store Connect (the app name must be
  unique on the App Store — if "Chore Heroes" is taken, change `expo.name` in `app.json` or
  pick a different name when prompted) and asks to create an App Store Connect API key — say
  **Yes**.
  Tip: `eas build --platform ios --auto-submit` does build + submit in one step.
- Apple processes the build (≈5–30 min). You'll get an e-mail when it's ready.

### Install on your iPad via TestFlight

1. Go to **https://appstoreconnect.apple.com → Apps → Chore Heroes → TestFlight**.
2. Under **Internal Testing**, create a group, add yourself (and up to 100 people on your
   App Store Connect team), and add the build. Answer the export-compliance question if asked
   (the app declares it uses no non-exempt encryption).
3. On the iPad, install **TestFlight** from the App Store and sign in with the same Apple ID.
4. Open the invitation e-mail on the iPad (or open TestFlight) → **Install**.

### Alternative: install directly without TestFlight (ad hoc)

```bash
eas device:create                                  # register the iPad (open the link on the iPad)
eas build --profile preview --platform ios         # internal distribution build
```

Open the resulting link on the registered iPad to install.

## 5. Development builds (optional, for working on the code)

```bash
eas build --profile development --platform ios       # or android
npx expo start --dev-client
```

Install the dev build on the device, then it loads your local code live. For quick checks you
can also run `npx expo start` and open the project in **Expo Go** (SDK 57).

## 6. Store release (when you're ready)

**iOS (App Store, Kids Category)**

1. In App Store Connect, fill in the listing, screenshots (iPad 13" required), and:
   - **Age rating:** answer the questionnaire; choose **Made for Kids → Ages 6–8** (the
     closest Apple band; the app also suits 9-year-olds).
   - **App Privacy:** select **Data Not Collected**.
   - Privacy policy URL: host `PRIVACY.md` somewhere public (e.g. GitHub Pages) and paste the URL.
2. Submit the TestFlight build for review.

**Android (Google Play, Families)**

1. Create a Google Play Console developer account (US$25 one-time).
2. Build the store bundle: `eas build --platform android` (production profile → **AAB**).
3. Create the app in Play Console and upload the first AAB **manually** (Play requires this
   once). Afterwards `eas submit --platform android --latest` can upload for you (needs a Google
   service-account key — `eas submit` walks you through it).
4. **Target audience:** ages 6–8 and 9–12 → the app joins the **Families** program.
   **Data safety:** "No data collected", "No data shared". **Ads:** "No".

## Versioning

- `expo.version` in `app.json` is the user-visible version (e.g. `1.0.0`) — bump it for each
  store release.
- Build numbers are managed by EAS (`appVersionSource: remote`, `autoIncrement` in production).

## Troubleshooting

- `npx expo-doctor` checks the project; run it with internet access (two of its checks need
  the Expo API).
- "Bundle identifier is not available": someone else uses it — choose another in `app.json`.
- iPad shows an old build: delete the app, reinstall from TestFlight.
- Builds fail on credentials: `eas credentials` lets you inspect/reset them.
