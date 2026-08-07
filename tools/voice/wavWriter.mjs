import fs from "node:fs";
import path from "node:path";

/**
 * Save mono Float32 PCM samples as a standard 16-bit little-endian WAV.
 * This intentionally has no ML/runtime dependencies so Kokoro narration does
 * not load a second incompatible onnxruntime-node version merely to write audio.
 */
export const saveFloat32Wav = (outputPath, samples, sampleRate) => {
  if (!(samples instanceof Float32Array)) throw new TypeError("samples must be a Float32Array");
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) throw new TypeError("sampleRate must be a positive integer");

  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.allocUnsafe(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const pcm16 = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    buffer.writeInt16LE(pcm16, 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
};
