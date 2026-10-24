// Quick TTS test: ur-PK neural voice -> reels/_voice-test.mp3
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'reels');

async function main() {
  const mod = require('msedge-tts');
  const MsEdgeTTS = mod.MsEdgeTTS || mod.default;
  const OUTPUT_FORMAT = mod.OUTPUT_FORMAT;
  const tts = new MsEdgeTTS();
  await tts.setMetadata('ur-PK-AsadNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioFilePath } = await tts.toFile(OUT, 'Salam! Ye CalcProMaster ki awaz hai. BMI nikaalna ab asaan hai.');
  const buf = fs.readFileSync(audioFilePath);
  fs.renameSync(audioFilePath, path.join(OUT, '_voice-test.mp3'));
  console.log('TTS OK, bytes:', buf.length);
  process.exit(0);
}
main().catch(e => { console.error('TTS FAIL:', e.message); process.exit(1); });
