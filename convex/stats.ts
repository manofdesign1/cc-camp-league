import { query } from "./_generated/server";
import { v } from "convex/values";

// WARNING: This is not truly "global" - it only processes top submissions
// to avoid Convex read limits. For accurate global stats, we need pre-aggregation.
export const getGlobalStats = query({
  args: {},
  handler: async (ctx) => {
    // 1. Get unique user count from profiles (lightweight docs)
    const profileCount = await ctx.db
      .query("profiles")
      .take(500)
      .then(profiles => profiles.length);

    // 2. Get top submissions — only read aggregate fields, not full dailyBreakdown
    // Reduced from 500 to 100 to stay within Convex read limits
    const topByCost = await ctx.db
      .query("submissions")
      .withIndex("by_total_cost")
      .order("desc")
      .take(100);

    // 3. Calculate stats from the sample (using only top-level fields)
    let totalCost = 0;
    let totalTokens = 0;
    let totalDays = 0;
    let validSubmissions = 0;
    const uniqueUsersFromSubmissions = new Set<string>();
    const modelUsage: Record<string, number> = {};
    let topSubmission: { totalCost: number; username: string } | null = null;

    for (const submission of topByCost) {
      if (submission.flaggedForReview) continue;

      validSubmissions++;
      uniqueUsersFromSubmissions.add(submission.username);
      totalCost += submission.totalCost;
      totalTokens += submission.totalTokens;
      totalDays += submission.dailyBreakdown.length;

      if (!topSubmission || submission.totalCost > topSubmission.totalCost) {
        topSubmission = { totalCost: submission.totalCost, username: submission.username };
      }

      submission.modelsUsed.forEach(model => {
        const key = model.includes("opus") ? "opus" : "sonnet";
        modelUsage[key] = (modelUsage[key] || 0) + 1;
      });
    }

    const uniqueUserCount = Math.max(
      uniqueUsersFromSubmissions.size,
      profileCount
    );

    const avgCostPerUser = uniqueUserCount > 0 ? totalCost / uniqueUserCount : 0;
    const avgTokensPerUser = uniqueUserCount > 0 ? totalTokens / uniqueUserCount : 0;

    return {
      totalUsers: uniqueUserCount,
      totalSubmissions: validSubmissions,
      totalCost,
      totalTokens,
      avgCostPerUser,
      topCost: topSubmission?.totalCost || 0,
      topUser: topSubmission?.username || "N/A",
      modelUsage,
      totalDays,
      avgTokensPerUser,
      isApproximate: true,
      basedOnTop: 100,
    };
  },
});