// Background Manager handles Picture-in-Picture, Web Worker heartbeat, and Native Notifications

type TickCallback = () => void;

class BackgroundService {
  private worker: Worker | null = null;
  private pipVideoElement: HTMLVideoElement | null = null;
  private pipWindow: Window | null = null;
  private isPipActive = false;
  private titleFlashIntervalId: number | null = null;
  private originalTitle = 'WakeGuard - Trợ Lý Báo Động Chống Buồn Ngủ';
  private tickListeners: Set<TickCallback> = new Set();

  constructor() {
    this.initWorker();
    this.originalTitle = typeof document !== 'undefined' ? document.title : this.originalTitle;
  }

  /**
   * Create an inline Web Worker ticker to bypass browser background tab throttling
   */
  private initWorker() {
    try {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!timer) {
              timer = setInterval(function() {
                self.postMessage('tick');
              }, 80); // ~12 fps in background mode
            }
          } else if (e.data === 'stop') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          this.tickListeners.forEach((listener) => listener());
        }
      };
    } catch (err) {
      console.warn('Web Worker initialization failed, will use window timers:', err);
    }
  }

  public subscribeTick(callback: TickCallback): () => void {
    this.tickListeners.add(callback);
    return () => {
      this.tickListeners.delete(callback);
    };
  }

  public startBackgroundTicker() {
    if (this.worker) {
      this.worker.postMessage('start');
    }
  }

  public stopBackgroundTicker() {
    if (this.worker) {
      this.worker.postMessage('stop');
    }
  }

  /**
   * Request Desktop Notifications permission
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  public sendNotification(title: string, body: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'wakeguard-alert',
        requireInteraction: true,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch {
      // Ignore
    }
  }

  /**
   * Flashes browser tab title in red alerts
   */
  public startTitleFlash(alertText = '🚨🚨 DẬY ĐI! BÁO ĐỘNG BUỒN NGỦ!') {
    if (this.titleFlashIntervalId) return;
    let toggle = false;
    this.titleFlashIntervalId = window.setInterval(() => {
      document.title = toggle ? alertText : '⚠️ WAKEGUARD ALERT ⚠️';
      toggle = !toggle;
    }, 500);
  }

  public stopTitleFlash() {
    if (this.titleFlashIntervalId) {
      clearInterval(this.titleFlashIntervalId);
      this.titleFlashIntervalId = null;
      document.title = this.originalTitle;
    }
  }

  /**
   * Check if Picture-in-Picture is supported on this browser
   */
  public isPipSupported(): boolean {
    return (
      ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) ||
      'documentPictureInPicture' in window
    );
  }

  public getIsPipActive(): boolean {
    return this.isPipActive;
  }

  /**
   * Launch Picture-in-Picture from the live tracking HUD canvas
   */
  public async requestCanvasPip(
    canvas: HTMLCanvasElement,
    onPipClose?: () => void
  ): Promise<boolean> {
    try {
      // 1. If standard HTML5 Video Picture-in-Picture
      if ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) {
        if (!this.pipVideoElement) {
          const video = document.createElement('video');
          video.muted = true;
          video.autoplay = true;
          video.playsInline = true;
          video.style.position = 'fixed';
          video.style.top = '-9999px';
          video.style.left = '-9999px';
          video.style.width = '1px';
          video.style.height = '1px';
          document.body.appendChild(video);
          this.pipVideoElement = video;
        }

        const stream = (canvas as unknown as { captureStream: (fps: number) => MediaStream }).captureStream(
          25
        );
        this.pipVideoElement.srcObject = stream;
        await this.pipVideoElement.play();

        this.pipVideoElement.addEventListener(
          'leavepictureinpicture',
          () => {
            this.isPipActive = false;
            if (onPipClose) onPipClose();
          },
          { once: true }
        );

        await this.pipVideoElement.requestPictureInPicture();
        this.isPipActive = true;
        return true;
      }

      return false;
    } catch (err) {
      console.error('Failed to enter Picture-in-Picture:', err);
      this.isPipActive = false;
      return false;
    }
  }

  /**
   * Exit Picture-in-Picture if active
   */
  public async exitPip(): Promise<void> {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      if (this.pipWindow && !this.pipWindow.closed) {
        this.pipWindow.close();
        this.pipWindow = null;
      }
      this.isPipActive = false;
    } catch (err) {
      console.warn('Error exiting PiP:', err);
    }
  }
}

export const backgroundService = new BackgroundService();
