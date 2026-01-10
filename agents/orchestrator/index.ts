/**
 * オーケストレーター（統括エージェント）
 *
 * 役割: 全エージェントを統括し、パイプラインを管理して最終的な動画を出力する
 */

import type {
  PipelineStage,
  PipelineState,
  ProjectState,
  RenderConfig,
  ScriptAnalysisResult,
  AudioProcessingResult,
  SubtitleGenerationResult,
  VideoCompositionResult,
  BGMManagementResult,
  FilePath,
} from '../shared/types';
import { generateId, getCurrentISOTime, normalizeAssetPath, DEFAULT_RESOLUTION } from '../shared/utils';

// 各エージェントをインポート
import ScriptAnalyzerAgent, { type ScriptInput } from '../script-analyzer';
import AudioProcessorAgent, { type AudioProcessingInput } from '../audio-processor';
import SubtitleGeneratorAgent, { type SubtitleGenerationInput } from '../subtitle-generator';
import VideoComposerAgent, { type VideoCompositionInput, type LayoutPreset } from '../video-composer';
import BGMManagerAgent, { type BGMManagementInput } from '../bgm-manager';

/** プロジェクト作成入力 */
export interface CreateProjectInput {
  /** プロジェクト名 */
  name: string;
  /** 台本テキスト */
  script: string;
  /** 素材ファイルパス */
  assets?: {
    audio?: Record<string, FilePath>;
    avatar?: Record<string, FilePath>;
    background?: Record<string, FilePath>;
    images?: Record<string, FilePath>;
    bgm?: Record<string, FilePath>;
  };
  /** レンダリング設定 */
  renderConfig?: Partial<RenderConfig>;
  /** レイアウトプリセット */
  layoutPreset?: LayoutPreset;
}

/** パイプライン実行オプション */
export interface PipelineOptions {
  /** 特定のステージからスタート */
  startFrom?: PipelineStage;
  /** 特定のステージで停止 */
  stopAt?: PipelineStage;
  /** エラー時に続行するか */
  continueOnError?: boolean;
  /** 進捗コールバック */
  onProgress?: (stage: PipelineStage, status: string) => void;
}

/** デフォルトのレンダリング設定 */
const DEFAULT_RENDER_CONFIG: RenderConfig = {
  outputPath: normalizeAssetPath('output', 'video.mp4'),
  resolution: DEFAULT_RESOLUTION,
  fps: 30,
  codec: 'h264',
  quality: 'high',
};

/**
 * オーケストレーター
 */
export class Orchestrator {
  private projectState: ProjectState | null = null;

  /**
   * 新しいプロジェクトを作成
   */
  async createProject(input: CreateProjectInput): Promise<ProjectState> {
    const projectId = generateId('proj');
    const now = getCurrentISOTime();

    const renderConfig: RenderConfig = {
      ...DEFAULT_RENDER_CONFIG,
      ...input.renderConfig,
    };

    this.projectState = {
      projectId,
      projectName: input.name,
      pipeline: this.initializePipelineState(),
      renderConfig,
      createdAt: now,
      updatedAt: now,
    };

    return this.projectState;
  }

  /**
   * パイプライン状態を初期化
   */
  private initializePipelineState(): PipelineState {
    const stages: PipelineStage[] = [
      'script-analysis',
      'audio-processing',
      'subtitle-generation',
      'video-composition',
      'bgm-management',
      'rendering',
    ];

    const stageStatuses = stages.reduce((acc, stage) => {
      acc[stage] = { status: 'pending' };
      return acc;
    }, {} as PipelineState['stages']);

    return {
      currentStage: 'script-analysis',
      stages: stageStatuses,
    };
  }

