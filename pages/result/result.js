const storage = require("../../utils/storage");
const {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
} = require("../../utils/theme-sync");

function createId() {
  return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function encodeShareValue(text) {
  return encodeURIComponent(`${text || ""}`);
}

function decodeShareValue(text) {
  if (!text) return "";
  try {
    return decodeURIComponent(`${text}`);
  } catch (_) {
    return `${text}`;
  }
}

function buildSharePath(result) {
  if (!result) return "/pages/home/home";
  const question = encodeShareValue(result.question);
  const picked = encodeShareValue(result.result);
  const options = Array.isArray(result.options)
    ? result.options.map((item) => encodeShareValue(item)).join("|")
    : "";
  return `/pages/result/result?fromShare=1&q=${question}&r=${picked}&o=${options}`;
}

function parseSharedResult(query) {
  if (!query || `${query.fromShare || ""}` !== "1") return null;
  const question = decodeShareValue(query.q || "");
  const result = decodeShareValue(query.r || "");
  const options = `${query.o || ""}`
    .split("|")
    .map((item) => decodeShareValue(item).trim())
    .filter(Boolean);
  if (!question || !result) return null;
  const finalOptions = options.length ? options : [result];
  if (!finalOptions.includes(result)) {
    finalOptions.unshift(result);
  }
  return {
    id: `shared_${Date.now()}`,
    question,
    options: finalOptions,
    result,
    createdAt: Date.now(),
  };
}

function calcSeedHash(seed) {
  let hash = 0;
  const text = `${seed || ""}`;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

const KEYWORD_HINTS = [
  {
    keywords: ["火锅", "串串", "麻辣烫", "烤肉", "烧烤"],
    hints: ["这顿主打一个热闹，快乐和香气一起翻滚。", "先吃肉再聊天，今天的幸福感很快就到。"],
  },
  {
    keywords: ["日料", "寿司", "刺身"],
    hints: ["这一口走精致路线，仪式感和口福都在线。", "清爽但不简单，今天吃得高级又舒服。"],
  },
  {
    keywords: ["西餐", "牛排", "意面", "披萨"],
    hints: ["安排一点小浪漫，今天这餐有氛围。", "刀叉一拿，今天立刻有点生活质感。"],
  },
  {
    keywords: ["中餐", "家常菜", "盖饭", "炒菜"],
    hints: ["稳稳当当的选择，吃完继续高效发挥。", "经典永不过时，胃和心情都能被照顾到。"],
  },
  {
    keywords: ["简餐", "轻食", "沙拉"],
    hints: ["轻负担不将就，吃完人也更清爽。", "今天走轻盈路线，状态拉满继续冲。"],
  },
  {
    keywords: ["奶茶", "咖啡", "甜品", "蛋糕"],
    hints: ["这一口是情绪加分项，今天更甜一点。", "小确幸到账，心情值+1。"],
  },
];

const EASTER_KEYWORD_RULES = [
  {
    keywords: ["火锅", "烧烤", "烤肉", "串串", "麻辣烫"],
    hints: ["热辣局已成立，今天的快乐值会飙升。", "香味都快透屏了，这一票投得很有食欲。"],
  },
  {
    keywords: ["奶茶", "甜品", "蛋糕", "冰淇淋", "咖啡"],
    hints: ["今日份多巴胺签收，请尽快前往领取。", "快乐热量已就位，心情条正在回血。"],
  },
  {
    keywords: ["学习", "写作业", "背单词", "复习", "工作", "加班"],
    hints: ["战斗模式启动，认真起来连空气都安静了。", "你选的是成长线，未来的你会偷偷点赞。"],
  },
];

const EASTER_CONFLICT_RULES = [
  {
    keywords: ["减肥", "轻食", "健身", "控糖"],
    opposite: ["奶茶", "甜品", "炸鸡", "火锅", "烧烤"],
    hints: ["理智和嘴馋正在拉扯，今天的裁判是你自己。", "这是自律与快乐的对决现场，气氛已拉满。"],
  },
  {
    keywords: ["早睡", "早起", "养生"],
    opposite: ["熬夜", "通宵", "追剧", "游戏"],
    hints: ["一边想养生，一边舍不得夜生活，真实。", "白天的你和晚上的你正在进行一场辩论赛。"],
  },
];

const TONE_PROFILES = [
  {
    key: "cute",
    prefix: ["叮咚，", "报告一下，", "小小提示："],
    suffix: ["", "～", "呀"],
  },
  {
    key: "teasing",
    prefix: ["别犹豫了，", "说真的，", "你看吧，"],
    suffix: ["。", "，懂的都懂。", "，这波很稳。"],
  },
  {
    key: "healing",
    prefix: ["慢慢来，", "放轻松，", "今天也辛苦啦，"],
    suffix: ["。", "，按这个走就好。", "，你已经做得很好了。"],
  },
  {
    key: "serious",
    prefix: ["结论如下：", "综合判断：", "决策建议："],
    suffix: ["。", "，可以直接执行。", "，本轮可收工。"],
  },
];

Page({
  data: {
    result: null,
    hasResult: false,
    fromShare: false,
    animate: false,
    showConfetti: false,
    resultHint: "",
    theme: {
      primary: "#FF8C69",
      primaryLight: "#FFB399",
      primaryDark: "#FF6B3D",
    },
    selectedBg: "rgba(255,140,105,0.14)",
    resultBadgeBg: "rgba(255,140,105,0.12)",
  },
  onLoad(query) {
    this._sharedResult = parseSharedResult(query);
    this._fromShare = !!this._sharedResult;
    bindThemeListener(this, (theme) => {
      applyPageTheme(this, theme, {
        alphaFields: {
          selectedBg: 0.14,
          resultBadgeBg: 0.12,
        },
      });
    });
  },
  onUnload() {
    this.clearConfettiTimer();
    unbindThemeListener(this);
  },
  onHide() {
    this.clearConfettiTimer();
  },
  clearConfettiTimer() {
    if (this._confettiTimer) {
      clearInterval(this._confettiTimer);
      this._confettiTimer = null;
    }
  },
  pickByHash(seed, list) {
    if (!list || !list.length) return "";
    const hash = calcSeedHash(seed);
    const idx = Math.abs(hash) % list.length;
    return list[idx];
  },
  hasAnyKeyword(text, keywords = []) {
    const lowerText = `${text || ""}`.toLowerCase();
    return keywords.some((kw) => lowerText.includes(`${kw}`.toLowerCase()));
  },
  shouldUseEaster(seed) {
    const hash = Math.abs(calcSeedHash(seed));
    return hash % 100 < 38;
  },
  pickToneProfile(result) {
    const question = `${(result && result.question) || ""}`.trim();
    const option = `${(result && result.result) || ""}`.trim();
    return this.pickByHash(`${question}|${option}|tone`, TONE_PROFILES);
  },
  applyTone(text, result) {
    if (!text) return "";
    const tone = this.pickToneProfile(result);
    if (!tone) return text;
    const prefix = this.pickByHash(`${text}|${tone.key}|prefix`, tone.prefix || []);
    const suffix = this.pickByHash(`${text}|${tone.key}|suffix`, tone.suffix || []);
    return `${prefix || ""}${text}${suffix || ""}`;
  },
  buildEasterHint(result) {
    if (!result || !result.result) return "";
    const question = `${result.question || ""}`.trim();
    const option = `${result.result || ""}`.trim();
    const optionsText = Array.isArray(result.options) ? result.options.join(" ") : "";
    const mergedText = `${question} ${optionsText} ${option}`.toLowerCase();
    const seed = `${question}|${option}|easter`;

    if (!this.shouldUseEaster(seed)) return "";

    const keywordRule = EASTER_KEYWORD_RULES.find((rule) =>
      this.hasAnyKeyword(`${option} ${question}`, rule.keywords)
    );
    if (keywordRule) {
      return this.applyTone(this.pickByHash(seed, keywordRule.hints), result);
    }

    const conflictRule = EASTER_CONFLICT_RULES.find(
      (rule) =>
        this.hasAnyKeyword(mergedText, rule.keywords) &&
        this.hasAnyKeyword(mergedText, rule.opposite)
    );
    if (conflictRule) {
      return this.applyTone(this.pickByHash(seed, conflictRule.hints), result);
    }

    const optionCount = Array.isArray(result.options) ? result.options.length : 0;
    if (optionCount <= 2) {
      return this.applyTone(
        this.pickByHash(seed, [
          "经典二选一现场，命运硬币已经替你抛好了。",
          "越少越难选，能果断就是今天最酷的事。",
        ]),
        result
      );
    }
    if (optionCount >= 8) {
      return this.applyTone(
        this.pickByHash(seed, [
          "候选人过多，建议下轮先来一轮淘汰赛。",
          "选项这么多还能选出来，决策力很能打。",
        ]),
        result
      );
    }

    const hour = new Date(result.createdAt || Date.now()).getHours();
    if (hour >= 22 || hour <= 5) {
      return this.applyTone(
        this.pickByHash(seed, [
          "夜间模式下做的决定，往往自带一点勇气。",
          "深夜拍板成功，纠结值已自动清零。",
        ]),
        result
      );
    }
    if (hour >= 11 && hour <= 14) {
      return this.applyTone(
        this.pickByHash(seed, [
          "饭点做决定最准，因为胃从不说谎。",
          "午间决策完成，下午心情稳了。",
        ]),
        result
      );
    }
    return "";
  },
  buildResultHint(result) {
    if (!result || !result.result) return "";
    const option = `${result.result}`.trim();
    const question = `${result.question || ""}`.trim();
    const easterHint = this.buildEasterHint(result);
    if (easterHint) return easterHint;
    const lower = option.toLowerCase();
    const matched = KEYWORD_HINTS.find((group) =>
      group.keywords.some((kw) => lower.includes(kw.toLowerCase()))
    );
    if (matched) {
      return this.applyTone(this.pickByHash(`${question}|${option}`, matched.hints), result);
    }
    const genericHints = [
      `就它了：${option}。今天不纠结，执行力拉满。`,
      `${option} 已拍板，留点脑细胞给更重要的事。`,
      `命运签收：${option}。出发就对了。`,
      `今日关键词：${option}。听直觉，通常都不会错。`,
      `选 ${option}，主打一个干脆利落。`,
    ];
    return this.applyTone(this.pickByHash(`${question}|${option}`, genericHints), result);
  },
  onWheelComplete(e) {
    const againContext = this._againContext;
    this._againContext = null;
    if (!againContext) return;
    const finalResult = (e.detail && e.detail.finalResult) || againContext.options[againContext.pickIndex];
    const next = {
      id: createId(),
      question: againContext.question,
      options: againContext.options,
      result: finalResult,
      createdAt: Date.now(),
    };
    storage.appendHistory(next);
    getApp().globalData.lastResult = next;
    this.setData({
      result: next,
      animate: false,
      resultHint: this.buildResultHint(next),
    });
    setTimeout(() => this.setData({ animate: true }), 20);
    this.playConfetti();
  },
  playConfetti() {
    if (!storage.shouldPlayAnimation()) return;
    const settings = storage.getSmartSettings();
    const theme = this.data.theme || storage.getCurrentTheme();

    const width = 750;
    const height = 420;
    const colors = [
      theme.primary,
      theme.primaryLight,
      theme.primaryDark,
      "#7ec8e3",
      "#ffd166",
      "#a4e4b4",
    ];
    const particleCount = settings.lowEndDevice ? 28 : 58;
    const particles = Array.from({ length: particleCount }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.9 + Math.random() * 1.4;
      return {
        x: Math.random() * width,
        y: -40 - Math.random() * 120,
        vx: Math.cos(angle) * speed * 2.1,
        vy: 2 + Math.random() * 4.2,
        size: 5 + Math.random() * 9,
        rotate: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        circle: Math.random() > 0.45,
      };
    });

    this.setData({ showConfetti: true });
    this.clearConfettiTimer();

    const startedAt = Date.now();
    const duration = settings.lowEndDevice ? 1200 : 1900;
    const frameInterval = settings.lowEndDevice ? 24 : 16;
    this._confettiTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const t = Math.min(1, elapsed / duration);
      const ctx = wx.createCanvasContext("confettiCanvas", this);
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        const px = p.x + p.vx * elapsed * 0.28;
        const py = p.y + p.vy * elapsed * 0.22 + elapsed * elapsed * 0.000012;
        const opacity = Math.max(0, 1 - t * 1.08);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.rotate + p.vr * elapsed);
        ctx.setGlobalAlpha(opacity);
        ctx.setFillStyle(p.color);
        if (p.circle) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size * 0.6, -p.size * 0.22, p.size * 1.2, p.size * 0.44);
        }
        ctx.restore();
      });

      ctx.draw();

      if (t >= 1) {
        this.clearConfettiTimer();
        this.setData({ showConfetti: false });
      }
    }, frameInterval);
  },
  onShow() {
    const app = getApp();
    const data = this._sharedResult || app.globalData.lastResult;
    const theme = storage.getCurrentTheme();
    applyPageTheme(this, theme, {
      alphaFields: {
        selectedBg: 0.14,
        resultBadgeBg: 0.12,
      },
      extraData: {
        result: data || null,
        hasResult: !!data,
        fromShare: !!this._fromShare,
        animate: false,
        resultHint: this.buildResultHint(data),
      },
    });
    if (data) {
      setTimeout(() => this.setData({ animate: true }), 20);
      this.playConfetti();
    }
  },
  onShareAppMessage() {
    const result = this.data.result;
    if (!result) {
      return {
        title: "帮我选一下吧，纠结症发作了",
        path: "/pages/home/home",
      };
    }
    return {
      title: `我刚抽到了「${result.result}」！`,
      path: buildSharePath(result),
    };
  },
  onShareTimeline() {
    const result = this.data.result;
    if (!result) {
      return {
        title: "帮我选一下吧，纠结症发作了",
        query: "",
      };
    }
    const path = buildSharePath(result);
    return {
      title: `我刚抽到了「${result.result}」！`,
      query: path.split("?")[1] || "",
    };
  },
  again() {
    const result = this.data.result;
    if (!result || !result.options || result.options.length < 2) return;
    const idx = Math.floor(Math.random() * result.options.length);
    if (!storage.shouldPlayAnimation()) {
      this._againContext = {
        question: result.question,
        options: result.options,
        pickIndex: idx,
      };
      this.onWheelComplete({
        detail: {
          finalResult: result.options[idx],
        },
      });
      return;
    }
    this._againContext = {
      question: result.question,
      options: result.options,
      pickIndex: idx,
    };
    const wheel = this.selectComponent("#wheelOverlay");
    if (!wheel || !wheel.startSpin) {
      this.onWheelComplete({
        detail: {
          finalResult: result.options[idx],
        },
      });
      return;
    }
    wheel.startSpin({
      options: result.options,
      pickIndex: idx,
      theme: this.data.theme,
    });
  },
  edit() {
    const result = this.data.result;
    if (!result) return;
    getApp().globalData.pendingDraft = {
      question: result.question,
      options: result.options,
    };
    wx.navigateTo({
      url: "/pages/decision/decision",
    });
  },
  goHistory() {
    wx.switchTab({
      url: "/pages/history/history",
    });
  },
  goHome() {
    wx.switchTab({
      url: "/pages/home/home",
    });
  },
  goDecision() {
    wx.navigateTo({
      url: "/pages/decision/decision",
    });
  },
  startWithSharedDraft() {
    const result = this.data.result;
    if (!result || !result.question || !Array.isArray(result.options) || result.options.length < 2) {
      this.goDecision();
      return;
    }
    getApp().globalData.pendingDraft = {
      question: result.question,
      options: result.options,
    };
    wx.navigateTo({
      url: "/pages/decision/decision",
    });
  },
});
