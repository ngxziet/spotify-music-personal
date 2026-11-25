<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## SoundWave web and Android

- This repo is `ngxziet/spotify-music-personal`. The production site at `https://spotify-music-personal.vercel.app` supplies the interface and API to both the browser and the Android APK.
- Keep web changes compatible with already installed APKs. The bridge protocol is shared by `src/utils/androidPlayback.ts` and `MainActivity.java` under `android/app/src/main/java/com/soundwave/music/`. Keep working commands and response fields when adding capabilities. Expose the bridge only to the trusted SoundWave origin and its main frame.
- Keep Android playback and queue progression in Media3's `PlaybackService` so they work while the WebView is in the background. Use full tracks with direct audio URLs for new catalog sources. Keep legacy video and preview entries in saved collections and send listeners to audio search when they select one.
- Keep the version endpoint in `src/app/api/app-version/route.ts` uncached. `AndroidWebUpdates.tsx` checks it against the loaded deployment and reloads when the app is idle, so web updates can arrive without an APK reinstall.

## Builds and releases

- Run `npm run build` for web changes. For Android changes, run `android/gradlew -p android :app:assembleDebug` or `.\android\gradlew.bat -p android :app:assembleDebug` on Windows. When changing playback, verify that audio continues with the screen off and that the system media controls can pause and advance the queue.
- Pushes to `master` deploy the web app to Vercel. Changes under `android/` or to `.github/workflows/android.yml` on `master` also trigger the signed APK release workflow. The stable download URL is `https://github.com/ngxziet/spotify-music-personal/releases/latest/download/SoundWave.apk`.
- Keep `com.soundwave.music` as the Android application ID and preserve the signing key and increasing `versionCode` across releases so Android can install updates over previous builds. The release workflow reads signing material from GitHub Secrets. Keep keystores and passwords out of the repo and logs.
