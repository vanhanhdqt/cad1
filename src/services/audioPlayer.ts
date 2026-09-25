/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let activeAudioSource: AudioBufferSourceNode | null = null;
let activeAudioCtx: AudioContext | null = null;

export const playBase64Audio = async (base64Data: string, sampleRate = 24000): Promise<void> => {
  // Stop existing playback
  stopAudio();

  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  activeAudioCtx = audioCtx;

  // Check if it's already a WAV or raw PCM 16-bit
  try {
    const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
    activeAudioSource = source;
  } catch (e) {
    // If decodeAudioData fails (raw PCM 16-bit mono 24kHz), convert manually
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const buffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
    buffer.copyToChannel(float32Array, 0);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
    activeAudioSource = source;
  }
};

export const stopAudio = () => {
  if (activeAudioSource) {
    try {
      activeAudioSource.stop();
    } catch (_) {}
    activeAudioSource = null;
  }
  if (activeAudioCtx) {
    try {
      activeAudioCtx.close();
    } catch (_) {}
    activeAudioCtx = null;
  }
};
