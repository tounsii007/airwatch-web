interface NeonTextProps {
  text: string;
  size?: string;
  color?: string;
  className?: string;
}

export function NeonText({ text, size = 'text-xl', color, className = '' }: NeonTextProps) {
  return (
    <span
      className={`neon-text font-[var(--font-heading)] font-bold tracking-wider ${size} ${className}`}
      style={color ? { color } : undefined}
    >
      {text}
    </span>
  );
}
