"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl, MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { useStore } from '@/store/useStore';
import { Company } from '@/types';
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

// France fill layer - subtle territory highlight
const franceFillLayer: LayerProps = {
    id: 'france-fill',
    type: 'fill',
    paint: {
        'fill-color': 'rgba(30, 40, 80, 0.25)',
    },
};

// France border line layer - prominent
const franceBorderLayer: LayerProps = {
    id: 'france-border',
    type: 'line',
    paint: {
        'line-color': '#4a9eff',
        'line-width': 2.5,
        'line-opacity': 0.8,
    },
};

// Inter-region lines - thinner
const franceRegionLayer: LayerProps = {
    id: 'france-regions',
    type: 'line',
    paint: {
        'line-color': '#4a9eff',
        'line-width': 1,
        'line-opacity': 0.4,
    },
};

// Point layer with data-driven styling (opacity per-feature for animation)
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
    data: Company[];
}

export default function DefenseMap({ data }: MapProps) {
    const mapRef = useRef<MapRef>(null);
    const { filiere: activeFilieres, minScore, setSelectedCompany } = useStore();
    const [viewState, setViewState] = useState(INITIAL_VIEW);
    const [franceGeoJSON, setFranceGeoJSON] = useState<any>(null);
    const [hoveredNode, setHoveredNode] = useState<{
        c: Company | null;
        cluster: ClusterPoint | null;
        x: number;
        y: number;
    } | null>(null);
    const [styleLoaded, setStyleLoaded] = useState(false);

    // Load France GeoJSON
    useEffect(() => {
        fetch('/france-geojson.json')
            .then(res => res.json())
            .then(data => setFranceGeoJSON(data))
            .catch(err => console.error("Could not load France GeoJSON", err));
    }, []);

    // Filter data
    const filteredData = useMemo(() => {
        return data.filter(c => {
            if (activeFilieres.length > 0 && !activeFilieres.includes(c.filiere)) return false;
            if (c.score_convertibilite < minScore) return false;
            return true;
        });
    }, [data, activeFilieres, minScore]);

    // Cluster with current zoom
    const zoomLevel = Math.round(viewState.zoom);
    const { points: mapPoints, indices } = useClusters(filteredData, zoomLevel);

    // Animated GeoJSON: interpolates positions when zoom crosses integer boundaries
    const pointsGeoJSON = useAnimatedPoints(indices, mapPoints, zoomLevel);

    // Handle point click
    const handleClick = useCallback((e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const props = feature.properties;
        if (!props) return;

        const isCluster = props.isCluster === true || props.isCluster === 'true';

        if (isCluster) {
            // Zoom to cluster expansion zoom
            const coords = (feature.geometry as any).coordinates;
            const expansionZoom = Number(props.expansionZoom);
            mapRef.current?.flyTo({
                center: coords,
                zoom: Math.min(expansionZoom + 1, 20),
                duration: 500,
            });
        } else {
            // Find the company in mapPoints
            const pointIndex = Number(props.pointIndex);
            const pt = mapPoints[pointIndex];
            if (pt && pt.type === 'individual') {
                setSelectedCompany(pt.company);
            }
        }
    }, [mapPoints, setSelectedCompany]);

    // Handle hover
    const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) {
            setHoveredNode(null);
            if (mapRef.current) {
                mapRef.current.getCanvas().style.cursor = '';
            }
            return;
        }

        if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = 'pointer';
        }

        const props = feature.properties;
        if (!props) return;

        const isCluster = props.isCluster === true || props.isCluster === 'true';
        const pointIndex = Number(props.pointIndex);
        const pt = mapPoints[pointIndex];

        if (isCluster && pt && pt.type === 'cluster') {
            setHoveredNode({
                c: null,
                cluster: pt,
                x: e.point.x,
                y: e.point.y,
            });
        } else if (!isCluster && pt && pt.type === 'individual') {
            setHoveredNode({
                c: pt.company,
                cluster: null,
                x: e.point.x,
                y: e.point.y,
            });
        }
    }, [mapPoints]);

    const handleMouseLeave = useCallback(() => {
        setHoveredNode(null);
        if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = '';
        }
    }, []);

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

                {/* France territory layers */}
                {styleLoaded && franceGeoJSON && (
                    <>
                        <Source id="france" type="geojson" data={franceGeoJSON}>
                            <Layer {...franceFillLayer} />
                            <Layer {...franceRegionLayer} />
                        </Source>
                        {/* Outer border: merged outline - use same source but thicker line */}
                        <Source id="france-border" type="geojson" data={franceGeoJSON}>
                            <Layer {...franceBorderLayer} />
                        </Source>
                    </>
                )}

                {/* Company points */}
                {styleLoaded && (
                    <Source id="companies" type="geojson" data={pointsGeoJSON}>
                        <Layer {...pointsLayer} />
                    </Source>
                )}
            </Map>

            {/* Tooltip for individual company */}
            {hoveredNode?.c && (
                <div
                    className="absolute z-50 pointer-events-none bg-[var(--color-surface)] border border-[var(--color-border)] p-3 clip-snip-corner-sm shadow-lg"
                    style={{ left: hoveredNode.x + 15, top: hoveredNode.y + 15, width: '280px' }}
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-section-header">{hoveredNode.c.filiere}</span>
                        <span className="font-bold text-sm text-[var(--color-accent)]">{hoveredNode.c.nom_commercial || hoveredNode.c.raison_sociale}</span>
                        <div className="flex justify-between mt-2 pt-2 border-t border-[var(--color-border)]">
                            <span className="text-xs text-[var(--color-muted)]">EFFECTIFS</span>
                            <span className="text-xs font-mono">{hoveredNode.c.effectif_total || 'Inconnu'}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-xs text-[var(--color-muted)]">SCORE</span>
                            <span className="text-xs font-mono">{hoveredNode.c.score_convertibilite}/5</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tooltip for cluster */}
            {hoveredNode?.cluster && (
                <div
                    className="absolute z-50 pointer-events-none bg-[var(--color-surface)] border border-[var(--color-border)] p-2 clip-snip-corner-sm shadow-lg"
                    style={{ left: hoveredNode.x + 15, top: hoveredNode.y + 15 }}
                >
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-[var(--color-accent)]">{hoveredNode.cluster.pointCount} entreprises</span>
                        <span className="text-[10px] text-[var(--color-muted)]">{hoveredNode.cluster.dominantFiliere}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
