const { hexToRgba } = require("./ui");

function bindThemeListener(page, onThemeChange) {
  if (!page || typeof onThemeChange !== "function") return;
  const app = getApp();
  if (!app || typeof app.addThemeListener !== "function") return;
  const listenerId = app.addThemeListener((theme) => {
    if (!theme || !theme.primary) return;
    onThemeChange(theme);
  });
  page._themeListenerId = listenerId;
}

function unbindThemeListener(page) {
  if (!page || !page._themeListenerId) return;
  const app = getApp();
  if (!app || typeof app.removeThemeListener !== "function") return;
  app.removeThemeListener(page._themeListenerId);
  page._themeListenerId = "";
}

function applyPageTheme(page, theme, options = {}) {
  if (!page || typeof page.setData !== "function" || !theme || !theme.primary) return;
  const nextData = {
    theme,
  };
  const alphaFields = options.alphaFields || {};
  Object.keys(alphaFields).forEach((key) => {
    const alpha = Number(alphaFields[key]);
    if (Number.isFinite(alpha)) {
      nextData[key] = hexToRgba(theme.primary, alpha);
    }
  });
  const extraData = options.extraData;
  if (extraData && typeof extraData === "object") {
    Object.assign(nextData, extraData);
  }
  page.setData(nextData, options.callback);
}

module.exports = {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
};
