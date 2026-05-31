'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useFlightStore } from '@/lib/stores/flightStore';
import { parseVoiceCommand, type VoiceCommand } from '@/lib/voice/commandParser';
import { useRouter } from 'next/navigation';

const LANG_MAP: Record<string, string> = { en: 'en-US', de: 'de-DE', fr: 'fr-FR' };

export function VoiceButton() {
  const language = useSettingsStore((s) => s.language);
  const setMapStyle = useSettingsStore((s) => s.setMapStyle);
  const setShowRadar = useSettingsStore((s) => s.setShowRadar);
  const showRadar = useSettingsStore((s) => s.showRadar);
  const setShowTurbulence = useSettingsStore((s) => s.setShowTurbulence);
  const showTurbulence = useSettingsStore((s) => s.showTurbulence);
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const router = useRouter();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
     
    setIsSupported(Boolean(SR));
  }, []);

  const executeCommand = useCallback((cmd: VoiceCommand) => {
    switch (cmd.type) {
      case 'showFlight': {
        // Search in live aircraft
        const found = Array.from(aircraftMap.values()).find(
          (ac) => ac.callsign?.toUpperCase().includes(cmd.callsign)
        );
        if (found) {
          selectAircraft(found);
          setFeedback(`✈ ${cmd.callsign}`);
        } else {
          setFeedback(`? ${cmd.callsign}`);
        }
        break;
      }
      case 'goToAirport':
        router.push(`/airports/${cmd.query.toUpperCase()}`);
        setFeedback(`✈ ${cmd.query}`);
        break;
      case 'filterCargo':
        router.push('/cargo');
        setFeedback('CARGO');
        break;
      case 'setStyleDark':
        setMapStyle('dark');
        setFeedback('DARK');
        break;
      case 'setStyleLight':
        setMapStyle('toner');
        setFeedback('LIGHT');
        break;
      case 'toggleRadar':
        setShowRadar(!showRadar);
        setFeedback(showRadar ? 'RADAR OFF' : 'RADAR ON');
        break;
      case 'toggleTurbulence':
        setShowTurbulence(!showTurbulence);
        setFeedback(showTurbulence ? 'TURB OFF' : 'TURB ON');
        break;
      case 'zoomIn':
      case 'zoomOut':
        setFeedback(cmd.type === 'zoomIn' ? 'ZOOM +' : 'ZOOM -');
        break;
    }
    setTimeout(() => { setFeedback(''); setTranscript(''); }, 3000);
  }, [aircraftMap, selectAircraft, router, setMapStyle, setShowRadar, showRadar, setShowTurbulence, showTurbulence]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = LANG_MAP[language] ?? 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);

      if (final) {
        const cmd = parseVoiceCommand(final, language);
        if (cmd) executeCommand(cmd);
        else setFeedback('?');
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    setTranscript('');
    setFeedback('');
  }, [isListening, language, executeCommand]);

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-4 z-[1100] flex flex-col items-start gap-2">
      {/* Transcript/feedback popup */}
      {(transcript || feedback) && (
        <div className="glass-panel px-3 py-1.5 max-w-[250px]">
          {feedback && <span className="text-xs font-[var(--font-heading)] font-bold text-[var(--success)] block">{feedback}</span>}
          {transcript && !feedback && <span className="text-xs font-[var(--font-body)] text-[var(--text-secondary)] block truncate">{transcript}</span>}
        </div>
      )}

      {/* Mic button */}
      <button
        type="button"
        onClick={toggleListening}
        aria-pressed={isListening}
        aria-label={isListening ? 'Stop voice command' : 'Start voice command'}
        className={`p-3 rounded-full shadow-lg transition-all cursor-pointer ${
          isListening
            ? 'bg-[var(--error)] text-white animate-pulse shadow-[0_0_20px_var(--error)]'
            : 'glass-panel text-[var(--primary)] hover:bg-white/10'
        }`}
      >
        {isListening ? <Mic size={22} /> : <MicOff size={22} />}
      </button>
    </div>
  );
}
