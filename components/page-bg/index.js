const BACKGROUND_IMAGES = [
  "/assets/backgrounds/mascots/husky.jpg",
  "/assets/backgrounds/mascots/bunny.jpg",
  "/assets/backgrounds/mascots/panda.jpg",
  "/assets/backgrounds/mascots/fox.jpg",
  "/assets/backgrounds/mascots/totoro.jpg",
  "/assets/backgrounds/mascots/ragdoll_cat.jpg",
  "/assets/backgrounds/mascots/otter.jpg",
  "/assets/backgrounds/mascots/red_panda.jpg",
  "/assets/backgrounds/mascots/squirrel.jpg",
  "/assets/backgrounds/mascots/unicorn.jpg",
  "/assets/backgrounds/mascots/raccoon.jpg",
];

Component({
  data: {
    bgStyle: "",
  },
  lifetimes: {
    attached() {
      const list = BACKGROUND_IMAGES;
      const idx = Math.floor(Math.random() * list.length);
      const url = list[idx];
      this.setData({
        bgStyle: `background-image: url('${url}');`,
      });
    },
  },
});
