'use client';

import { useState } from 'react';
import { NeonText } from '@/components/ui/NeonText';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { AddAirportInput } from '@/app/dashboard/AddAirportInput';
import { AirportCard } from '@/app/dashboard/AirportCard';
import { useDashboardAirports } from '@/app/dashboard/useDashboardAirports';

export default function DashboardPage() {
  const { language } = useSettingsStore();
  const { airports, addAirport, removeAirport } = useDashboardAirports();
  const [newIata, setNewIata] = useState('');

  const handleAdd = () => {
    if (addAirport(newIata)) setNewIata('');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <NeonText text={t('dashboard', language)} size="text-xl" />
      </div>

      <AddAirportInput language={language} value={newIata} onChange={setNewIata} onAdd={handleAdd} />

      <div className="space-y-4">
        {airports.map((ap) => (
          <AirportCard key={ap.iata} airport={ap} language={language} onRemove={removeAirport} />
        ))}
      </div>
    </div>
  );
}
