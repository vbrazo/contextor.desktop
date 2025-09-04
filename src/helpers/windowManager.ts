import { BrowserWindow, screen, nativeImage } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';

// ============================================================================
// WINDOW MANAGER
// ============================================================================

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  // --------------------------------------------------------------------------
  // GETTERS
  // --------------------------------------------------------------------------

  get window(): BrowserWindow | null {
    return this.mainWindow;
  }

  get isVisible(): boolean {
    return this.mainWindow?.isVisible() ?? false;
  }

  // --------------------------------------------------------------------------
  // WINDOW CREATION
  // --------------------------------------------------------------------------

  createMainWindow(): BrowserWindow {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const windowWidth = 400;
    const windowHeight = 60;

    this.mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      movable: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      x: Math.floor((screenWidth - windowWidth) / 2),
      y: 40,
      title: 'Contextor',
      backgroundColor: '#000000',
      show: false,
      roundedCorners: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
      },
    });

    this.mainWindow.setTitle('Contextor');
    
    // Explicitly disable resizing after window creation
    this.mainWindow.setResizable(false);
    this.mainWindow.setMaximizable(false);
    this.mainWindow.setMinimizable(false);
    this.mainWindow.setFullScreenable(false);
    
    this.loadContent();
    this.setupEvents();
    this.setupStyling();
    this.setupContentProtection();

    return this.mainWindow;
  }

  // --------------------------------------------------------------------------
  // WINDOW OPERATIONS
  // --------------------------------------------------------------------------

  show(): void {
    this.mainWindow?.show();
    this.mainWindow?.focus();
  }

  hide(): void {
    this.mainWindow?.hide();
  }

  focus(): void {
    this.mainWindow?.focus();
  }

  restore(): void {
    if (this.mainWindow?.isMinimized()) {
      this.mainWindow.restore();
    }
  }

  resize(width?: number, height?: number): void {
    if (!this.mainWindow) return;

    const currentBounds = this.mainWindow.getBounds();
    this.mainWindow.setBounds({
      ...currentBounds,
      ...(width && { width }),
      ...(height && { height }),
    });
    
    // Ensure window stays non-resizable after programmatic resize
    this.ensureNonResizable();
  }

  setOpacity(opacity: number): void {
    this.mainWindow?.setOpacity(opacity);
  }

  setSkipTaskbar(skip: boolean): void {
    this.mainWindow?.setSkipTaskbar(skip);
  }

  setContentProtection(enabled: boolean): void {
    if (!this.mainWindow) return;
    this.mainWindow.setContentProtection(enabled);
    console.log(`🔒 Content protection ${enabled ? 'enabled' : 'disabled'}`);
  }

  blur(): void {
    this.mainWindow?.blur();
  }

  setIgnoreMouseEvents(ignore: boolean): void {
    this.mainWindow?.setIgnoreMouseEvents(ignore);
  }

  // --------------------------------------------------------------------------
  // MESSAGING
  // --------------------------------------------------------------------------

  sendMessage(channel: string, ...args: any[]): void {
    console.log(`📤 Sending message to renderer: ${channel}`, args);
    console.log(`📤 Main window exists: ${!!this.mainWindow}`);
    console.log(`📤 Main window webContents exists: ${!!this.mainWindow?.webContents}`);
    this.mainWindow?.webContents.send(channel, ...args);
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private loadContent(): void {
    if (!this.mainWindow) return;

    if (isDev) {
      this.mainWindow.loadURL('http://localhost:8080');
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }

  private setupEvents(): void {
    if (!this.mainWindow) return;

    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
        console.log('Window shown and focused');
      }
    });

    this.mainWindow.webContents.once('did-finish-load', () => {
      this.handleStoredCallbacks();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Ensure window stays non-resizable
    this.mainWindow.on('resize', () => {
      // Prevent manual resizing by immediately setting back to programmatic size
      if (this.mainWindow) {
        this.ensureNonResizable();
      }
    });
  }

  private handleStoredCallbacks(): void {
    if ((global as any).authCallback && this.mainWindow) {
      this.mainWindow.webContents.send('auth-callback', (global as any).authCallback);
      delete (global as any).authCallback;
    }

    if ((global as any).paymentCallback && this.mainWindow) {
      this.mainWindow.webContents.send('payment-callback', (global as any).paymentCallback);
      delete (global as any).paymentCallback;
    }
  }

  private setupStyling(): void {
    if (!this.mainWindow) return;

    this.mainWindow.setBackgroundColor('#00000000');
    this.mainWindow.setVibrancy('under-window');
    this.mainWindow.setHasShadow(false);
    this.setupDockIcon();
    
    // Ensure window stays non-resizable
    this.ensureNonResizable();
    
    // Set up periodic check to ensure non-resizable state
    setInterval(() => {
      if (this.mainWindow && this.mainWindow.isResizable()) {
        console.log('Window became resizable, fixing...');
        this.ensureNonResizable();
      }
    }, 1000); // Check every second
  }

  private setupDockIcon(): void {
    if (process.platform === 'darwin') {
      // In production, go up from dist/ to project root, then to public/
      // In development, go up from src/ to project root, then to public/
      const iconPath = isDev 
        ? path.join(__dirname, '../../public/apple-touch-icon.png')
        : path.join(__dirname, '../public/apple-touch-icon.png');
      const image = nativeImage.createFromPath(iconPath);
      if (!image.isEmpty()) {
        require('electron').app.dock?.setIcon(image);
      } else {
        console.warn('Failed to load Dock icon:', iconPath);
      }
    }
  }

  private setupContentProtection(): void {
    if (!this.mainWindow) return;

    // Hide window content from screen sharing and recording
    this.mainWindow.setContentProtection(true);
    console.log('🔒 Content protection enabled - window hidden from screen sharing');
  }

  // Method to ensure window stays non-resizable
  private ensureNonResizable(): void {
    if (!this.mainWindow) return;
    
    this.mainWindow.setResizable(false);
    this.mainWindow.setMaximizable(false);
    this.mainWindow.setMinimizable(false);
    this.mainWindow.setFullScreenable(false);
    
    // Also prevent the window from being moved to screen edges where resize handles might appear
    const bounds = this.mainWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Ensure window stays within reasonable bounds
    if (bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > screenWidth || bounds.y + bounds.height > screenHeight) {
      this.mainWindow.setBounds({
        x: Math.max(0, Math.min(bounds.x, screenWidth - bounds.width)),
        y: Math.max(0, Math.min(bounds.y, screenHeight - bounds.height)),
        width: bounds.width,
        height: bounds.height
      });
    }
  }
} 