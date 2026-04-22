const storage = require("../../utils/storage");
const { applyTabBarTheme } = require("../../utils/ui");
const {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
} = require("../../utils/theme-sync");
const {
  BUILT_IN_TEMPLATES,
  CUSTOM_CATEGORY,
  getCategoryChips,
} = require("../../utils/template-data");

Page({
  data: {
    templates: [],
    categories: getCategoryChips(),
    customTemplates: [],
    selectedCategory: "全部",
    theme: {
      primary: "#FF8C69",
      primaryLight: "#FFB399",
      primaryDark: "#FF6B3D",
    },
    pillBg: "rgba(255, 140, 105, 0.14)",
    customBg: "rgba(255, 140, 105, 0.08)",
  },
  onLoad() {
    bindThemeListener(this, (theme) => {
      applyTabBarTheme(theme);
      applyPageTheme(this, theme, {
        alphaFields: {
          pillBg: 0.14,
          customBg: 0.08,
        },
        callback: () => {
          this.syncTabSelected();
        },
      });
    });
  },
  onShow() {
    const theme = storage.getCurrentTheme();
    const customTemplates = storage.getCustomTemplates();
    applyTabBarTheme(theme);
    applyPageTheme(this, theme, {
      alphaFields: {
        pillBg: 0.14,
        customBg: 0.08,
      },
      extraData: {
        customTemplates,
      },
      callback: () => {
        this.refreshTemplateList(customTemplates, this.data.selectedCategory);
        this.syncTabSelected();
      },
    });
  },
  onUnload() {
    unbindThemeListener(this);
  },
  syncTabSelected() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1,
        selectedColor: this.data.theme.primary,
      });
    }
  },
  refreshTemplateList(customTemplatesArg, selectedCategoryArg) {
    const category = selectedCategoryArg || this.data.selectedCategory;
    const customSource = Array.isArray(customTemplatesArg)
      ? customTemplatesArg
      : this.data.customTemplates;
    const customTemplates = customSource.map((it) => ({
      ...it,
      category: CUSTOM_CATEGORY,
      source: "custom",
      usageCount: Number(it.usageCount || 0),
    }));
    let builtIn = BUILT_IN_TEMPLATES;
    if (category !== "全部" && category !== CUSTOM_CATEGORY) {
      builtIn = BUILT_IN_TEMPLATES.filter((it) => it.category === category);
    }
    let list = builtIn.map((it) => ({
      ...it,
      source: "builtin",
      usageCount: Number(it.usageCount || 0),
    }));

    if (category === "全部") {
      list = [...list, ...customTemplates];
    } else if (category === CUSTOM_CATEGORY) {
      list = customTemplates;
    }
    this.setData({
      templates: list,
    });
  },
  scrollListToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 180,
    });
  },
  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    if (!category) return;
    if (category === this.data.selectedCategory) return;
    this.setData(
      {
        selectedCategory: category,
      },
      () => {
        this.refreshTemplateList(this.data.customTemplates, category);
        this.scrollListToTop();
      },
    );
  },
  openCreateEditor() {
    wx.navigateTo({
      url: "/pages/template-editor/template-editor",
    });
  },
  openEditEditor(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/template-editor/template-editor?id=${encodeURIComponent(id)}`,
    });
  },
  removeCustomTemplate(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: "删除模板",
      content: "确认删除这个自定义模板吗？",
      success: (res) => {
        if (!res.confirm) return;
        storage.removeCustomTemplate(id);
        const customTemplates = storage.getCustomTemplates();
        this.setData(
          {
            customTemplates,
          },
          () => {
            this.refreshTemplateList(
              customTemplates,
              this.data.selectedCategory,
            );
          },
        );
      },
    });
  },
  useTemplate(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const draft = this.data.templates[idx];
    if (!draft) return;
    if (draft.source === "custom" && draft.id) {
      storage.bumpCustomTemplateUsage(draft.id);
      const customTemplates = storage.getCustomTemplates();
      this.setData(
        {
          customTemplates,
        },
        () => {
          this.refreshTemplateList(customTemplates, this.data.selectedCategory);
        },
      );
    }
    const app = getApp();
    app.globalData.pendingDraft = draft;
    wx.navigateTo({
      url: "/pages/decision/decision",
    });
  },
});
