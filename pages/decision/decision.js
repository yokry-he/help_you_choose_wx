const storage = require("../../utils/storage");
const feedback = require("../../utils/feedback");
const {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
} = require("../../utils/theme-sync");

const SHAKE_COOLDOWN_MS = 1600;
const LONG_PRESS_MS = 380;

function createId() {
  return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

Page({
  data: {
    question: "",
    options: ["", ""],
    isChoosing: false,
    isCharging: false,
    showFloatingAddButton: false,
    focusIndex: -1,
    shakeEnabled: true,
    interactionHint: "点击抽选 · 长按蓄力 · 摇一摇也可开奖",
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
  refreshInteractionSettings() {
    const settings = storage.getSmartSettings();
    const shakeEnabled = settings.shakeEnabled !== false;
    const animationEnabled = storage.shouldPlayAnimation();
    let interactionHint = "点击抽选即可开奖";
    if (animationEnabled) {
      interactionHint = shakeEnabled
        ? "点击抽选 · 长按蓄力 · 摇一摇也可开奖"
        : "点击抽选 · 长按蓄力开奖";
    } else if (shakeEnabled) {
      interactionHint = "点击抽选 · 摇一摇也可开奖";
    }
    this.setData({
      shakeEnabled,
      interactionHint,
    });
    if (shakeEnabled) {
      this.startShakeListener();
    } else {
      this.stopShakeListener();
    }
  },
  startShakeListener() {
    if (this._shakeListening || !wx.onAccelerometerChange) return;
    this._shakeListening = true;
    this._lastShakeAt = 0;
    this._lastAccel = null;
    wx.startAccelerometer({
      interval: "game",
      fail: () => {
        this._shakeListening = false;
      },
    });
    this._shakeHandler = (res) => {
      if (this.data.isChoosing || this.data.isCharging) return;
      const x = Number(res.x || 0);
      const y = Number(res.y || 0);
      const z = Number(res.z || 0);
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      if (!this._lastAccel) {
        this._lastAccel = { x, y, z, magnitude };
        return;
      }
      const delta =
        Math.abs(x - this._lastAccel.x) +
        Math.abs(y - this._lastAccel.y) +
        Math.abs(z - this._lastAccel.z);
      this._lastAccel = { x, y, z, magnitude };
      const now = Date.now();
      if (magnitude < 1.15 && delta < 1.1) return;
      if (now - this._lastShakeAt < SHAKE_COOLDOWN_MS) return;
      this._lastShakeAt = now;
      feedback.playHaptic("medium");
      this.makeChoice({ source: "shake" });
    };
    wx.onAccelerometerChange(this._shakeHandler);
  },
  stopShakeListener() {
    if (this._shakeHandler && wx.offAccelerometerChange) {
      wx.offAccelerometerChange(this._shakeHandler);
    }
    this._shakeHandler = null;
    this._shakeListening = false;
    this._lastAccel = null;
    if (wx.stopAccelerometer) {
      wx.stopAccelerometer();
    }
  },
  clearLongPressTimer() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  },
  onUnload() {
    this.clearFocusScrollTimers();
    this.clearLongPressTimer();
    this.stopShakeListener();
    if (this._keyboardHandler && wx.offKeyboardHeightChange) {
      wx.offKeyboardHeightChange(this._keyboardHandler);
      this._keyboardHandler = null;
    }
    unbindThemeListener(this);
  },
  onHide() {
    this.clearFocusScrollTimers();
    this.clearLongPressTimer();
    if (this.data.isCharging) {
      const wheel = this.selectComponent("#wheelOverlay");
      if (wheel && wheel.cancelChargeSpin) {
        wheel.cancelChargeSpin();
      }
      this.setData({ isCharging: false });
    }
    this.stopShakeListener();
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
    this.refreshInteractionSettings();
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
      this.setData({ isChoosing: false, isCharging: false });
      return;
    }
    this.finishChoice({
      ...pendingPayload,
      result: finalResult || pendingPayload.result,
    });
  },
  showNewBadgesToast(newlyEarned) {
    if (!newlyEarned || !newlyEarned.length) return;
    const badge = storage.BADGE_DEFS.find((item) => item.id === newlyEarned[0]);
    if (!badge) return;
    wx.showToast({
      title: `解锁成就：${badge.name}`,
      icon: "none",
      duration: 2200,
    });
  },
  finishChoice(payload) {
    const engagement = storage.appendHistory(payload);
    getApp().globalData.lastResult = payload;
    getApp().globalData.lastEngagement = engagement;
    this.setData({
      isChoosing: false,
      isCharging: false,
    });
    this.showNewBadgesToast(engagement && engagement.newlyEarned);
    wx.navigateTo({
      url: "/pages/result/result",
    });
  },
  buildChoicePayload() {
    const question = this.data.question.trim();
    const options = this.data.options.map((s) => s.trim()).filter(Boolean);
    if (!question) {
      wx.showToast({ title: "请输入问题", icon: "none" });
      return null;
    }
    if (options.length < 2) {
      wx.showToast({ title: "至少要两个选项", icon: "none" });
      return null;
    }
    const pickIndex = Math.floor(Math.random() * options.length);
    return {
      id: createId(),
      question,
      options,
      result: options[pickIndex],
      pickIndex,
      createdAt: Date.now(),
    };
  },
  runSpinWithPayload(payload, { charge = false } = {}) {
    const animationEnabled = storage.shouldPlayAnimation();
    this.setData({
      isChoosing: true,
      isCharging: charge,
    });
    const spinPayload = {
      id: payload.id,
      question: payload.question,
      options: payload.options,
      result: payload.result,
      createdAt: payload.createdAt,
    };

    if (!animationEnabled) {
      feedback.playHaptic("light");
      feedback.playSpinEndSound();
      setTimeout(() => this.finishChoice(spinPayload), 30);
      return;
    }

    this._pendingPayload = spinPayload;
    const wheel = this.selectComponent("#wheelOverlay");
    if (!wheel) {
      this._pendingPayload = null;
      this.finishChoice(spinPayload);
      return;
    }

    if (charge && wheel.startChargeSpin) {
      const started = wheel.startChargeSpin({
        options: payload.options,
        pickIndex: payload.pickIndex,
        theme: this.data.theme,
      });
      if (!started) {
        this._pendingPayload = null;
        this.finishChoice(spinPayload);
      }
      return;
    }

    if (!wheel.startSpin) {
      this._pendingPayload = null;
      this.finishChoice(spinPayload);
      return;
    }
    wheel.startSpin({
      options: payload.options,
      pickIndex: payload.pickIndex,
      theme: this.data.theme,
    });
  },
  makeChoice(options = {}) {
    if (this.data.isChoosing || this.data.isCharging) return;
    const payload = this.buildChoicePayload();
    if (!payload) return;
    if (options.source === "shake") {
      wx.showToast({
        title: "摇一摇开奖",
        icon: "none",
        duration: 900,
      });
    }
    this.runSpinWithPayload(payload, { charge: false });
  },
  onChooseTouchStart() {
    if (this.data.isChoosing || this.data.isCharging) return;
    if (!storage.shouldPlayAnimation()) return;
    this._suppressTap = false;
    this.clearLongPressTimer();
    this._longPressTimer = setTimeout(() => {
      const payload = this.buildChoicePayload();
      if (!payload) return;
      this._suppressTap = true;
      feedback.playHaptic("light");
      this.runSpinWithPayload(payload, { charge: true });
    }, LONG_PRESS_MS);
  },
  onChooseTouchEnd() {
    this.clearLongPressTimer();
    if (!this.data.isCharging) return;
    const wheel = this.selectComponent("#wheelOverlay");
    if (wheel && wheel.releaseChargeSpin) {
      const released = wheel.releaseChargeSpin();
      if (!released) {
        this.setData({ isCharging: false, isChoosing: false });
        this._pendingPayload = null;
      }
      return;
    }
    this.setData({ isCharging: false, isChoosing: false });
  },
  onChooseTouchCancel() {
    this.clearLongPressTimer();
    if (!this.data.isCharging) return;
    const wheel = this.selectComponent("#wheelOverlay");
    if (wheel && wheel.cancelChargeSpin) {
      wheel.cancelChargeSpin();
    }
    this._pendingPayload = null;
    this.setData({ isCharging: false, isChoosing: false });
  },
  onChooseTap() {
    if (this._suppressTap) {
      this._suppressTap = false;
      return;
    }
    this.makeChoice();
  },
});
