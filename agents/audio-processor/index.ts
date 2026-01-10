/**
 * 音声処理エージェント
 *
 * 役割: 音声ファイルを各シーンに紐付け、タイミングと音量を調整する
 */

import type {
  Agent,
  AudioClip,
  AudioProcessingResult,
  Scene,
  ScriptAnalysisResult,
  Timestamp,
  FilePath,
} from '../shared/types';
import { generateId, getCurrentISOTime, normalizeAssetPath } from '../shared/utils';

/** 音声処理入力 */
export interface AudioProcessingInput {
  /** スクリプト分析結果 */
  scriptAnalysis: ScriptAnalysisResult;
  /** 音声ファイルマッピング（シーンIDまたはインデックス → ファイルパス） */
  audioFiles: Map<string, FilePath> | Record<string, FilePath>;
  /** デフォルト音量 (0.0 - 1.0) */
  defaultVolume?: number;
  /** フェード設定 */
  fadeSettings?: {
    fadeIn?: Timestamp;
    fadeOut?: Timestamp;
  };
}

/** 音声ファイル情報（シミュレート用） */
interface AudioFileInfo {
  duration: Timestamp;
  sampleRate: number;
  channels: number;
}

/**
 * 音声処理エージェント
 */
export class AudioProcessorAgent implements Agent<AudioProcessingInput, AudioProcessingResult> {
  name = 'audio-processor';
  description = '音声ファイルをシーンに紐付け、タイミングと音量を調整する';

  private defaultVolume = 1.0;
  private defaultFadeIn = 0.1;
  private defaultFadeOut = 0.1;

  /**
   * 音声を処理してクリップを生成
   */
  async process(input: AudioProcessingInput): Promise<AudioProcessingResult> {
    const { scriptAnalysis, audioFiles, defaultVolume, fadeSettings } = input;

    if (defaultVolume !== undefined) {
      this.defaultVolume = defaultVolume;
    }
    if (fadeSettings?.fadeIn !== undefined) {
      this.defaultFadeIn = fadeSettings.fadeIn;
    }
    if (fadeSettings?.fadeOut !== undefined) {
      this.defaultFadeOut = fadeSettings.fadeOut;
    }

    const audioFileMap = audioFiles instanceof Map
      ? audioFiles
      : new Map(Object.entries(audioFiles));

    const clips = await this.processScenes(scriptAnalysis.scenes, audioFileMap);
    const totalDuration = clips.length > 0
      ? Math.max(...clips.map(c => c.endTime))
      : scriptAnalysis.totalDuration;

    return {
      clips,
      totalDuration,
      processedAt: getCurrentISOTime(),
    };
  }

  /**
   * 各シーンの音声を処理
   */
  private async processScenes(
    scenes: Scene[],
    audioFiles: Map<string, FilePath>
  ): Promise<AudioClip[]> {
    const clips: AudioClip[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      // シーンIDまたはインデックスで音声ファイルを検索
      const audioPath = audioFiles.get(scene.id)
        || audioFiles.get(i.toString())
        || audioFiles.get(`scene_${i}`);

      if (audioPath) {
        const audioInfo = await this.analyzeAudioFile(audioPath);
        const clip = this.createClip(scene, audioPath, audioInfo);
        clips.push(clip);
      } else {
        // 音声ファイルがない場合は自動生成用のプレースホルダー
        const placeholderPath = normalizeAssetPath('audio', `${scene.id}.wav`);
        const clip = this.createPlaceholderClip(scene, placeholderPath);
        clips.push(clip);
      }
    }

    return clips;
  }

  /**
   * 音声ファイルを分析（実際の実装ではffprobeなどを使用）
   */
  private async analyzeAudioFile(filePath: FilePath): Promise<AudioFileInfo> {
    // シミュレート: 実際の実装ではファイルを読み込んで分析
    return {
      duration: 5.0, // 仮の値
      sampleRate: 44100,
      channels: 2,
    };
  }

  /**
   * 音声クリップを作成
   */
  private createClip(scene: Scene, filePath: FilePath, audioInfo: AudioFileInfo): AudioClip {
    // 音声の長さをシーンの長さに合わせる
    const effectiveDuration = Math.min(audioInfo.duration, scene.duration);

    return {
      id: generateId('audio'),
      sceneId: scene.id,
      filePath,
      startTime: scene.startTime,
      endTime: scene.startTime + effectiveDuration,
      duration: effectiveDuration,
      volume: this.defaultVolume,
      fadeIn: this.defaultFadeIn,
      fadeOut: this.defaultFadeOut,
    };
  }

  /**
   * プレースホルダークリップを作成（TTSなどで後から生成する用）
   */
  private createPlaceholderClip(scene: Scene, placeholderPath: FilePath): AudioClip {
    return {
      id: generateId('audio_placeholder'),
      sceneId: scene.id,
      filePath: placeholderPath,
      startTime: scene.startTime,
      endTime: scene.endTime,
      duration: scene.duration,
      volume: this.defaultVolume,
      fadeIn: this.defaultFadeIn,
      fadeOut: this.defaultFadeOut,
    };
  }

  /**
   * 音量を正規化（ピーク値を基準に調整）
   */
  normalizeVolume(clips: AudioClip[], targetPeak: number = 0.9): AudioClip[] {
    const maxVolume = Math.max(...clips.map(c => c.volume));
    const scaleFactor = targetPeak / maxVolume;

    return clips.map(clip => ({
      ...clip,
      volume: Math.min(clip.volume * scaleFactor, 1.0),
    }));
  }

  /**
   * クロスフェードを適用
   */
  applyCrossfade(clips: AudioClip[], crossfadeDuration: Timestamp = 0.5): AudioClip[] {
    return clips.map((clip, index) => {
      const modified = { ...clip };

      // 前のクリップとのクロスフェード
      if (index > 0) {
        modified.fadeIn = crossfadeDuration;
      }

      // 次のクリップとのクロスフェード
      if (index < clips.length - 1) {
        modified.fadeOut = crossfadeDuration;
      }

      return modified;
    });
  }
}

// デフォルトエクスポート
export default new AudioProcessorAgent();
