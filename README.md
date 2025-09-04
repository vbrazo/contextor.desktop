# Contextor Desktop

Contextor is a cross‑platform Electron application that captures on‑screen context (screenshots) and audio (microphone and system audio), analyzes it, and provides conversational, actionable insights through a clean React UI. It showcases full‑stack desktop engineering across Electron main/preload/renderer processes, secure IPC, audio routing/mixing, and authenticated API integration.

## Highlights

- **Contextual assistant**: Combine screenshots, recorded audio, and chat to get targeted insights.
- **Audio pipeline**: Loopback system audio, capture microphone, mix streams, apply echo cancellation, and playback.
- **Typed IPC surface**: Secure bridge from renderer to main via `contextBridge` with a well‑defined API.
- **Modern UI**: React + TypeScript with a componentized chat panel that renders Markdown and media.
- **Production‑ready**: Hot reload in development, packaged builds for distribution.

## Architecture

The app follows Electron’s three‑tier model with a focused, security‑first design:

- **Main process (`src/main.ts`)**
  - Owns application lifecycle and window management.
  - Handles privileged operations: screen capture, audio routing/recording, auth/session state, deep links, and system integrations.
  - Registers IPC handlers that the preload exposes to the renderer.

- **Preload (`src/preload.ts`)**
  - Runs in an isolated context and exposes a curated API on `window.api` using `contextBridge`.
  - Example capabilities exposed to the renderer:
    - Window control: `resizeWindow`, `setWindowSize`, `moveWindow`.
    - Context events: `onScreenshotAnalysis`, `onAudioWithAnalysis`, `onLoadingUpdate`.
    - Audio controls: `enableSystemAudioLoopback`, `startCombinedAudioRecording`, `stopCombinedAudioRecording`.
    - Audio config: `setAudioConfiguration`, `getAudioConfiguration` (echo cancellation, sensitivity, scenarios).
    - Conversation and chat: `createMessage`, `createScreenshotMessage`, `onChatResponse`.
    - Auth lifecycle: `onAuthCallback`, `onLogout`, `sendAuthTokenResponse`.

- **Renderer (`src/renderer/…`)**
  - React UI with a conversation‑centric experience.
  - Key component: `components/InsightsPanel.tsx` renders chat history, inlines screenshots, embeds audio players, and streams assistant responses.
  - Uses a small `apiService` to fetch conversation history and persist messages to the backend.

### Data Flow Overview

1. User triggers an action (send text, take screenshot, start mic/system recording) from the UI.
2. Renderer calls `window.api.*` methods exposed by the preload.
3. Main process performs the privileged work (capture, record, analyze, fetch) and emits results back over IPC.
4. Renderer updates the conversation with:
   - A screenshot message (image preview)
   - An audio message (embedded `<audio>` player with download)
   - A Markdown‑formatted assistant response

### Audio Subsystem

The audio architecture supports rich desktop scenarios:

- **System audio loopback**: Route OS output back into the app for analysis/mixing.
- **Microphone capture**: Record voice input concurrently with system audio.
- **Mixing and levels**: Merge streams and manage levels for clarity.
- **Echo control**: Enable echo cancellation with tunable sensitivity and listening scenarios.
- **Playback**: Render recorded clips with multiple codecs and support exporting.

Configuration is applied via the preload API, for example:

```ts
window.api.setAudioConfiguration({
  systemAudioEnabled: true,
  echoCancellationEnabled: true,
  echoCancellationSensitivity: 'medium',
  audioScenario: 'speakers',
  voiceRecordingMode: 'auto'
});
```

## Documentation

Deep‑dives and operational guides live alongside the codebase:

- [Audio Debug](./docs/AUDIO_DEBUG.md)
- [Audio Echo Fix](./docs/AUDIO_ECHO_FIX.md)
- [Audio Integration Guide](./docs/AUDIO_INTEGRATION_GUIDE.md)
- [Audio Mixing](./docs/AUDIO_MIXING.md)
- [Audio Playback](./docs/AUDIO_PLAYBACK.md)
- [Audio Troubleshooting](./docs/AUDIO_TROUBLESHOOTING.md)
- [Platform Audio Guide](./docs/PLATFORM_AUDIO_GUIDE.md)
- [Authentication](./docs/AUTHENTICATION.md)

## Getting Started

Prerequisites:

- Node.js and npm installed
- macOS, Windows, or Linux

Install dependencies:

```bash
npm install
```

Start the app in development (with hot reload):

```bash
npm run dev
```

Build a production bundle:

```bash
npm run build
```

## Project Structure

```
contextor.desktop/
├── public/
│   └── index.html
├── src/
│   ├── main.ts                 # Electron main process
│   ├── preload.ts              # Secure context bridge (window.api)
│   └── renderer/
│       ├── components/
│       │   └── InsightsPanel.tsx
│       ├── design-system/
│       │   └── styles.ts
│       ├── services/
│       │   └── api.ts
│       ├── App.tsx
│       └── index.tsx
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## Technical Highlights (Skills Showcase)

- **Electron engineering**: Window lifecycle, secure IPC, preload isolation, deep links.
- **Audio engineering**: Desktop loopback, stream mixing, echo cancellation strategies, playback UX.
- **TypeScript at scale**: Strongly‑typed boundaries across main/preload/renderer.
- **Frontend architecture**: Modular React components, Markdown rendering, UX micro‑interactions.
- **API integration**: Auth flows, conversation history sync, and message creation.

---

If you’re exploring this project to evaluate my desktop and audio engineering skills, start with `src/preload.ts` for the IPC surface and `src/renderer/components/InsightsPanel.tsx` for the end‑user experience, then browse the audio docs listed above.
