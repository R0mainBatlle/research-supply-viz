'use client';

import React, { useState, useMemo } from 'react';
import { TreeNode } from '@/types';
import { useDefenseStore } from '@/store/useDefenseStore';
import { ChevronRight, ChevronDown } from 'lucide-react';

const CRITICALITY_COLORS: Record<string, string> = {
    critique: '#ef4444',
    haute: '#f59e0b',
    moyenne: '#3b82f6',
    faible: '#6b7280',
};

const CRITICALITY_LABELS: Record<string, string> = {
    critique: 'CRIT',
    haute: 'HIGH',
    moyenne: 'MED',
    faible: 'LOW',
};

function collectNaceCodes(node: TreeNode): string[] {
    if (node.nace_codes) return node.nace_codes;
    const codes = new Set<string>();
    for (const child of node.children || []) {
        for (const code of collectNaceCodes(child)) {
            codes.add(code);
        }
    }
    return Array.from(codes);
}

function countMatches(node: TreeNode, byNace: Record<string, number>): number {
    const codes = collectNaceCodes(node);
    const counted = new Set<string>();
    let total = 0;
    for (const code of codes) {
        if (!counted.has(code)) {
            counted.add(code);
            total += byNace[code] || 0;
        }
    }
    return total;
}

interface TreeItemProps {
    node: TreeNode;
    depth: number;
    byNace: Record<string, number>;
}

function TreeItem({ node, depth, byNace }: TreeItemProps) {
    const [expanded, setExpanded] = useState(depth === 0);
    const { selectedNode, setSelectedNode } = useDefenseStore();
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;
    const matchCount = useMemo(() => countMatches(node, byNace), [node, byNace]);

    const handleClick = () => {
        if (hasChildren) setExpanded(!expanded);
        setSelectedNode(node);
    };

    return (
        <div>
            <button
                onClick={handleClick}
                className={`w-full flex items-center gap-1.5 py-1.5 px-2 text-left text-xs hover:bg-[var(--color-surface)] transition-colors rounded ${
                    isSelected ? 'bg-[var(--color-surface)] border-l-2 border-[var(--color-accent)]' : ''
                }`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
                {hasChildren ? (
                    expanded ? <ChevronDown size={12} className="shrink-0 text-[var(--color-muted)]" /> : <ChevronRight size={12} className="shrink-0 text-[var(--color-muted)]" />
                ) : (
                    <span className="w-3 shrink-0" />
                )}

                {node.criticality && (
                    <span
                        className="shrink-0 inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: CRITICALITY_COLORS[node.criticality] }}
                        title={node.criticality}
                    />
                )}

                <span className={`truncate ${node.level === 'programme' ? 'font-semibold' : ''}`}>
                    {node.name}
                </span>

                <span className="ml-auto shrink-0 text-[10px] font-mono text-[var(--color-muted)]">
                    {matchCount > 0 ? matchCount.toLocaleString('fr-FR') : ''}
                </span>
            </button>

            {hasChildren && expanded && (
                <div>
                    {node.children!.map((child) => (
                        <TreeItem key={child.id} node={child} depth={depth + 1} byNace={byNace} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function DefenseTree() {
    const { tree, selectedNode, stats } = useDefenseStore();

    if (!tree) return null;

    return (
        <aside className="w-[320px] shrink-0 border-r border-[var(--color-border)] flex flex-col h-full overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <h2 className="text-section-header">Arbre des besoins</h2>
            </div>

            {/* Legend */}
            <div className="px-4 py-2 flex gap-3 text-[10px] font-mono text-[var(--color-muted)] border-b border-[var(--color-border)]">
                {Object.entries(CRITICALITY_LABELS).map(([key, label]) => (
                    <span key={key} className="flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CRITICALITY_COLORS[key] }} />
                        {label}
                    </span>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto filter-scrollbar py-1">
                {tree.children?.map((child) => (
                    <TreeItem key={child.id} node={child} depth={0} byNace={stats.byNace} />
                ))}
            </div>

            {/* Selected node info */}
            {selectedNode && selectedNode.level === 'capacite' && (
                <div className="border-t border-[var(--color-border)] px-4 py-3 text-xs space-y-2 max-h-[200px] overflow-y-auto filter-scrollbar">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">{selectedNode.name}</span>
                        {selectedNode.criticality && (
                            <span
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                style={{
                                    backgroundColor: CRITICALITY_COLORS[selectedNode.criticality] + '20',
                                    color: CRITICALITY_COLORS[selectedNode.criticality],
                                }}
                            >
                                {selectedNode.criticality.toUpperCase()}
                            </span>
                        )}
                    </div>
                    {selectedNode.description && (
                        <p className="text-[var(--color-muted)] leading-relaxed">{selectedNode.description}</p>
                    )}
                    {selectedNode.bottleneck && (
                        <div>
                            <span className="text-label">Bottleneck</span>
                            <p className="text-[var(--color-muted)] leading-relaxed mt-1">{selectedNode.bottleneck}</p>
                        </div>
                    )}
                    {selectedNode.nace_codes && (
                        <div className="flex gap-1 flex-wrap">
                            {selectedNode.nace_codes.map((code) => (
                                <span key={code} className="font-mono text-[10px] px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded">
                                    {code}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
}
