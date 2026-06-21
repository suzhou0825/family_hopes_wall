export type PetId = "corgi_star" | "poodle_cloud" | "ragdoll_moon" | "orange_star";

export type PetOption = {
  id: PetId;
  name: string;
  species: "狗狗" | "猫咪";
  image: string;
  actionImage: string;
  actionLabel: string;
  feedImage: string;
  playImage: string;
  outfitAnchors: Record<"star_hat" | "bow" | "hoodie", { left: number; top: number; width: number; rotate: number }>;
  hitZones: Record<"head" | "body" | "paw", { left: number; top: number; width: number; height: number }>;
  personality: string;
  mood: string;
  energy: number;
};

export const petOptions: PetOption[] = [
  {
    id: "corgi_star",
    name: "星星柯基",
    species: "狗狗",
    image: "/images/pets/corgi-star.png",
    actionImage: "/images/pets/corgi-star-wave.png",
    actionLabel: "挥挥爪",
    feedImage: "/images/pets/corgi-star-feed.png",
    playImage: "/images/pets/corgi-star-play.png",
    outfitAnchors: { star_hat: { left: 50, top: 17, width: 24, rotate: -4 }, bow: { left: 50, top: 48, width: 22, rotate: 0 }, hoodie: { left: 53, top: 59, width: 43, rotate: 0 } },
    hitZones: { head: { left: 34, top: 21, width: 34, height: 31 }, body: { left: 41, top: 48, width: 37, height: 29 }, paw: { left: 28, top: 63, width: 45, height: 22 } },
    personality: "热情又勇敢",
    mood: "开心",
    energy: 92
  },
  {
    id: "poodle_cloud",
    name: "云朵贵宾",
    species: "狗狗",
    image: "/images/pets/poodle-cloud.png",
    actionImage: "/images/pets/poodle-cloud-tilt.png",
    actionLabel: "歪头看看你",
    feedImage: "/images/pets/poodle-cloud-feed.png",
    playImage: "/images/pets/poodle-cloud-play.png",
    outfitAnchors: { star_hat: { left: 50, top: 16, width: 23, rotate: 4 }, bow: { left: 50, top: 50, width: 21, rotate: 0 }, hoodie: { left: 50, top: 60, width: 42, rotate: 0 } },
    hitZones: { head: { left: 31, top: 20, width: 39, height: 34 }, body: { left: 37, top: 50, width: 39, height: 30 }, paw: { left: 31, top: 66, width: 42, height: 19 } },
    personality: "温柔又聪明",
    mood: "放松",
    energy: 86
  },
  {
    id: "ragdoll_moon",
    name: "月光布偶",
    species: "猫咪",
    image: "/images/pets/ragdoll-moon.png",
    actionImage: "/images/pets/ragdoll-moon-wave.png",
    actionLabel: "眨眼打招呼",
    feedImage: "/images/pets/ragdoll-moon-feed.png",
    playImage: "/images/pets/ragdoll-moon-play.png",
    outfitAnchors: { star_hat: { left: 50, top: 18, width: 22, rotate: -3 }, bow: { left: 50, top: 51, width: 20, rotate: 0 }, hoodie: { left: 51, top: 60, width: 41, rotate: 0 } },
    hitZones: { head: { left: 33, top: 24, width: 35, height: 31 }, body: { left: 38, top: 51, width: 40, height: 29 }, paw: { left: 32, top: 67, width: 39, height: 18 } },
    personality: "安静又黏人",
    mood: "满足",
    energy: 78
  },
  {
    id: "orange_star",
    name: "橘子星球",
    species: "猫咪",
    image: "/images/pets/orange-star.png",
    actionImage: "/images/pets/orange-star-stretch.png",
    actionLabel: "伸个懒腰",
    feedImage: "/images/pets/orange-star-feed.png",
    playImage: "/images/pets/orange-star-play.png",
    outfitAnchors: { star_hat: { left: 50, top: 16, width: 23, rotate: 3 }, bow: { left: 50, top: 52, width: 21, rotate: 0 }, hoodie: { left: 52, top: 61, width: 43, rotate: 0 } },
    hitZones: { head: { left: 34, top: 21, width: 35, height: 32 }, body: { left: 41, top: 50, width: 39, height: 30 }, paw: { left: 31, top: 68, width: 42, height: 18 } },
    personality: "活泼又好奇",
    mood: "兴奋",
    energy: 95
  }
];
