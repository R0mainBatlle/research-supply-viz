import { useMemo, useCallback } from 'react';
import Supercluster from 'supercluster';
import { Company } from '@/types';

export interface ClusterPoint {
    type: 'cluster';
    id: number;
    lng: number;
    lat: number;
    pointCount: number;
    totalEffectif: number;
    dominantFiliere: string;
    expansionZoom: number;
}

export interface IndividualPoint {
    type: 'individual';
    company: Company;
    lng: number;
    lat: number;
}

export type MapPoint = ClusterPoint | IndividualPoint;

interface CompanyProperties {
    companyIndex: number;
    filiere: string;
    effectif: number;
}

export function useClusters(data: Company[], zoomLevel: number) {
    // Per-filière Supercluster instances — clusters only merge same-filière points
    const indices = useMemo(() => {
        const map = new Map<string, Supercluster<CompanyProperties>>();

        // Group companies with coordinates by filière
        const byFiliere = new Map<string, { company: Company; idx: number }[]>();
        for (let i = 0; i < data.length; i++) {
            const c = data[i];
            if (c.coordinates === null) continue;
            const f = c.filiere;
            if (!byFiliere.has(f)) byFiliere.set(f, []);
            byFiliere.get(f)!.push({ company: c, idx: i });
        }

        for (const [, items] of byFiliere) {
            const sc = new Supercluster<CompanyProperties>({
                radius: 80,
                maxZoom: 22,
            });

            const features: Supercluster.PointFeature<CompanyProperties>[] = items.map(({ company, idx }) => ({
                type: 'Feature' as const,
                geometry: {
                    type: 'Point' as const,
                    coordinates: [company.coordinates![0], company.coordinates![1]],
                },
                properties: {
                    companyIndex: idx,
                    filiere: company.filiere,
                    effectif: company.effectif_total || 0,
                },
            }));

            sc.load(features);
            map.set(items[0].company.filiere, sc);
        }

        return map;
    }, [data]);

    const getPoints = useCallback((zoom: number): MapPoint[] => {
        const clampedZoom = Math.max(0, Math.min(22, zoom));
        const bbox: [number, number, number, number] = [-5.5, 41.0, 10.0, 51.5];
        const allPoints: MapPoint[] = [];

        for (const [filiere, sc] of indices) {
            const clusters = sc.getClusters(bbox, clampedZoom);

            for (const feature of clusters) {
                const [lng, lat] = feature.geometry.coordinates;
                const props = feature.properties as any;

                if (props.cluster) {
                    const clusterId: number = props.cluster_id;
                    const leaves = sc.getLeaves(clusterId, Infinity);

                    let totalEffectif = 0;
                    for (const leaf of leaves) {
                        totalEffectif += leaf.properties.effectif || 0;
                    }

                    const expansionZoom = sc.getClusterExpansionZoom(clusterId);

                    allPoints.push({
                        type: 'cluster',
                        id: clusterId,
                        lng,
                        lat,
                        pointCount: props.point_count as number,
                        totalEffectif,
                        dominantFiliere: filiere,
                        expansionZoom,
                    });
                } else {
                    const company = data[props.companyIndex];
                    allPoints.push({
                        type: 'individual',
                        company,
                        lng,
                        lat,
                    });
                }
            }
        }

        return allPoints;
    }, [indices, data]);

    const points = useMemo(() => getPoints(zoomLevel), [getPoints, zoomLevel]);

    return { points, indices };
}
