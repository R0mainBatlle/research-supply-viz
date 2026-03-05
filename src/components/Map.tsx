"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl, MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { MapCompany, NACE_GROUP_COLORS } from '@/types';
import { useClusters, ClusterPoint } from '@/hooks/useClusters';
import { useAnimatedPoints } from '@/hooks/useAnimatedPoints';
import type { LayerProps } from 'react-map-gl/maplibre';

const INITIAL_VIEW = {
    longitude: 2.2137,
    latitude: 46.2276,
    zoom: 5.5,
};

const MAP_STYLE = '/dark-matter-style.json';
const POINTS_LAYER_ID = 'company-points';

const franceFillLayer: LayerProps = {
    id: 'france-fill',
    type: 'fill',
    paint: { 'fill-color': 'rgba(30, 40, 80, 0.25)' },
};

const franceBorderLayer: LayerProps = {
    id: 'france-border',
    type: 'line',
    paint: { 'line-color': '#4a9eff', 'line-width': 2.5, 'line-opacity': 0.8 },
};

const franceRegionLayer: LayerProps = {
    id: 'france-regions',
    type: 'line',
    paint: { 'line-color': '#4a9eff', 'line-width': 1, 'line-opacity': 0.4 },
};

const pointsLayer: LayerProps = {
    id: POINTS_LAYER_ID,
    type: 'circle',
    paint: {
        'circle-radius': ['get', 'size'],
        'circle-color': ['get', 'color'],
        'circle-opacity': ['get', 'opacity'],
        'circle-blur': 0.15,
        'circle-stroke-width': 0.5,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': ['*', ['get', 'opacity'], 0.6],
    },
};

interface MapProps {
    data: MapCompany[];
    onSelectCompany?: (company: MapCompany) => void;
}

