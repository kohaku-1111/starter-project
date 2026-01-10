/**
 * BGM管理エージェント
 *
 * 役割: BGMの選定、タイミング調整、ダッキング（音声時の音量自動調整）を管理する
 */

import type {
  Agent,
  AudioClip,
  AudioProcessingResult,
  BGMManagementResult,
  BGMTrack,
  Scene,
  SceneType,
  ScriptAnalysisResult,
  FilePath,
  Timestamp,
} from '../shared/types';
import { generateId, getCurrentISOTime, normalizeAssetPath } from '../shared/utils';

/** BGM管理入力 */
export interface BGMManagementInput {
  /** スクリプト分析結果 */
  scriptAnalysis: ScriptAnalysisResult;
  /** 音声処理結果（ダッキング用） */
  audioProcessing?: AudioProcessingResult;
  /** BGMファイルマッピング（シーンタイプまたはIDごと） */
  bgmFiles?: Map<string, FilePath> | Record<string, FilePath>;
  /** マスター音量 (0.0 - 1.0) */
  masterVolume?: number;
  /** ダッキング設定 */
  duckingConfig?: DuckingConfig;
}

/** ダッキング設定 */
export interface DuckingConfig {
  /** ダッキング有効 */
  enabled: boolean;
  /** ナレーション時のBGM音量 (0.0 - 1.0) */
  targetVolume: number;
  /** フェード時間（秒） */
  fadeDuration: number;
}

/** デフォルトのダッキング設定 */
const DEFAULT_DUCKING_CONFIG: DuckingConfig = {
  enabled: true,
  targetVolume: 0.2,  // ナレーション時は20%まで下げる
  fadeDuration: 0.3,
};

/** シーンタイプごとのデフォルトBGM音量 */
const SCENE_TYPE_VOLUMES: Record<SceneType, number> = {
  intro: 0.6,
  main: 0.4,
  transition: 0.5,
  outro: 0.6,
};

/**
 * BGM管理エージェント
 */
export class BGMManagerAgent implements Agent<BGMManagementInput, BGMManagementResult> {
  name = 'bgm-manager';
  description = 'BGMの選定、タイミング調整、ダッキングを管理する';

  private masterVolume = 0.5;
  private duckingConfig = DEFAULT_DUCKING_CONFIG;

  /**
   * BGMを管理
   */
  async process(input: BGMManagementInput): Promise<BGMManagementResult> {
    const {
      scriptAnalysis,
      audioProcessing,
      bgmFiles = {},
      masterVolume,
      duckingConfig,
    } = input;

    if (masterVolume !== undefined) {
      this.masterVolume = masterVolume;
    }
    if (duckingConfig) {
      this.duckingConfig = { ...DEFAULT_DUCKING_CONFIG, ...duckingConfig };
    }

    const bgmFileMap = bgmFiles instanceof Map
      ? bgmFiles
      : new Map(Object.entries(bgmFiles));

    const tracks = this.createBGMTracks(
      scriptAnalysis,
      bgmFileMap,
      audioProcessing?.clips || []
    );

    return {
      tracks,
      masterVolume: this.masterVolume,
      managedAt: getCurrentISOTime(),
    };
  }

  /**
   * BGMトラックを作成
   */
  private createBGMTracks(
    scriptAnalysis: ScriptAnalysisResult,
    bgmFiles: Map<string, FilePath>,
    audioClips: AudioClip[]
  ): BGMTrack[] {
    const tracks: BGMTrack[] = [];
    const { scenes, totalDuration } = scriptAnalysis;

    // シーンタイプごとにBGMをグループ化
    const sceneGroups = this.groupScenesByType(scenes);

    for (const [sceneType, typeScenes] of sceneGroups.entries()) {
      const bgmPath = this.getBGMForSceneType(sceneType, bgmFiles);

      if (!bgmPath) continue;

      // 連続するシーンをマージしてトラックを作成
      const mergedRanges = this.mergeConsecutiveScenes(typeScenes);

      for (const range of mergedRanges) {
        const track = this.createTrack(
          bgmPath,
          range.startTime,
          range.endTime,
          sceneType,
          typeScenes.map(s => s.id),
          audioClips
        );
        tracks.push(track);
      }
    }

    // 全体を通すメインBGMがある場合
    const mainBgm = bgmFiles.get('main') || bgmFiles.get('default');
    if (mainBgm && tracks.length === 0) {
      const mainTrack = this.createMainTrack(mainBgm, totalDuration, scenes, audioClips);
      tracks.push(mainTrack);
    }

    return tracks;
  }

  /**
   * シーンをタイプごとにグループ化
   */
  private groupScenesByType(scenes: Scene[]): Map<SceneType, Scene[]> {
    const groups = new Map<SceneType, Scene[]>();

    for (const scene of scenes) {
      const existing = groups.get(scene.type) || [];
      existing.push(scene);
      groups.set(scene.type, existing);
    }

    return groups;
  }

