/**
 * スクリプト分析エージェント
 *
 * 役割: 台本を分析してシーンに分割し、各シーンの情報を抽出する
 */

import type { Agent, Scene, SceneType, ScriptAnalysisResult, Timestamp } from '../shared/types';
import { generateId, getCurrentISOTime } from '../shared/utils';

/** スクリプト入力形式 */
export interface ScriptInput {
  /** 動画タイトル */
  title: string;
  /** 台本テキスト（シーン区切りは "---" または "【シーン】" で表現） */
  rawScript: string;
  /** デフォルトのシーン長さ（秒） */
  defaultSceneDuration?: number;
}

/** シーン区切りパターン */
const SCENE_DELIMITERS = [
  /^---+$/m,                    // ハイフン区切り
  /^【.*?】/m,                   // 【シーン名】形式
  /^\[Scene\s*\d*\]/im,         // [Scene 1] 形式
  /^##\s+/m,                    // Markdown見出し
];

/** 話者パターン */
const SPEAKER_PATTERN = /^(.+?)[:：]\s*(.+)$/;

/** 感情タグパターン */
const EMOTION_PATTERN = /\(([^)]+)\)/;

/**
 * スクリプト分析エージェント
 */
export class ScriptAnalyzerAgent implements Agent<ScriptInput, ScriptAnalysisResult> {
  name = 'script-analyzer';
  description = '台本を分析してシーンに分割し、タイムラインを生成する';

  private defaultDuration: number = 5; // デフォルト5秒/シーン

  /**
   * スクリプトを処理してシーン分析結果を返す
   */
  async process(input: ScriptInput): Promise<ScriptAnalysisResult> {
    if (input.defaultSceneDuration) {
      this.defaultDuration = input.defaultSceneDuration;
    }

    const rawScenes = this.splitIntoScenes(input.rawScript);
    const scenes = this.analyzeScenes(rawScenes);
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

    return {
      title: input.title,
      totalDuration,
      scenes,
      metadata: {
        createdAt: getCurrentISOTime(),
        version: '1.0.0',
      },
    };
  }

  /**
   * 台本をシーンに分割
   */
  private splitIntoScenes(rawScript: string): string[] {
    let scenes: string[] = [rawScript];

    // 区切りパターンで分割を試みる
    for (const delimiter of SCENE_DELIMITERS) {
      const parts = rawScript.split(delimiter).map(s => s.trim()).filter(s => s.length > 0);
      if (parts.length > 1) {
        scenes = parts;
        break;
      }
    }

    // 改行で分割（段落単位）
    if (scenes.length === 1 && scenes[0].includes('\n\n')) {
      scenes = scenes[0].split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 0);
    }

    return scenes;
  }

  /**
   * 各シーンを分析
   */
  private analyzeScenes(rawScenes: string[]): Scene[] {
    const scenes: Scene[] = [];
    let currentTime: Timestamp = 0;

    rawScenes.forEach((rawScene, index) => {
      const sceneType = this.detectSceneType(rawScene, index, rawScenes.length);
      const { text, speaker, emotion } = this.parseSceneContent(rawScene);
      const duration = this.estimateDuration(text);

      const scene: Scene = {
        id: generateId('scene'),
        type: sceneType,
        startTime: currentTime,
        endTime: currentTime + duration,
        duration,
        text,
        speaker,
        emotion,
      };

      scenes.push(scene);
      currentTime += duration;
    });

    return scenes;
  }

  /**
   * シーンタイプを検出
   */
  private detectSceneType(content: string, index: number, total: number): SceneType {
    const lowerContent = content.toLowerCase();

    if (index === 0 || lowerContent.includes('イントロ') || lowerContent.includes('intro') || lowerContent.includes('オープニング')) {
      return 'intro';
    }
    if (index === total - 1 || lowerContent.includes('アウトロ') || lowerContent.includes('outro') || lowerContent.includes('エンディング')) {
      return 'outro';
    }
    if (lowerContent.includes('transition') || lowerContent.includes('転換')) {
      return 'transition';
    }

    return 'main';
  }

  /**
   * シーン内容をパース
   */
  private parseSceneContent(rawScene: string): { text: string; speaker?: string; emotion?: string } {
    let text = rawScene;
    let speaker: string | undefined;
    let emotion: string | undefined;

    // 話者を抽出
    const speakerMatch = rawScene.match(SPEAKER_PATTERN);
    if (speakerMatch) {
      speaker = speakerMatch[1].trim();
      text = speakerMatch[2].trim();
    }

    // 感情タグを抽出
    const emotionMatch = text.match(EMOTION_PATTERN);
    if (emotionMatch) {
      emotion = emotionMatch[1];
      text = text.replace(EMOTION_PATTERN, '').trim();
    }

    return { text, speaker, emotion };
  }

  /**
   * テキストから再生時間を推定（日本語対応）
   */
  private estimateDuration(text: string): Timestamp {
    // 日本語は1文字約0.2秒、英語は1単語約0.4秒で計算
    const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

    const estimatedTime = (japaneseChars * 0.2) + (englishWords * 0.4);

    // 最低でもデフォルト時間、最大30秒
    return Math.max(this.defaultDuration, Math.min(estimatedTime, 30));
  }
}

// デフォルトエクスポート
export default new ScriptAnalyzerAgent();
