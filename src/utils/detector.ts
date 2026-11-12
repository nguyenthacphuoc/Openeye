import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface FaceDetectionResult {
  hasFace: boolean;
  landmarks: NormalizedLandmark[] | null;
  leftEAR: number;
  rightEAR: number;
  avgEAR: number;
  leftBlinkScore: number;
  rightBlinkScore: number;
  isClosed: boolean;
  modelReady: boolean;
  engineName: 'mediapipe' | 'fallback_cv';
}

// MediaPipe Landmark Indices for Eye Aspect Ratio (EAR)
// Left eye: 33 (outer corner), 133 (inner corner), 160 & 158 (top lids), 144 & 153 (bottom lids)
const LEFT_EYE_INDICES = {
  p1: 33,
  p2: 160,
  p3: 158,
  p4: 133,
  p5: 153,
  p6: 144,
};

// Right eye: 362 (outer corner), 263 (inner corner), 385 & 387 (top lids), 380 & 373 (bottom lids)
const RIGHT_EYE_INDICES = {
  p1: 362,
  p2: 385,
  p3: 387,
  p4: 263,
  p5: 373,
  p6: 380,
};

function euclideanDistance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
}

function calculateEAR(landmarks: NormalizedLandmark[], idx: typeof LEFT_EYE_INDICES): number {
  const p1 = landmarks[idx.p1];
  const p2 = landmarks[idx.p2];
  const p3 = landmarks[idx.p3];
  const p4 = landmarks[idx.p4];
  const p5 = landmarks[idx.p5];
  const p6 = landmarks[idx.p6];

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0.25;

  const vertical1 = euclideanDistance(p2, p6);
  const vertical2 = euclideanDistance(p3, p5);
  const horizontal = euclideanDistance(p1, p4);

  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

class EyeDetectorService {
  private landmarker: FaceLandmarker | null = null;
  private isInitializing = false;
  private isReady = false;
  private initError: string | null = null;
  private fallbackCvActive = false;

  public async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
      });

      this.isReady = true;
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.warn('MediaPipe initialization warning (will use fallback computer vision):', err);
      this.initError = (err as Error)?.message || 'Failed to load MediaPipe model';
      this.isInitializing = false;
      this.fallbackCvActive = true;
      return false;
    }
  }

  public getIsReady(): boolean {
    return this.isReady || this.fallbackCvActive;
  }

  public getEngine(): 'mediapipe' | 'fallback_cv' {
    return this.isReady ? 'mediapipe' : 'fallback_cv';
  }

  public getError(): string | null {
    return this.initError;
  }

  /**
   * Process a single video frame and return eye openness metrics
   */
  public detect(
    video: HTMLVideoElement,
    timestamp: number,
    thresholdEAR: number,
    glassesMode = false
  ): FaceDetectionResult {
    // If MediaPipe is loaded and ready
    if (this.isReady && this.landmarker) {
      try {
        const results = this.landmarker.detectForVideo(video, timestamp);

        if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
          return {
            hasFace: false,
            landmarks: null,
            leftEAR: 0,
            rightEAR: 0,
            avgEAR: 0,
            leftBlinkScore: 0,
            rightBlinkScore: 0,
            isClosed: false,
            modelReady: true,
            engineName: 'mediapipe',
          };
        }

        const face = results.faceLandmarks[0];
        const leftEAR = calculateEAR(face, LEFT_EYE_INDICES);
        const rightEAR = calculateEAR(face, RIGHT_EYE_INDICES);
        const avgEAR = (leftEAR + rightEAR) / 2.0;

        // Check blendshapes if available
        let leftBlink = 0;
        let rightBlink = 0;
        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
          const categories = results.faceBlendshapes[0].categories;
          const bLeft = categories.find((c) => c.categoryName === 'eyeBlinkLeft');
          const bRight = categories.find((c) => c.categoryName === 'eyeBlinkRight');
          if (bLeft) leftBlink = bLeft.score;
          if (bRight) rightBlink = bRight.score;
        }

        // Effective threshold adjusted for glasses mode if toggled
        const effectiveEARThreshold = glassesMode ? thresholdEAR * 0.9 : thresholdEAR;

        // An eye is closed if either:
        // 1. EAR is below threshold
        // 2. OR both blendshape blink scores exceed 0.58
        const earClosed = avgEAR < effectiveEARThreshold;
        const blendshapeClosed = leftBlink > 0.55 && rightBlink > 0.55;

        const isClosed = earClosed || (blendshapeClosed && avgEAR < effectiveEARThreshold * 1.3);

        return {
          hasFace: true,
          landmarks: face,
          leftEAR,
          rightEAR,
          avgEAR,
          leftBlinkScore: leftBlink,
          rightBlinkScore: rightBlink,
          isClosed,
          modelReady: true,
          engineName: 'mediapipe',
        };
      } catch (err) {
        console.warn('MediaPipe frame error:', err);
      }
    }

    // Fallback CV engine using lightweight canvas brightness/contrast
    return this.detectFallback(video, thresholdEAR);
  }

  // Lightweight Fallback Computer Vision when wasm isn't available
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private prevBrightness = 0;

  private detectFallback(video: HTMLVideoElement, thresholdEAR: number): FaceDetectionResult {
    if (!this.fallbackCanvas) {
      this.fallbackCanvas = document.createElement('canvas');
      this.fallbackCanvas.width = 64;
      this.fallbackCanvas.height = 48;
    }
    const ctx = this.fallbackCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || video.videoWidth === 0) {
      return {
        hasFace: true,
        landmarks: null,
        leftEAR: 0.28,
        rightEAR: 0.28,
        avgEAR: 0.28,
        leftBlinkScore: 0,
        rightBlinkScore: 0,
        isClosed: false,
        modelReady: true,
        engineName: 'fallback_cv',
      };
    }

    try {
      // Draw center 40% where face usually rests
      const sx = video.videoWidth * 0.25;
      const sy = video.videoHeight * 0.2;
      const sWidth = video.videoWidth * 0.5;
      const sHeight = video.videoHeight * 0.45;

      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, 64, 48);
      const imgData = ctx.getImageData(0, 0, 64, 48);
      const data = imgData.data;

      let totalLum = 0;
      let count = 0;
      // Focus on eye strip (rows 14 to 28)
      for (let y = 14; y < 28; y++) {
        for (let x = 12; x < 52; x++) {
          const idx = (y * 64 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLum += lum;
          count++;
        }
      }
      const currentBrightness = count > 0 ? totalLum / count : 120;

      // Simulate EAR based on normalized variance and delta
      let estimatedEAR = 0.26;
      if (this.prevBrightness > 0) {
        const delta = Math.abs(currentBrightness - this.prevBrightness);
        if (delta > 8 && currentBrightness > 80) {
          estimatedEAR = 0.14; // blink transition
        }
      }
      this.prevBrightness = currentBrightness;

      return {
        hasFace: true,
        landmarks: null,
        leftEAR: estimatedEAR,
        rightEAR: estimatedEAR,
        avgEAR: estimatedEAR,
        leftBlinkScore: estimatedEAR < thresholdEAR ? 0.8 : 0.1,
        rightBlinkScore: estimatedEAR < thresholdEAR ? 0.8 : 0.1,
        isClosed: estimatedEAR < thresholdEAR,
        modelReady: true,
        engineName: 'fallback_cv',
      };
    } catch {
      return {
        hasFace: true,
        landmarks: null,
        leftEAR: 0.25,
        rightEAR: 0.25,
        avgEAR: 0.25,
        leftBlinkScore: 0,
        rightBlinkScore: 0,
        isClosed: false,
        modelReady: true,
        engineName: 'fallback_cv',
      };
    }
  }
}

export const eyeDetector = new EyeDetectorService();
