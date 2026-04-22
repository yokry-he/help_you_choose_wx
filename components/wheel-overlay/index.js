const storage = require("../../utils/storage");
const { hexToRgba } = require("../../utils/ui");

Component({
  data: {
    visible: false,
    rollingText: "正在抽选…",
    theme: {
      primary: "#FF8C69",
      primaryLight: "#FFB399",
      primaryDark: "#FF6B3D",
    },
  },
  lifetimes: {
    detached() {
      this.clearTimer();
    },
  },
  methods: {
    clearTimer() {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    },
    normalizeAngle(rad) {
      const full = Math.PI * 2;
      return ((rad % full) + full) % full;
    },
    getPointerIndex(rotation, count) {
      const safeCount = Math.max(2, count);
      const sweep = (Math.PI * 2) / safeCount;
      const epsilon = 1e-6;
      return Math.floor(this.normalizeAngle(-rotation + epsilon) / sweep) % safeCount;
    },
    splitLabel(text, maxCharsPerLine = 4, maxLines = 2) {
      const raw = `${text || ""}`.trim();
      if (!raw) return [""];
      const hasSpace = /\s/.test(raw);
      if (hasSpace) {
        const words = raw.split(/\s+/);
        const lines = [];
        let current = "";
        words.forEach((word) => {
          const next = current ? `${current} ${word}` : word;
          if (next.length <= maxCharsPerLine * 2) {
            current = next;
          } else if (lines.length < maxLines - 1) {
            lines.push(current || word);
            current = current ? word : "";
          }
        });
        if (current && lines.length < maxLines) lines.push(current);
        if (lines.length) return lines.slice(0, maxLines);
      }
      const lines = [];
      let cursor = 0;
      while (cursor < raw.length && lines.length < maxLines) {
        lines.push(raw.slice(cursor, cursor + maxCharsPerLine));
        cursor += maxCharsPerLine;
      }
      if (cursor < raw.length && lines.length) {
        const last = lines.length - 1;
        const trimmed = lines[last].slice(0, Math.max(0, maxCharsPerLine - 1));
        lines[last] = `${trimmed}…`;
      }
      return lines;
    },
    drawWheel(options, rotation) {
      const ctx = wx.createCanvasContext("wheelCanvas", this);
      const theme = this.data.theme || storage.getCurrentTheme();
      const size = 310;
      const center = size / 2;
      const radius = 145;
      const count = Math.max(2, options.length);
      const sweep = (Math.PI * 2) / count;
      const pointerIndex = this.getPointerIndex(rotation, count);
      const normalColor = hexToRgba(theme.primary, 0.8);

      ctx.clearRect(0, 0, size, size);

      for (let i = 0; i < count; i += 1) {
        const start = -Math.PI / 2 + i * sweep + rotation;
        const end = start + sweep;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, start, end);
        ctx.closePath();
        ctx.setFillStyle(i === pointerIndex ? theme.primaryDark : normalColor);
        ctx.fill();
      }

      for (let i = 0; i < count; i += 1) {
        const angle = -Math.PI / 2 + i * sweep + rotation;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(x, y);
        ctx.setStrokeStyle("rgba(255,255,255,0.85)");
        ctx.setLineWidth(2);
        ctx.stroke();
      }

      for (let i = 0; i < count; i += 1) {
        const text = options[i] || "";
        const angle = -Math.PI / 2 + (i + 0.5) * sweep + rotation;
        const tx = center + Math.cos(angle) * radius * 0.63;
        const ty = center + Math.sin(angle) * radius * 0.63;
        const lines = this.splitLabel(text);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(angle + Math.PI / 2);
        ctx.setFillStyle("#ffffff");
        ctx.setFontSize(11);
        lines.forEach((line, idx) => {
          const y = (idx - (lines.length - 1) / 2) * 13;
          ctx.fillText(line, -ctx.measureText(line).width / 2, y);
        });
        ctx.restore();
      }

      ctx.beginPath();
      ctx.setFillStyle("rgba(255,255,255,0.9)");
      ctx.arc(center, center, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.setFillStyle(theme.primary);
      ctx.setFontSize(15);
      const centerIcon = "✦";
      ctx.fillText(centerIcon, center - ctx.measureText(centerIcon).width / 2, center + 5);
      ctx.draw();
    },
    startSpin({ options, pickIndex, theme }) {
      if (!options || options.length < 2) return;
      const settings = storage.getSmartSettings();
      const appliedTheme = theme || storage.getCurrentTheme();
      const count = Math.max(2, options.length);
      const sweep = (Math.PI * 2) / count;
      const duration = settings.lowEndDevice ? 1700 : 2500;
      const baseTurns = settings.lowEndDevice ? 4 : 6;
      const targetRotation = baseTurns * Math.PI * 2 - (pickIndex + 0.5) * sweep;
      const startedAt = Date.now();
      let lastShownIndex = -1;

      this.setData({
        visible: true,
        rollingText: "正在抽选…",
        theme: appliedTheme,
      });
      this.drawWheel(options, 0);

      this.clearTimer();
      this._timer = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 5);
        const rotation = targetRotation * eased;
        const currentIndex = this.getPointerIndex(rotation, count);
        this.drawWheel(options, rotation);

        if (currentIndex !== lastShownIndex && options[currentIndex]) {
          this.setData({ rollingText: `正在抽选：${options[currentIndex]}` });
          lastShownIndex = currentIndex;
        }

        if (t >= 1) {
          this.clearTimer();
          const finalIndex = this.getPointerIndex(targetRotation, count);
          const finalResult = options[finalIndex] || options[pickIndex];
          this.setData({ rollingText: `已选：${finalResult}` });
          setTimeout(() => {
            this.setData({ visible: false, rollingText: "正在抽选…" });
            this.triggerEvent("complete", {
              finalResult,
              finalIndex,
            });
          }, 260);
        }
      }, 16);
    },
  },
});
