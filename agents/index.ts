/**
 * 動画編集エージェントシステム
 *
 * Remotionを使用した動画編集を自動化するサブエージェントシステム
 *
 * ========================================
 * AI動画 + 楽曲字幕 モード（シンプル）
 * ========================================
 *
 * ```typescript
 * import { aiVideoEditor } from './agents';
 *
 * const result = await aiVideoEditor.edit({
 *   projectName: 'my-music-video',
 *   videoFiles: ['project/ai-video/scene1.mp4'],
 *   musicFile: 'project/audio/song.mp3',
 *   duration: 180, // 3分
 *   lyrics: `
 *     [00:05.00]最初の歌詞
 *     [00:10.00]次の歌詞
 *     [00:15.00]サビの部分
 *   `,
 * });
 *
 * // Remotion用の設定を生成
 * const composition = aiVideoEditor.toRemotionComposition(result);
 * ```
 *
 * ========================================
 * フル機能モード（台本ベース）
 * ========================================
 *
 * ```typescript
 * import { orchestrator } from './agents';
 *
 * const project = await orchestrator.runPipeline({
 *   name: 'My Video',
 *   script: '【イントロ】こんにちは！',
 *   assets: { avatar: { default: 'project/avatar/main.mp4' } },
 * });
 * ```
 */

// 共通モジュール
export * from './shared/types';
export * from './shared/utils';

// 各エージェント
export { default as ScriptAnalyzerAgent } from './script-analyzer';
export type { ScriptInput } from './script-analyzer';

export { default as AudioProcessorAgent } from './audio-processor';
export type { AudioProcessingInput } from './audio-processor';

export { default as SubtitleGeneratorAgent } from './subtitle-generator';
export type { SubtitleGenerationInput } from './subtitle-generator';

export { default as VideoComposerAgent } from './video-composer';
export type { VideoCompositionInput, LayoutPreset } from './video-composer';

export { default as BGMManagerAgent } from './bgm-manager';
export type { BGMManagementInput, DuckingConfig } from './bgm-manager';

// 歌詞字幕エージェント（楽曲向け）
export { default as LyricsSubtitleAgent } from './lyrics-subtitle';
export type { LyricsInput, LyricLine, LyricsSubtitleResult } from './lyrics-subtitle';

// AI動画エディター（シンプルモード）
export { aiVideoEditor, AIVideoEditor } from './ai-video-editor';
export type { AIVideoEditInput, AIVideoEditResult } from './ai-video-editor';

// オーケストレーター
export { orchestrator, Orchestrator } from './orchestrator';
export type {
  CreateProjectInput,
  PipelineOptions,
  RemotionCompositionData,
} from './orchestrator';

/**
 * クイックスタート: AI動画 + 楽曲字幕で動画を作成
 *
 * @example
 * ```typescript
 * const result = await createMusicVideo({
 *   name: 'my-song',
 *   video: 'project/ai-video/video.mp4',
 *   music: 'project/audio/song.mp3',
 *   duration: 180,
 *   lyrics: '[00:05.00]歌詞...',
 * });
 * ```
 */
export async function createMusicVideo(options: {
  name: string;
  video: string | string[];
  music: string;
  duration: number;
  lyrics?: string;
}) {
  const { aiVideoEditor } = await import('./ai-video-editor');

  const videoFiles = Array.isArray(options.video) ? options.video : [options.video];

  return aiVideoEditor.edit({
    projectName: options.name,
    videoFiles,
    musicFile: options.music,
    duration: options.duration,
    lyrics: options.lyrics,
  });
}

/**
 * クイックスタート: 台本から動画プロジェクトを作成
 */
export async function createVideoProject(
  name: string,
  script: string,
  options?: {
    assets?: {
      audio?: Record<string, string>;
      avatar?: Record<string, string>;
      background?: Record<string, string>;
      images?: Record<string, string>;
      bgm?: Record<string, string>;
    };
    onProgress?: (stage: string, status: string) => void;
  }
) {
  const { orchestrator } = await import('./orchestrator');

  return orchestrator.runPipeline(
    {
      name,
      script,
      assets: options?.assets,
    },
    {
      onProgress: options?.onProgress,
    }
  );
}
