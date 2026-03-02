/**
 * Calculate Levenshtein distance between two strings.
 * Used for "did you mean" suggestions.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Convert a name to a URL-safe slug.
 * Used for generating attribute slugs from names.
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Find similar names from a list based on Levenshtein distance.
 * Returns names that are within a threshold distance (max 3).
 */
export function findSimilarNames(
  target: string,
  candidates: readonly string[],
  maxDistance = 3
): string[] {
  const targetLower = target.toLowerCase();
  const withDistances = candidates
    .map((name) => ({
      name,
      distance: levenshteinDistance(targetLower, name.toLowerCase()),
    }))
    .filter((item) => item.distance <= maxDistance && item.distance > 0)
    .sort((a, b) => a.distance - b.distance);

  return withDistances.map((item) => item.name);
}
