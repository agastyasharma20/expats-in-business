/**
 * Splits a heading into words that rise in one after another. Pure CSS (see .word-rise), so it needs
 * no JavaScript and the text is painted immediately: only transform animates. The real spaces stay
 * between the spans, so screen readers still read one normal sentence.
 */
export function WordRise({ text, startAt = 0 }: { text: string; startAt?: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span
            className="word-rise"
            style={{ "--i": startAt + Math.min(i, 12) } as React.CSSProperties}
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}
