const storage = require("../../utils/storage");
const {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
} = require("../../utils/theme-sync");

Page({
  data: {
    theme: storage.getCurrentTheme(),
    features: [
      "🎯 随机选择 - 算法很公平，一对谁都不太负责",
      "📝 历史记录 - 翻旧账专用，证明你当时真的选过",
      "🎨 主题换肤 - 换个颜色，假装在做重大决策",
      "💾 本地存储 - 秘密留在手机里，连云都不知道",
      "🚀 轻量快速 - 比「再想想」快，比算命省流量",
    ],
    intro: [
      "午饭吃啥、电影看啥、消息回不回——大脑 CPU 已满，交给宇宙随机数吧。",
      "“帮你定了” 专治「想太多、选不动」：点一下，结果立现；选错了？锅甩给随机，心理负担当场减半。",
      "郑重声明：本应用不提供人生正确答案，只负责在你和无限纠结之间，插播一个干脆利落的句号。",
    ],
    team: [
      "由一个同样纠结过「午饭吃啥」的开发者敲出来。",
      "若觉得好用，欢迎好评；若不好用——那一定是随机数的锅。",
      "联系我们：1181354012@qq.com",
    ],
  },
  onLoad() {
    bindThemeListener(this, (theme) => {
      applyPageTheme(this, theme);
    });
  },
  onShow() {
    applyPageTheme(this, storage.getCurrentTheme());
  },
  onUnload() {
    unbindThemeListener(this);
  },
});
