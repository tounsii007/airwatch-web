const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  'en-route': { bg: 'bg-green-500/15', text: 'text-green-400', label: 'LIVE' },
  'active': { bg: 'bg-green-500/15', text: 'text-green-400', label: 'LIVE' },
  'landed': { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'LANDED' },
  'scheduled': { bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: 'SCHED' },
  'cancelled': { bg: 'bg-red-500/15', text: 'text-red-400', label: 'CANCEL' },
};

interface StatusBadgeProps {
  status?: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  if (!status) return null;
  const style = statusStyles[status.toLowerCase()] ?? {
    bg: 'bg-gray-500/15', text: 'text-gray-400', label: status.toUpperCase(),
  };

  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-[var(--font-heading)] font-bold ${style.bg} ${style.text} ${className}`}>
      {style.label}
    </span>
  );
}
