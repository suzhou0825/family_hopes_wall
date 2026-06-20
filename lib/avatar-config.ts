export const avatarOptions = [
  { id: "father_01", image: "/images/avatars/father-01.png", label: "爸爸" },
  { id: "mother_01", image: "/images/avatars/mother-01.png", label: "妈妈" },
  { id: "older_brother_01", image: "/images/avatars/older-brother-01.png", label: "哥哥" },
  { id: "younger_brother_01", image: "/images/avatars/younger-brother-01.png", label: "弟弟" },
  { id: "older_sister_01", image: "/images/avatars/older-sister-01.png", label: "姐姐" },
  { id: "younger_sister_01", image: "/images/avatars/younger-sister-01.png", label: "妹妹" }
] as const;

export type AvatarId = (typeof avatarOptions)[number]["id"];
