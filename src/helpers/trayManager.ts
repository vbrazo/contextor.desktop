import { Tray, Menu, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { createDefaultIcon } from './iconUtils';
import { WindowManager } from './windowManager';

// ============================================================================
// TRAY MANAGER
// ============================================================================

export class TrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;
  private isInvisible: boolean = false;

  // --------------------------------------------------------------------------
  // GETTERS
  // --------------------------------------------------------------------------

  get invisibleState(): boolean {
    return this.isInvisible;
  }

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  // --------------------------------------------------------------------------
  // TRAY CREATION
  // --------------------------------------------------------------------------

  createTray(): void {
    try {
      const iconPath = this.getIconPath();
      this.ensureIconExists(iconPath);

      this.tray = new Tray(iconPath);
      this.tray.setToolTip('Contextor');

      this.setupTrayMenu();
      this.setupTrayEvents();

      // Restore invisible state if it was previously set
      this.restoreInvisibleState();

      console.log('Tray icon created successfully');
    } catch (error) {
      console.error('Failed to create tray icon:', error);
    }
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private getIconPath(): string {
    // In production, go up from dist/ to project root, then to public/
    // In development, go up from src/ to project root, then to public/
    const isDev = require('electron-is-dev');
    return isDev 
      ? path.join(__dirname, '../../public/icon.iconset/icon_16x16@2x.png')
      : path.join(__dirname, '../public/icon.iconset/icon_16x16@2x.png');
  }

  private ensureIconExists(iconPath: string): void {
    if (!fs.existsSync(iconPath)) {
      const iconBuffer = createDefaultIcon();
      fs.writeFileSync(iconPath, iconBuffer);
    }
  }

  private setupTrayMenu(): void {
    const isVisible = this.windowManager.isVisible;
    const showHideLabel = isVisible ? 'Hide App' : 'Show App';
    const invisibleLabel = this.isInvisible ? 'Make Invisible' : 'Make Visible';

    this.windowManager.sendMessage('get-auth-token');

    ipcMain.once('auth-token-response', (event, token) => {
      const menuItems = [
        {
          label: showHideLabel,
          click: () => this.handleShowHide()
        },
        {
          label: invisibleLabel,
          click: () => this.handleInvisibleToggle()
        },
        { type: 'separator' as const }
      ];

      if (token) {
        menuItems.push({
          label: 'Logout',
          click: () => this.handleLogout()
        });
      }

      menuItems.push({
        label: 'Quit',
        click: () => require('electron').app.quit()
      });

      const contextMenu = Menu.buildFromTemplate(menuItems);
      this.tray?.setContextMenu(contextMenu);
    });
  }

  private setupTrayEvents(): void {
    if (!this.tray) return;

    this.tray.on('click', () => {});

    // Update menu when window state changes
    this.windowManager.window?.on('show', () => this.setupTrayMenu());
    this.windowManager.window?.on('hide', () => this.setupTrayMenu());

    // Listen for auth state changes
    ipcMain.on('auth-state-changed', () => {
      this.setupTrayMenu();
    });
  }

  private handleShowHide(): void {
    if (this.windowManager.isVisible) {
      this.windowManager.hide();
    } else {
      this.windowManager.show();
    }
    setTimeout(() => this.setupTrayMenu(), 100);
  }

  private handleInvisibleToggle(): void {
    this.isInvisible = !this.isInvisible;

    if (this.isInvisible) {
      // Make the app "invisible" for screen sharing/screenshots
      // Keep opacity normal but make it non-interactive and remove from taskbar
      this.windowManager.setSkipTaskbar(true);
      // this.windowManager.setIgnoreMouseEvents(true);
      this.windowManager.setContentProtection(false); // Allow screen capture
      this.windowManager.show();
      this.windowManager.focus();
    } else {
      // Make the app visible and interactive again
      // this.windowManager.setIgnoreMouseEvents(false);
      this.windowManager.setSkipTaskbar(false);
      this.windowManager.setContentProtection(true); // Re-enable content protection
      this.windowManager.show();
      this.windowManager.focus();
    }

    // Update the tray menu to reflect the new state
    setTimeout(() => this.setupTrayMenu(), 100);
  }

  private handleLogout(): void {
    this.windowManager.sendMessage('logout');
  }

  private restoreInvisibleState(): void {
    // Check if the app was previously set to invisible
    // For now, we'll start visible by default
    // In the future, this could be persisted to localStorage or a config file
    this.isInvisible = false;
  }
} 