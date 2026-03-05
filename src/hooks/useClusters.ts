import { useMemo, useCallback } from 'react';
import Supercluster from 'supercluster';
import { MapCompany } from '@/types';

export interface ClusterPoint {
    type: 'cluster';
    id: number;
    lng: number;
    lat: number;
    pointCount: number;
    totalEmployees: number;
    dominantGroup: string;
    expansionZoom: number;
}

export interface IndividualPoint {
    type: 'individual';
    company: MapCompany;
    lng: number;
    lat: number;
}

export type MapPoint = ClusterPoint | IndividualPoint;

interface CompanyProperties {
    companyIndex: number;
    naceGroup: string;
    employees: number;
}

export function useClusters(data: MapCompany[], zoomLevel: number) {
    // Per-naceGroup Supercluster instances — clusters only merge same-group points
    const indices = useMemo(() => {
        const map = new Map<string, Supercluster<CompanyProperties>>();

        const byGroup = new Map<string, { company: MapCompany; idx: number }[]>();
        for (let i = 0; i < data.length; i++) {
            const c = data[i];
            const g = c.naceGroup;
            if (!byGroup.has(g)) byGroup.set(g, []);
            byGroup.get(g)!.push({ company: c, idx: i });
        }

        for (const [, items] of byGroup) {
            const sc = new Supercluster<CompanyProperties>({
                radius: 80,
                maxZoom: 22,
            });

            const features: Supercluster.PointFeature<CompanyProperties>[] = items.map(({ company, idx }) => ({
                type: 'Feature' as const,
                geometry: {
                    type: 'Point' as const,
                    coordinates: [company.coordinates[0], company.coordinates[1]],
                },
                properties: {
                    companyIndex: idx,
                    naceGroup: company.naceGroup,
                    employees: company.employees || 0,
                },
            }));

            sc.load(features);
            map.set(items[0].company.naceGroup, sc);
        }

        return map;
    }, [data]);

    const getPoints = useCallback((zoom: number): MapPoint[] => {
        const clampedZoom = Math.max(0, Math.min(22, zoom));
        const bbox: [number, number, number, number] = [-5.5, 41.0, 10.0, 51.5];
        const allPoints: MapPoint[] = [];

        for (const [group, sc] of indices) {
            const clusters = sc.getClusters(bbox, clampedZoom);

            for (const feature of clusters) {
                const [lng, lat] = feature.geometry.coordinates;
                const props = feature.properties as any;

                if (props.cluster) {
                    const clusterId: number = props.cluster_id;
                    const leaves = sc.getLeaves(clusterId, Infinity);

                    let totalEmployees = 0;
                    for (const leaf of leaves) {
                        totalEmployees += leaf.properties.employees || 0;
                    }

                    const expansionZoom = sc.getClusterExpansionZoom(clusterId);

                    allPoints.push({
                        type: 'cluster',
                        id: clusterId,
                        lng,
                        lat,
                        pointCount: props.point_count as number,
                        totalEmployees,
                        dominantGroup: group,
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
