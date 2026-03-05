import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'alert' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}: ButtonProps) {
    const baseClasses = "inline-flex items-center justify-center font-sans tracking-tight transition-colors duration-200 outline-none focus:ring-2 focus:ring-[var(--color-border)] disabled:opacity-50 disabled:cursor-not-allowed";

    let variantClasses = "";
    switch (variant) {
        case 'primary':
            variantClasses = "bg-[var(--color-accent)] text-[var(--color-bg)] hover:bg-[#333333] clip-snip-corner-sm";
            break;
        case 'secondary':
            variantClasses = "bg-transparent text-[var(--color-accent)] border border-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] clip-snip-corner-sm";
            break;
        case 'alert':
            variantClasses = "bg-[var(--color-alert)] text-white hover:opacity-90 clip-snip-corner-sm";
            break;
        case 'ghost':
            variantClasses = "bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-surface)]";
            break;
    }

    let sizeClasses = "";
    switch (size) {
        case 'sm':
            sizeClasses = "px-3 py-1.5 text-xs";
            break;
        case 'md':
            sizeClasses = "px-6 py-3 text-sm";
            break;
        case 'lg':
            sizeClasses = "px-8 py-4 text-base";
            break;
    }

    return (
        <button className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`} {...props}>
            {children}
        </button>
    );
}
