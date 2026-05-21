'use client';

import Link from 'next/link';
import { ArrowLeft, CuboidIcon } from 'lucide-react';
import { NeonText } from '@/components/ui/NeonText';
import { ReplayList } from '@/app/(public)/replay/3d/ReplayList';
import { ReplayStage } from '@/app/(public)/replay/3d/ReplayStage';
import { useReplaySession } from '@/app/(public)/replay/3d/useReplaySession';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

function BackLink() {
  const language = useSettingsStore((s) => s.language);
  return (
    <Link href="/replay" className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline cursor-pointer">
      <ArrowLeft size={14} />
      <span>{t('replay_3d_back_to_2d', language)}</span>
    </Link>
  );
}

export default function Replay3DPage() {
  const language = useSettingsStore((s) => s.language);
  const { replays, selected, positions, loading, select } = useReplaySession();

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 pt-6 px-4 md:px-8 lg:pt-16">
      <header className="mb-4 flex items-center gap-3">
        <CuboidIcon size={20} className="text-[var(--primary)]" />
        <NeonText text={t('replay_3d_title', language)} size="text-xl" />
        <span className="ml-auto text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
          {t('replay_3d_available', language).replace('{0}', String(replays.length))}
        </span>
      </header>
      <div className="mb-4"><BackLink /></div>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <ReplayList replays={replays} selected={selected} onSelect={select} />
        <ReplayStage selected={selected} loading={loading} positions={positions} />
      </div>
    </div>
  );
}
