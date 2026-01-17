'use client';

import { Metrics, THRESHOLDS } from '@/lib/types';

interface MetricsDisplayProps {
  metrics: Metrics;
}

interface MetricItemProps {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'bad';
}

function MetricItem({ label, value, status }: MetricItemProps) {
  const statusColors = {
    good: 'text-green-400 bg-green-500/10 border-green-500/30',
    warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    bad: 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  return (
    <div className={`p-3 rounded-lg border ${statusColors[status]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

export default function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  // Determine status for each metric
  const getPaceStatus = (): 'good' | 'warning' | 'bad' => {
    const { pace_wpm } = metrics;
    if (pace_wpm >= THRESHOLDS.pace.min && pace_wpm <= THRESHOLDS.pace.max) return 'good';
    if (pace_wpm >= 130 && pace_wpm <= 180) return 'warning';
    return 'bad';
  };

  const getFillerStatus = (): 'good' | 'warning' | 'bad' => {
    const { filler_rate_per_min } = metrics;
    if (filler_rate_per_min <= THRESHOLDS.fillers.max) return 'good';
    if (filler_rate_per_min <= 4) return 'warning';
    return 'bad';
  };

  const getEyeContactStatus = (): 'good' | 'warning' | 'bad' => {
    const { eye_contact_pct } = metrics;
    if (eye_contact_pct >= THRESHOLDS.eye_contact.min) return 'good';
    if (eye_contact_pct >= 0.5) return 'warning';
    return 'bad';
  };

  const getEnergyStatus = (): 'good' | 'warning' | 'bad' => {
    const { motion_energy } = metrics;
    if (motion_energy >= THRESHOLDS.motion_energy.min && motion_energy <= THRESHOLDS.motion_energy.max) return 'good';
    if (motion_energy >= 0.2 && motion_energy <= 0.7) return 'warning';
    return 'bad';
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricItem
        label="Pace"
        value={`${metrics.pace_wpm} WPM`}
        status={getPaceStatus()}
      />
      <MetricItem
        label="Fillers"
        value={`${metrics.filler_rate_per_min}/min`}
        status={getFillerStatus()}
      />
      <MetricItem
        label="Eye Contact"
        value={`${Math.round(metrics.eye_contact_pct * 100)}%`}
        status={getEyeContactStatus()}
      />
      <MetricItem
        label="Energy"
        value={`${Math.round(metrics.motion_energy * 100)}%`}
        status={getEnergyStatus()}
      />
    </div>
  );
}
