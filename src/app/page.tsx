"use client";

import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { CompanySheet } from '@/components/CompanySheet';
import { TableView } from '@/components/TableView';
import DefenseMap from '@/components/Map';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const { setCompanies, companies, filiere, minScore, profil, activeScenario, searchQuery, region, caMin, caMax, effMin, effMax, urlOnly } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');

  useEffect(() => {
    fetch('/data/companies_unified.json')
      .then(res => res.json())
      .then(data => {
        setCompanies(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load company data", err);
        setIsLoading(false);
      });
  }, [setCompanies]);

  const activeCompanies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const caMinN = caMin ? parseFloat(caMin) : null;
    const caMaxN = caMax ? parseFloat(caMax) : null;
    const effMinN = effMin ? parseFloat(effMin) : null;
    const effMaxN = effMax ? parseFloat(effMax) : null;

    return companies.filter(c => {
      if (!c.coordinates) return false; // map needs coordinates
      if (filiere.length > 0 && !filiere.includes(c.filiere)) return false;
      if (c.score_convertibilite < minScore) return false;
      if (profil.length > 0 && !profil.includes(c.profil_conversion)) return false;
      if (region.length > 0 && !region.includes(c.region_siege)) return false;
      if (q) {
        const hay = [c.raison_sociale, c.nom_commercial, c.description_activite, c.produits_fabriques, c.groupe_appartenance]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (caMinN !== null && (c.ca_meur == null || c.ca_meur < caMinN)) return false;
      if (caMaxN !== null && (c.ca_meur == null || c.ca_meur > caMaxN)) return false;
      if (effMinN !== null && (c.effectif_total == null || c.effectif_total < effMinN)) return false;
      if (effMaxN !== null && (c.effectif_total == null || c.effectif_total > effMaxN)) return false;
      if (urlOnly && !c.url_site_web) return false;
      return true;
    });
  }, [companies, filiere, minScore, profil, region, searchQuery, caMin, caMax, effMin, effMax, urlOnly]);

  // Timeline categorization
  const timelineCounts = useMemo(() => {
    let c3m = 0, c6m = 0, c12m = 0, c24m = 0;
    activeCompanies.forEach(c => {
      const hasAeroCert = c.certifications.includes('EN 9100') || c.certifications.includes('AQAP') || c.certifications.includes('NADCAP');
      if (c.habilitation_defense && c.score_convertibilite === 5) c3m++;
      else if (c.score_convertibilite >= 4 && hasAeroCert) c6m++;
      else if (c.score_convertibilite >= 3) c12m++;
      else c24m++;
    });
    return { c3m, c6m, c12m, c24m };
  }, [activeCompanies]);

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-[var(--color-bg)]">
      <Header viewMode={viewMode} onViewModeChange={setViewMode} />

      {/* ── Table mode: full-width explorer ─────────── */}
      <div className={`flex-1 overflow-hidden ${viewMode === 'table' ? '' : 'hidden'}`}>
        <TableView />
      </div>

      {/* ── Map mode: sidebar + map + sheet ─────────── */}
      <div className={`flex flex-1 overflow-hidden relative ${viewMode === 'map' ? '' : 'hidden'}`}>
        <Sidebar />

        <div className="flex-1 relative flex flex-col">

          {/* Main Content Area */}
          <div className="flex-1 relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-section-header animate-pulse text-[var(--color-accent)]">CHARGEMENT DES DONNÉES...</div>
              </div>
            ) : (
              <DefenseMap data={activeCompanies} />
            )}
          </div>

          {/* Timeline Bottom Bar */}
          <div className="h-16 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-6 gap-8 shrink-0 z-20">
            <span className="text-section-header whitespace-nowrap hidden md:block">TIMELINE DE CONVERSION</span>

            <div className="flex-1 flex items-center h-full max-w-4xl gap-1 pb-2 pt-2">
              <TimelineSegment label="< 3 MOIS" count={timelineCounts.c3m} total={activeCompanies.length} color="bg-[var(--color-success)]" />
              <TimelineSegment label="3-6 MOIS" count={timelineCounts.c6m} total={activeCompanies.length} color="bg-[var(--color-accent)] opacity-80" />
              <TimelineSegment label="6-12 MOIS" count={timelineCounts.c12m} total={activeCompanies.length} color="bg-[var(--color-muted)]" />
              <TimelineSegment label="12-24 MOIS" count={timelineCounts.c24m} total={activeCompanies.length} color="bg-[var(--color-border)] opacity-60" />
            </div>
          </div>
        </div>

        <CompanySheet />
      </div>
    </main>
  );
}

function TimelineSegment({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  if (total === 0) return null;
  const pct = (count / total) * 100;
  if (pct === 0) return null;

  return (
    <div className="relative h-full flex flex-col justify-end" style={{ width: `${pct}%` }}>
      <div className={`w-full ${color} clip-snip-corner-sm h-full flex items-center justify-center transition-all`}>
        {pct > 15 && (
          <span className="text-[10px] font-mono text-white/90 truncate px-2 mix-blend-difference">{count} sites</span>
        )}
      </div>
      <div className="absolute -bottom-1 w-full text-center">
        <span className="text-[8px] font-mono uppercase text-[var(--color-muted)] truncate block w-full">{label}</span>
      </div>
    </div>
  );
}
