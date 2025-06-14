// Set up global object before anything else
if (typeof window !== 'undefined') {
  (window as any).global = window;
}

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    getMessage: () => ipcRenderer.invoke('get-message'),
    sendTextToMain: (text: string) => ipcRenderer.send('send-text-to-main', text),
    resizeWindow: (height: number) => ipcRenderer.send('resize-window', height),
    setWindowSize: (width: number, height: number) => ipcRenderer.send('set-window-size', width, height),
    moveWindow: (x: number, y: number) => ipcRenderer.send('move-window', x, y),
    onPlayStateChanged: (callback: (state: boolean) => void) => {
      ipcRenderer.on('play-state-changed', (_event, state) => callback(state));
    },
    onTranscriptionText: (callback: (text: string) => void) => {
      ipcRenderer.on('transcription-text', (_event, text) => callback(text));
    },
    onScreenshotAnalysis: (callback: (analysis: string) => void) => {
      ipcRenderer.on('screenshot-analysis', (_event, analysis) => callback(analysis));
    },
    onScreenshotWithImage: (callback: (data: { analysis: string, imageUrl: string }) => void) => {
      ipcRenderer.on('screenshot-with-image', (_event, data) => callback(data));
    },
    onChatResponse: (callback: (response: string) => void) => {
      ipcRenderer.on('chat-response', (_event, response) => callback(response));
    },
    onAuthCallback: (callback: (authData: { token: string, user: any, expires_at: string }) => void) => {
      ipcRenderer.on('auth-callback', (_event, authData) => callback(authData));
    },
    onPaymentCallback: (callback: (paymentData: { status: string, session_id: string }) => void) => {
      ipcRenderer.on('payment-callback', (_event, paymentData) => callback(paymentData));
    },
    onLogout: (callback: () => void) => {
      ipcRenderer.on('logout', (_event) => callback());
    },
    onGetAuthToken: (callback: () => void) => {
      ipcRenderer.on('get-auth-token', (_event) => callback());
    },
    sendAuthTokenResponse: (token: string | null) => ipcRenderer.send('auth-token-response', token),
    onIdlePrompt: (callback: (data: { message: string, buttons: Array<{ id: string, text: string }> }) => void) => {
      ipcRenderer.on('idle-prompt', (_event, data) => callback(data));
    },
    sendIdleResponse: (response: string) => ipcRenderer.send('idle-response', response),
    onHideInsightsPanel: (callback: () => void) => {
      ipcRenderer.on('hide-insights-panel', (_event) => callback());
    },
    openChatWindow: () => ipcRenderer.send('open-chat-window'),
    closeChatWindow: () => ipcRenderer.send('close-chat-window'),
    openExternal: (url: string) => ipcRenderer.send('open-external', url),
  }
); 
