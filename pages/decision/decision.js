const storage = require("../../utils/storage");
const {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
} = require("../../utils/theme-sync");

function createId() {
  return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

Page({
  data: {
    question: "",
    options: ["", ""],
    isChoosing: false,
    showFloatingAddButton: false,
    focusIndex: -1,
    theme: {
      primary: "#FF8C69",
      primaryLight: "#FFB399",
      primaryDark: "#FF6B3D",
    },
    optionBadgeBg: "rgba(255,140,105,0.16)",
  },
  applyTheme(theme) {
    if (!theme || !theme.primary) return;
    applyPageTheme(this, theme, {
      alphaFields: {
        optionBadgeBg: 0.16,
      },
    });
  },
  onUnload() {
    this.clearFocusScrollTimers();
    if (this._keyboardHandler && wx.offKeyboardHeightChange) {
      wx.offKeyboardHeightChange(this._keyboardHandler);
      this._keyboardHandler = null;
    }
    unbindThemeListener(this);
  },
  onHide() {
    this.clearFocusScrollTimers();
  },
  onLoad() {
    const app = getApp();
    const theme = storage.getCurrentTheme();
    this.applyTheme(theme);
    bindThemeListener(this, (nextTheme) => {
      this.applyTheme(nextTheme);
    });
    const draft = app.globalData.pendingDraft;
    if (draft) {
      this.setData({
        question: draft.question || "",
        options: (draft.options || ["", ""]).slice(0, 10),
      });
      app.globalData.pendingDraft = null;
    }
    if (wx.onKeyboardHeightChange) {
      this._keyboardHandler = (res) => {
        this._keyboardHeight = Math.max(0, (res && res.height) || 0);
        if (this.data.focusIndex >= 0) {
          this.scheduleFocusScroll(this.data.focusIndex);
        }
      };
      wx.onKeyboardHeightChange(this._keyboardHandler);
    }
  },
  onReady() {
    this.measureFloatingAddAnchor();
  },
  onShow() {
    this.applyTheme(storage.getCurrentTheme());
    this.measureFloatingAddAnchor();
  },
  onPageScroll(e) {
    const triggerTop = this._floatingAddTriggerTop || 0;
    const shouldShow = !!triggerTop && e.scrollTop > triggerTop;
    if (shouldShow !== this.data.showFloatingAddButton) {
      this.setData({ showFloatingAddButton: shouldShow });
    }
  },
  measureFloatingAddAnchor() {
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select("#option-head").boundingClientRect();
      query.selectViewport().scrollOffset();
      query.exec((res) => {
        const headRect = res && res[0];
        const viewport = res && res[1];
        if (!headRect || !viewport) return;
        this._floatingAddTriggerTop = Math.max(0, viewport.scrollTop + headRect.bottom + 8);
      });
    });
  },
  onQuestionInput(e) {
    this.setData({ question: e.detail.value });
  },
  onOptionInput(e) {
    const idx = e.currentTarget.dataset.idx;
    const options = [...this.data.options];
    options[idx] = e.detail.value;
    this.setData({ options });
  },
  onOptionFocus(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (!Number.isNaN(idx)) {
      this.setData({ focusIndex: idx });
      this.scheduleFocusScroll(idx);
    }
  },
  clearFocusScrollTimers() {
    if (this._focusScrollTimer) {
      clearTimeout(this._focusScrollTimer);
      this._focusScrollTimer = null;
    }
    if (this._focusScrollTimer2) {
      clearTimeout(this._focusScrollTimer2);
      this._focusScrollTimer2 = null;
    }
  },
  scheduleFocusScroll(index) {
    this.clearFocusScrollTimers();
    this.scrollToOption(index, 180);
    this._focusScrollTimer = setTimeout(() => {
      this.scrollToOption(index, 220);
    }, 140);
    this._focusScrollTimer2 = setTimeout(() => {
      this.scrollToOption(index, 220);
    }, 320);
  },
  scrollToOption(index, duration = 220) {
    const targetId = `#option-card-${index}`;
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select(targetId).boundingClientRect();
      query.selectViewport().scrollOffset();
      query.exec((res) => {
        const targetRect = res && res[0];
        const viewport = res && res[1];
        if (!targetRect || !viewport) return;
        const keyboardCompensation = Math.min(120, Math.floor((this._keyboardHeight || 0) * 0.35));
        const top = Math.max(0, viewport.scrollTop + targetRect.top - 120 - keyboardCompensation);
        wx.pageScrollTo({
          scrollTop: top,
          duration,
        });
      });
    });
  },
  addOption() {
    if (this.data.options.length >= 10) {
      wx.showToast({ title: "最多 10 个选项", icon: "none" });
      return;
    }
    const nextOptions = [...this.data.options, ""];
    const focusIndex = nextOptions.length - 1;
    this.setData(
      {
        options: nextOptions,
        focusIndex,
      },
      () => {
        this.measureFloatingAddAnchor();
        this.scheduleFocusScroll(focusIndex);
      }
    );
  },
  removeOption(e) {
    const idx = e.currentTarget.dataset.idx;
    if (this.data.options.length <= 2) return;
    const options = this.data.options.filter((_, i) => i !== idx);
    this.setData({ options }, () => {
      this.measureFloatingAddAnchor();
    });
  },
  onWheelComplete(e) {
    const pendingPayload = this._pendingPayload;
    this._pendingPayload = null;
    const finalResult = e.detail && e.detail.finalResult;
    if (!pendingPayload) {
      this.setData({ isChoosing: false });
      return;
    }
    this.finishChoice({
      ...pendingPayload,
      result: finalResult || pendingPayload.result,
    });
  },
  finishChoice(payload) {
    storage.appendHistory(payload);
    getApp().globalData.lastResult = payload;
    this.setData({
      isChoosing: false,
    });
    wx.navigateTo({
      url: "/pages/result/result",
    });
  },
  makeChoice() {
    const question = this.data.question.trim();
    const options = this.data.options.map((s) => s.trim()).filter(Boolean);

    if (!question) {
      wx.showToast({ title: "请输入问题", icon: "none" });
      return;
    }
    if (options.length < 2) {
      wx.showToast({ title: "至少要两个选项", icon: "none" });
      return;
    }
    if (this.data.isChoosing) return;

    const animationEnabled = storage.shouldPlayAnimation();
    const pickIndex = Math.floor(Math.random() * options.length);
    const result = options[pickIndex];

    this.setData({ isChoosing: true });
    const payload = {
      id: createId(),
      question,
      options,
      result,
      createdAt: Date.now(),
    };

    if (animationEnabled) {
      this._pendingPayload = payload;
      const wheel = this.selectComponent("#wheelOverlay");
      if (!wheel || !wheel.startSpin) {
        this._pendingPayload = null;
        this.finishChoice(payload);
        return;
      }
      wheel.startSpin({
        options,
        pickIndex,
        theme: this.data.theme,
      });
      return;
    }

    setTimeout(() => this.finishChoice(payload), 30);
  },
});
