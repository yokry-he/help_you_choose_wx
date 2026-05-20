const storage = require("./storage");

let spinEndAudio = null;
let chargeTickAudio = null;

function getSpinEndAudio() {
  if (!spinEndAudio) {
    spinEndAudio = wx.createInnerAudioContext();
    spinEndAudio.src = "/assets/audio/spin-end.mp3";
    spinEndAudio.volume = 0.55;
  }
  return spinEndAudio;
}

function getChargeTickAudio() {
  if (!chargeTickAudio) {
    chargeTickAudio = wx.createInnerAudioContext();
    chargeTickAudio.src = "/assets/audio/charge-tick.mp3";
    chargeTickAudio.volume = 0.35;
  }
  return chargeTickAudio;
}

function shouldHaptic() {
  const settings = storage.getSmartSettings();
  return settings.hapticEnabled !== false;
}

function shouldSound() {
  const settings = storage.getSmartSettings();
  return settings.soundEnabled !== false;
}

function playHaptic(type) {
  if (!shouldHaptic() || !wx.vibrateShort) return;
  wx.vibrateShort({
    type: type || "medium",
  });
}

function playSpinEndSound() {
  if (!shouldSound()) return;
  try {
    const audio = getSpinEndAudio();
    audio.stop();
    audio.seek(0);
    audio.play();
  } catch (_) {}
}

function playChargeTickSound() {
  if (!shouldSound()) return;
  try {
    const audio = getChargeTickAudio();
    audio.stop();
    audio.seek(0);
    audio.play();
  } catch (_) {}
}

function destroyAudio() {
  if (spinEndAudio) {
    spinEndAudio.destroy();
    spinEndAudio = null;
  }
  if (chargeTickAudio) {
    chargeTickAudio.destroy();
    chargeTickAudio = null;
  }
}

module.exports = {
  playHaptic,
  playSpinEndSound,
  playChargeTickSound,
  destroyAudio,
};
