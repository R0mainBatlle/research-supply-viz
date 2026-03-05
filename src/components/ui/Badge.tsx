import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    variant?: 'default' | 'outline' | 'alert' | 'success' | 'muted';
}

export function Badge({ children, variant = 'default', className = '', ...props }: BadgeProps) {
    const baseClasses = "inline-flex items-center px-3 py-1 text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase clip-snip-corner-sm leading-none whitespace-nowrap";

    let variantClasses = "";
    switch (variant) {
        case 'default':
            variantClasses = "bg-[var(--color-accent)] text-[var(--color-bg)]";
            break;
        case 'outline':
            variantClasses = "bg-transparent border border-[var(--color-border)] text-[var(--color-muted)]";
            break;
        case 'alert':
            variantClasses = "bg-[var(--color-alert)] text-white";
            break;
        case 'success':
            variantClasses = "bg-[var(--color-success)] text-white";
            break;
        case 'muted':
            variantClasses = "bg-[var(--color-border)] text-[var(--color-accent)]";
            break;
    }

    return (
        <span className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
            {children}
        </span>
    );
}
