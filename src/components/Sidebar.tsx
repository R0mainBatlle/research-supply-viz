import React, { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { FILIERE_COLORS, SCENARIOS } from '@/types';
import { SnipCard } from '@/components/ui/SnipCard';
import { Button } from '@/components/ui/Button';

export function Sidebar({ className = '' }: { className?: string }) {
    const store = useStore();

    const handleScenarioChange = (id: string | null) => {
        store.setActiveScenario(id);
        if (id) {
            const scenario = SCENARIOS.find(s => s.id === id);
            if (scenario) {
                store.resetFilters();
                scenario.filieres.forEach(f => store.toggleFiliere(f));
                store.setActiveScenario(id);
            }
        } else {
            store.resetFilters();
        }
    };

    // Compute Active Companies
    const activeCompanies = useMemo(() => {
        return store.companies.filter(c => {
            if (store.filiere.length > 0 && !store.filiere.includes(c.filiere)) return false;
            if (c.score_convertibilite < store.minScore) return false;
            if (store.profil.length > 0 && !store.profil.includes(c.profil_conversion)) return false;

            const q = store.searchQuery.toLowerCase();
            if (q) {
                if (!c.raison_sociale?.toLowerCase().includes(q) &&
                    !c.nom_commercial?.toLowerCase().includes(q) &&
                    !c.produits_fabriques?.toLowerCase().includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }, [store.companies, store.filiere, store.minScore, store.profil, store.searchQuery]);

    // Compute Concentration Alerts
    const alerts = useMemo(() => {
        if (store.filiere.length === 0 && store.activeScenario === null) return []; // Only show alerts when filtering by specific filieres or scenario

        const filieresToCheck = store.filiere.length > 0 ? store.filiere : Object.keys(FILIERE_COLORS);
        const counts: Record<string, number> = {};

        filieresToCheck.forEach(f => counts[f] = 0);
        activeCompanies.forEach(c => {
            if (counts[c.filiere] !== undefined) {
                counts[c.filiere]++;
            }
        });

        const alertsList: { type: 'critical' | 'warning', message: string }[] = [];
        Object.entries(counts).forEach(([f, count]) => {
            if (count < 3) {
                alertsList.push({ type: 'critical', message: `CRITIQUE: <3 fournisseurs en ${f}` });
            } else if (count < 5) {
                alertsList.push({ type: 'warning', message: `ATTENTION: <5 fournisseurs en ${f}` });
            }
        });

        // Check region concentration as well
        const regionCounts: Record<string, number> = {};
        let maxRegion = "";
        let maxCount = 0;
        activeCompanies.forEach(c => {
            if (!regionCounts[c.region_siege]) regionCounts[c.region_siege] = 0;
            regionCounts[c.region_siege]++;
            if (regionCounts[c.region_siege] > maxCount) {
                maxCount = regionCounts[c.region_siege];
                maxRegion = c.region_siege;
            }
        });

        if (activeCompanies.length > 10 && (maxCount / activeCompanies.length) > 0.6) {
            alertsList.push({ type: 'warning', message: `CONCENTRATION GÉO: >60% en ${maxRegion}` });
        }

        return alertsList;
    }, [activeCompanies, store.filiere, store.activeScenario]);


    return (
        <div className={`w-80 h-full border-r border-[var(--color-border)] flex flex-col overflow-hidden ${className}`}>

            <div className="flex-1 overflow-y-auto filter-scrollbar p-6 flex flex-col gap-8">

                {/* Scenario Mode */}
                <section>
                    <div className="text-section-header mb-4">MODE SCÉNARIO</div>
                    <select
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-2 text-sm text-[var(--color-accent)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                        value={store.activeScenario || ""}
                        onChange={(e) => handleScenarioChange(e.target.value || null)}
                    >
                        <option value="">Sélection libre</option>
                        {SCENARIOS.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </section>

                {/* Text Search */}
                <section>
                    <div className="text-section-header mb-4">RECHERCHE RAPIDE</div>
                    <input
                        type="text"
                        placeholder="Raison sociale, produit..."
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-2 text-sm text-[var(--color-accent)] outline-none placeholder-[var(--color-muted)] focus:ring-1 focus:ring-[var(--color-accent)]"
                        value={store.searchQuery}
                        onChange={(e) => store.setSearchQuery(e.target.value)}
                    />
                </section>

                {/* Filières Filter */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-section-header">FILIÈRES ({Object.keys(FILIERE_COLORS).length})</span>
                        {store.filiere.length > 0 && (
                            <button onClick={() => { store.resetFilters(); store.setActiveScenario(null); }} className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-accent)]">CLEAR</button>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        {Object.keys(FILIERE_COLORS).map(filiere => {
                            const isActive = store.filiere.includes(filiere);
                            return (
                                <button
                                    key={filiere}
                                    onClick={() => store.toggleFiliere(filiere)}
                                    className={`flex items-center gap-3 text-left p-2 transition-colors clip-snip-corner-sm border ${isActive ? 'bg-[var(--color-surface)] border-[var(--color-accent)]' : 'border-transparent hover:bg-[var(--color-surface)]'}`}
                                >
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: FILIERE_COLORS[filiere] }} />
                                    <span className="text-xs truncate">{filiere}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Score de convertibilité */}
                <section>
                    <div className="text-section-header mb-4 flex justify-between">
                        <span>SCORE MINIMUM</span>
                        <span className="text-[var(--color-accent)]">{store.minScore}/5</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={store.minScore}
                        onChange={(e) => store.setMinScore(Number(e.target.value))}
                        className="w-full accent-[var(--color-accent)] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--color-muted)] mt-1">
                        <span>1 (Éloigné)</span>
                        <span>5 (Immédiat)</span>
                    </div>
                </section>

                {/* Toggle Profil */}
                <section>
                    <div className="text-section-header mb-4">PROFIL DE CONVERSION</div>
                    <div className="flex flex-wrap gap-2">
                        {["Quick-win", "Potentiel stratégique", "Conversion moyenne", "Investissement requis"].map(profil => (
                            <button
                                key={profil}
                                onClick={() => store.toggleProfil(profil)}
                                className={`text-[10px] px-3 py-1 font-mono uppercase clip-snip-corner-sm border ${store.profil.includes(profil) ? 'bg-[var(--color-accent)] text-[var(--color-bg)] border-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'}`}
                            >
                                {profil}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Concentration Alerts */}
                {alerts.length > 0 && (
                    <section>
                        <div className="text-section-header mb-4 text-[var(--color-alert)] flex items-center gap-2">
                            ALERTES RISQUES
                            <div className="w-2 h-2 rounded-full bg-[var(--color-alert)] animate-pulse"></div>
                        </div>
                        <div className="flex flex-col gap-3">
                            {alerts.map((alert, i) => (
                                <SnipCard key={i} variant="outline" className={`!p-3 ${alert.type === 'critical' ? 'border-[var(--color-alert)] bg-[var(--color-alert)]/5' : 'border-[#eab308] bg-[#eab308]/5'}`}>
                                    <div className="flex items-start gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${alert.type === 'critical' ? 'bg-[var(--color-alert)]' : 'bg-[#eab308]'}`}></div>
                                        <span className={`text-xs ${alert.type === 'critical' ? 'text-[var(--color-alert)]' : 'text-[#eab308]'}`}>
                                            {alert.message}
                                        </span>
                                    </div>
                                </SnipCard>
                            ))}
                        </div>
                    </section>
                )}

            </div>

            <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                <Button variant="secondary" className="w-full text-xs font-mono tracking-widest" onClick={() => { store.resetFilters(); store.setActiveScenario(null); }}>
                    RÉINITIALISER TOUT
                </Button>
            </div>
        </div>
    );
}
