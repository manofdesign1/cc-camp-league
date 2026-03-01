import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const SLACK_CHANNEL_ID = "C0ABTN1UV1A"; // #ai_native_camp

function getLevelEmoji(tokens: number) {
  if (tokens >= 500_000_000) return "🐉";
  if (tokens >= 300_000_000) return "🦅";
  if (tokens >= 150_000_000) return "🦚";
  if (tokens >= 80_000_000) return "🦩";
  if (tokens >= 40_000_000) return "🕊️";
  if (tokens >= 20_000_000) return "🦉";
  if (tokens >= 8_000_000) return "🐓";
  if (tokens >= 3_000_000) return "🐥";
  if (tokens >= 1_000_000) return "🐣";
  return "🥚";
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "CONVEX_URL not set" }, { status: 500 });
    }

    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
      return NextResponse.json({ error: "SLACK_BOT_TOKEN not set" }, { status: 500 });
    }

    // Query today's leaderboard from Convex
    const client = new ConvexHttpClient(convexUrl);
    const today = new Date();
    // KST is UTC+9, so "today" in KST
    const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000);
    const dateStr = kstDate.toISOString().split("T")[0];

    const result = await client.query(api.submissions.getLeaderboardByDateRange, {
      dateFrom: dateStr,
      dateTo: dateStr,
      sortBy: "tokens",
      limit: 10,
    });

    if (!result.items || result.items.length === 0) {
      return NextResponse.json({ message: "No data for today, skipping" });
    }

    // Build Slack message
    const lines = result.items.map((item: any, i: number) => {
      const rank = i + 1;
      const emoji = getLevelEmoji(item.totalTokens);
      const name = item.githubUsername || item.username;
      const tokens = formatTokens(item.totalTokens);
      const medal = rank === 1 ? " 👑" : "";
      return `${emoji}  *${rank}위*  ${name}  \`${tokens} tokens\`${medal}`;
    });

    const message = [
      `🏆 *AI Native Camp — 오늘의 최종 순위* (${dateStr})`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      "",
      ...lines,
      "",
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Top ${result.items.length} | <https://cc-camp-league.vercel.app|전체 순위 보기>`,
    ].join("\n");

    // Post to Slack
    const slackResponse = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: message,
      }),
    });

    const slackResult = await slackResponse.json();

    if (!slackResult.ok) {
      console.error("Slack post failed:", slackResult.error);
      return NextResponse.json({ error: slackResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      date: dateStr,
      participants: result.items.length,
    });
  } catch (error: any) {
    console.error("Daily ranking cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
