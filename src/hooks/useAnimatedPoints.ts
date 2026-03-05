import { useRef, useState, useEffect } from 'react';
import type Supercluster from 'supercluster';
import { NACE_GROUP_COLORS } from '@/types';
import type { MapPoint } from './useClusters';
import type { FeatureCollection, Point } from 'geojson';

const ANIM_MS = 600;
const MAX_GHOSTS = 500;

type IndicesMap = Map<string, Supercluster<any, any>>;

function pointSize(employees: number): number {
    if (employees <= 20) return 4;
    if (employees <= 50) return 5;
    if (employees <= 150) return 7;
    if (employees <= 400) return 9;
    if (employees <= 1000) return 12;
    return 16;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function easeOut(t: number): number {
    return 1 - (1 - t) ** 3;
}

function ckey(lng: number, lat: number): string {
    return `${lng},${lat}`;
}

function getLeavesSafe(indices: IndicesMap, group: string, clusterId: number) {
    try {
        const sc = indices.get(group);
        if (!sc) return [];
        return sc.getLeaves(clusterId, Infinity);
    } catch {
        return [];
    }
}

interface Anim {
    sLng: number; sLat: number;
    eLng: number; eLat: number;
    sSize: number; eSize: number;
    sOp: number; eOp: number;
    color: string;
    isCluster: boolean;
    pointCount: number;
    pointIndex: number;
    name: string | null;
    naceGroup: string;
    employees: number;
    expansionZoom: number | null;
}

function propsFor(pt: MapPoint, idx: number) {
    const isCluster = pt.type === 'cluster';
    const employees = isCluster ? pt.totalEmployees : (pt.company.employees || 0);
    const naceGroup = isCluster ? pt.dominantGroup : pt.company.naceGroup;
    return {
        isCluster,
        employees,
        naceGroup,
        color: NACE_GROUP_COLORS[naceGroup] || '#888888',
        size: pointSize(employees),
        pointCount: isCluster ? pt.pointCount : 1,
        pointIndex: idx,
        name: isCluster ? null : pt.company.name,
        expansionZoom: isCluster ? pt.expansionZoom : null,
    };
}

function staticGeoJSON(pts: MapPoint[]): FeatureCollection<Point> {
    return {
        type: 'FeatureCollection',
        features: pts.map((pt, i) => {
            const p = propsFor(pt, i);
            return {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [pt.lng, pt.lat] },
                properties: { ...p, opacity: 0.85 },
            };
        }),
    };
}

