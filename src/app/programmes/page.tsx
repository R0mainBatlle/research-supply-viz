'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDefenseStore } from '@/store/useDefenseStore';
import { DefenseTree } from '@/components/DefenseTree';
import { CompanyResults } from '@/components/CompanyResults';
import { CompanyEUSheet } from '@/components/CompanyEUSheet';
import DefenseMap from '@/components/Map';
import { TreeNode, MapCompany } from '@/types';
import { Map as MapIcon, Table2 } from 'lucide-react';

export default function ProgrammesPage() {
    const store = useDefenseStore();
    const {
        tree, setTree, stats,
        viewMode, setViewMode,
        fetchResults, fetchStats, fetchFilters, fetchMapResults,
        mapCompanies, mapLoading,
        selectedMapCompany, setSelectedMapCompany,
        selectedNode, searchQuery, countryFilter, regionFilter, naceFilter,
        caMin, caMax, effMin, effMax, urlOnly,
        sortKey, sortDir, page,
    } = store;

    const [loading, setLoading] = useState(!tree);
    const [error, setError] = useState<string | null>(null);

    // Load tree + initial filters (once)
    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                if (!tree) {
                    const res = await fetch('/data/defense_tree.json');
                    if (!res.ok) throw new Error('Failed to load defense tree');
                    const data: TreeNode = await res.json();
                    if (!cancelled) setTree(data);
                }
                if (!cancelled) {
                    await fetchFilters();
                    setLoading(false);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Unknown error');
                    setLoading(false);
                }
            }
        }

        init();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch table results when sort/page/selectedNode change
    useEffect(() => {
        if (loading) return;
        fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedNode, sortKey, sortDir, page]);

    // Fetch map results when selectedNode or filters change and map is active
    useEffect(() => {
        if (loading || viewMode !== 'map') return;
        fetchMapResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedNode, viewMode]);

    // Fetch results + stats when bar filters change (debounced for search)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => {
        if (loading) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchResults();
            fetchStats();
            if (viewMode === 'map') fetchMapResults();
        }, searchQuery ? 300 : 0);
        return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [countryFilter, regionFilter, naceFilter, caMin, caMax, effMin, effMax, urlOnly, searchQuery]);

    // Initial fetch after tree loaded
    useEffect(() => {
        if (!loading && tree) {
            fetchResults();
            fetchStats();
            if (viewMode === 'map') fetchMapResults();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    // Fetch map data when switching to map view
    useEffect(() => {
        if (!loading && viewMode === 'map' && mapCompanies.length === 0) {
            fetchMapResults();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode]);

    const handleSelectMapCompany = (c: MapCompany) => {
        setSelectedMapCompany(c);
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
                <div className="text-center space-y-3">
                    <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-mono text-[var(--color-muted)]">Chargement...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
                <div className="text-center space-y-2">
                    <p className="text-sm text-[var(--color-alert)]">Erreur: {error}</p>
                    <p className="text-xs text-[var(--color-muted)]">Vérifiez que PostgreSQL est accessible.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[var(--color-bg)]">
            {/* Header */}
            <header className="h-14 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-6 justify-between z-10">
                <div className="flex items-center gap-4">
                    <h1 className="font-mono text-xs tracking-[0.3em] uppercase">LE_VECTOR</h1>
                    <div className="h-4 w-px bg-[var(--color-border)]"></div>

                    {/* View toggle */}
                    <div className="flex border border-[var(--color-border)] overflow-hidden">
                        <button
                            onClick={() => setViewMode('map')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                                viewMode === 'map'
                                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                                    : 'text-[var(--color-muted)] hover:text-[var(--color-accent)]'
                            }`}
                        >
                            <MapIcon size={12} />
                            CARTE
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                                viewMode === 'table'
                                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                                    : 'text-[var(--color-muted)] hover:text-[var(--color-accent)]'
                            }`}
                        >
                            <Table2 size={12} />
                            TABLEAU
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--color-muted)]">
                    {viewMode === 'map' && (
                        <>
                            <span>{mapCompanies.length.toLocaleString('fr-FR')} entreprises FR géolocalisées</span>
                            <span>·</span>
                        </>
                    )}
                    <span>{stats.totalAll.toLocaleString('fr-FR')} entreprises EU</span>
                    <span>·</span>
                    <span>Source: Orbis (BvD)</span>
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                <DefenseTree />

                {/* Table mode */}
                <div className={`flex-1 ${viewMode === 'table' ? '' : 'hidden'}`}>
                    <CompanyResults />
                </div>

                {/* Map mode */}
                <div className={`flex-1 relative ${viewMode === 'map' ? '' : 'hidden'}`}>
                    {mapLoading && mapCompanies.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="text-center space-y-3">
                                <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-xs font-mono text-[var(--color-muted)]">Chargement des données carte...</p>
                            </div>
                        </div>
                    ) : (
                        <DefenseMap data={mapCompanies} onSelectCompany={handleSelectMapCompany} />
                    )}

                    {selectedMapCompany && (
                        <CompanyEUSheet
                            company={selectedMapCompany}
                            onClose={() => setSelectedMapCompany(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
