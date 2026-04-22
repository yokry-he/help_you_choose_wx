const storage = require("../../utils/storage");
const {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
} = require("../../utils/theme-sync");

Page({
  data: {
    settings: {
      animationsEnabled: true,
      autoReduceOnLowEnd: true,
      lowEndDevice: false,
    },
    theme: {
      primary: "#9B59B6",
      primaryLight: "#BB8FD4",
      primaryDark: "#803DA0",
    },
    backupDialogVisible: false,
    backupJsonInput: "",
    backupMode: "replace",
    backupPreview: null,
    backupError: "",
  },
  onLoad() {
    bindThemeListener(this, (theme) => {
      applyPageTheme(this, theme);
    });
  },
  onShow() {
    const settings = storage.getSmartSettings();
    const theme = storage.getCurrentTheme();
    applyPageTheme(this, theme, {
      extraData: {
        settings,
      },
    });
  },
  onUnload() {
    unbindThemeListener(this);
  },
  onToggleAnimation(e) {
    const enabled = !!e.detail.value;
    const settings = {
      ...this.data.settings,
      animationsEnabled: enabled,
    };
    this.setData({ settings });
    storage.saveSettings(settings);
  },
  onToggleAutoReduce(e) {
    const enabled = !!e.detail.value;
    const settings = {
      ...this.data.settings,
      autoReduceOnLowEnd: enabled,
    };
    this.setData({ settings });
    storage.saveSettings(settings);
  },
  exportBackup() {
    const json = storage.exportBackupJson();
    wx.setClipboardData({
      data: json,
      success: () => {
        wx.showToast({
          title: "备份 JSON 已复制",
          icon: "success",
        });
      },
      fail: () => {
        wx.showToast({
          title: "复制失败，请重试",
          icon: "none",
        });
      },
    });
  },
  openImportDialog() {
    this.setData({
      backupDialogVisible: true,
      backupJsonInput: "",
      backupMode: "replace",
      backupPreview: null,
      backupError: "",
    });
  },
  closeImportDialog() {
    this.setData({
      backupDialogVisible: false,
    });
  },
  onBackupInput(e) {
    const value = e.detail.value;
    this.setData({
      backupJsonInput: value,
    });
    this.refreshBackupPreview(value, this.data.backupMode);
  },
  useClipboardContent() {
    wx.getClipboardData({
      success: (res) => {
        const value = res.data || "";
        this.setData({
          backupJsonInput: value,
        });
        this.refreshBackupPreview(value, this.data.backupMode);
      },
    });
  },
  chooseBackupMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode) return;
    this.setData({
      backupMode: mode,
    });
    this.refreshBackupPreview(this.data.backupJsonInput, mode);
  },
  refreshBackupPreview(raw, mode) {
    const text = `${raw || ""}`.trim();
    if (!text) {
      this.setData({
        backupPreview: null,
        backupError: "",
      });
      return;
    }
    const analyzed = storage.analyzeBackupJson(text, mode || "replace");
    if (!analyzed.ok) {
      this.setData({
        backupPreview: null,
        backupError: analyzed.message || "备份解析失败",
      });
      return;
    }
    this.setData({
      backupPreview: analyzed.preview,
      backupError: "",
    });
  },
  confirmImport() {
    const raw = this.data.backupJsonInput.trim();
    if (!raw) {
      wx.showToast({
        title: "请先粘贴 JSON",
        icon: "none",
      });
      return;
    }
    const mode = this.data.backupMode || "replace";
    const preview = storage.analyzeBackupJson(raw, mode);
    if (!preview.ok) {
      wx.showToast({
        title: preview.message || "备份内容有误",
        icon: "none",
      });
      return;
    }
    const result = storage.importBackupJson(raw, mode);
    if (!result.ok) {
      wx.showToast({
        title: result.message || "恢复失败",
        icon: "none",
      });
      return;
    }
    this.setData({
      backupDialogVisible: false,
      backupJsonInput: "",
      backupPreview: null,
      backupError: "",
    });
    this.onShow();
    wx.showModal({
      title: "恢复完成",
      content: `历史 ${result.counts.history} 条，自定义模板 ${result.counts.customTemplates} 条`,
      showCancel: false,
    });
  },
});
