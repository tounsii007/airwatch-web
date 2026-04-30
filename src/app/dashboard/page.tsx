'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { AddAirportInput } from '@/app/dashboard/AddAirportInput';
import { AirportCard } from '@/app/dashboard/AirportCard';
import { useDashboardAirports } from '@/app/dashboard/useDashboardAirports';
import { PageContainer, Stagger, FadeIn } from '@/components/ui';

export default function DashboardPage() {
  const { language } = useSettingsStore();
  const { airports, addAirport, removeAirport } = useDashboardAirports();
  const [newIata, setNewIata] = useState('');

  const handleAdd = () => {
    if (addAirport(newIata)) setNewIata('');
  };

  return (
    <PageContainer
      maxWidth="2xl"
      title={t('dashboard', language)}
      subtitle={airports.length === 0 ? null : (
        <span className="badge badge-info">{airports.length} airports</span>
      )}
    >
      <FadeIn>
        <AddAirportInput
          language={language}
          value={newIata}
          onChange={setNewIata}
          onAdd={handleAdd}
        />
      </FadeIn>

      <Stagger className="space-y-4 mt-6">
        {airports.map((ap) => (
          <div key={ap.iata} className="animate-fade-up">
            <AirportCard airport={ap} language={language} onRemove={removeAirport} />
          </div>
        ))}
      </Stagger>
    </PageContainer>
  );
}
