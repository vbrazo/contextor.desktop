if (typeof window !== 'undefined') {
  (window as any).global = window;
}

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld(
  'api', {
    getMessage: () => ipcRenderer.invoke('get-message'),
    sendTextToMain: (text: string) => ipcRenderer.send('send-text-to-main', text),
    resizeWindow: (height: number) => ipcRenderer.send('resize-window', height),
    setWindowSize: (width: number, height: number) => ipcRenderer.send('set-window-size', width, height),
    moveWindow: (x: number, y: number) => ipcRenderer.send('move-window', x, y),

    onScreenshotAnalysis: (callback: (analysis: string) => void) => {
      ipcRenderer.on('screenshot-analysis', (_event, analysis) => callback(analysis));
    },
    onScreenshotWithImage: (callback: (data: { analysis: string, imageUrl: string }) => void) => {
      ipcRenderer.on('screenshot-with-image', (_event, data) => callback(data));
    },
    onAudioRecordingStarted: (callback: () => void) => {
      ipcRenderer.on('audio-recording-started', (_event) => callback());
    },
    onAudioRecordingError: (callback: (error: string) => void) => {
      ipcRenderer.on('audio-recording-error', (_event, error) => callback(error));
    },
    onAudioAnalysis: (callback: (analysis: string) => void) => {
      ipcRenderer.on('audio-analysis', (_event, analysis) => callback(analysis));
    },
    onAudioWithAnalysis: (callback: (data: { analysis: string, audioUrl: string }) => void) => {
      console.log('🎯 Preload: Setting up audio-with-analysis listener');
      ipcRenderer.on('audio-with-analysis', (_event, data) => {
        console.log('🎯 Preload: Received audio-with-analysis message:', data);
        callback(data);
      });
    },
    enableSystemAudioLoopback: () => ipcRenderer.invoke('enable-loopback-audio'),
    disableSystemAudioLoopback: () => ipcRenderer.invoke('disable-loopback-audio'),
    notifySystemAudioStarted: () => ipcRenderer.send('system-audio-started'),
    notifySystemAudioStopped: (audioData: any) => ipcRenderer.send('system-audio-stopped', audioData),
    startCombinedAudioRecording: () => ipcRenderer.invoke('start-combined-audio-recording'),
    stopCombinedAudioRecording: () => ipcRenderer.invoke('stop-combined-audio-recording'),
    
    setAudioConfiguration: (config: { systemAudioEnabled?: boolean; echoCancellationEnabled?: boolean; echoCancellationSensitivity?: 'low' | 'medium' | 'high'; audioScenario?: 'auto' | 'earphones' | 'speakers'; voiceRecordingMode?: 'headphones' | 'speakers' | 'auto' }) => 
      ipcRenderer.invoke('set-audio-configuration', config),
    getAudioConfiguration: () => ipcRenderer.invoke('get-audio-configuration'),
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
    onHideInsightsPanel: (callback: () => void) => {
      ipcRenderer.on('hide-insights-panel', (_event) => callback());
    },
    onToggleInsightsPanel: (callback: (state: boolean) => void) => {
      ipcRenderer.on('toggle-insights-panel', (_event, state) => callback(state));
    },
    onLoadingUpdate: (callback: (message: string) => void) => {
      ipcRenderer.on('loading-update', (_event, message) => callback(message));
    },
    openChatWindow: () => ipcRenderer.send('open-chat-window'),
    closeChatWindow: () => ipcRenderer.send('close-chat-window'),
    openExternal: (url: string) => ipcRenderer.send('open-external', url),
    sendAuthStateChanged: () => ipcRenderer.send('auth-state-changed'),
    createMessage: (conversationId: string, data: { content_type: string, text_content?: string, screenshot_url?: string, sender_type?: string }) => 
      ipcRenderer.invoke('create-message', conversationId, data),
    createScreenshotMessage: (conversationId: string, screenshotUrl: string) => 
      ipcRenderer.invoke('create-screenshot-message', conversationId, screenshotUrl),
    notifyInsightsPanelOpened: () => ipcRenderer.send('insights-panel-opened'),
    notifyInsightsPanelClosed: () => ipcRenderer.send('insights-panel-closed'),
  }
);
