// Kids Matcher Audio & Speech Synthesis Engine

let audioCtx = null;
let soundEnabled = true;

// Initialize Audio Context on user gesture
export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Toggle sound state
export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  if (enabled) {
    initAudio();
  }
}

export function isSoundEnabled() {
  return soundEnabled;
}

// Play Pop/Plop Sound (Short pitch sweep)
export function playPop() {
  if (!soundEnabled) return;
  initAudio();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = 'sine';
  const now = audioCtx.currentTime;
  
  // Quick frequency sweep downward
  osc.frequency.setValueAtTime(450, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
  
  // Smooth volume envelope
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  
  osc.start(now);
  osc.stop(now + 0.12);
}

// Play Match Correct Sound (Cute ascending arpeggio)
export function playCorrect() {
  if (!soundEnabled) return;
  initAudio();
  
  const now = audioCtx.currentTime;
  const playNote = (freq, time, duration) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'triangle'; // Soft flute-like sound
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
    
    osc.start(time);
    osc.stop(time + duration);
  };
  
  // Ascending C major arpeggio
  playNote(523.25, now, 0.25);        // C5
  playNote(659.25, now + 0.08, 0.25); // E5
  playNote(783.99, now + 0.16, 0.25); // G5
  playNote(1046.50, now + 0.24, 0.3); // C6
}

// Play Match Incorrect Sound (Low dull buzzer)
export function playIncorrect() {
  if (!soundEnabled) return;
  initAudio();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = 'sawtooth';
  const now = audioCtx.currentTime;
  
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.linearRampToValueAtTime(110, now + 0.2);
  
  // Buzzing vibrato effect
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 25; // 25 Hz vibrato
  lfoGain.gain.value = 20;
  
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
  
  lfo.start(now);
  osc.start(now);
  
  lfo.stop(now + 0.22);
  osc.stop(now + 0.22);
}

// Play victory fanfare (cheerful chord melody)
export function playFanfare() {
  if (!soundEnabled) return;
  initAudio();
  
  const now = audioCtx.currentTime;
  const playBrassNote = (freq, time, duration) => {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);
    
    // Mix triangle and sine for a rich synth horn sound
    osc1.type = 'triangle';
    osc2.type = 'sine';
    
    // Detune slightly for chorusing effect
    osc1.frequency.setValueAtTime(freq - 1.5, time);
    osc2.frequency.setValueAtTime(freq + 1.5, time);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  };
  
  // Play a simple happy melody (C4, E4, G4, C5, then chords)
  playBrassNote(261.63, now, 0.15); // C4
  playBrassNote(329.63, now + 0.12, 0.15); // E4
  playBrassNote(392.00, now + 0.24, 0.15); // G4
  playBrassNote(523.25, now + 0.36, 0.4);  // C5
  
  // Final victory chord (E5 + G5 + C6)
  playBrassNote(659.25, now + 0.7, 0.85); // E5
  playBrassNote(783.99, now + 0.7, 0.85); // G5
  playBrassNote(1046.50, now + 0.7, 0.85); // C6
}

// Text to Speech (TTS) Pronunciation Helper
export function speakText(text) {
  if (!soundEnabled || !window.speechSynthesis) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // Clean emoji and special symbols from string
  const cleanText = text
    .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
    .trim();
  
  if (!cleanText) return;
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 0.85; // Kid friendly slow speech rate
  utterance.pitch = 1.25; // Slightly higher pitch for kids
  
  // Select an English voice if available
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith('en-'));
  if (enVoice) {
    utterance.voice = enVoice;
  }
  
  window.speechSynthesis.speak(utterance);
}
