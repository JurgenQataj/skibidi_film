const getAudioContext = () => {
  if (!window.audioCtx) {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (window.audioCtx.state === "suspended") {
    window.audioCtx.resume();
  }
  return window.audioCtx;
};

export const initAudio = () => {
  try {
    getAudioContext();
  } catch (e) {}
};

// Play a single "tick" sound for the roulette (Casino wheel peg sound)
export const playTickSound = () => {
  try {
    const ctx = getAudioContext();
    
    // 1. Crisp high-frequency snap (the peg hitting)
    const bufferSize = ctx.sampleRate * 0.015; // 15ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(3000, ctx.currentTime);
    noiseFilter.Q.value = 1.0;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start();

    // 2. Small "thud" body (the wheel resonating slightly)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.015);
    
    oscGain.gain.setValueAtTime(0.08, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
    
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.015);

  } catch (e) {
    console.error("Audio error", e);
  }
};

// Play a mechanical sound mimicking a gun cocking / cylinder locking ("chk-chk")
export const playCylinderSpinSound = () => {
  try {
    const ctx = getAudioContext();
    
    // Play two distinct heavy metallic clicks
    [0, 0.15].forEach((timeOffset) => {
      const start = ctx.currentTime + timeOffset;
      
      // High frequency metallic scrape
      const bufferSize = ctx.sampleRate * 0.1; 
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(timeOffset === 0 ? 1500 : 1800, start);
      noiseFilter.Q.value = 1.0;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, start);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(start);
      
      // Heavy mechanical thud body
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(timeOffset === 0 ? 150 : 250, start);
      osc.frequency.exponentialRampToValueAtTime(50, start + 0.08);
      
      oscGain.gain.setValueAtTime(0.15, start);
      oscGain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
      
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.08);
    });
  } catch (e) {
    console.error("Audio error", e);
  }
};

// Play a loud gunshot sound
export const playGunshotSound = () => {
  try {
    const ctx = getAudioContext();

    // White noise buffer
    const bufferSize = ctx.sampleRate * 2; // 2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filter to make it sound like a gun (lowpass)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(1, ctx.currentTime);
    // Exponential decay
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start();
  } catch (e) {
    console.error("Audio error", e);
  }
};

// Play a celebratory win sound
export const playWinSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.15); // C#5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3); // E5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.45); // A5

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.45);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.0);
  } catch (e) {
    console.error("Audio error", e);
  }
};