export function useAnimatedPoints(
    indices: IndicesMap,
    mapPoints: MapPoint[],
    zoom: number,
): FeatureCollection<Point> {
    const prevZoomRef = useRef(zoom);
    const prevPtsRef = useRef(mapPoints);
    const prevIndicesRef = useRef(indices);
    const rafRef = useRef(0);
    const [geo, setGeo] = useState(() => staticGeoJSON(mapPoints));

    useEffect(() => {
        const pz = prevZoomRef.current;
        const pp = prevPtsRef.current;
        const pi = prevIndicesRef.current;

        prevZoomRef.current = zoom;
        prevPtsRef.current = mapPoints;
        prevIndicesRef.current = indices;

        // Skip animation if data changed (indices rebuilt) or zoom unchanged
        if (pi !== indices || pz === zoom) {
            cancelAnimationFrame(rafRef.current);
            setGeo(staticGeoJSON(mapPoints));
            return;
        }

        // --- Build old-position lookup ---
        const oldPos = new Map<string, { lng: number; lat: number; sz: number }>();

        for (const pt of pp) {
            if (pt.type === 'individual') {
                const k = ckey(pt.company.coordinates[0], pt.company.coordinates[1]);
                oldPos.set(k, { lng: pt.lng, lat: pt.lat, sz: pointSize(pt.company.employees || 0) });
            } else {
                const leaves = getLeavesSafe(indices, pt.dominantGroup, pt.id);
                for (const lf of leaves) {
                    const [lo, la] = lf.geometry.coordinates;
                    oldPos.set(ckey(lo, la), { lng: pt.lng, lat: pt.lat, sz: pointSize(pt.totalEmployees) });
                }
            }
        }

        // --- Build animation targets for new points ---
        const anims: Anim[] = [];

        for (let i = 0; i < mapPoints.length; i++) {
            const pt = mapPoints[i];
            const p = propsFor(pt, i);
            let sLng = pt.lng, sLat = pt.lat, sSize = p.size;

            if (pt.type === 'cluster') {
                const leaves = getLeavesSafe(indices, pt.dominantGroup, pt.id);
                let sx = 0, sy = 0, n = 0;
                for (const lf of leaves) {
                    const [lo, la] = lf.geometry.coordinates;
                    const op = oldPos.get(ckey(lo, la));
                    if (op) { sx += op.lng; sy += op.lat; n++; }
                }
                if (n > 0) { sLng = sx / n; sLat = sy / n; }
            } else {
                const k = ckey(pt.company.coordinates[0], pt.company.coordinates[1]);
                const op = oldPos.get(k);
                if (op) { sLng = op.lng; sLat = op.lat; sSize = op.sz; }
            }

            anims.push({
                sLng, sLat, eLng: pt.lng, eLat: pt.lat,
                sSize, eSize: p.size, sOp: 0.85, eOp: 0.85,
                ...p,
            });
        }

        // --- Ghost features for old individual points merging into clusters ---
        const newIndivKeys = new Set<string>();
        for (const pt of mapPoints) {
            if (pt.type === 'individual') {
                newIndivKeys.add(ckey(pt.company.coordinates[0], pt.company.coordinates[1]));
            }
        }

        const newPos = new Map<string, { lng: number; lat: number }>();
        for (const pt of mapPoints) {
            if (pt.type === 'cluster') {
                const leaves = getLeavesSafe(indices, pt.dominantGroup, pt.id);
                for (const lf of leaves) {
                    const [lo, la] = lf.geometry.coordinates;
                    newPos.set(ckey(lo, la), { lng: pt.lng, lat: pt.lat });
                }
            }
        }

        let ghostCount = 0;
        for (const pt of pp) {
            if (ghostCount >= MAX_GHOSTS) break;
            if (pt.type === 'individual') {
                const k = ckey(pt.company.coordinates[0], pt.company.coordinates[1]);
                if (!newIndivKeys.has(k)) {
                    const np = newPos.get(k);
                    if (np) {
                        const grp = pt.company.naceGroup;
                        anims.push({
                            sLng: pt.lng, sLat: pt.lat,
                            eLng: np.lng, eLat: np.lat,
                            sSize: pointSize(pt.company.employees || 0), eSize: 2,
                            sOp: 0.7, eOp: 0,
                            color: NACE_GROUP_COLORS[grp] || '#888888',
                            isCluster: false, pointCount: 1, pointIndex: -1,
                            name: null, naceGroup: grp,
                            employees: pt.company.employees || 0,
                            expansionZoom: null,
                        });
                        ghostCount++;
                    }
                }
            }
        }

        // --- Animate with requestAnimationFrame ---
        cancelAnimationFrame(rafRef.current);
        const t0 = performance.now();

        function tick(now: number) {
            const raw = Math.min(1, (now - t0) / ANIM_MS);
            const t = easeOut(raw);

            const features = anims.map(a => ({
                type: 'Feature' as const,
                geometry: {
                    type: 'Point' as const,
                    coordinates: [lerp(a.sLng, a.eLng, t), lerp(a.sLat, a.eLat, t)],
                },
                properties: {
                    color: a.color,
                    size: lerp(a.sSize, a.eSize, t),
                    opacity: lerp(a.sOp, a.eOp, t),
                    isCluster: a.isCluster,
                    pointCount: a.pointCount,
                    pointIndex: a.pointIndex,
                    name: a.name,
                    naceGroup: a.naceGroup,
                    employees: a.employees,
                    expansionZoom: a.expansionZoom,
                },
            }));

            setGeo({ type: 'FeatureCollection', features });

            if (raw < 1) {
                rafRef.current = requestAnimationFrame(tick);
            }
        }

        rafRef.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(rafRef.current);
    }, [zoom, mapPoints, indices]);

    return geo;
}
