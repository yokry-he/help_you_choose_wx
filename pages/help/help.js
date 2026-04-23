const storage = require("../../utils/storage");
const {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
} = require("../../utils/theme-sync");

Page({
  data: {
    theme: storage.getCurrentTheme(),
    faqList: [
      {
        id: "how",
        icon: "🚀",
        q: "怎么用 “帮你定了”？",
        a: "超简单：首页点「开始选择」→ 写下你在纠结啥 → 塞进去两个以上选项 → 点「帮我选」。接下来发生的事，就交给概率和一点点仪式感啦。",
        open: true,
      },
      {
        id: "random",
        icon: "🎲",
        q: "结果是随机的吗？",
        a: "是随机抽的，而且尽量公平——每个选项理论上机会均等。玄学一点说：今天宇宙站你这边的概率，大约是 1/n（n 是选项个数）。",
        open: true,
      },
      {
        id: "history",
        icon: "💾",
        q: "我的记录会丢吗？",
        a: "历史都存在手机本地，和我们一样宅。只要你不卸载 App、不去系统设置「清数据」作大死，一般都能一直陪着。",
        open: true,
      },
      {
        id: "edit",
        icon: "↩️",
        q: "选完能改结果吗？",
        a: "结果生成后不能原地修改——毕竟「命运」也要面子的。真不满意就删掉历史，重新摇一次，当作平行宇宙重开。",
        open: true,
      },
      {
        id: "count",
        icon: "📊",
        q: "可以加几个选项？",
        a: "想加多少加多少，但脑子建议 2～10 个：太少像二选一硬刚，太多会像逛超市一样更纠结。",
        open: true,
      },
      {
        id: "money",
        icon: "💰",
        q: "要钱吗？",
        a: "不要钱。纠结已经够费电了，不能再费钱。",
        open: true,
      },
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
  toggleFaq(e) {
    const id = e.currentTarget.dataset.id;
    const list = this.data.faqList.map((it) =>
      it.id === id ? { ...it, open: !it.open } : it,
    );
    this.setData({ faqList: list });
  },
});
