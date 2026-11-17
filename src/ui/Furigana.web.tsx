/**
 * Japanese text with furigana (web): the browser's native <ruby> layout, which aligns
 * readings over their kanji and wraps lines correctly. See Furigana.tsx for native.
 */
import { fonts } from '@/theme/tokens';

import type { FuriganaProps } from './furiganaTypes';

export function Furigana({ segments, size, showReading, color, readingColor, align = 'left', weight = '400' }: FuriganaProps) {
  return (
    <span
      lang="ja"
      style={{
        display: 'block',
        fontFamily: fonts.jp,
        fontSize: size,
        fontWeight: weight,
        // Same line height either way: toggling furigana must not move the text.
        lineHeight: 2.0,
        color,
        textAlign: align,
        wordBreak: 'break-all',
      }}>
      {segments.map((s, i) =>
        s.r ? (
          <ruby key={i} style={{ rubyAlign: 'center' }}>
            {s.t}
            <rt style={{ fontSize: '0.5em', color: readingColor, visibility: showReading ? 'visible' : 'hidden', userSelect: 'none' }}>
              {s.r}
            </rt>
          </ruby>
        ) : (
          <span key={i}>{s.t}</span>
        ),
      )}
    </span>
  );
}
