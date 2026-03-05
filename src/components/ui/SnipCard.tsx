import React from 'react';

export interface SnipCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'emphasis' | 'outline' | 'alert';
  snipSize?: 'md' | 'sm';
}

export function SnipCard({ 
  children, 
  variant = 'default', 
  snipSize = 'md',
  className = '', 
  ...props 
}: SnipCardProps) {
  const baseClasses = "relative overflow-hidden";
  const snipClass = snipSize === 'md' ? 'clip-snip-corner' : 'clip-snip-corner-sm';
  
  let variantClasses = "";
  switch (variant) {
    case 'default':
      variantClasses = "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]";
      break;
    case 'emphasis':
      variantClasses = "bg-[var(--color-accent)] text-[var(--color-bg)]";
      break;
    case 'outline':
      variantClasses = "bg-transparent border border-[var(--color-border)] text-[var(--color-accent)]";
      break;
    case 'alert':
      variantClasses = "bg-[var(--color-alert)] text-white";
      break;
  }

  return (
    <div 
      className={`${baseClasses} ${snipClass} ${variantClasses} p-4 md:p-6 ${className}`}
      {...props}
    >
      {/* Optional top-left bracket decor can go here if needed */}
      {children}
    </div>
  );
}
