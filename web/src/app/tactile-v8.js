(() => {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const interactiveSelector = [
    'button:not(:disabled)',
    'a[href]',
    'summary',
    'select:not(:disabled)',
    'input:not([type="hidden"]):not(:disabled)',
    'textarea:not(:disabled)',
    '[role="button"]',
    '[role="tab"]',
    '[role="switch"]',
    'label[for]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  const surfaceSelector = [
    '.data-primary-action-v4',
    '.primary-cta',
    '.mobile-continue-dock-v4',
    '.achievement-toggle',
    '.subjects-v2 .subject',
    '.lesson-card',
    '.family-tools-grid-v6 .game-entry',
    '.rest-entry-v6',
    '.curriculum-subject-card-v3',
    '.path-node',
    '.account-auth-choice > button'
  ].join(',');
  const depthSelector = [
    '.data-primary-action-v4',
    '.primary-cta',
    '.mobile-continue-dock-v4',
    '.subjects-v2 .subject',
    '.family-tools-grid-v6 .game-entry',
    '.rest-entry-v6'
  ].join(',');

  let audioContext = null;
  let masterGain = null;
  let clickNoise = null;
  let soundUnlocked = false;
  let lastHoverSoundAt = 0;
  let lastConfirmSoundAt = 0;
  let activeControl = null;
  let field = null;
  let pointerFrame = 0;
  let latestPointerEvent = null;
  let lastPointerDownAt = 0;

  function ensureAudio() {
    const AudioContextType = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextType) return null;
    if (!audioContext) {
      audioContext = new AudioContextType();
      masterGain = audioContext.createGain();
      masterGain.gain.value = .44;
      masterGain.connect(audioContext.destination);
      clickNoise = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * .032), audioContext.sampleRate);
      const noise = clickNoise.getChannelData(0);
      for (let index = 0; index < noise.length; index += 1) {
        const envelope = 1 - index / noise.length;
        noise[index] = (Math.random() * 2 - 1) * envelope * envelope * envelope;
      }
    }
    if (audioContext.state === 'suspended') void audioContext.resume();
    soundUnlocked = true;
    return audioContext;
  }

  function outputNode(context, pan = 0) {
    if (!context.createStereoPanner) return masterGain;
    const panner = context.createStereoPanner();
    panner.pan.value = Math.max(-.3, Math.min(.3, pan));
    panner.connect(masterGain);
    return panner;
  }

  function playTone(context, { frequency, endFrequency, duration, gain, type = 'sine', delay = 0, pan = 0 }) {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + .0025);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(outputNode(context, pan));
    oscillator.start(start);
    oscillator.stop(start + duration + .008);
  }

  function playNoiseTick(context, pan = 0) {
    if (!clickNoise) return;
    const start = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = clickNoise;
    filter.type = 'bandpass';
    filter.frequency.value = 5600;
    filter.Q.value = 1.45;
    envelope.gain.setValueAtTime(.078, start);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + .017);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(outputNode(context, pan));
    source.start(start);
    source.stop(start + .022);
  }

  function playConfirmSound(pan = 0) {
    const now = performance.now();
    if (now - lastConfirmSoundAt < 28) return;
    lastConfirmSoundAt = now;
    const context = ensureAudio();
    if (!context) return;
    playNoiseTick(context, pan);
    playTone(context, { frequency: 1880, endFrequency: 1420, duration: .03, gain: .052, type: 'triangle', pan });
    playTone(context, { frequency: 980, endFrequency: 1120, duration: .052, gain: .036, type: 'sine', pan });
    playTone(context, { frequency: 2480, endFrequency: 2050, duration: .034, gain: .018, type: 'sine', delay: .006, pan });
    playTone(context, { frequency: 1220, endFrequency: 1040, duration: .065, gain: .012, type: 'sine', delay: .021, pan });
  }

  function playHoverSound(pan = 0) {
    if (!soundUnlocked || !audioContext || audioContext.state !== 'running') return;
    const now = performance.now();
    if (now - lastHoverSoundAt < 78) return;
    lastHoverSoundAt = now;
    playTone(audioContext, { frequency: 780, endFrequency: 920, duration: .046, gain: .015, type: 'sine', pan });
    playTone(audioContext, { frequency: 1560, endFrequency: 1740, duration: .038, gain: .006, type: 'sine', delay: .006, pan });
  }

  function pointerPan(clientX = innerWidth / 2) {
    return (clientX / Math.max(1, innerWidth) - .5) * .48;
  }

  function findInteractive(target) {
    if (!(target instanceof Element)) return null;
    const control = target.closest(interactiveSelector);
    if (!control || control.closest('[hidden]') || !control.getClientRects().length) return null;
    return control;
  }

  function ensureField() {
    if (field) return field;
    field = document.createElement('span');
    field.className = 'interaction-field-v12';
    field.setAttribute('aria-hidden', 'true');
    document.body.append(field);
    return field;
  }

  function placeField(control, clientX, clientY, keyboard = false) {
    if (!control) return;
    const bounds = control.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const glow = ensureField();
    const styles = getComputedStyle(control);
    const x = keyboard ? bounds.width / 2 : Math.max(0, Math.min(bounds.width, clientX - bounds.left));
    const y = keyboard ? bounds.height / 2 : Math.max(0, Math.min(bounds.height, clientY - bounds.top));
    glow.style.left = `${bounds.left}px`;
    glow.style.top = `${bounds.top}px`;
    glow.style.width = `${bounds.width}px`;
    glow.style.height = `${bounds.height}px`;
    glow.style.borderRadius = styles.borderRadius;
    glow.style.setProperty('--field-x', `${x}px`);
    glow.style.setProperty('--field-y', `${y}px`);
    glow.classList.toggle('is-keyboard-v12', keyboard);
    glow.classList.add('is-visible-v12');
  }

  function hideField(control = activeControl) {
    if (control && activeControl && control !== activeControl) return;
    field?.classList.remove('is-visible-v12', 'is-pressing-v12', 'is-keyboard-v12');
    activeControl = null;
  }

  function pulseField() {
    const glow = ensureField();
    glow.classList.remove('is-pressing-v12');
    void glow.offsetWidth;
    glow.classList.add('is-pressing-v12');
    setTimeout(() => glow.classList.remove('is-pressing-v12'), 230);
  }

  function showGlobalBurst(clientX, clientY) {
    if (reduceMotion.matches) return;
    const burst = document.createElement('span');
    burst.className = 'interaction-burst-v12';
    burst.setAttribute('aria-hidden', 'true');
    burst.style.left = `${clientX}px`;
    burst.style.top = `${clientY}px`;
    document.body.append(burst);
    burst.addEventListener('animationend', () => burst.remove(), { once: true });
    setTimeout(() => burst.remove(), 620);
  }

  function confirmSurface(surface) {
    if (!surface) return;
    surface.classList.remove('is-confirmed-v8');
    void surface.offsetWidth;
    surface.classList.add('is-confirmed-v8');
    setTimeout(() => surface.classList.remove('is-confirmed-v8'), 180);
  }

  function updatePointer(surface, event) {
    if (!finePointer.matches || reduceMotion.matches) return;
    const bounds = surface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.min(bounds.width, Math.max(0, event.clientX - bounds.left));
    const y = Math.min(bounds.height, Math.max(0, event.clientY - bounds.top));
    const nx = x / bounds.width - .5;
    const ny = y / bounds.height - .5;
    surface.style.setProperty('--touch-x', `${(x / bounds.width) * 100}%`);
    surface.style.setProperty('--touch-y', `${(y / bounds.height) * 100}%`);
    if (surface.classList.contains('has-depth-v8')) {
      surface.style.setProperty('--touch-rx', `${(-ny * 1.15).toFixed(2)}deg`);
      surface.style.setProperty('--touch-ry', `${(nx * 1.45).toFixed(2)}deg`);
    }
  }

  function enhance(surface) {
    if (!(surface instanceof HTMLElement) || surface.classList.contains('tactile-v8')) return;
    surface.classList.add('tactile-v8');
    if (surface.matches(depthSelector)) surface.classList.add('has-depth-v8');
    const light = document.createElement('span');
    light.className = 'tactile-light-v8';
    light.setAttribute('aria-hidden', 'true');
    surface.append(light);
    let frame = 0;
    let latest = null;
    surface.addEventListener('pointerenter', event => {
      if (!finePointer.matches) return;
      surface.classList.add('is-touched-v8');
      updatePointer(surface, event);
    }, { passive: true });
    surface.addEventListener('pointermove', event => {
      if (!finePointer.matches || reduceMotion.matches) return;
      latest = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (latest) updatePointer(surface, latest);
      });
    }, { passive: true });
    surface.addEventListener('pointerleave', () => {
      surface.classList.remove('is-touched-v8');
      surface.style.removeProperty('--touch-rx');
      surface.style.removeProperty('--touch-ry');
    }, { passive: true });
    surface.addEventListener('pointerdown', () => surface.classList.add('is-pressed-v8'), { passive: true });
    const release = () => surface.classList.remove('is-pressed-v8');
    surface.addEventListener('pointerup', release, { passive: true });
    surface.addEventListener('pointercancel', release, { passive: true });
  }

  function enhanceTree(root = document) {
    if (root instanceof HTMLElement && root.matches(surfaceSelector)) enhance(root);
    root.querySelectorAll?.(surfaceSelector).forEach(enhance);
  }

  enhanceTree();
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node instanceof HTMLElement) enhanceTree(node);
  }))).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('pointerover', event => {
    if (!finePointer.matches) return;
    const control = findInteractive(event.target);
    if (!control) return;
    if (activeControl !== control) {
      activeControl = control;
      playHoverSound(pointerPan(event.clientX));
    }
    placeField(control, event.clientX, event.clientY);
  }, true);

  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || !activeControl) return;
    latestPointerEvent = event;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (activeControl && latestPointerEvent) placeField(activeControl, latestPointerEvent.clientX, latestPointerEvent.clientY);
    });
  }, { capture: true, passive: true });

  document.addEventListener('pointerout', event => {
    if (!activeControl) return;
    const next = findInteractive(event.relatedTarget);
    if (next === activeControl) return;
    hideField(activeControl);
  }, true);

  document.addEventListener('pointerdown', event => {
    const control = findInteractive(event.target);
    if (!control) return;
    lastPointerDownAt = performance.now();
    activeControl = control;
    placeField(control, event.clientX, event.clientY);
    pulseField();
    showGlobalBurst(event.clientX, event.clientY);
    playConfirmSound(pointerPan(event.clientX));
    confirmSurface(control.closest('.tactile-v8'));
  }, true);

  document.addEventListener('focusin', event => {
    const control = findInteractive(event.target);
    if (!control) return;
    if (performance.now() - lastPointerDownAt < 220) return;
    activeControl = control;
    const bounds = control.getBoundingClientRect();
    placeField(control, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, true);
    playHoverSound(0);
  }, true);

  document.addEventListener('focusout', event => {
    if (event.target === activeControl) hideField(activeControl);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.repeat || !['Enter', ' '].includes(event.key)) return;
    const control = findInteractive(event.target);
    if (!control) return;
    const bounds = control.getBoundingClientRect();
    activeControl = control;
    placeField(control, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, true);
    pulseField();
    showGlobalBurst(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    playConfirmSound(0);
    confirmSurface(control.closest('.tactile-v8'));
  }, true);

  document.addEventListener('change', event => {
    const control = findInteractive(event.target);
    if (!control || performance.now() - lastConfirmSoundAt < 180) return;
    const bounds = control.getBoundingClientRect();
    playConfirmSound(pointerPan(bounds.left + bounds.width / 2));
    pulseField();
  }, true);

  addEventListener('scroll', () => hideField(), { passive: true });
  addEventListener('resize', () => hideField(), { passive: true });
})();
