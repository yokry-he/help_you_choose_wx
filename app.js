const storage = require("./utils/storage");

App({
  onLaunch() {
    storage.ensureDefaults();
  },
  addThemeListener(listener) {
    if (typeof listener !== "function") return "";
    const id = `theme_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this.globalData.themeListeners[id] = listener;
    return id;
  },
  removeThemeListener(id) {
    if (!id) return;
    delete this.globalData.themeListeners[id];
  },
  emitThemeChange(theme) {
    const listeners = this.globalData.themeListeners || {};
    Object.keys(listeners).forEach((id) => {
      const fn = listeners[id];
      if (typeof fn !== "function") return;
      try {
        fn(theme);
      } catch (_) {}
    });
  },
  globalData: {
    pendingDraft: null,
    lastResult: null,
    themeListeners: {},
  },
});
