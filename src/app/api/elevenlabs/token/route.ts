import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * Mint a short-lived WebRTC conversation token for a private ElevenLabs voice agent.
 * (Signed WebSocket URLs are for text-only — voice walks need this token.)
 * API key never leaves the server.
 */
export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured" },
      { status: 503 }
    );
  }

  const url = new URL(
    "https://api.elevenlabs.io/v1/convai/conversation/token"
  );
  url.searchParams.set("agent_id", agentId);

  const response = await fetch(url, {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("ElevenLabs token error", response.status, detail);
    return NextResponse.json(
      { error: "Failed to start voice session", detail: detail.slice(0, 300) },
      { status: 502 }
    );
  }

  const body = (await response.json()) as { token?: string };
  if (!body.token) {
    return NextResponse.json(
      { error: "Invalid token response" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    token: body.token,
    userId: session.user.sub ?? session.user.email ?? undefined,
  });
}
