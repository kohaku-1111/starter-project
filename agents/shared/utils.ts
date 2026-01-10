/**
 * 動画編集エージェントシステム - 共通ユーティリティ
 */

import type { Timestamp, Frame } from './types';

/** フレームレート設定 */
export const DEFAULT_FPS = 30;
export const DEFAULT_RESOLUTION = { width: 1920, height: 1080 };

/**
 * タイムスタンプをフレーム番号に変換
 */
export function timestampToFrame(timestamp: Timestamp, fps: number = DEFAULT_FPS): Frame {
  return Math.floor(timestamp * fps);
}

/**
 * フレーム番号をタイムスタンプに変換
 */
export function frameToTimestamp(frame: Frame, fps: number = DEFAULT_FPS): Timestamp {
  return frame / fps;
}

/**
 * タイムスタンプを "MM:SS.ms" 形式にフォーマット
 */
export function formatTimestamp(timestamp: Timestamp): string {
  const minutes = Math.floor(timestamp / 60);
  const seconds = Math.floor(timestamp % 60);
  const ms = Math.floor((timestamp % 1) * 100);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * ユニークIDを生成
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 現在のISO日時を取得
 */
export function getCurrentISOTime(): string {
  return new Date().toISOString();
}

/**
 * パスを正規化（project/配下のパスに変換）
 */
export function normalizeAssetPath(assetType: 'audio' | 'avatar' | 'bgm' | 'images' | 'output', filename: string): string {
  return `project/${assetType}/${filename}`;
}

/**
 * 配列を指定したキーでグループ化
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * 時間範囲が重複しているかチェック
 */
export function isTimeOverlap(
  start1: Timestamp,
  end1: Timestamp,
  start2: Timestamp,
  end2: Timestamp
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * 音量をdBから線形値に変換
 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * 音量を線形値からdBに変換
 */
export function linearToDb(linear: number): number {
  return 20 * Math.log10(Math.max(linear, 0.0001));
}