  /**
   * パイプラインを実行
   */
  async runPipeline(
    input: CreateProjectInput,
    options: PipelineOptions = {}
  ): Promise<ProjectState> {
    const { onProgress } = options;

    // プロジェクト作成
    await this.createProject(input);

    if (!this.projectState) {
      throw new Error('Failed to create project');
    }

    try {
      // 1. スクリプト分析
      onProgress?.('script-analysis', 'スクリプトを分析中...');
      await this.runScriptAnalysis(input.script);

      // 2. 音声処理
      onProgress?.('audio-processing', '音声を処理中...');
      await this.runAudioProcessing(input.assets?.audio || {});

      // 3. 字幕生成
      onProgress?.('subtitle-generation', '字幕を生成中...');
      await this.runSubtitleGeneration();

      // 4. 映像配置
      onProgress?.('video-composition', '映像を配置中...');
      await this.runVideoComposition(
        input.assets?.avatar || {},
        input.assets?.background || {},
        input.assets?.images || {},
        input.layoutPreset
      );

      // 5. BGM管理
      onProgress?.('bgm-management', 'BGMを設定中...');
      await this.runBGMManagement(input.assets?.bgm || {});

      // 6. レンダリング（Remotion設定を生成）
      onProgress?.('rendering', 'レンダリング準備中...');
      await this.prepareRendering();

      return this.projectState;

    } catch (error) {
      this.updateStageStatus(this.projectState.pipeline.currentStage, 'failed', String(error));
      throw error;
    }
  }

  /**
   * スクリプト分析を実行
   */
  private async runScriptAnalysis(script: string): Promise<void> {
    if (!this.projectState) throw new Error('No project');

    this.updateStageStatus('script-analysis', 'running');

    const input: ScriptInput = {
      title: this.projectState.projectName,
      rawScript: script,
    };

    const result = await ScriptAnalyzerAgent.process(input);

    this.projectState.scriptAnalysis = result;
    this.projectState.updatedAt = getCurrentISOTime();
    this.updateStageStatus('script-analysis', 'completed');
  }

  /**
   * 音声処理を実行
   */
  private async runAudioProcessing(audioFiles: Record<string, FilePath>): Promise<void> {
    if (!this.projectState?.scriptAnalysis) throw new Error('Script analysis required');

    this.updateStageStatus('audio-processing', 'running');

    const input: AudioProcessingInput = {
      scriptAnalysis: this.projectState.scriptAnalysis,
      audioFiles,
    };

    const result = await AudioProcessorAgent.process(input);

    this.projectState.audioProcessing = result;
    this.projectState.updatedAt = getCurrentISOTime();
    this.updateStageStatus('audio-processing', 'completed');
  }

  /**
   * 字幕生成を実行
   */
  private async runSubtitleGeneration(): Promise<void> {
    if (!this.projectState?.scriptAnalysis) throw new Error('Script analysis required');

    this.updateStageStatus('subtitle-generation', 'running');

    const input: SubtitleGenerationInput = {
      scriptAnalysis: this.projectState.scriptAnalysis,
    };

    const result = await SubtitleGeneratorAgent.process(input);

    this.projectState.subtitleGeneration = result;
    this.projectState.updatedAt = getCurrentISOTime();
    this.updateStageStatus('subtitle-generation', 'completed');
  }

  /**
   * 映像配置を実行
   */
  private async runVideoComposition(
    avatarAssets: Record<string, FilePath>,
    backgroundAssets: Record<string, FilePath>,
    imageAssets: Record<string, FilePath>,
    layoutPreset?: LayoutPreset
  ): Promise<void> {
    if (!this.projectState?.scriptAnalysis) throw new Error('Script analysis required');

    this.updateStageStatus('video-composition', 'running');

    const input: VideoCompositionInput = {
      scriptAnalysis: this.projectState.scriptAnalysis,
      avatarAssets,
      backgroundAssets,
      imageAssets,
      resolution: this.projectState.renderConfig.resolution,
      fps: this.projectState.renderConfig.fps,
      layoutPreset,
    };

    const result = await VideoComposerAgent.process(input);

    this.projectState.videoComposition = result;
    this.projectState.updatedAt = getCurrentISOTime();
    this.updateStageStatus('video-composition', 'completed');
  }

