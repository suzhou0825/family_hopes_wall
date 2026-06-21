export type PetId = "corgi_star" | "poodle_cloud" | "ragdoll_moon" | "orange_star";

export type PetOption = {
  id: PetId;
  name: string;
  species: "狗狗" | "猫咪";
  image: string;
  actionImage: string;
  actionLabel: string;
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
    personality: "活泼又好奇",
    mood: "兴奋",
    energy: 95
  }
];