  /**
   * シーンタイプに対応するBGMを取得
   */
  private getBGMForSceneType(sceneType: SceneType, bgmFiles: Map<string, FilePath>): FilePath | null {
    return bgmFiles.get(sceneType)
      || bgmFiles.get(`bgm_${sceneType}`)
      || null;
  }

  /**
   * 連続するシーンをマージ
   */
  private mergeConsecutiveScenes(scenes: Scene[]): { startTime: Timestamp; endTime: Timestamp }[] {
    if (scenes.length === 0) return [];

    const sorted = [...scenes].sort((a, b) => a.startTime - b.startTime);
    const ranges: { startTime: Timestamp; endTime: Timestamp }[] = [];

    let currentRange = { startTime: sorted[0].startTime, endTime: sorted[0].endTime };

    for (let i = 1; i < sorted.length; i++) {
      const scene = sorted[i];

      // 0.5秒以内の間隔なら連続とみなす
      if (scene.startTime - currentRange.endTime <= 0.5) {
        currentRange.endTime = scene.endTime;
      } else {
        ranges.push(currentRange);
        currentRange = { startTime: scene.startTime, endTime: scene.endTime };
      }
    }

    ranges.push(currentRange);
    return ranges;
  }

  /**
   * BGMトラックを作成
   */
  private createTrack(
    filePath: FilePath,
    startTime: Timestamp,
    endTime: Timestamp,
    sceneType: SceneType,
    sceneIds: string[],
    audioClips: AudioClip[]
  ): BGMTrack {
    const baseVolume = SCENE_TYPE_VOLUMES[sceneType] * this.masterVolume;

    // このトラック範囲内の音声クリップを取得（ダッキング用）
    const overlappingClips = audioClips.filter(
      clip => clip.startTime < endTime && clip.endTime > startTime
    );

    return {
      id: generateId('bgm'),
      filePath,
      startTime,
      endTime,
      volume: baseVolume,
      loop: (endTime - startTime) > 60, // 60秒以上はループ
      fadeIn: sceneType === 'intro' ? 1.0 : 0.5,
      fadeOut: sceneType === 'outro' ? 1.5 : 0.5,
      ducking: this.duckingConfig.enabled && overlappingClips.length > 0
        ? {
            enabled: true,
            targetVolume: this.duckingConfig.targetVolume,
            triggerSceneIds: sceneIds,
          }
        : undefined,
    };
  }

  /**
   * メインBGMトラックを作成（全体を通すBGM）
   */
  private createMainTrack(
    filePath: FilePath,
    totalDuration: Timestamp,
    scenes: Scene[],
    audioClips: AudioClip[]
  ): BGMTrack {
    return {
      id: generateId('bgm_main'),
      filePath,
      startTime: 0,
      endTime: totalDuration,
      volume: this.masterVolume * 0.4,
      loop: totalDuration > 60,
      fadeIn: 1.0,
      fadeOut: 2.0,
      ducking: this.duckingConfig.enabled
        ? {
            enabled: true,
            targetVolume: this.duckingConfig.targetVolume,
            triggerSceneIds: scenes.map(s => s.id),
          }
        : undefined,
    };
  }

  /**
   * ダッキングカーブを計算（Remotionでの実装用）
   */
  calculateDuckingCurve(
    track: BGMTrack,
    audioClips: AudioClip[],
    resolution: number = 0.1 // 0.1秒ごとに計算
  ): { time: Timestamp; volume: number }[] {
    const curve: { time: Timestamp; volume: number }[] = [];
    const fadeDuration = this.duckingConfig.fadeDuration;

    for (let t = track.startTime; t <= track.endTime; t += resolution) {
      // この時点で音声が再生中かチェック
      const isVoiceActive = audioClips.some(
        clip => clip.startTime <= t && clip.endTime >= t
      );

      let volume = track.volume;

      if (isVoiceActive && track.ducking?.enabled) {
        volume = track.volume * track.ducking.targetVolume;
      }

      // フェードイン/アウトの適用
      const timeFromStart = t - track.startTime;
      const timeToEnd = track.endTime - t;

      if (track.fadeIn && timeFromStart < track.fadeIn) {
        volume *= timeFromStart / track.fadeIn;
      }
      if (track.fadeOut && timeToEnd < track.fadeOut) {
        volume *= timeToEnd / track.fadeOut;
      }

      curve.push({ time: t, volume });
    }

    return curve;
  }

  /**
   * BGMリストを推奨（シーンタイプと雰囲気から）
   */
  suggestBGMFiles(scenes: Scene[]): Record<SceneType, string> {
    const suggestions: Record<SceneType, string> = {
      intro: normalizeAssetPath('bgm', 'intro_upbeat.mp3'),
      main: normalizeAssetPath('bgm', 'main_ambient.mp3'),
      transition: normalizeAssetPath('bgm', 'transition_soft.mp3'),
      outro: normalizeAssetPath('bgm', 'outro_calm.mp3'),
    };

    return suggestions;
  }
}

// デフォルトエクスポート
export default new BGMManagerAgent();
