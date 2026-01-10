/**
 * 映像配置エージェント
 *
 * 役割: 映像素材（アバター、背景、オーバーレイ）を配置し、レイヤー構成を管理する
 */

import type {
  Agent,
  Scene,
  ScriptAnalysisResult,
  VideoLayer,
  VideoCompositionResult,
  FilePath,
  Timestamp,
} from '../shared/types';
import { generateId, getCurrentISOTime, normalizeAssetPath, DEFAULT_RESOLUTION } from '../shared/utils';

/** 映像配置入力 */
export interface VideoCompositionInput {
  /** スクリプト分析結果 */
  scriptAnalysis: ScriptAnalysisResult;
  /** アバター素材マッピング */
  avatarAssets?: Map<string, FilePath> | Record<string, FilePath>;
  /** 背景素材マッピング */
  backgroundAssets?: Map<string, FilePath> | Record<string, FilePath>;
  /** 画像素材マッピング */
  imageAssets?: Map<string, FilePath> | Record<string, FilePath>;
  /** 解像度設定 */
  resolution?: { width: number; height: number };
  /** FPS設定 */
  fps?: number;
  /** レイアウトプリセット */
  layoutPreset?: LayoutPreset;
}

/** レイアウトプリセット */
export type LayoutPreset =
  | 'center-avatar'       // アバター中央配置
  | 'left-avatar'         // アバター左配置（解説向け）
  | 'right-avatar'        // アバター右配置
  | 'fullscreen-avatar'   // アバターフルスクリーン
  | 'picture-in-picture'  // ピクチャーインピクチャー
  | 'split-screen';       // 画面分割

/** レイアウト設定 */
interface LayoutConfig {
  avatar: { x: number; y: number; width: number; height: number };
  background: { x: number; y: number; width: number; height: number };
  overlay?: { x: number; y: number; width: number; height: number };
}

/** プリセットごとのレイアウト設定 */
const LAYOUT_PRESETS: Record<LayoutPreset, (resolution: { width: number; height: number }) => LayoutConfig> = {
  'center-avatar': (res) => ({
    avatar: { x: res.width * 0.25, y: res.height * 0.2, width: res.width * 0.5, height: res.height * 0.7 },
    background: { x: 0, y: 0, width: res.width, height: res.height },
  }),
  'left-avatar': (res) => ({
    avatar: { x: res.width * 0.05, y: res.height * 0.15, width: res.width * 0.35, height: res.height * 0.7 },
    background: { x: 0, y: 0, width: res.width, height: res.height },
    overlay: { x: res.width * 0.45, y: res.height * 0.1, width: res.width * 0.5, height: res.height * 0.8 },
  }),
  'right-avatar': (res) => ({
    avatar: { x: res.width * 0.6, y: res.height * 0.15, width: res.width * 0.35, height: res.height * 0.7 },
    background: { x: 0, y: 0, width: res.width, height: res.height },
    overlay: { x: res.width * 0.05, y: res.height * 0.1, width: res.width * 0.5, height: res.height * 0.8 },
  }),
  'fullscreen-avatar': (res) => ({
    avatar: { x: 0, y: 0, width: res.width, height: res.height },
    background: { x: 0, y: 0, width: res.width, height: res.height },
  }),
  'picture-in-picture': (res) => ({
    avatar: { x: res.width * 0.7, y: res.height * 0.65, width: res.width * 0.25, height: res.height * 0.3 },
    background: { x: 0, y: 0, width: res.width, height: res.height },
  }),
  'split-screen': (res) => ({
    avatar: { x: 0, y: 0, width: res.width * 0.5, height: res.height },
    background: { x: res.width * 0.5, y: 0, width: res.width * 0.5, height: res.height },
  }),
};

/**
 * 映像配置エージェント
 */
export class VideoComposerAgent implements Agent<VideoCompositionInput, VideoCompositionResult> {
  name = 'video-composer';
  description = '映像素材を配置し、レイヤー構成とアニメーションを管理する';

  private resolution = DEFAULT_RESOLUTION;
  private fps = 30;
  private layoutPreset: LayoutPreset = 'center-avatar';

  /**
   * 映像を配置
   */
  async process(input: VideoCompositionInput): Promise<VideoCompositionResult> {
    const {
      scriptAnalysis,
      avatarAssets = {},
      backgroundAssets = {},
      imageAssets = {},
      resolution,
      fps,
      layoutPreset,
    } = input;

    if (resolution) this.resolution = resolution;
    if (fps) this.fps = fps;
    if (layoutPreset) this.layoutPreset = layoutPreset;

    const avatarMap = this.toMap(avatarAssets);
    const backgroundMap = this.toMap(backgroundAssets);
    const imageMap = this.toMap(imageAssets);

    const layers = this.composeScenes(
      scriptAnalysis.scenes,
      avatarMap,
      backgroundMap,
      imageMap
    );

    return {
      layers,
      resolution: this.resolution,
      fps: this.fps,
      composedAt: getCurrentISOTime(),
    };
  }

  /**
   * Record を Map に変換
   */
  private toMap(assets: Map<string, FilePath> | Record<string, FilePath>): Map<string, FilePath> {
    if (assets instanceof Map) return assets;
    return new Map(Object.entries(assets));
  }

