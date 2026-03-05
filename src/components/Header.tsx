import React from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { Company } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
    viewMode: 'map' | 'table';
    onViewModeChange: (mode: 'map' | 'table') => void;
}

export function Header({ viewMode, onViewModeChange }: HeaderProps) {
    const { companies, filiere, minScore } = useStore();

    // Calculate active companies based on filters
    const activeCompanies = companies.filter(c => {
        if (filiere.length > 0 && !filiere.includes(c.filiere)) return false;
        if (c.score_convertibilite < minScore) return false;
        // ...other filters
        return true;
    });

    const totalCA = activeCompanies.reduce((acc, c) => acc + (c.ca_meur || 0), 0);
    const totalEffectif = activeCompanies.reduce((acc, c) => acc + (c.effectif_total || 0), 0);
    const avgScore = activeCompanies.length > 0
        ? activeCompanies.reduce((acc, c) => acc + c.score_convertibilite, 0) / activeCompanies.length
        : 0;

    const quickWins = activeCompanies.filter(c => c.profil_conversion === "Quick-win").length;

    return (
        <header className="h-16 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-6 justify-between z-10 relative">
            <div className="flex items-center gap-4">
                <h1 className="font-mono text-xs tracking-[0.3em] uppercase hidden md:block">LE_VECTOR</h1>
                <div className="h-4 w-px bg-[var(--color-border)] hidden md:block"></div>

                {/* Page navigation */}
                <nav className="flex gap-1 items-center">
                    <span className="px-3 py-1.5 text-xs bg-[var(--color-accent)] text-[var(--color-bg)] clip-snip-corner-sm">
                        BASE FR
                    </span>
                    <Link
                        href="/programmes"
                        className="px-3 py-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface)] rounded transition-colors"
                    >
                        PROGRAMMES
                    </Link>
                </nav>

                <div className="h-4 w-px bg-[var(--color-border)] hidden md:block"></div>

                {/* View mode toggle */}
                <div className="flex gap-1">
                    <Button
                        variant={viewMode === 'map' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => onViewModeChange('map')}
                    >
                        CARTE
                    </Button>
                    <Button
                        variant={viewMode === 'table' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => onViewModeChange('table')}
                    >
                        TABLEAU
                    </Button>
                </div>
            </div>

            {viewMode === 'map' && (
                <div className="flex items-center gap-6">
                    <Metric label="SITES ACTIFS" value={activeCompanies.length} />
                    <Metric label="EFFECTIF TOTAL" value={totalEffectif.toLocaleString('fr-FR')} />
                    <Metric label="CA CUMULÉ" value={`${totalCA.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} M€`} />

                    <div className="hidden lg:flex items-center gap-4 border-l border-[var(--color-border)] pl-4">
                        <Metric label="SCORE MOYEN" value={avgScore.toFixed(1)} badge={avgScore > 3.5 ? 'success' : 'default'} />
                        <Metric label="QUICK-WINS" value={quickWins} badge={quickWins > 0 ? 'alert' : 'muted'} />
                    </div>
                </div>
            )}
        </header>
    );
}

function Metric({ label, value, badge }: { label: string, value: string | number, badge?: 'success' | 'alert' | 'muted' | 'default' }) {
    return (
        <div className="flex flex-col items-end">
            <span className="text-[10px] text-[var(--color-muted)] font-mono tracking-widest">{label}</span>
            {badge ? (
                <Badge variant={badge} className="mt-1">{value}</Badge>
            ) : (
                <span className="text-sm font-semibold text-[var(--color-accent)]">{value}</span>
            )}
        </div>
    );
}
