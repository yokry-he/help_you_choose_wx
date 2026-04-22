function hexToRgba(hex, alpha = 1) {
  const raw = `${hex || ""}`.replace("#", "");
  if (raw.length !== 6) return `rgba(255, 140, 105, ${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyTabBarTheme(theme) {
  if (!theme || !theme.primary) return;
  try {
    wx.setTabBarStyle({
      color: "#8e8e93",
      selectedColor: theme.primary,
      backgroundColor: "#ffffff",
      borderStyle: "black",
    });
  } catch (_) {}
}

module.exports = {
  hexToRgba,
  applyTabBarTheme,
};