  /**
   * シーンごとに映像を配置
   */
  private composeScenes(
    scenes: Scene[],
    avatarAssets: Map<string, FilePath>,
    backgroundAssets: Map<string, FilePath>,
    imageAssets: Map<string, FilePath>
  ): VideoLayer[] {
    const layers: VideoLayer[] = [];
    const layout = LAYOUT_PRESETS[this.layoutPreset](this.resolution);

    for (const scene of scenes) {
      // 背景レイヤー（最背面）
      const backgroundLayer = this.createBackgroundLayer(scene, backgroundAssets, layout);
      layers.push(backgroundLayer);

      // 画像オーバーレイ（あれば）
      const imageLayer = this.createImageLayer(scene, imageAssets, layout);
      if (imageLayer) {
        layers.push(imageLayer);
      }

      // アバターレイヤー（最前面）
      const avatarLayer = this.createAvatarLayer(scene, avatarAssets, layout);
      layers.push(avatarLayer);
    }

    return layers;
  }

  /**
   * 背景レイヤーを作成
   */
  private createBackgroundLayer(
    scene: Scene,
    backgroundAssets: Map<string, FilePath>,
    layout: LayoutConfig
  ): VideoLayer {
    const bgPath = backgroundAssets.get(scene.id)
      || backgroundAssets.get(scene.type)
      || backgroundAssets.get('default')
      || normalizeAssetPath('images', 'default_bg.png');

    return {
      id: generateId('bg'),
      sceneId: scene.id,
      type: 'background',
      filePath: bgPath,
      startTime: scene.startTime,
      endTime: scene.endTime,
      position: { x: layout.background.x, y: layout.background.y },
      size: { width: layout.background.width, height: layout.background.height },
      zIndex: 0,
      opacity: 1.0,
      animation: scene.type === 'intro' || scene.type === 'outro'
        ? { type: 'fadeIn', duration: 0.5 }
        : undefined,
    };
  }

  /**
   * アバターレイヤーを作成
   */
  private createAvatarLayer(
    scene: Scene,
    avatarAssets: Map<string, FilePath>,
    layout: LayoutConfig
  ): VideoLayer {
    const avatarPath = avatarAssets.get(scene.id)
      || avatarAssets.get(scene.speaker || 'default')
      || avatarAssets.get('default')
      || normalizeAssetPath('avatar', 'default_avatar.mp4');

    return {
      id: generateId('avatar'),
      sceneId: scene.id,
      type: 'avatar',
      filePath: avatarPath,
      startTime: scene.startTime,
      endTime: scene.endTime,
      position: { x: layout.avatar.x, y: layout.avatar.y },
      size: { width: layout.avatar.width, height: layout.avatar.height },
      zIndex: 10,
      opacity: 1.0,
      animation: this.getAvatarAnimation(scene),
    };
  }

  /**
   * 画像オーバーレイレイヤーを作成
   */
  private createImageLayer(
    scene: Scene,
    imageAssets: Map<string, FilePath>,
    layout: LayoutConfig
  ): VideoLayer | null {
    const imagePath = imageAssets.get(scene.id);
    if (!imagePath || !layout.overlay) return null;

    return {
      id: generateId('img'),
      sceneId: scene.id,
      type: 'image',
      filePath: imagePath,
      startTime: scene.startTime,
      endTime: scene.endTime,
      position: { x: layout.overlay.x, y: layout.overlay.y },
      size: { width: layout.overlay.width, height: layout.overlay.height },
      zIndex: 5,
      opacity: 1.0,
      animation: { type: 'fadeIn', duration: 0.3 },
    };
  }

  /**
   * アバターのアニメーションを決定
   */
  private getAvatarAnimation(scene: Scene): VideoLayer['animation'] | undefined {
    switch (scene.type) {
      case 'intro':
        return { type: 'slideIn', duration: 0.5 };
      case 'outro':
        return { type: 'fadeOut', duration: 0.5 };
      default:
        return undefined;
    }
  }

  /**
   * トランジションを追加
   */
  addTransitions(layers: VideoLayer[], transitionDuration: Timestamp = 0.3): VideoLayer[] {
    const sortedLayers = [...layers].sort((a, b) => a.startTime - b.startTime);

    return sortedLayers.map((layer, index) => {
      const modified = { ...layer };

      // 最初のレイヤーにフェードイン
      if (index === 0 && layer.zIndex === 0) {
        modified.animation = { type: 'fadeIn', duration: transitionDuration };
      }

      // 最後のレイヤーにフェードアウト
      if (index === sortedLayers.length - 1 && layer.zIndex === 0) {
        modified.animation = { type: 'fadeOut', duration: transitionDuration };
      }

      return modified;
    });
  }

  /**
   * レイヤーをシーンIDでグループ化
   */
  groupLayersByScene(layers: VideoLayer[]): Map<string, VideoLayer[]> {
    const groups = new Map<string, VideoLayer[]>();

    for (const layer of layers) {
      const existing = groups.get(layer.sceneId) || [];
      existing.push(layer);
      groups.set(layer.sceneId, existing);
    }

    return groups;
  }
}

// デフォルトエクスポート
export default new VideoComposerAgent();
