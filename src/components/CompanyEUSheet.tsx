"use client";

import React from "react";
import { X, ExternalLink } from "lucide-react";
import { MapCompany, NACE_GROUP_COLORS } from "@/types";

const COUNTRY_NAMES: Record<string, string> = {
    AT: "Autriche", BE: "Belgique", BG: "Bulgarie", CY: "Chypre", CZ: "Tchéquie",
    DE: "Allemagne", DK: "Danemark", EE: "Estonie", ES: "Espagne", FI: "Finlande",
    FR: "France", GR: "Grèce", HR: "Croatie", HU: "Hongrie", IE: "Irlande",
    IT: "Italie", LT: "Lituanie", LU: "Luxembourg", LV: "Lettonie", MT: "Malte",
    NL: "Pays-Bas", PL: "Pologne", PT: "Portugal", RO: "Roumanie", SE: "Suède",
    SI: "Slovénie", SK: "Slovaquie", NO: "Norvège", CH: "Suisse", GB: "Royaume-Uni",
};

interface Props {
    company: MapCompany;
    onClose: () => void;
}

export function CompanyEUSheet({ company, onClose }: Props) {
    const c = company;
    const color = NACE_GROUP_COLORS[c.naceGroup] || '#888';

    return (
        <div className="absolute right-0 top-0 h-full w-[380px] bg-[var(--color-surface)] border-l border-[var(--color-border)] overflow-y-auto filter-scrollbar z-30 shadow-2xl">
            <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--color-muted)]">{c.naceGroup}</span>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-accent)] shrink-0">
                        <X size={16} />
                    </button>
                </div>

                <h2 className="text-base font-semibold leading-tight mt-2 mb-1">{c.name}</h2>

                {c.website && (
                    <a
                        href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3b82f6] text-xs hover:underline flex items-center gap-1 mb-4"
                    >
                        <ExternalLink size={12} />
                        {c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    </a>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <MetricCard label="EFFECTIF" value={c.employees?.toLocaleString("fr-FR") ?? "—"} />
                    <MetricCard label="CA (k€)" value={c.revenue != null ? Math.round(c.revenue).toLocaleString("fr-FR") : "—"} />
                </div>

                {/* Details */}
                <div className="space-y-4">
                    <Section title="LOCALISATION">
                        <Row label="Ville" value={c.city} />
                        <Row label="Région" value={c.region} />
                        <Row label="Pays" value={COUNTRY_NAMES[c.countryIso] || c.countryIso} />
                    </Section>

                    <Section title="INDUSTRIE">
                        <Row label="NACE" value={c.naceCore} />
                        <Row label="Secteur" value={c.naceGroup} />
                        {c.guoName && <Row label="Groupe" value={c.guoName} />}
                    </Section>

                    {c.tradeDescription && (
                        <Section title="ACTIVITÉ">
                            <p className="text-xs text-[var(--color-accent)] leading-relaxed">{c.tradeDescription}</p>
                        </Section>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 clip-snip-corner-sm">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1">{label}</div>
            <div className="text-sm font-semibold text-[var(--color-accent)]">{value}</div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-section-header mb-2 pb-1 border-b border-[var(--color-border)]">{title}</div>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
        <div className="flex justify-between items-baseline">
            <span className="text-[10px] text-[var(--color-muted)]">{label}</span>
            <span className="text-xs text-[var(--color-text)]">{value}</span>
        </div>
    );
}
