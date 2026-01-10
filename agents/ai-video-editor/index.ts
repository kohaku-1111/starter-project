/**
 * AI動画エディター
 *
 * 役割: AI生成動画と楽曲を組み合わせて、歌詞字幕付きの動画を生成する
 */

import type {
  VideoLayer,
  BGMTrack,
  SubtitleEntry,
  FilePath,
  Timestamp,
} from '../shared/types';
import { generateId, getCurrentISOTime, normalizeAssetPath, DEFAULT_RESOLUTION } from '../shared/utils';
import LyricsSubtitleAgent, { type LyricsInput, type LyricLine } from '../lyrics-subtitle';

/** AI動画編集入力 */
export interface AIVideoEditInput {
  /** プロジェクト名 */
  projectName: string;
  /** AI生成動画ファイル（1つまたは複数） */
  videoFiles: FilePath[];
  /** 楽曲ファイル */
  musicFile: FilePath;
  /** 楽曲の長さ（秒） */
  duration: number;
  /** 歌詞（LRC形式テキスト or 配列） */
  lyrics?: string | LyricLine[];
  /** 解像度 */
  resolution?: { width: number; height: number };
  /** FPS */
  fps?: number;
}

/** AI動画編集結果 */
export interface AIVideoEditResult {
  projectId: string;
  projectName: string;
  /** 動画レイヤー */
  videoLayers: VideoLayer[];
  /** 音楽トラック */
  musicTrack: BGMTrack;
  /** 歌詞字幕 */
  subtitles: SubtitleEntry[];
  /** 設定 */
  config: {
    duration: Timestamp;
    resolution: { width: number; height: number };
    fps: number;
    outputPath: FilePath;
  };
  createdAt: string;
}

/**
 * AI動画エディター
 */
export class AIVideoEditor {
  name = 'ai-video-editor';
  description = 'AI生成動画と楽曲を組み合わせて歌詞字幕付き動画を生成する';

  /**
   * AI動画を編集
   */
  async edit(input: AIVideoEditInput): Promise<AIVideoEditResult> {
    const {
      projectName,
      videoFiles,
      musicFile,
      duration,
      lyrics,
      resolution = DEFAULT_RESOLUTION,
      fps = 30,
    } = input;

    const projectId = generateId('aivideo');

    // 1. 動画レイヤーを作成
    const videoLayers = this.createVideoLayers(videoFiles, duration, resolution);

    // 2. 音楽トラックを作成
    const musicTrack = this.createMusicTrack(musicFile, duration);

    // 3. 歌詞字幕を生成
    let subtitles: SubtitleEntry[] = [];
    if (lyrics) {
      const lyricsInput: LyricsInput = { lyrics, duration };
      const result = await LyricsSubtitleAgent.process(lyricsInput);
      subtitles = result.entries;
    }

    return {
      projectId,
      projectName,
      videoLayers,
      musicTrack,
      subtitles,
      config: {
        duration,
        resolution,
        fps,
        outputPath: normalizeAssetPath('output', `${projectName}.mp4`),
      },
      createdAt: getCurrentISOTime(),
    };
  }

  /**
   * 動画レイヤーを作成
   */
  private createVideoLayers(
    videoFiles: FilePath[],
    duration: Timestamp,
    resolution: { width: number; height: number }
  ): VideoLayer[] {
    if (videoFiles.length === 0) return [];

    // 動画が1つの場合はフルスクリーン
    if (videoFiles.length === 1) {
      return [{
        id: generateId('video'),
        sceneId: 'main',
        type: 'background',
        filePath: videoFiles[0],
        startTime: 0,
        endTime: duration,
        position: { x: 0, y: 0 },
        size: { width: resolution.width, height: resolution.height },
        zIndex: 0,
        opacity: 1.0,
        animation: { type: 'fadeIn', duration: 0.5 },
      }];
    }

    // 複数動画の場合は均等に分割
    const segmentDuration = duration / videoFiles.length;

    return videoFiles.map((file, index) => ({
      id: generateId('video'),
      sceneId: `segment_${index}`,
      type: 'background' as const,
      filePath: file,
      startTime: index * segmentDuration,
      endTime: (index + 1) * segmentDuration,
      position: { x: 0, y: 0 },
      size: { width: resolution.width, height: resolution.height },
      zIndex: 0,
      opacity: 1.0,
      animation: { type: 'fadeIn' as const, duration: 0.3 },
    }));
  }

  /**
   * 音楽トラックを作成
   */
  private createMusicTrack(musicFile: FilePath, duration: Timestamp): BGMTrack {
    return {
      id: generateId('music'),
      filePath: musicFile,
      startTime: 0,
      endTime: duration,
      volume: 1.0,
      loop: false,
      fadeIn: 0.5,
      fadeOut: 1.0,
    };
  }

  /**
   * Remotion用のコンポジションデータを生成
   */
  toRemotionComposition(result: AIVideoEditResult) {
    return {
      id: result.projectId,
      component: 'AIVideoComposition',
      durationInFrames: Math.ceil(result.config.duration * result.config.fps),
      fps: result.config.fps,
      width: result.config.resolution.width,
      height: result.config.resolution.height,
      defaultProps: {
        videoLayers: result.videoLayers,
        musicTrack: result.musicTrack,
        subtitles: result.subtitles,
      },
    };
  }
}

// シングルトンインスタンス
export const aiVideoEditor = new AIVideoEditor();
export default aiVideoEditor;
