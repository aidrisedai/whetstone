/** Map a 0-100 score to the Whetstone status palette. */
export function scoreHex(n: number): string {
  if (n >= 80) return "#41D49A"; // good
  if (n >= 60) return "#FFB020"; // amber
  return "#F2545B"; // warn
}

export function scoreLabel(n: number): string {
  if (n >= 80) return "sharp";
  if (n >= 60) return "getting there";
  return "soft";
}

/** "define_audience" -> "define audience" for display. */
export function prettyPractice(key: string): string {
  return key.replace(/_/g, " ");
}
