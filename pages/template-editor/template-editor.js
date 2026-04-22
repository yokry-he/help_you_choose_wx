const storage = require("../../utils/storage");
const { hexToRgba } = require("../../utils/ui");

function createTemplateId() {
  return `tpl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

Page({
  data: {
    editingId: "",
    formQuestion: "",
    formOptions: ["", ""],
    theme: {
      primary: "#FF8C69",
      primaryLight: "#FFB399",
      primaryDark: "#FF6B3D",
    },
    indexBg: "rgba(255, 140, 105, 0.14)",
  },
  onLoad(query) {
    const theme = storage.getCurrentTheme();
    this.setData({
      theme,
      indexBg: hexToRgba(theme.primary, 0.14),
    });

    const id = query && query.id ? `${query.id}` : "";
    if (!id) return;
    const target = storage.getCustomTemplates().find((it) => it.id === id);
    if (!target) return;
    this.setData({
      editingId: target.id,
      formQuestion: target.question || "",
      formOptions: Array.isArray(target.options) && target.options.length ? target.options.slice(0, 10) : ["", ""],
    });
  },
  onQuestionInput(e) {
    this.setData({ formQuestion: e.detail.value });
  },
  onOptionInput(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (!Number.isFinite(idx)) return;
    const formOptions = [...this.data.formOptions];
    formOptions[idx] = e.detail.value;
    this.setData({ formOptions });
  },
  addOptionField() {
    if (this.data.formOptions.length >= 10) {
      wx.showToast({ title: "最多 10 个选项", icon: "none" });
      return;
    }
    this.setData({
      formOptions: [...this.data.formOptions, ""],
    });
  },
  removeOptionField(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (!Number.isFinite(idx)) return;
    if (this.data.formOptions.length <= 2) return;
    this.setData({
      formOptions: this.data.formOptions.filter((_, i) => i !== idx),
    });
  },
  saveTemplate() {
    const question = `${this.data.formQuestion || ""}`.trim();
    const options = (this.data.formOptions || []).map((it) => `${it}`.trim()).filter(Boolean);

    if (!question) {
      wx.showToast({ title: "请输入问题", icon: "none" });
      return;
    }
    if (options.length < 2) {
      wx.showToast({ title: "至少保留两个选项", icon: "none" });
      return;
    }

    const now = Date.now();
    const existing = this.data.editingId
      ? storage.getCustomTemplates().find((it) => it.id === this.data.editingId)
      : null;
    const derivedTitle = question.length > 10 ? `${question.slice(0, 10)}…` : question;
    const next = {
      id: existing ? existing.id : createTemplateId(),
      title: existing ? existing.title || derivedTitle : derivedTitle,
      question,
      options,
      icon: existing ? existing.icon || "✨" : "✨",
      usageCount: existing ? Number(existing.usageCount || 0) : 0,
      createdAt: existing ? Number(existing.createdAt || now) : now,
    };

    storage.upsertCustomTemplate(next);
    wx.showToast({
      title: "保存成功",
      icon: "success",
      duration: 900,
    });
    setTimeout(() => {
      wx.navigateBack();
    }, 220);
  },
});