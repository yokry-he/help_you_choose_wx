const BUILT_IN_TEMPLATES = [
  { id: "food_01", icon: "🍜", title: "今天吃什么", question: "今天吃什么好呢？", options: ["火锅", "烤肉", "日料", "中餐", "西餐", "简餐"], category: "美食", usageCount: 1280 },
  { id: "food_02", icon: "🥤", title: "喝点什么", question: "想喝点什么？", options: ["奶茶", "咖啡", "果汁", "气泡水", "白开水"], category: "美食", usageCount: 856 },
  { id: "food_03", icon: "🍰", title: "甜品选择", question: "来点什么甜品？", options: ["蛋糕", "冰淇淋", "马卡龙", "泡芙", "布丁"], category: "美食", usageCount: 642 },
  { id: "fun_01", icon: "🎬", title: "周末看什么电影", question: "周末看什么电影好呢？", options: ["动作片", "喜剧片", "爱情片", "科幻片", "纪录片"], category: "娱乐", usageCount: 923 },
  { id: "fun_02", icon: "🎮", title: "玩什么游戏", question: "想玩什么游戏？", options: ["MOBA", "FPS", "RPG", "休闲小游戏", "桌游"], category: "娱乐", usageCount: 785 },
  { id: "fun_03", icon: "📺", title: "看什么剧", question: "今晚看什么剧？", options: ["美剧", "韩剧", "日剧", "国产剧", "动漫"], category: "娱乐", usageCount: 1102 },
  { id: "life_01", icon: "👗", title: "今天穿什么", question: "今天穿什么出门？", options: ["休闲风", "运动风", "正式装", "甜美风", "简约风"], category: "生活", usageCount: 967 },
  { id: "life_02", icon: "🏃", title: "今天做什么运动", question: "今天做什么运动？", options: ["跑步", "游泳", "瑜伽", "健身", "骑行", "散步"], category: "运动", usageCount: 734 },
  { id: "life_03", icon: "📖", title: "看什么书", question: "最近看什么书？", options: ["小说", "散文", "历史", "科技", "心理", "传记"], category: "生活", usageCount: 521 },
  { id: "travel_01", icon: "✈️", title: "假期去哪玩", question: "假期去哪里旅游？", options: ["海边", "山区", "城市", "古镇", "国外"], category: "旅行", usageCount: 1456 },
  { id: "travel_02", icon: "🚗", title: "怎么出行", question: "今天怎么出行？", options: ["地铁", "公交", "打车", "骑车", "步行", "自驾"], category: "旅行", usageCount: 892 },
  { id: "emotion_01", icon: "💕", title: "要主动联系他/她吗？", question: "要主动联系他/她吗？", options: ["要", "可以，但没必要", "不要", "打死不要", "洗洗睡吧"], category: "情感", usageCount: 888 },
  { id: "emotion_02", icon: "💔", title: "这段感情还要坚持吗", question: "这段感情还要坚持吗？", options: ["再坚持一下", "先冷处理", "听天由命", "累了，算了", "分了吧"], category: "情感", usageCount: 756 },
  { id: "emotion_03", icon: "🌹", title: "今天要不要表白", question: "今天要不要表白？", options: ["冲", "写小作文", "让朋友旁敲侧击", "怂了，下次一定", "假装什么都没发生"], category: "情感", usageCount: 692 },
  { id: "emotion_04", icon: "💬", title: "对方已读不回", question: "对方已读不回，怎么办？", options: ["再等等，可能真的在忙", "直接问清楚", "截图发闺蜜群吐槽", "他可能想见上帝了，送他去见上帝吧", "再忍忍，说不定哪天他就回你了呢"], category: "情感", usageCount: 834 },
  { id: "emotion_05", icon: "🏠", title: "周末社交还是独处", question: "周末想社交还是独处？", options: ["约朋友", "随缘", "躺平", "谁也别想找到我", "手机关机保平安"], category: "情感", usageCount: 645 },
  { id: "emotion_06", icon: "📱", title: "前任突然联系你", question: "前任突然联系你，你？", options: ["当没看见", "礼貌回一句", "拉黑保平安", "已读不回", "借钱吗？"], category: "情感", usageCount: 721 },
  { id: "work_01", icon: "💼", title: "先做什么工作", question: "现在先处理哪个工作？", options: ["回复邮件", "开会", "写报告", "整理文档", "打电话"], category: "工作", usageCount: 1089 },
  { id: "work_02", icon: "📝", title: "学习什么", question: "今天学习什么内容？", options: ["英语", "编程", "设计", "写作", "数据分析"], category: "学习", usageCount: 756 },
  { id: "nonsense_01", icon: "🛸", title: "路灯的自我修养", question: "今晚月色很美，作为一根路灯，你该怎么发光？", options: ["瓦亮到外星人投诉", "开启省电假装故障", "只照有缘人", "向月亮申请加班费", "已被乌鸦站成景点"], category: "非人类", usageCount: 404 },
  { id: "nonsense_02", icon: "🧊", title: "冰箱对鸡蛋的审判", question: "如果冰箱会说话，它最想对鸡蛋说什么？", options: ["再滚就冷藏你", "请出示暂住证", "壳这么硬想碰瓷？", "下班别走，加个班", "我吃素（骗你的）"], category: "非人类", usageCount: 312 },
  { id: "nonsense_03", icon: "🧦", title: "袜子失踪悬案", question: "洗衣机吃掉了你一只袜子，另一只该怎么活？", options: ["晋升独脚袜艺术家", "等双十一强制配对", "改行当杯套或发圈", "装作从未存在过", "去袜生心理咨询"], category: "非人类", usageCount: 288 },
  { id: "nonsense_04", icon: "🏥", title: "拖延症分诊台", question: "拖延症晚期，宇宙分诊台该给你挂哪一科？", options: ["明天科（永远满号）", "算了科（一键放弃）", "再刷五分钟科", "外卖到了再动科", "宇宙热寂还早科"], category: "非人类", usageCount: 501 },
  { id: "nonsense_05", icon: "👽", title: "外星人辣条声明", question: "外星人第一次吃辣条，会发表什么外交声明？", options: ["签署《地球香辣互不侵犯条约》", "要求配方上交给星际联盟", "申请喝水一整吨", "怀疑地球人在下毒但真香", "连夜加入银河系川菜系"], category: "非人类", usageCount: 366 },
  { id: "nonsense_06", icon: "🧋", title: "珍珠奶茶遗言", question: "作为一杯珍珠奶茶，你对吸管有什么临终遗言？", options: ["轻点捅，里面有灵魂", "别嚼我兄弟", "去冰三分糖谢谢", "杯底见，别剩我", "记得先搅匀，我社恐"], category: "非人类", usageCount: 277 },
  { id: "nonsense_07", icon: "⌨️", title: "ESC 键的创伤", question: "键盘上的 ESC 键，心理阴影面积有多大？", options: ["零，它只负责逃跑", "和 Ctrl+Z 一样大", "取决于你删了多少字", "全选删除那么大", "已黑屏，勿念"], category: "非人类", usageCount: 199 },
  { id: "nonsense_08", icon: "📶", title: "Wi‑Fi 心情条", question: "Wi‑Fi 信号条心情不好时会干什么？", options: ["假装满格骗你一下", "随机断连增加仪式感", "让你转圈圈健身", "去隔壁路由器蹭蹭", "考公上岸改有线"], category: "非人类", usageCount: 233 },
  { id: "nonsense_09", icon: "🐱", title: "猫主子今天心情", question: "猫主子盯着你五分钟了，它可能在想什么？", options: ["开罐仪式什么时候开始", "这个两脚兽好笨", "假装路过其实饿了", "你椅子归我了", "明天还这个点"], category: "非人类", usageCount: 445 },
  { id: "nonsense_10", icon: "🪴", title: "盆栽的复仇计划", question: "你三天没给盆栽浇水，它内心在策划什么？", options: ["落叶给你看", "半夜长到你床上", "光合作用罢工", "向多肉通风报信", "假装绿萝其实是塑料"], category: "非人类", usageCount: 158 },
];

const CUSTOM_CATEGORY = "自定义";
const EMOTION_CATEGORY = "情感";
const NON_HUMAN_CATEGORY = "非人类";

function getBuiltInCategories() {
  const set = new Set(BUILT_IN_TEMPLATES.map((item) => item.category));
  return Array.from(set).sort();
}

function getCategoryChips() {
  const others = getBuiltInCategories().filter((it) => it !== EMOTION_CATEGORY && it !== NON_HUMAN_CATEGORY);
  return ["全部", CUSTOM_CATEGORY, EMOTION_CATEGORY, NON_HUMAN_CATEGORY, ...others];
}

const HOT_TEMPLATE_IDS = ["food_01", "travel_01", "life_02", "emotion_01", "emotion_02", "emotion_04"];
const HOT_TEMPLATES = BUILT_IN_TEMPLATES.filter((it) => HOT_TEMPLATE_IDS.includes(it.id));

module.exports = {
  BUILT_IN_TEMPLATES,
  CUSTOM_CATEGORY,
  getCategoryChips,
  HOT_TEMPLATES,
};
