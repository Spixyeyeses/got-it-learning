(() => {
  const SESSION_KEY = 'gongxing_arcade_session_v1';
  const SETTINGS_KEY = 'wuming_admin_settings_v1';
  const USAGE_KEY = 'wuming_usage_log_v1';
  const ALLOWED_MINUTES = [5, 10, 15, 20, 30, 45, 60];
  const dayKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const deny = () => {
    const payload = { channel: 'wuming-arcade-return', version: 1, expired: true };
    document.documentElement.classList.add('access-denied');
    if (location.protocol === 'file:') {
      window.name = JSON.stringify(payload);
      location.replace(`index.html?gameAccess=required#arcadeReturn=${encodeURIComponent(JSON.stringify(payload))}`);
    } else {
      window.name = '';
      location.replace('index.html?gameAccess=required');
    }
  };

  try {
    const now = Date.now();
    let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    let session = null;
    let returnedUsageMs = 0;
    if (location.protocol === 'file:') {
      const encoded = new URLSearchParams(location.hash.slice(1)).get('handoff');
      if (encoded) {
        const handoff = JSON.parse(encoded);
        const sessionMinutes = Number(handoff?.settings?.gameMinutesCap);
        const dailyMinutes = Number(handoff?.settings?.dailyPlayMinutesCap);
        if (handoff?.version === 1 && handoff.session && ALLOWED_MINUTES.includes(sessionMinutes) && ALLOWED_MINUTES.includes(dailyMinutes)) {
          settings = { ...settings, freeGames: handoff.settings.freeGames === true, gameMinutesCap: sessionMinutes, dailyPlayMinutesCap: dailyMinutes };
          returnedUsageMs = Math.max(0, Number(handoff.settings.dailyPlayUsedMs) || 0);
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
          session = handoff.session;
        }
        try { history.replaceState({}, '', location.pathname + location.search); } catch {}
      }
    }

    const usage = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
    const days = usage.days && typeof usage.days === 'object' ? usage.days : {};
    const today = dayKey();
    const bucket = days[today] || { studyMs: 0, playMs: 0 };
    bucket.playMs = Math.max(Number(bucket.playMs) || 0, returnedUsageMs);
    days[today] = bucket;
    localStorage.setItem(USAGE_KEY, JSON.stringify({ days, events: Array.isArray(usage.events) ? usage.events : [] }));

    const freeGames = settings.freeGames === true;
    const gameMinutesCap = ALLOWED_MINUTES.includes(Number(settings.gameMinutesCap)) ? Number(settings.gameMinutesCap) : 15;
    const dailyMinutesCap = ALLOWED_MINUTES.includes(Number(settings.dailyPlayMinutesCap)) ? Number(settings.dailyPlayMinutesCap) : 20;
    const dailyRemainingMs = Math.max(0, dailyMinutesCap * 60000 - bucket.playMs);
    let candidate = session || JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!candidate && freeGames && dailyRemainingMs >= 60000) {
      const minutes = Math.min(gameMinutesCap, Math.floor(dailyRemainingMs / 60000));
      candidate = { version: 2, issuedAt: now, remainingMs: minutes * 60000, activeSince: null, expiresAt: null, minutes, cost: 0, free: true, nonce: crypto.randomUUID?.() || String(now) + Math.random() };
    }
    const rate = candidate?.rate === 2 ? 2 : 5;
    const validCost = candidate?.free === true ? freeGames && candidate.cost === 0 : candidate?.cost === candidate?.minutes * rate;
    const baseValid = candidate && Number.isInteger(candidate.minutes) && candidate.minutes >= 1 && candidate.minutes <= 60 && validCost;
    const total = baseValid ? candidate.minutes * 60000 : 0;
    const remaining = candidate?.version === 1 && Number.isFinite(candidate.expiresAt)
      ? candidate.expiresAt - now
      : candidate?.version === 2 && Number.isFinite(candidate.remainingMs)
        ? candidate.remainingMs - (Number.isFinite(candidate.activeSince) ? Math.max(0, now - candidate.activeSince) : 0)
        : 0;
    const boundedRemaining = Math.min(total, remaining, dailyRemainingMs);
    if (baseValid && boundedRemaining > 0 && remaining <= total + 1500) {
      const active = { ...candidate, version: 2, remainingMs: boundedRemaining, activeSince: now, expiresAt: now + boundedRemaining };
      localStorage.setItem(SESSION_KEY, JSON.stringify(active));
      window.__gongxingGameSession = active;
    } else {
      localStorage.removeItem(SESSION_KEY);
      deny();
    }
  } catch {
    deny();
  }
})();
