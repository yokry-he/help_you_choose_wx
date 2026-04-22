const storage = require("../utils/storage");

Component({
  data: {
    selected: 0,
    color: "#a5acb8",
    selectedColor: "#ff8c69",
    list: [
      { pagePath: "/pages/home/home", text: "首页", iconType: "home" },
      { pagePath: "/pages/template/template", text: "模板", iconType: "grid" },
      { pagePath: "/pages/history/history", text: "历史", iconType: "history" },
      { pagePath: "/pages/profile/profile", text: "我的", iconType: "profile" },
    ],
  },
  lifetimes: {
    attached() {
      const theme = storage.getCurrentTheme();
      this.setData({
        selectedColor: theme.primary,
      });
    },
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      const index = Number(data.index);
      if (!url) return;
      this.setData({ selected: index });
      wx.switchTab({ url });
    },
  },
});
