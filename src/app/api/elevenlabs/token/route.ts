import { NextResponse } from "next/server";
import dns from "node:dns";
import { auth0 } from "@/lib/auth0";

// Prefer IPv4 — some networks hang on the AAAA path to api.elevenlabs.io.
dns.setDefaultResultOrder("ipv4first");

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

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    console.error("ElevenLabs token network error", err);
    return NextResponse.json(
      {
        error:
          "Could not reach ElevenLabs (network timeout). Check your connection or VPN and try again.",
      },
      { status: 502 }
    );
  }

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
