interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassPanel({ children, className = '', onClick }: GlassPanelProps) {
  return (
    <div className={`glass-panel ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
