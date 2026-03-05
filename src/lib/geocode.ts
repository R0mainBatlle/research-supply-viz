/**
 * Client-side geocoding using a static GeoNames-derived lookup.
 * The lookup maps normalized French city names to [lon, lat] coordinates.
 */

type GeocodeLookup = Record<string, [number, number]>;

let cache: GeocodeLookup | null = null;

export async function loadGeocodeLookup(): Promise<GeocodeLookup> {
    if (cache) return cache;
    const res = await fetch('/data/geocode_fr.json');
    cache = await res.json();
    return cache!;
}

/** Normalize a city name to match the GeoNames lookup keys. */
export function normalizeCity(city: string): string {
    let s = city.toUpperCase();
    // Strip accents (NFD decompose + remove combining marks)
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Replace hyphens and apostrophes with spaces
    s = s.replace(/[-']/g, ' ');
    // Strip postal suffixes (CEDEX, BP, CS, etc.)
    s = s.replace(/\b(CEDEX|BP|CS)\s*\d*/g, '');
    // Collapse multiple spaces
    s = s.replace(/\s+/g, ' ').trim();
    // Expand ST/STE abbreviations
    const words = s.split(' ');
    const expanded: string[] = [];
    for (const w of words) {
        if (w === 'ST') expanded.push('SAINT');
        else if (w === 'STE') expanded.push('SAINTE');
        else expanded.push(w);
    }
    return expanded.join(' ');
}

export function geocodeCity(
    lookup: GeocodeLookup,
    city: string | null,
): [number, number] | null {
    if (!city) return null;
    return lookup[normalizeCity(city)] ?? null;
}
