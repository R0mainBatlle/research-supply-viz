import { CompanyEU, MapCompany, naceToGroup } from '@/types';

/**
 * Deterministic hash-based jitter so companies in the same city
 * don't stack on the exact same pixel. The offset is seeded by
 * the company id → stable across renders, no randomness.
 * ~0.005° ≈ 400-500m spread at French latitudes.
 */
const JITTER_RADIUS = 0.005;

function jitter(id: number, base: [number, number]): [number, number] {
    // Simple integer hash (splitmix-style)
    let h = (id * 2654435761) >>> 0;
    const angle = ((h & 0xffff) / 0xffff) * Math.PI * 2;
    h = ((h >>> 16) ^ h) * 0x45d9f3b;
    const r = ((h & 0xffff) / 0xffff) * JITTER_RADIUS;
    return [
        base[0] + Math.cos(angle) * r,
        base[1] + Math.sin(angle) * r,
    ];
}

export function companyEUToMapCompany(
    c: CompanyEU,
    coordinates: [number, number],
): MapCompany {
    return {
        id: c.id,
        name: c.company_name,
        coordinates: jitter(c.id, coordinates),
        employees: c.employees,
        revenue: c.revenue_eur_th,
        city: c.city,
        region: c.region,
        countryIso: c.country_iso,
        naceCore: c.nace_core,
        naceGroup: naceToGroup(c.nace_core),
        tradeDescription: c.trade_description,
        website: c.website,
        guoName: c.guo_name,
    };
}
