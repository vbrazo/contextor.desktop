# Contextor Prototype

A cross-platform desktop application built with Electron, React, and TypeScript.

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

This will start the Electron app with hot reloading enabled.

## Building

To build the application for production:

```bash
npm run build
```

This will create a production build in the `release` directory.

## Project Structure

```
contextor-prototype/
├── public/
│   └── index.html
├── src/
│   ├── main.ts           # Main process
│   ├── preload.ts        # Preload script
│   └── renderer/
│       ├── App.tsx       # Main React component
│       └── index.tsx     # React entry point
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## Features

- Electron for cross-platform desktop app
- React + TypeScript for UI
- Webpack for bundling
- Secure IPC communication using contextBridge
- Hot reloading in development
- Production build with electron-builder 