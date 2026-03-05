import React from 'react';
import { useStore } from '@/store/useStore';
import { SnipCard } from '@/components/ui/SnipCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { X, ExternalLink, MapPin } from 'lucide-react';

export function CompanySheet() {
    const { selectedCompany, setSelectedCompany } = useStore();

    if (!selectedCompany) return null;

    const c = selectedCompany;

    // Split tags
    const certs = c.certifications ? c.certifications.split(';').map(s => s.trim()) : [];
    const prods = c.produits_fabriques ? c.produits_fabriques.split(';').map(s => s.trim()) : [];
    const defenseProds = c.produits_defense_potentiels ? c.produits_defense_potentiels.split(';').map(s => s.trim()) : [];

    return (
        <div className="absolute top-16 right-0 bottom-0 w-full md:w-[480px] bg-[var(--color-bg)] border-l border-[var(--color-border)] shadow-2xl z-40 flex flex-col transform transition-transform duration-300">

            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-[var(--color-border)]">
                <div>
                    <div className="flex gap-2 mb-2">
                        <span className="text-section-header">{c.filiere}</span>
                        {c.sous_filiere && (
                            <>
                                <span className="text-[var(--color-muted)]">/</span>
                                <span className="text-section-header">{c.sous_filiere}</span>
                            </>
                        )}
                    </div>
                    <h2 className="text-2xl font-light">{c.nom_commercial || c.raison_sociale}</h2>
                    {c.groupe_appartenance && (
                        <p className="text-sm text-[var(--color-muted)] mt-1">
                            Groupe: {c.groupe_appartenance} {c.pays_groupe && `(${c.pays_groupe})`}
                        </p>
                    )}
                </div>
                <button onClick={() => setSelectedCompany(null)} className="p-2 hover:bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors clip-snip-corner-sm">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto filter-scrollbar p-6 flex flex-col gap-8">

                {/* Core Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <SnipCard className="!p-4">
                        <div className="text-section-header mb-2">EFFECTIF TOTAL</div>
                        <div className="text-xl">{c.effectif_total || 'Inconnu'}</div>
                        <div className={`text-xs mt-1 ${c.tendance_effectif === 'en hausse' ? 'text-[var(--color-success)]' : c.tendance_effectif === 'en baisse' ? 'text-[var(--color-alert)]' : 'text-[var(--color-muted)]'}`}>
                            {c.tendance_effectif ? c.tendance_effectif.toUpperCase() : 'INCONNU'}
                        </div>
                    </SnipCard>
                    <SnipCard className="!p-4">
                        <div className="text-section-header mb-2">CHIFFRE D'AFFAIRES</div>
                        <div className="text-xl">{c.ca_meur ? `${c.ca_meur} M€` : 'Inconnu'}</div>
                        <div className={`text-xs mt-1 ${c.tendance_ca === 'en hausse' ? 'text-[var(--color-success)]' : c.tendance_ca === 'en baisse' ? 'text-[var(--color-alert)]' : 'text-[var(--color-muted)]'}`}>
                            {c.tendance_ca ? c.tendance_ca.toUpperCase() : 'INCONNU'}
                        </div>
                    </SnipCard>
                </div>

                {/* Defense Evaluation */}
                <SnipCard variant={c.score_convertibilite >= 4 ? 'emphasis' : 'default'} className="!p-5 border-l-4 border-l-[var(--color-accent)]">
                    <div className={`text-section-header mb-3 ${c.score_convertibilite >= 4 ? 'text-white/60' : ''}`}>ÉVALUATION DÉFENSE</div>

                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold">Score de convertibilité</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`w-6 h-2 clip-snip-corner-sm ${i <= c.score_convertibilite ? (c.score_convertibilite >= 4 ? 'bg-white' : 'bg-[var(--color-accent)]') : (c.score_convertibilite >= 4 ? 'bg-white/20' : 'bg-[var(--color-border)]')}`}></div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant={c.score_convertibilite >= 4 ? "default" : "outline"} className={c.score_convertibilite >= 4 ? "bg-white text-black" : ""}>{c.profil_conversion}</Badge>
                        {c.habilitation_defense && <Badge variant="success">Habilitation Défense</Badge>}
                    </div>

                    {c.justification_score && (
                        <p className={`text-sm leading-relaxed ${c.score_convertibilite >= 4 ? 'text-white/80' : 'text-[var(--color-muted)]'}`}>
                            {c.justification_score}
                        </p>
                    )}
                </SnipCard>

                {/* Capabilities */}
                <section>
                    <div className="text-section-header mb-3">CAPACITÉS INDUSTRIELLES</div>
                    <p className="text-sm leading-relaxed mb-4">{c.capacites_industrielles || 'Inconnu'}</p>

                    {certs.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {certs.map(cert => {
                                const isDef = cert.includes('EN 9100') || cert.includes('AQAP') || cert.includes('NADCAP');
                                return <Badge key={cert} variant={isDef ? 'alert' : 'outline'}>{cert}</Badge>;
                            })}
                        </div>
                    )}
                </section>

                {/* Products */}
                <section>
                    <div className="text-section-header mb-3">POSSIBILITÉS DÉFENSE</div>
                    <ul className="flex flex-col gap-2">
                        {defenseProds.map((pd, i) => (
                            <li key={i} className="flex gap-3 text-sm items-start">
                                <div className="w-1 h-3 bg-[var(--color-accent)] mt-1 shrink-0"></div>
                                {pd}
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Location & Links */}
                <section className="border-t border-[var(--color-border)] pt-6 mt-2">
                    <div className="flex items-start gap-3 text-sm mb-4 text-[var(--color-muted)]">
                        <MapPin size={16} className="mt-0.5" />
                        <div>
                            <p className="font-semibold text-[var(--color-accent)]">{c.site_name || 'Inconnu'}</p>
                            <p>{c.region_siege || 'Inconnu'}</p>
                        </div>
                    </div>

                    {c.url_site_web && (
                        <a href={c.url_site_web} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-mono tracking-widest hover:underline">
                            SITE WEB <ExternalLink size={12} />
                        </a>
                    )}
                </section>

            </div>
        </div>
    );
}
