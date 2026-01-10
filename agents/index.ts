/**
 * 動画編集エージェントシステム
 *
 * Remotionを使用した動画編集を自動化するサブエージェントシステム
 *
 * エージェント構成:
 * 1. ScriptAnalyzer - 台本を分析してシーンに分割
 * 2. AudioProcessor - 音声ファイルをシーンに紐付け
 * 3. SubtitleGenerator - 字幕を生成
 * 4. VideoComposer - 映像素材を配置
 * 5. BGMManager - BGMを管理
 * 6. Orchestrator - 全体を統括
 *
 * 使用例:
 * ```typescript
 * import { orchestrator, CreateProjectInput } from './agents';
 *
 * const input: CreateProjectInput = {
 *   name: 'My Video Project',
 *   script: `
 *     【イントロ】
 *     こんにちは！今日は新機能を紹介します。
 *     ---
 *     【メイン】
 *     この機能はとても便利です。
 *     ---
 *     【アウトロ】
 *     ご視聴ありがとうございました！
 *   `,
 *   assets: {
 *     avatar: { default: 'project/avatar/main.mp4' },
 *     bgm: { intro: 'project/bgm/intro.mp3' },
 *   },
 * };
 *
 * const project = await orchestrator.runPipeline(input, {
 *   onProgress: (stage, status) => console.log(`${stage}: ${status}`),
 * });
 *
 * // Remotion用の設定を生成
 * const composition = orchestrator.generateRemotionComposition();
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

// オーケストレーター
export { orchestrator, Orchestrator } from './orchestrator';
export type {
  CreateProjectInput,
  PipelineOptions,
  RemotionCompositionData,
} from './orchestrator';

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