  /**
   * BGM管理を実行
   */
  private async runBGMManagement(bgmFiles: Record<string, FilePath>): Promise<void> {
    if (!this.projectState?.scriptAnalysis) throw new Error('Script analysis required');

    this.updateStageStatus('bgm-management', 'running');

    const input: BGMManagementInput = {
      scriptAnalysis: this.projectState.scriptAnalysis,
      audioProcessing: this.projectState.audioProcessing,
      bgmFiles,
    };

    const result = await BGMManagerAgent.process(input);

    this.projectState.bgmManagement = result;
    this.projectState.updatedAt = getCurrentISOTime();
    this.updateStageStatus('bgm-management', 'completed');
  }

  /**
   * レンダリング準備
   */
  private async prepareRendering(): Promise<void> {
    if (!this.projectState) throw new Error('No project');

    this.updateStageStatus('rendering', 'running');

    // ここでRemotionの設定ファイルを生成
    // 実際のレンダリングはRemotionのCLIで行う

    this.updateStageStatus('rendering', 'completed');
  }

  /**
   * ステージステータスを更新
   */
  private updateStageStatus(
    stage: PipelineStage,
    status: 'pending' | 'running' | 'completed' | 'failed',
    error?: string
  ): void {
    if (!this.projectState) return;

    const now = getCurrentISOTime();
    const stageState = this.projectState.pipeline.stages[stage];

    stageState.status = status;

    if (status === 'running') {
      stageState.startedAt = now;
      this.projectState.pipeline.currentStage = stage;
    } else if (status === 'completed' || status === 'failed') {
      stageState.completedAt = now;
    }

    if (error) {
      stageState.error = error;
    }
  }

  /**
   * Remotion用のコンポジションデータを生成
   */
  generateRemotionComposition(): RemotionCompositionData {
    if (!this.projectState) throw new Error('No project');

    return {
      id: this.projectState.projectId,
      component: 'MainComposition',
      durationInFrames: Math.ceil(
        (this.projectState.scriptAnalysis?.totalDuration || 0) *
        this.projectState.renderConfig.fps
      ),
      fps: this.projectState.renderConfig.fps,
      width: this.projectState.renderConfig.resolution.width,
      height: this.projectState.renderConfig.resolution.height,
      defaultProps: {
        scenes: this.projectState.scriptAnalysis?.scenes || [],
        audioClips: this.projectState.audioProcessing?.clips || [],
        subtitles: this.projectState.subtitleGeneration?.entries || [],
        videoLayers: this.projectState.videoComposition?.layers || [],
        bgmTracks: this.projectState.bgmManagement?.tracks || [],
      },
    };
  }

  /**
   * プロジェクト状態をJSONとしてエクスポート
   */
  exportProjectState(): string {
    if (!this.projectState) throw new Error('No project');
    return JSON.stringify(this.projectState, null, 2);
  }

  /**
   * プロジェクト状態をインポート
   */
  importProjectState(json: string): ProjectState {
    this.projectState = JSON.parse(json);
    return this.projectState!;
  }

  /**
   * 現在のプロジェクト状態を取得
   */
  getProjectState(): ProjectState | null {
    return this.projectState;
  }
}

/** Remotion用コンポジションデータ */
export interface RemotionCompositionData {
  id: string;
  component: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: {
    scenes: ScriptAnalysisResult['scenes'];
    audioClips: AudioProcessingResult['clips'];
    subtitles: SubtitleGenerationResult['entries'];
    videoLayers: VideoCompositionResult['layers'];
    bgmTracks: BGMManagementResult['tracks'];
  };
}

// シングルトンインスタンス
export const orchestrator = new Orchestrator();

// デフォルトエクスポート
export default orchestrator;
