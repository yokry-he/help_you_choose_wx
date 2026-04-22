const THEMES = [
  {
    name: "珊瑚橙",
    icon: "🧡",
    primary: "#FF8C69",
    primaryLight: "#FFB399",
    primaryDark: "#FF6B3D",
  },
  {
    name: "薄荷绿",
    icon: "💚",
    primary: "#4ECDC4",
    primaryLight: "#7EDDD7",
    primaryDark: "#3AB5AD",
  },
  {
    name: "薰衣草紫",
    icon: "💜",
    primary: "#9B59B6",
    primaryLight: "#BB8FD4",
    primaryDark: "#803DA0",
  },
  {
    name: "天空蓝",
    icon: "💙",
    primary: "#3498DB",
    primaryLight: "#6BB5E8",
    primaryDark: "#217DBB",
  },
  {
    name: "玫瑰粉",
    icon: "💗",
    primary: "#E91E63",
    primaryLight: "#F06292",
    primaryDark: "#C2185B",
  },
  {
    name: "暖阳黄",
    icon: "💛",
    primary: "#FFB300",
    primaryLight: "#FFC94D",
    primaryDark: "#D69600",
  },
  {
    name: "青柠绿",
    icon: "💚",
    primary: "#66BB6A",
    primaryLight: "#8FD792",
    primaryDark: "#4A9F4F",
  },
  {
    name: "莓果紫",
    icon: "💜",
    primary: "#7E57C2",
    primaryLight: "#A085D6",
    primaryDark: "#6442A3",
  },
  {
    name: "海盐蓝",
    icon: "🩵",
    primary: "#29B6F6",
    primaryLight: "#6ED0FA",
    primaryDark: "#0E9AD9",
  },
  {
    name: "奶油杏",
    icon: "🧡",
    primary: "#F4A261",
    primaryLight: "#F8C08D",
    primaryDark: "#DE8540",
  },
  {
    name: "森林青",
    icon: "🌿",
    primary: "#2E7D6E",
    primaryLight: "#5AA294",
    primaryDark: "#1F5F53",
  },
  {
    name: "晚霞红",
    icon: "❤️",
    primary: "#EF5350",
    primaryLight: "#F37F7D",
    primaryDark: "#D33C39",
  },
  {
    name: "星空靛",
    icon: "🌌",
    primary: "#3F51B5",
    primaryLight: "#6B79CB",
    primaryDark: "#2F4097",
  },
  {
    name: "可可棕",
    icon: "🤎",
    primary: "#8D6E63",
    primaryLight: "#AD9086",
    primaryDark: "#73574E",
  },
];

function clampThemeIndex(index) {
  const num = Number(index);
  if (!Number.isFinite(num)) return 0;
  if (num < 0) return 0;
  if (num >= THEMES.length) return THEMES.length - 1;
  return num;
}

function getThemeByIndex(index) {
  return THEMES[clampThemeIndex(index)];
}

module.exports = {
  THEMES,
  getThemeByIndex,
  clampThemeIndex,
};
