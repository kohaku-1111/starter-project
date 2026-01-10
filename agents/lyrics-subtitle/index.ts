/**
 * 歌詞字幕エージェント
 *
 * 役割: 楽曲の歌詞から字幕を生成する（LRC形式対応）
 */

import type {
  Agent,
  SubtitleEntry,
  SubtitleStyle,
  Timestamp,
} from '../shared/types';
import { generateId, getCurrentISOTime } from '../shared/utils';

/** 歌詞入力形式 */
export interface LyricsInput {
  /** LRC形式の歌詞テキスト、または歌詞配列 */
  lyrics: string | LyricLine[];
  /** 楽曲の長さ（秒） */
  duration: number;
  /** スタイル設定 */
  style?: Partial<SubtitleStyle>;
}

/** 歌詞1行 */
export interface LyricLine {
  /** 開始時間（秒） */
  time: Timestamp;
  /** 歌詞テキスト */
  text: string;
}

/** 歌詞字幕結果 */
export interface LyricsSubtitleResult {
  entries: SubtitleEntry[];
  defaultStyle: SubtitleStyle;
  generatedAt: string;
}

/** デフォルトの歌詞スタイル（楽曲向け） */
const DEFAULT_LYRICS_STYLE: SubtitleStyle = {
  fontFamily: 'Noto Sans JP',
  fontSize: 56,
  fontColor: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  position: 'bottom',
  alignment: 'center',
};

/**
 * LRC形式をパース
 * 例: [00:12.34]歌詞テキスト
 */
function parseLRC(lrcText: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;

  let match;
  while ((match = regex.exec(lrcText)) !== null) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const ms = parseInt(match[3].padEnd(3, '0'), 10);
    const text = match[4].trim();

    if (text) {
      const time = minutes * 60 + seconds + ms / 1000;
      lines.push({ time, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

/**
 * シンプルな歌詞形式をパース（タイムスタンプなし、均等割り）
 */
function parseSimpleLyrics(text: string, duration: number): LyricLine[] {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'));

  if (lines.length === 0) return [];

  const timePerLine = duration / lines.length;

  return lines.map((text, index) => ({
    time: index * timePerLine,
    text,
  }));
}

/**
 * 歌詞字幕エージェント
 */
export class LyricsSubtitleAgent implements Agent<LyricsInput, LyricsSubtitleResult> {
  name = 'lyrics-subtitle';
  description = '楽曲の歌詞から字幕を生成する';

  /**
   * 歌詞から字幕を生成
   */
  async process(input: LyricsInput): Promise<LyricsSubtitleResult> {
    const { lyrics, duration, style = {} } = input;

    const mergedStyle: SubtitleStyle = {
      ...DEFAULT_LYRICS_STYLE,
      ...style,
    };

    // 歌詞をパース
    let lyricLines: LyricLine[];

    if (typeof lyrics === 'string') {
      // LRC形式かチェック
      if (lyrics.includes('[') && lyrics.includes(']')) {
        lyricLines = parseLRC(lyrics);
      } else {
        lyricLines = parseSimpleLyrics(lyrics, duration);
      }
    } else {
      lyricLines = lyrics;
    }

    // 字幕エントリを生成
    const entries = this.createEntries(lyricLines, duration, mergedStyle);

    return {
      entries,
      defaultStyle: mergedStyle,
      generatedAt: getCurrentISOTime(),
    };
  }

  /**
   * 字幕エントリを作成
   */
  private createEntries(
    lines: LyricLine[],
    duration: number,
    style: SubtitleStyle
  ): SubtitleEntry[] {
    return lines.map((line, index) => {
      // 終了時間は次の行の開始時間、または楽曲終了
      const nextLine = lines[index + 1];
      const endTime = nextLine ? nextLine.time : duration;

      return {
        id: generateId('lyric'),
        sceneId: 'main',
        text: line.text,
        startTime: line.time,
        endTime,
        style,
      };
    });
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
   * LRC形式でエクスポート
   */
  exportToLRC(entries: SubtitleEntry[]): string {
    return entries
      .map(entry => {
        const time = this.formatLRCTime(entry.startTime);
        return `${time}${entry.text}`;
      })
      .join('\n');
  }

  private formatSRTTime(timestamp: Timestamp): string {
    const hours = Math.floor(timestamp / 3600);
    const minutes = Math.floor((timestamp % 3600) / 60);
    const seconds = Math.floor(timestamp % 60);
    const ms = Math.floor((timestamp % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  private formatLRCTime(timestamp: Timestamp): string {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    const cs = Math.floor((timestamp % 1) * 100);
    return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}]`;
  }
}

// デフォルトエクスポート
export default new LyricsSubtitleAgent();
