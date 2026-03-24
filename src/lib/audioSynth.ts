const writeString = (view: DataView, offset: number, value: string) => {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
};

const audioBufferToWav = (buffer: AudioBuffer) => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numFrames = buffer.length;
  const dataSize = numFrames * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      let sample = buffer.getChannelData(channel)[i] || 0;
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return wavBuffer;
};

export const generateEpicSoundtrack = async (durationSec = 8, sampleRate = 44100) => {
  const context = new OfflineAudioContext(2, Math.floor(durationSec * sampleRate), sampleRate);

  const masterGain = context.createGain();
  masterGain.gain.value = 0.6;
  masterGain.connect(context.destination);

  const low = context.createOscillator();
  low.type = "sine";
  low.frequency.value = 55;

  const mid = context.createOscillator();
  mid.type = "sawtooth";
  mid.frequency.value = 220;

  const high = context.createOscillator();
  high.type = "triangle";
  high.frequency.value = 440;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1200;

  const swell = context.createGain();
  swell.gain.value = 0;

  const lfo = context.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.35;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 0.12;

  low.connect(swell);
  mid.connect(swell);
  high.connect(swell);
  swell.connect(filter);
  filter.connect(masterGain);

  lfo.connect(lfoGain);
  lfoGain.connect(swell.gain);

  swell.gain.setValueAtTime(0, 0);
  swell.gain.linearRampToValueAtTime(0.45, 1.2);
  swell.gain.linearRampToValueAtTime(0.5, durationSec * 0.6);
  swell.gain.linearRampToValueAtTime(0.2, durationSec);

  low.start(0);
  mid.start(0);
  high.start(0);
  lfo.start(0);
  low.stop(durationSec);
  mid.stop(durationSec);
  high.stop(durationSec);
  lfo.stop(durationSec);

  const buffer = await context.startRendering();
  return audioBufferToWav(buffer);
};
