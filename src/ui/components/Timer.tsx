export function Timer({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const seconds = Math.max(0, remainingMs) / 1000;
  const fraction = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const state = seconds <= 3 ? 'critical' : seconds <= 6 ? 'low' : 'ok';
  return (
    <div className="grid" style={{ gap: 8, justifyItems: 'center' }}>
      <div className={`timer${state === 'ok' ? '' : ` timer-${state}`}`} aria-live="off">
        {seconds.toFixed(1)}
      </div>
      <div className={`timerbar${state === 'ok' ? '' : ` timerbar-${state}`}`}>
        <i style={{ width: `${fraction * 100}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="stat" title={hint}>
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}