export default function DefenseMap({ data, onSelectCompany }: MapProps) {
    const mapRef = useRef<MapRef>(null);
    const [viewState, setViewState] = useState(INITIAL_VIEW);
    const [franceGeoJSON, setFranceGeoJSON] = useState<any>(null);
    const [hoveredNode, setHoveredNode] = useState<{
        c: MapCompany | null;
        cluster: ClusterPoint | null;
        x: number;
        y: number;
    } | null>(null);
    const [styleLoaded, setStyleLoaded] = useState(false);

    useEffect(() => {
        fetch('/france-geojson.json')
            .then(res => res.json())
            .then(data => setFranceGeoJSON(data))
            .catch(err => console.error("Could not load France GeoJSON", err));
    }, []);

    const zoomLevel = Math.round(viewState.zoom);
    const { points: mapPoints, indices } = useClusters(data, zoomLevel);
    const pointsGeoJSON = useAnimatedPoints(indices, mapPoints, zoomLevel);

    const handleClick = useCallback((e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature?.properties) return;

        const props = feature.properties;
        const isCluster = props.isCluster === true || props.isCluster === 'true';

        if (isCluster) {
            const coords = (feature.geometry as any).coordinates;
            const expansionZoom = Number(props.expansionZoom);
            mapRef.current?.flyTo({
                center: coords,
                zoom: Math.min(expansionZoom + 1, 20),
                duration: 500,
            });
        } else {
            const pointIndex = Number(props.pointIndex);
            const pt = mapPoints[pointIndex];
            if (pt?.type === 'individual' && onSelectCompany) {
                onSelectCompany(pt.company);
            }
        }
    }, [mapPoints, onSelectCompany]);

    const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) {
            setHoveredNode(null);
            if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
            return;
        }

        if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';

        const props = feature.properties;
        if (!props) return;

        const isCluster = props.isCluster === true || props.isCluster === 'true';
        const pointIndex = Number(props.pointIndex);
        const pt = mapPoints[pointIndex];

        if (isCluster && pt?.type === 'cluster') {
            setHoveredNode({ c: null, cluster: pt, x: e.point.x, y: e.point.y });
        } else if (!isCluster && pt?.type === 'individual') {
            setHoveredNode({ c: pt.company, cluster: null, x: e.point.x, y: e.point.y });
        }
    }, [mapPoints]);

    const handleMouseLeave = useCallback(() => {
        setHoveredNode(null);
        if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
    }, []);

    // NACE group legend (only show groups present in data)
    const activeGroups = useMemo(() => {
        const groups = new Set<string>();
        for (const c of data) groups.add(c.naceGroup);
        return Array.from(groups).sort();
    }, [data]);

    return (
        <div className="w-full h-full relative bg-[var(--color-bg)]">
            <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapStyle={MAP_STYLE}
                minZoom={4}
                maxZoom={20}
                interactiveLayerIds={[POINTS_LAYER_ID]}
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onLoad={() => setStyleLoaded(true)}
                attributionControl={false}
            >
                <NavigationControl position="bottom-right" />

                {styleLoaded && franceGeoJSON && (
                    <>
                        <Source id="france" type="geojson" data={franceGeoJSON}>
                            <Layer {...franceFillLayer} />
                            <Layer {...franceRegionLayer} />
                        </Source>
                        <Source id="france-border" type="geojson" data={franceGeoJSON}>
                            <Layer {...franceBorderLayer} />
                        </Source>
                    </>
                )}

                {styleLoaded && (
                    <Source id="companies" type="geojson" data={pointsGeoJSON}>
                        <Layer {...pointsLayer} />
                    </Source>
                )}
            </Map>

            {/* Legend */}
            {activeGroups.length > 0 && (
                <div className="absolute bottom-4 left-4 bg-[var(--color-surface)]/90 backdrop-blur border border-[var(--color-border)] p-3 clip-snip-corner-sm z-10">
                    <div className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-wider mb-2">Secteur NACE</div>
                    <div className="flex flex-col gap-1">
                        {activeGroups.map(g => (
                            <div key={g} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NACE_GROUP_COLORS[g] || '#888' }} />
                                <span className="text-[10px] font-mono text-[var(--color-text)]">{g}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tooltip: individual company */}
            {hoveredNode?.c && (
                <div
                    className="absolute z-50 pointer-events-none bg-[var(--color-surface)] border border-[var(--color-border)] p-3 clip-snip-corner-sm shadow-lg"
                    style={{ left: hoveredNode.x + 15, top: hoveredNode.y + 15, width: '280px' }}
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-section-header">{hoveredNode.c.naceGroup}</span>
                        <span className="font-bold text-sm text-[var(--color-accent)]">{hoveredNode.c.name}</span>
                        {hoveredNode.c.city && (
                            <span className="text-xs text-[var(--color-muted)]">{hoveredNode.c.city}</span>
                        )}
                        <div className="flex justify-between mt-2 pt-2 border-t border-[var(--color-border)]">
                            <span className="text-xs text-[var(--color-muted)]">EFFECTIFS</span>
                            <span className="text-xs font-mono">{hoveredNode.c.employees?.toLocaleString('fr-FR') || '—'}</span>
                        </div>
                        {hoveredNode.c.revenue != null && (
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-[var(--color-muted)]">CA (k&euro;)</span>
                                <span className="text-xs font-mono">{Math.round(hoveredNode.c.revenue).toLocaleString('fr-FR')}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tooltip: cluster */}
            {hoveredNode?.cluster && (
                <div
                    className="absolute z-50 pointer-events-none bg-[var(--color-surface)] border border-[var(--color-border)] p-2 clip-snip-corner-sm shadow-lg"
                    style={{ left: hoveredNode.x + 15, top: hoveredNode.y + 15 }}
                >
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-[var(--color-accent)]">{hoveredNode.cluster.pointCount} entreprises</span>
                        <span className="text-[10px] text-[var(--color-muted)]">{hoveredNode.cluster.dominantGroup}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
