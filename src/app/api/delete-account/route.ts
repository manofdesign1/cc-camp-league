import { NextRequest, NextResponse } from "next/server";
import { getServerDataLayer } from "@/lib/data";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = body.username;

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);

    // Delete profiles
    const profileResult = await client.mutation(api.admin.deleteProfilesByPattern, {
      patterns: [username],
      searchField: "both",
      caseSensitive: true,
    });

    // Delete submissions
    const submissionResult = await client.mutation(api.admin.deleteSubmissionsByPattern, {
      patterns: [username],
      searchField: "both",
    });

    return NextResponse.json({
      success: true,
      message: `Account "${username}" deleted`,
      deletedProfiles: profileResult.deletedCount,
      deletedSubmissions: submissionResult.deletedCount,
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
