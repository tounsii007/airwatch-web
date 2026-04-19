'use client';

import { Monitor, Moon, Palette, Sun } from 'lucide-react';
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

const LANGUAGES: ChipOption<AppLanguage>[] = [
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
  { value: 'fr', label: 'FR' },
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
