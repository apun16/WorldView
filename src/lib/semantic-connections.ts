import { SEMANTIC_CONNECTIONS, type SemanticConnection } from "@/lib/geo-types";

export type SemanticConnectionSource = "database" | "fallback";

export async function getSemanticConnections(): Promise<{
  connections: SemanticConnection[];
  source: SemanticConnectionSource;
}> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return {
      connections: SEMANTIC_CONNECTIONS,
      source: "fallback",
    };
  }

  try {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(process.env.MONGODB_DB || "worldview");
    const docs = await db.collection("semantic_connections").find({}).project({ _id: 0 }).toArray();
    await client.close();

    if (Array.isArray(docs) && docs.length > 0) {
      return {
        connections: docs as SemanticConnection[],
        source: "database",
      };
    }
  } catch {
    // Fall back silently to the hardcoded array if Atlas is unavailable.
  }

  return {
    connections: SEMANTIC_CONNECTIONS,
    source: "fallback",
  };
}
