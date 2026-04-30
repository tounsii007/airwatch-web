'use client';

import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import Image from 'next/image';
import { t } from '@/lib/i18n/translations';
import { ChipGroup, type ChipOption } from '@/app/settings/ChipGroup';
import { LabeledBlock, SectionPanel } from '@/app/settings/SectionPanel';
import type { AppLanguage, AppTheme } from '@/lib/types';

interface Props {
  theme: AppTheme;
  language: AppLanguage;
  onTheme: (t: AppTheme) => void;
  onLanguage: (l: AppLanguage) => void;
}

/**
 * Tiny SVG flag rendered next to each language chip. Uses the same
 * /public/flags/ asset set the airport / cargo / saved pages already
 * pull from — no new image deps. Pinned at 4×3 aspect ratio (16×12 px)
 * with a 1 px border + rounded corners so it reads as a proper flag
 * even when the chip background is dark.
 */
function FlagIcon({ country, alt }: { country: 'gb' | 'de' | 'fr'; alt: string }) {
  return (
    <Image
      src={`/flags/${country}.svg`}
      alt={alt}
      width={16}
      height={12}
      className="rounded-[2px] ring-1 ring-black/20 shadow-sm shrink-0"
      // SVGs scale crisply; unoptimised flag is < 2 KB so we skip Next's
      // image optimiser to avoid an extra round-trip on every render.
      unoptimized
      priority={false}
    />
  );
}

const LANGUAGES: ChipOption<AppLanguage>[] = [
  { value: 'en', label: 'EN', icon: <FlagIcon country="gb" alt="English" /> },
  { value: 'de', label: 'DE', icon: <FlagIcon country="de" alt="Deutsch" /> },
  { value: 'fr', label: 'FR', icon: <FlagIcon country="fr" alt="Français" /> },
];

function themeOptions(language: AppLanguage): ChipOption<AppTheme>[] {
  return [
    { value: 'dark', label: t('theme_dark', language), icon: <Moon size={12} /> },
    { value: 'light', label: t('theme_light', language), icon: <Sun size={12} /> },
    { value: 'system', label: t('theme_system', language), icon: <Monitor size={12} /> },
  ];
}

/** Appearance section: theme + language. */
export function AppearanceSection({ theme, language, onTheme, onLanguage }: Props) {
  return (
    <SectionPanel icon={<Palette size={12} />} title={t('appearance', language)}>
      <div className="space-y-1">
        <LabeledBlock label={t('theme', language)}>
          <ChipGroup options={themeOptions(language)} value={theme} onChange={onTheme} />
        </LabeledBlock>
        <div className="border-t border-[var(--glass-border)]" />
        <LabeledBlock label={t('language', language)}>
          <ChipGroup options={LANGUAGES} value={language} onChange={onLanguage} />
        </LabeledBlock>
      </div>
    </SectionPanel>
  );
}
