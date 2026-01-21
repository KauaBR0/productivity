# Android release checklist

## Prereqs
- Install EAS CLI: `npm i -g eas-cli`
- Authenticate: `eas login`

## Build (AAB for Play Store)
1) `npm install`
2) `npm run build:android`

## Build (APK for internal testing)
1) `npm install`
2) `npm run build:android:apk`

## Credentials
- EAS will prompt to generate or upload a keystore on first build.
- Store the keystore securely (do not lose it).

## Notes
- App ID: `com.kauaan.productivy`
- Ensure notification permissions are accepted on Android 13+ for alarms.
