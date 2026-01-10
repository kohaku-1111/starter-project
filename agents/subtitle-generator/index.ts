/**
 * 字幕生成エージェント
 *
 * 役割: シーンのテキストから字幕を生成し、スタイルとタイミングを設定する
 */

import type {
  Agent,
  Scene,
  ScriptAnalysisResult,
  SubtitleEntry,
  SubtitleGenerationResult,
  SubtitleStyle,
  Timestamp,
} from '../shared/types';
import { generateId, getCurrentISOTime } from '../shared/utils';

/** 字幕生成入力 */
export interface SubtitleGenerationInput {
  /** スクリプト分析結果 */
  scriptAnalysis: ScriptAnalysisResult;
  /** デフォルトスタイル設定 */
  defaultStyle?: Partial<SubtitleStyle>;
  /** 1行あたりの最大文字数 */
  maxCharsPerLine?: number;
  /** 話者ごとのスタイル設定 */
  speakerStyles?: Record<string, Partial<SubtitleStyle>>;
}

/** デフォルトの字幕スタイル */
const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'Noto Sans JP',
  fontSize: 48,
  fontColor: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  position: 'bottom',
  alignment: 'center',
};

/** 感情に応じた色設定 */
const EMOTION_COLORS: Record<string, string> = {
  happy: '#FFD700',      // ゴールド
  sad: '#87CEEB',        // スカイブルー
  angry: '#FF4444',      // レッド
  surprised: '#FF69B4',  // ピンク
  neutral: '#FFFFFF',    // ホワイト
};

/**
 * 字幕生成エージェント
 */
export class SubtitleGeneratorAgent implements Agent<SubtitleGenerationInput, SubtitleGenerationResult> {
  name = 'subtitle-generator';
  description = 'シーンから字幕を生成し、スタイルとタイミングを設定する';

  private maxCharsPerLine = 20; // 日本語の場合

  /**
   * 字幕を生成
   */
  async process(input: SubtitleGenerationInput): Promise<SubtitleGenerationResult> {
    const {
      scriptAnalysis,
      defaultStyle = {},
      maxCharsPerLine,
      speakerStyles = {},
    } = input;

    if (maxCharsPerLine) {
      this.maxCharsPerLine = maxCharsPerLine;
    }

    const mergedDefaultStyle: SubtitleStyle = {
      ...DEFAULT_SUBTITLE_STYLE,
      ...defaultStyle,
    };

    const entries = this.generateSubtitles(
      scriptAnalysis.scenes,
      mergedDefaultStyle,
      speakerStyles
    );

    return {
      entries,
      defaultStyle: mergedDefaultStyle,
      generatedAt: getCurrentISOTime(),
    };
  }

  /**
   * シーンから字幕エントリを生成
   */
  private generateSubtitles(
    scenes: Scene[],
    defaultStyle: SubtitleStyle,
    speakerStyles: Record<string, Partial<SubtitleStyle>>
  ): SubtitleEntry[] {
    const entries: SubtitleEntry[] = [];

    for (const scene of scenes) {
      // テキストを行に分割
      const lines = this.splitTextIntoLines(scene.text);

      // 各行の表示時間を計算
      const lineEntries = this.createLineEntries(scene, lines, defaultStyle, speakerStyles);
      entries.push(...lineEntries);
    }

    return entries;
  }

  /**
   * テキストを行に分割（最大文字数を考慮）
   */
  private splitTextIntoLines(text: string): string[] {
    const lines: string[] = [];
    let currentLine = '';

    // 句読点や改行で自然に分割
    const segments = text.split(/([。、！？\n])/);

    for (const segment of segments) {
      if (segment === '\n') {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
        continue;
      }

      if (currentLine.length + segment.length > this.maxCharsPerLine) {
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = segment;
      } else {
        currentLine += segment;
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    return lines.filter(line => line.length > 0);
  }

  /**
   * 行ごとの字幕エントリを作成
   */
  private createLineEntries(
    scene: Scene,
    lines: string[],
    defaultStyle: SubtitleStyle,
    speakerStyles: Record<string, Partial<SubtitleStyle>>
  ): SubtitleEntry[] {
    if (lines.length === 0) return [];

    const entries: SubtitleEntry[] = [];
    const timePerLine = scene.duration / lines.length;
    let currentTime = scene.startTime;

    for (const line of lines) {
      // スタイルを決定
      let style = { ...defaultStyle };

      // 話者別スタイルを適用
      if (scene.speaker && speakerStyles[scene.speaker]) {
        style = { ...style, ...speakerStyles[scene.speaker] };
      }

      // 感情に応じた色を適用
      if (scene.emotion && EMOTION_COLORS[scene.emotion]) {
        style.fontColor = EMOTION_COLORS[scene.emotion];
      }

      const entry: SubtitleEntry = {
        id: generateId('sub'),
        sceneId: scene.id,
        text: line,
        startTime: currentTime,
        endTime: currentTime + timePerLine,
        style,
      };

      entries.push(entry);
      currentTime += timePerLine;
    }

    return entries;
  }

  /**
   * SRT形式でエクスポート
   */
  exportToSRT(entries: SubtitleEntry[]): string {
    return entries
      .map((entry, index) => {
        const startTime = this.formatSRTTime(entry.startTime);
        const endTime = this.formatSRTTime(entry.endTime);
        return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`;
      })
      .join('\n');
  }

  /**
   * VTT形式でエクスポート
   */
  exportToVTT(entries: SubtitleEntry[]): string {
    const header = 'WEBVTT\n\n';
    const body = entries
      .map((entry, index) => {
        const startTime = this.formatVTTTime(entry.startTime);
        const endTime = this.formatVTTTime(entry.endTime);
        return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`;
      })
      .join('\n');
    return header + body;
  }

  /**
   * SRT用タイムフォーマット (HH:MM:SS,mmm)
   */
  private formatSRTTime(timestamp: Timestamp): string {
    const hours = Math.floor(timestamp / 3600);
    const minutes = Math.floor((timestamp % 3600) / 60);
    const seconds = Math.floor(timestamp % 60);
    const ms = Math.floor((timestamp % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  /**
   * VTT用タイムフォーマット (HH:MM:SS.mmm)
   */
  private formatVTTTime(timestamp: Timestamp): string {
    return this.formatSRTTime(timestamp).replace(',', '.');
  }

  /**
   * ASS形式でエクスポート（高度なスタイリング用）
   */
  exportToASS(entries: SubtitleEntry[], defaultStyle: SubtitleStyle): string {
    const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${defaultStyle.fontFamily},${defaultStyle.fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const events = entries
      .map(entry => {
        const startTime = this.formatASSTime(entry.startTime);
        const endTime = this.formatASSTime(entry.endTime);
        return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${entry.text}`;
      })
      .join('\n');

    return header + events;
  }

  /**
   * ASS用タイムフォーマット (H:MM:SS.cc)
   */
  private formatASSTime(timestamp: Timestamp): string {
    const hours = Math.floor(timestamp / 3600);
    const minutes = Math.floor((timestamp % 3600) / 60);
    const seconds = Math.floor(timestamp % 60);
    const centiseconds = Math.floor((timestamp % 1) * 100);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
}

// デフォルトエクスポート
export default new SubtitleGeneratorAgent();
