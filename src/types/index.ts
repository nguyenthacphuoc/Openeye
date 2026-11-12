export type AlarmSoundType = 'siren' | 'horn' | 'piercing_beep' | 'fire_alarm';

export interface DetectionSettings {
  closeDurationThresholdSec: number; // e.g. 1.5s
  eyeOpenThresholdEAR: number; // e.g. 0.20
  sensitivity: 'low' | 'medium' | 'high';
  alarmSound: AlarmSoundType;
  volume: number; // 0 to 1
  voiceAlertEnabled: boolean;
  vibrateEnabled: boolean;
  glassesMode: boolean;
  autoPipOnStart: boolean;
}

export interface EyeStatus {
  hasFace: boolean;
  leftEAR: number;
  rightEAR: number;
  avgEAR: number;
  leftBlinkScore: number;
  rightBlinkScore: number;
  isEyesClosed: boolean;
  closedDurationSec: number;
  alarmTriggered: boolean;
  fps: number;
  headTiltAngle?: number;
}

export interface DrowsinessEvent {
  id: string;
  timestamp: Date;
  durationSec: number;
  maxEAR: number;
  soundPlayed: AlarmSoundType;
  dismissed: boolean;
}

export interface CalibrationData {
  openEyeEAR: number;
  closedEyeEAR: number;
  calibratedThreshold: number;
  timestamp: Date;
}
