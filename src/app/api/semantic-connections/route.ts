import { NextResponse } from "next/server";
import { getSemanticConnections } from "@/lib/semantic-connections";

export async function GET() {
  const result = await getSemanticConnections();
  return NextResponse.json(result);
}
