import { supabase } from "@/lib/supabase";

// Endpoints de l'API publique bicolline.online/api/ copiés dans game_snapshots.
export const GAME_ENDPOINTS = [
  "guild",
  "belief",
  "domain",
  "vault",
  "region",
  "province",
  "poi",
  "army",
  "ship",
  "mage",
] as const;

export type GameEndpoint = (typeof GAME_ENDPOINTS)[number];

export type IdName = { id: number; name: string };
export type Units = { units_qt: number; units_name: string }[];
// L'API renvoie "" quand une coordonnée est absente.
export type Coordinate = number | "";

export type ApiGuild = {
  general: {
    name: string;
    province: string;
    region: string;
    owner: string;
    founding_year: number | null;
    number_of_guildies: number;
    is_faction: boolean;
  };
  notoriety: {
    current_notoriety: number;
    last_gb_notoriety: number;
    total_presences: number;
    base_notoriety: {
      taille: number;
      anciennete: number;
      decorum: number;
      campement: number;
      quartier: number;
    };
    exploits: { name: string; bonus: number; season: string | null }[];
  };
};

export type ApiBelief = {
  general: {
    name: string;
    number_of_believers: number;
    public_note: string | null;
  };
  doctrines: {
    primary: string | null;
    secondary: string | null;
    tertiary: string | null;
  };
  devotion: { current: number; target: number; is_target_reached: boolean };
  high_priests: { character: string; highpriest_id: number | null }[];
};

export type ApiDomain = {
  domain_info: {
    name: string;
    owner: string;
    guild: IdName | null;
    dev_status: string;
    mine_type: string;
    mine_size: string | null;
    zone_tellurique: boolean;
    coastal: boolean;
    ressource_type: string;
    x: Coordinate;
    y: Coordinate;
    public_note: string | null;
    key_insight: string;
  };
  buildings: string[];
  units: Units;
};

export type ApiVault = {
  building: string;
  vault: number;
  domain: IdName;
  owner: string;
  guild: IdName | null;
};

type Reserve = {
  entries: { domain: string; building: string; vault: number }[];
  base: number;
  vault_total: number;
  vault_bonus: number;
  total: number;
};

type Fief = { name: string; id: number; domain: IdName[] };

export type ApiRegion = {
  region_info: { name: string; owners: string[]; public_note: string | null };
  provinces: { name: string; id: number; fiefs: Fief[] }[];
  reserve: Reserve & { maritime_bonus: number };
};

export type ApiProvince = {
  province_info: {
    name: string;
    owner: string;
    number_of_affiliated_guilds: number;
    public_note: string | null;
  };
  fiefs: Fief[];
  reserve: Reserve;
};

export type ApiPoi = {
  name: string;
  category: string;
  region: string;
  x: Coordinate;
  y: Coordinate;
  prevent_construction: boolean;
  public_note: string | null;
};

export type ApiArmy = {
  name: string;
  guild: IdName | null;
  general: IdName | null;
  category: string;
  x: Coordinate;
  y: Coordinate;
  units: Units;
  public_note: string | null;
  key_insight: string;
};

export type ApiShip = {
  name: string;
  owner: IdName | null;
  guild: IdName | null;
  category: string;
  current_structure: number;
  max_structure: number;
  x: Coordinate;
  y: Coordinate;
  is_admiral: boolean;
  improvements: string[];
  banners: string[];
  units: Units;
  public_note: string | null;
  key_insight: string;
};

export type ApiMage = {
  character: string;
  guild: IdName | null;
  residence: { building: string; domain: string };
  apprentice: IdName | null;
  spells: { id: number; name: string; tradition: string; level: string }[];
  public_note: string | null;
};

type SnapshotShapes = {
  guild: Record<string, ApiGuild>;
  belief: Record<string, ApiBelief>;
  domain: Record<string, ApiDomain>;
  vault: Record<string, ApiVault>;
  region: Record<string, ApiRegion>;
  province: Record<string, ApiProvince>;
  poi: Record<string, Record<string, ApiPoi>>;
  army: Record<string, ApiArmy>;
  ship: Record<string, ApiShip>;
  mage: Record<string, ApiMage>;
};

export type GameSnapshot<E extends GameEndpoint> = {
  data: SnapshotShapes[E];
  syncedAt: string;
};

// Les instantanés pèsent jusqu'à ~2 Mo : on les garde en mémoire le temps de la session.
const snapshotCache = new Map<GameEndpoint, Promise<unknown>>();

export function getGameSnapshot<E extends GameEndpoint>(
  endpoint: E,
): Promise<GameSnapshot<E> | null> {
  const cached = snapshotCache.get(endpoint);
  if (cached) return cached as Promise<GameSnapshot<E> | null>;

  const promise = (async () => {
    const { data, error } = await supabase
      .from("game_snapshots")
      .select("data, synced_at")
      .eq("endpoint", endpoint)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { data: data.data, syncedAt: data.synced_at } as GameSnapshot<E>;
  })();
  promise.catch(() => snapshotCache.delete(endpoint));
  snapshotCache.set(endpoint, promise);
  return promise;
}

export function formatCoordinates(x: Coordinate, y: Coordinate): string {
  return x === "" || y === "" ? "—" : `${x}, ${y}`;
}

export function formatUnits(units: Units): string {
  return units.length > 0
    ? units.map((u) => `${u.units_qt} ${u.units_name}`).join(", ")
    : "—";
}

export function sumUnits(units: Units): number {
  return units.reduce((total, u) => total + u.units_qt, 0);
}
