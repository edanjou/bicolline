import "server-only";
import { isSyncDue } from "@/lib/app-settings";
import { BICOLLINE_BASE_URL } from "@/lib/bicolline-client";
import { createAdminClient } from "@/lib/supabase-admin";
import { GAME_ENDPOINTS, type GameEndpoint } from "@/lib/game-data";

const GAME_DATA_SYNC_FREQUENCY_KEY = "game_data_sync_frequency";
const GAME_DATA_LAST_SYNCED_KEY = "game_data_last_synced_at";

// L'API publique limite à une requête par minute par endpoint : chaque
// endpoint n'est donc appelé qu'une seule fois par synchronisation.
async function fetchEndpoint(endpoint: GameEndpoint): Promise<unknown> {
  const res = await fetch(`${BICOLLINE_BASE_URL}/api/${endpoint}/`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 429) {
    throw new Error(
      `${endpoint} : limite de requêtes atteinte, réessayer dans une minute.`,
    );
  }
  if (!res.ok) throw new Error(`${endpoint} : HTTP ${res.status}.`);
  const data = await res.json();
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(`${endpoint} : ${String(data.error)}`);
  }
  return data;
}

export async function syncGameData(options?: { force?: boolean }): Promise<{
  skipped: boolean;
  endpointsSynced: number;
  failures: string[];
}> {
  const admin = createAdminClient();

  if (!options?.force) {
    const { data: settingsRows } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", [GAME_DATA_SYNC_FREQUENCY_KEY, GAME_DATA_LAST_SYNCED_KEY]);
    const frequency =
      settingsRows?.find((r) => r.key === GAME_DATA_SYNC_FREQUENCY_KEY)
        ?.value ?? "daily";
    const lastSyncedAt = settingsRows?.find(
      (r) => r.key === GAME_DATA_LAST_SYNCED_KEY,
    )?.value;
    if (!isSyncDue(lastSyncedAt, frequency)) {
      return { skipped: true, endpointsSynced: 0, failures: [] };
    }
  }

  const results = await Promise.allSettled(
    GAME_ENDPOINTS.map(async (endpoint) => {
      const data = await fetchEndpoint(endpoint);
      const { error } = await admin.from("game_snapshots").upsert({
        endpoint,
        data,
        synced_at: new Date().toISOString(),
      });
      if (error) throw new Error(`${endpoint} : ${error.message}`);
    }),
  );

  // Un endpoint en échec garde sa dernière version enregistrée.
  const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) =>
      r.reason instanceof Error ? r.reason.message : String(r.reason),
    );
  const endpointsSynced = results.length - failures.length;

  if (endpointsSynced === 0) {
    throw new Error(`Aucune donnée synchronisée. ${failures.join(" ")}`);
  }

  await admin.from("app_settings").upsert({
    key: GAME_DATA_LAST_SYNCED_KEY,
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return { skipped: false, endpointsSynced, failures };
}
