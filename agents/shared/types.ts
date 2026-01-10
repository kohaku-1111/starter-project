/**
 * 動画編集エージェントシステム - 共通型定義
 */

// ============================================
// 基本型
// ============================================

/** タイムスタンプ（秒単位） */
export type Timestamp = number;

/** フレーム番号 */
export type Frame = number;

/** ファイルパス */
export type FilePath = string;

// ============================================
// スクリプト分析エージェントの型
// ============================================

/** シーンの種類 */
export type SceneType = 'intro' | 'main' | 'transition' | 'outro';

/** シーン情報 */
export interface Scene {
  id: string;
  type: SceneType;
  startTime: Timestamp;
  endTime: Timestamp;
  duration: Timestamp;
  text: string;
  speaker?: string;
  emotion?: string;
  notes?: string;
}

/** スクリプト分析結果 */
export interface ScriptAnalysisResult {
  title: string;
  totalDuration: Timestamp;
  scenes: Scene[];
  metadata: {
    createdAt: string;
    version: string;
  };
}

// ============================================
// 音声処理エージェントの型
// ============================================

/** 音声クリップ */
export interface AudioClip {
  id: string;
  sceneId: string;
  filePath: FilePath;
  startTime: Timestamp;
  endTime: Timestamp;
  duration: Timestamp;
  volume: number; // 0.0 - 1.0
  fadeIn?: Timestamp;
  fadeOut?: Timestamp;
}

/** 音声処理結果 */
export interface AudioProcessingResult {
  clips: AudioClip[];
  totalDuration: Timestamp;
  processedAt: string;
}

// ============================================
// 字幕生成エージェントの型
// ============================================

/** 字幕スタイル */
export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  backgroundColor?: string;
  position: 'top' | 'center' | 'bottom';
  alignment: 'left' | 'center' | 'right';
}

/** 字幕エントリ */
export interface SubtitleEntry {
  id: string;
  sceneId: string;
  text: string;
  startTime: Timestamp;
  endTime: Timestamp;
  style: SubtitleStyle;
}

/** 字幕生成結果 */
export interface SubtitleGenerationResult {
  entries: SubtitleEntry[];
  defaultStyle: SubtitleStyle;
  generatedAt: string;
}

// ============================================
// 映像配置エージェントの型
// ============================================

/** 映像レイヤー */
export interface VideoLayer {
  id: string;
  sceneId: string;
  type: 'avatar' | 'background' | 'overlay' | 'image';
  filePath: FilePath;
  startTime: Timestamp;
  endTime: Timestamp;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  opacity: number; // 0.0 - 1.0
  animation?: {
    type: 'fadeIn' | 'fadeOut' | 'slideIn' | 'slideOut' | 'scale';
    duration: Timestamp;
  };
}

/** 映像配置結果 */
export interface VideoCompositionResult {
  layers: VideoLayer[];
  resolution: { width: number; height: number };
  fps: number;
  composedAt: string;
}

// ============================================
// BGM管理エージェントの型
// ============================================

/** BGMトラック */
export interface BGMTrack {
  id: string;
  filePath: FilePath;
  startTime: Timestamp;
  endTime: Timestamp;
  volume: number; // 0.0 - 1.0
  loop: boolean;
  fadeIn?: Timestamp;
  fadeOut?: Timestamp;
  ducking?: {
    enabled: boolean;
    targetVolume: number;
    triggerSceneIds: string[];
  };
}

/** BGM管理結果 */
export interface BGMManagementResult {
  tracks: BGMTrack[];
  masterVolume: number;
  managedAt: string;
}

// ============================================
// オーケストレーター（統括）の型
// ============================================

/** パイプラインステージ */
export type PipelineStage =
  | 'script-analysis'
  | 'audio-processing'
  | 'subtitle-generation'
  | 'video-composition'
  | 'bgm-management'
  | 'rendering';

/** ステージステータス */
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed';

/** パイプライン状態 */
export interface PipelineState {
  currentStage: PipelineStage;
  stages: Record<PipelineStage, {
    status: StageStatus;
    startedAt?: string;
    completedAt?: string;
    error?: string;
  }>;
}

/** 最終出力設定 */
export interface RenderConfig {
  outputPath: FilePath;
  resolution: { width: number; height: number };
  fps: number;
  codec: 'h264' | 'h265' | 'vp9';
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

/** プロジェクト全体の状態 */
export interface ProjectState {
  projectId: string;
  projectName: string;
  pipeline: PipelineState;
  scriptAnalysis?: ScriptAnalysisResult;
  audioProcessing?: AudioProcessingResult;
  subtitleGeneration?: SubtitleGenerationResult;
  videoComposition?: VideoCompositionResult;
  bgmManagement?: BGMManagementResult;
  renderConfig: RenderConfig;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// エージェント基底インターフェース
// ============================================

/** エージェントの基底インターフェース */
export interface Agent<TInput, TOutput> {
  name: string;
  description: string;
  process(input: TInput): Promise<TOutput>;
}
