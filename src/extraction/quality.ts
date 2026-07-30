export function articleQuality(
  text: string,
  contentHtml: string,
): { pass: boolean; score: number } {
  const normalized = text.replace(/\s+/g, " ").trim();
  const blockCount = (
    contentHtml.match(/<(p|h[1-6]|li|blockquote|pre|table)\b/gi) ?? []
  ).length;
  const lengthScore = Math.min(70, normalized.length / 20);
  const structureScore = Math.min(30, blockCount * 5);
  const score = Math.round(lengthScore + structureScore);
  return {
    pass:
      normalized.length >= 200 &&
      (blockCount >= 2 || normalized.length >= 500),
    score,
  };
}
