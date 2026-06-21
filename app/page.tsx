"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { avatarOptions } from "../lib/avatar-config";
import { type PetId, petOptions } from "../lib/pet-config";

type Role = "parent" | "child";
type ParentTitle = "爸爸" | "妈妈";
type ChildGender = "男孩" | "女孩";
type ChildTitle = "哥哥" | "弟弟" | "姐姐" | "妹妹";
type WishStatus = "待申领" | "兑换中" | "兑现中" | "已兑换";
type TaskStatus = "待申领" | "完成中" | "已完成";
type TaskApprovalStatus = "待审批" | "已通过";
type WishType = "物质奖励" | "旅游奖励" | "陪玩奖励" | "积分奖励" | "其他愿望";
type TaskType = "打卡任务" | "一次性任务" | "承诺任务";
type Weekday = "周一" | "周二" | "周三" | "周四" | "周五" | "周六" | "周日";
type AppView = "home" | "wall" | "wishes" | "myTasks" | "tasks" | "family" | "account" | "points" | "pet";

type CheckIn = {
  childId: string;
  date: string;
};

type StoredAppData = {
  members: Member[];
  wishes: Wish[];
  tasks: Task[];
};

type PetAdoption = {
  id: string;
  memberId: string;
  petId: PetId;
  status: "active" | "abandoned";
  adoptedAt: string;
  abandonedAt?: string;
  growthValue: number;
  mood: string;
  hunger: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  outfitId: string;
  dailyThought: string;
  thoughtDate: string;
  updatedAt: string;
};

type PointAccount = {
  memberId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
};

type PointTransaction = {
  id: string;
  memberId: string;
  amount: number;
  balanceAfter: number;
  category: string;
  description: string;
  createdAt: string;
};

type PetInteraction = {
  id: string;
  adoptionId: string;
  action: "feed" | "play" | "dress" | "pet_head" | "pet_body" | "pet_paw";
  detail?: string;
  createdAt: string;
};

type PetMotionAction = "idle" | "greet" | "feed" | "play";
type PetMotionCommand = { action: PetMotionAction; nonce: number };

type RewardItem = {
  id: string;
  itemType: "physical" | "virtual";
  name: string;
  description: string;
  cost: number;
  stock?: number;
  icon: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type RewardRedemption = {
  id: string;
  memberId: string;
  rewardItemId: string;
  cost: number;
  status: "pending" | "fulfilled";
  createdAt: string;
};

type EconomyData = {
  pointAccounts: PointAccount[];
  transactions: PointTransaction[];
  petAdoptions: PetAdoption[];
  petInteractions: PetInteraction[];
  rewardItems: RewardItem[];
  redemptions: RewardRedemption[];
};

type AppAccount = {
  id: string;
  username: string;
  display_name: string;
  family_id?: string;
  member_id?: string;
  role?: Role;
  parent_title?: ParentTitle;
  child_title?: ChildTitle;
  gender?: ChildGender;
  avatar_id?: string;
  created_at?: string;
  updated_at?: string;
};

type Member = {
  id: string;
  name: string;
  role: Role;
  title?: ParentTitle;
  gender?: ChildGender;
  childTitle?: ChildTitle;
  accountUsername?: string;
  avatarId?: string;
};

type Wish = {
  id: string;
  title: string;
  description: string;
  type: WishType;
  childId: string;
  fulfiller: ParentTitle;
  expectedDate?: string;
  status: WishStatus;
  rewardPoints?: number;
  submittedAt?: string;
};

type Task = {
  id: string;
  title: string;
  type: TaskType;
  creatorId: string;
  reward?: string;
  rewardType?: WishType;
  rewardDescription?: string;
  createdAt: string;
  linkedWishId?: string;
  assigneeId?: string;
  status: TaskStatus;
  submitted?: boolean;
  checkInDays?: Weekday[];
  deadline?: string;
  checkIns?: CheckIn[];
  approvalStatus?: TaskApprovalStatus;
  proposalDescription?: string;
  suggestedPoints?: number;
  proposerId?: string;
  rewardPoints?: number;
  submittedAt?: string;
  completionSubmittedAt?: string;
  completedAt?: string;
};

const weekdays: Weekday[] = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const storageKey = "family-wish-wall-data-v1";
const sessionStorageKey = "family-wish-wall-app-session-v1";

function validatePassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function validateUsername(username: string) {
  return /^[a-z0-9_]{3,32}$/.test(username);
}

function getFamilyRoleLabel(member: Member) {
  if (member.role === "parent") return member.title ?? "父母";
  return member.childTitle ?? "孩子";
}

function getMemberAvatar(member: Member) {
  const defaultId = member.role === "parent"
    ? member.title === "妈妈" ? "mother_01" : "father_01"
    : member.childTitle === "哥哥" ? "older_brother_01"
      : member.childTitle === "姐姐" ? "older_sister_01"
        : member.childTitle === "妹妹" ? "younger_sister_01" : "younger_brother_01";
  return avatarOptions.find((item) => item.id === member.avatarId) ?? avatarOptions.find((item) => item.id === defaultId) ?? avatarOptions[0];
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function submittedNow() {
  return new Date().toISOString();
}

function formatSubmittedAt(value?: string) {
  if (!value) return "历史数据未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "历史数据未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function normalizedTitle(value: string) {
  return value.trim().toLocaleLowerCase("zh-CN");
}

const petThoughts = [
  "今天也想和你一起完成一件小事。",
  "被认真陪伴的每一天都值得收藏。",
  "慢慢长大，也要记得为自己鼓掌。",
  "今天的努力，会变成明天的小惊喜。",
  "有你回来看看我，心里就暖暖的。",
  "一起保持好奇，去发现新的快乐。"
];

function getPetDailyProfile(adoption: PetAdoption) {
  const adoptedDate = new Date(adoption.adoptedAt);
  const now = new Date();
  const adoptedDay = Number.isNaN(adoptedDate.getTime()) ? now : adoptedDate;
  const adoptedStart = new Date(adoptedDay.getFullYear(), adoptedDay.getMonth(), adoptedDay.getDate()).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.max(1, Math.floor((todayStart - adoptedStart) / 86400000) + 1);
  return {
    adoptedDate: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(adoptedDay),
    days,
    growth: adoption.growthValue || days * 10,
    mood: adoption.mood,
    thought: adoption.dailyThought || petThoughts[0]
  };
}

function copiedDeadline(task: Task) {
  if (task.type !== "打卡任务" || !task.deadline) return undefined;
  const start = new Date(`${task.createdAt}T00:00:00`);
  const end = new Date(`${task.deadline}T00:00:00`);
  const duration = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? 7 : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const nextEnd = new Date(`${todayKey()}T00:00:00`);
  nextEnd.setDate(nextEnd.getDate() + duration);
  return nextEnd.toISOString().slice(0, 10);
}

function dateToWeekday(date: Date): Weekday {
  const day = date.getDay();
  return weekdays[day === 0 ? 6 : day - 1];
}

function countRequiredCheckIns(task: Task) {
  if (task.type !== "打卡任务" || !task.deadline || !task.checkInDays?.length) return 0;
  const start = new Date(`${task.createdAt}T00:00:00`);
  const end = new Date(`${task.deadline}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return task.checkInDays.length;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (task.checkInDays.includes(dateToWeekday(cursor))) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(count, 1);
}

function countCompletedCheckIns(task: Task) {
  return new Set((task.checkIns ?? []).map((checkIn) => `${checkIn.childId}-${checkIn.date}`)).size;
}

function getCheckInProgress(task: Task) {
  const required = countRequiredCheckIns(task);
  const completed = Math.min(countCompletedCheckIns(task), required || countCompletedCheckIns(task));
  return { completed, required };
}

function canCheckInToday(task: Task, childId: string) {
  if (task.type !== "打卡任务" || task.assigneeId !== childId || task.status !== "完成中") return false;
  const today = todayKey();
  if (task.deadline && today > task.deadline) return false;
  if (!task.checkInDays?.includes(dateToWeekday(new Date(`${today}T00:00:00`)))) return false;
  return !(task.checkIns ?? []).some((checkIn) => checkIn.childId === childId && checkIn.date === today);
}

const initialMembers: Member[] = [
  { id: "p1", name: "爸爸", role: "parent", title: "爸爸" },
  { id: "p2", name: "妈妈", role: "parent", title: "妈妈" },
  { id: "c1", name: "小雨", role: "child", gender: "女孩", childTitle: "姐姐" },
  { id: "c2", name: "乐乐", role: "child", gender: "男孩", childTitle: "弟弟" }
];

const initialWishes: Wish[] = [
  {
    id: "w1",
    title: "周末去科技馆",
    description: "想去看机器人展区，最好能一起参加亲子实验课。",
    type: "旅游奖励",
    childId: "c1",
    fulfiller: "爸爸",
    expectedDate: "2026-06-28",
    status: "兑换中"
  },
  {
    id: "w2",
    title: "睡前一起拼乐高",
    description: "希望妈妈陪我把城堡的第二层拼完。",
    type: "陪玩奖励",
    childId: "c2",
    fulfiller: "妈妈",
    expectedDate: "2026-06-21",
    status: "待申领"
  }
];

const initialTasks: Task[] = [
  {
    id: "t1",
    title: "连续 5 天阅读 20 分钟",
    type: "打卡任务",
    creatorId: "p1",
    rewardType: "旅游奖励",
    rewardDescription: "点亮科技馆愿望，周末由爸爸带小雨去科技馆。",
    createdAt: "2026-06-10",
    linkedWishId: "w1",
    assigneeId: "c1",
    status: "完成中",
    submitted: false,
    checkInDays: ["周一", "周二", "周三", "周四", "周五"],
    deadline: "2026-06-20",
    checkIns: [
      { childId: "c1", date: "2026-06-10" },
      { childId: "c1", date: "2026-06-11" },
      { childId: "c1", date: "2026-06-12" }
    ]
  },
  {
    id: "t2",
    title: "整理自己的书桌",
    type: "一次性任务",
    creatorId: "p2",
    rewardType: "陪玩奖励",
    rewardDescription: "晚饭后一起玩一局桌游。",
    createdAt: "2026-06-14",
    status: "待申领"
  }
];

export default function Home() {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [wishes, setWishes] = useState<Wish[]>(initialWishes);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [petAdoptions, setPetAdoptions] = useState<PetAdoption[]>([]);
  const [pointAccounts, setPointAccounts] = useState<PointAccount[]>([]);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [petInteractions, setPetInteractions] = useState<PetInteraction[]>([]);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [hasLoadedStoredData, setHasLoadedStoredData] = useState(false);
  const [account, setAccount] = useState<AppAccount | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("本地演示数据");
  const [accountMessage, setAccountMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [showMemberPassword, setShowMemberPassword] = useState(false);
  const [showMemberConfirmPassword, setShowMemberConfirmPassword] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("p1");
  const [activeView, setActiveView] = useState<AppView>("home");
  const [activePetAdoptionId, setActivePetAdoptionId] = useState<string | null>(null);
  const [editingWishId, setEditingWishId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [taskFormType, setTaskFormType] = useState<TaskType>("打卡任务");
  const [proposalTaskType, setProposalTaskType] = useState<TaskType>("一次性任务");
  const [wishFormType, setWishFormType] = useState<WishType>("物质奖励");
  const [taskRewardType, setTaskRewardType] = useState<WishType>("物质奖励");
  const [proposalRewardType, setProposalRewardType] = useState<WishType>("积分奖励");
  const [memberFormRole, setMemberFormRole] = useState<Role>("child");
  const [wishFormMessage, setWishFormMessage] = useState("");
  const [taskFormMessage, setTaskFormMessage] = useState("");
  const [proposalFormMessage, setProposalFormMessage] = useState("");
  const [petMessage, setPetMessage] = useState("");
  const [petMotionCommand, setPetMotionCommand] = useState<PetMotionCommand>();
  const [economyMessage, setEconomyMessage] = useState("");
  const [editingRewardItemId, setEditingRewardItemId] = useState<string | null>(null);
  const [rewardItemType, setRewardItemType] = useState<RewardItem["itemType"]>("physical");

  const currentUser =
    members.find((member) => member.id === account?.member_id) ??
    members.find((member) => member.id === currentUserId) ??
    members[0] ??
    initialMembers[0];
  const parents = members.filter((member) => member.role === "parent");
  const children = members.filter((member) => member.role === "child");
  const roleLabel = getFamilyRoleLabel(currentUser);
  const memberAvatar = getMemberAvatar(currentUser);
  const defaultAvatarId = memberAvatar.id;
  const avatar = avatarOptions.find((item) => item.id === account?.avatar_id) ?? memberAvatar;

  const wishById = useMemo(() => new Map(wishes.map((wish) => [wish.id, wish])), [wishes]);
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const editingWish = wishes.find((wish) => wish.id === editingWishId);
  const editingTask = tasks.find((task) => task.id === editingTaskId);
  const editingMember = members.find((member) => member.id === editingMemberId);

  useEffect(() => {
    if (!account?.member_id || !members.some((member) => member.id === account.member_id)) return;
    setCurrentUserId(account.member_id);
  }, [account?.member_id, members]);

  useEffect(() => {
    if (!supabase) {
      try {
        const rawData = window.localStorage.getItem(storageKey);
        if (rawData) {
          const storedData = JSON.parse(rawData) as StoredAppData;
          applyStoredData(storedData);
        }
      } finally {
        setIsSessionLoading(false);
        setHasLoadedStoredData(true);
      }
      return;
    }

    const savedToken = window.localStorage.getItem(sessionStorageKey);
    if (!savedToken) {
      setIsSessionLoading(false);
      setHasLoadedStoredData(true);
      return;
    }

    const sessionTimeout = window.setTimeout(() => {
      setIsSessionLoading(false);
      setHasLoadedStoredData(true);
      setAuthMessage("登录状态检查超时，请确认 Supabase 环境变量和网络配置。");
    }, 8000);

    loadAppSession(savedToken).finally(() => {
      window.clearTimeout(sessionTimeout);
      setIsSessionLoading(false);
    });

    return () => window.clearTimeout(sessionTimeout);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredData) return;
    const data: StoredAppData = { members, wishes, tasks };
    if (supabase && account && sessionToken) {
      setSaveStatus("正在保存到 Supabase...");
      supabase
        .rpc("save_app_state", { p_token: sessionToken, p_state_data: data })
        .then(({ error }) => {
          setSaveStatus(error ? `云端保存失败：${error.message}` : "已保存到 Supabase");
        });
    } else if (!supabase) {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
      setSaveStatus("已保存到本地演示数据");
    } else {
      setSaveStatus("未登录");
    }
  }, [hasLoadedStoredData, members, wishes, tasks, account, sessionToken]);

  function applyStoredData(storedData: Partial<StoredAppData> | undefined) {
    if (!storedData) return;
    if (Array.isArray(storedData.members) && Array.isArray(storedData.wishes) && Array.isArray(storedData.tasks)) {
      setMembers(storedData.members);
      setWishes(storedData.wishes);
      setTasks(storedData.tasks);
    }
  }

  function applyEconomyData(data: Partial<EconomyData> | undefined) {
    setPointAccounts(Array.isArray(data?.pointAccounts) ? data.pointAccounts : []);
    setPointTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
    setPetAdoptions(Array.isArray(data?.petAdoptions) ? data.petAdoptions : []);
    setPetInteractions(Array.isArray(data?.petInteractions) ? data.petInteractions : []);
    setRewardItems(Array.isArray(data?.rewardItems) ? data.rewardItems : []);
    setRedemptions(Array.isArray(data?.redemptions) ? data.redemptions : []);
  }

  async function loadEconomy(token = sessionToken) {
    if (!supabase || !token) return;
    const { data, error } = await supabase.rpc("get_family_economy", { p_token: token });
    if (error) {
      setEconomyMessage(`积分与宠物数据加载失败：${error.message}`);
      return;
    }
    applyEconomyData(data as EconomyData);
    setEconomyMessage("");
  }

  function applyAuthPayload(payload: { token?: string; account?: AppAccount; data?: Partial<StoredAppData> }) {
    if (!payload.token || !payload.account) {
      setAuthMessage("登录返回数据不完整。");
      return;
    }
    setSessionToken(payload.token);
    setAccount(payload.account);
    setActiveView("home");
    setActivePetAdoptionId(null);
    window.localStorage.setItem(sessionStorageKey, payload.token);
    applyStoredData(payload.data);
    void loadEconomy(payload.token);
    setHasLoadedStoredData(true);
    setSaveStatus("已连接 Supabase");
  }

  async function loadAppSession(token: string) {
    if (!supabase) return;
    setHasLoadedStoredData(false);
    const { data, error } = await supabase.rpc("get_app_state", { p_token: token });
    if (error) {
      window.localStorage.removeItem(sessionStorageKey);
      setSessionToken(null);
      setAccount(null);
      setAuthMessage(`登录已失效：${error.message}`);
      setHasLoadedStoredData(true);
      return;
    }
    applyAuthPayload({ token, ...(data as { account: AppAccount; data: Partial<StoredAppData> }) });
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setAuthMessage("请先配置 Supabase 环境变量。");
      return;
    }
    const data = new FormData(event.currentTarget);
    const username = normalizeUsername(String(data.get("identifier") ?? ""));
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    const parentTitle = String(data.get("parentTitle") ?? "爸爸") as ParentTitle;
    if (!username || !password) return;
    if (!validateUsername(username)) {
      setAuthMessage("账号只能包含小写字母、数字、下划线，长度 3 到 32 位。");
      return;
    }
    if (!validatePassword(password)) {
      setAuthMessage("密码至少 8 位，并且必须包含字母和数字。");
      return;
    }
    if (authMode === "signup" && password !== confirmPassword) {
      setAuthMessage("两次输入的密码不一致。");
      return;
    }

    setIsAuthLoading(true);
    setAuthMessage("");
    const result = await (
      authMode === "login"
        ? supabase.rpc("login_app_account", { p_username: username, p_password: password })
        : supabase.rpc("register_app_account", {
            p_username: username,
            p_password: password,
            p_display_name: username,
            p_parent_title: parentTitle
          })
    );

    setIsAuthLoading(false);
    if (result.error) {
      setAuthMessage(result.error.message);
      return;
    }
    applyAuthPayload(result.data as { token: string; account: AppAccount; data: Partial<StoredAppData> });
    setAuthMessage(authMode === "signup" ? "注册成功。" : "登录成功。");
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !sessionToken || !account) return;
    const data = new FormData(event.currentTarget);
    const displayName = String(data.get("displayName") ?? "").trim();
    const newPassword = String(data.get("newPassword") ?? "");
    const newPasswordConfirm = String(data.get("newPasswordConfirm") ?? "");
    const avatarId = String(data.get("avatarId") ?? account.avatar_id ?? defaultAvatarId);
    if (!displayName) return;

    setAccountMessage("");
    if (newPassword || newPasswordConfirm) {
      if (newPassword !== newPasswordConfirm) {
        setAccountMessage("两次输入的新密码不一致。");
        return;
      }
      if (!validatePassword(newPassword)) {
        setAccountMessage("新密码至少 8 位，并且必须包含字母和数字。");
        return;
      }
    }
    const { data: savedAccount, error } = await supabase.rpc("update_app_account", {
      p_token: sessionToken,
      p_display_name: displayName,
      p_new_password: newPassword || null,
      p_avatar_id: avatarId
    });
    if (error) {
      setAccountMessage(`保存账号资料失败：${error.message}`);
      return;
    }
    const nextAccount = (savedAccount as { account: AppAccount }).account;
    setAccount(nextAccount);
    setMembers((current) => current.map((member) => member.id === nextAccount.member_id ? { ...member, avatarId: nextAccount.avatar_id ?? avatarId } : member));
    if (newPassword) event.currentTarget.reset();
    setAccountMessage("账号资料已保存。");
  }

  async function signOut() {
    window.localStorage.removeItem(sessionStorageKey);
    setSessionToken(null);
    setAccount(null);
    setActiveView("home");
    setActivePetAdoptionId(null);
    applyEconomyData(undefined);
    setAuthMessage("已退出登录。");
  }

  function refreshWishProgress(nextTasks: Task[]) {
    setWishes((current) =>
      current.map((wish) => {
        const linkedTasks = nextTasks.filter((task) => task.linkedWishId === wish.id);
        if (linkedTasks.some((task) => task.status === "已完成")) return { ...wish, status: "兑现中" };
        if (linkedTasks.length > 0) return { ...wish, status: "兑换中" };
        return { ...wish, status: "待申领" };
      })
    );
  }

  function saveWish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const expectedDate = String(data.get("expectedDate") ?? "");
    const type = String(data.get("type")) as WishType;
    const rewardPoints = Number(data.get("wishRewardPoints") ?? 0);
    if (!title || currentUser.role !== "child") return;
    setWishFormMessage("");
    if (wishes.some((wish) => wish.status !== "已兑换" && wish.id !== editingWishId && normalizedTitle(wish.title) === normalizedTitle(title))) {
      setWishFormMessage("愿望名重复，请修改后再提交。");
      return;
    }
    if (type === "积分奖励" && (!Number.isFinite(rewardPoints) || rewardPoints <= 0 || rewardPoints > 100)) {
      setWishFormMessage("积分奖励必须在 1 到 100 成长星之间。");
      return;
    }

    if (editingWishId) {
      setWishes((current) =>
        current.map((wish) =>
          wish.id === editingWishId && wish.childId === currentUser.id
            ? {
                ...wish,
                title,
                description,
                type,
                rewardPoints: type === "积分奖励" ? rewardPoints : undefined,
                fulfiller: String(data.get("fulfiller")) as ParentTitle,
                expectedDate: expectedDate || undefined
              }
            : wish
        )
      );
      setEditingWishId(null);
    } else {
      const wish: Wish = {
        id: crypto.randomUUID(),
        title,
        description,
        type,
        childId: currentUser.id,
        fulfiller: String(data.get("fulfiller")) as ParentTitle,
        expectedDate: expectedDate || undefined,
        status: "待申领",
        rewardPoints: type === "积分奖励" ? rewardPoints : undefined,
        submittedAt: submittedNow()
      };

      setWishes((current) => [wish, ...current]);
    }
    event.currentTarget.reset();
    setWishFormType("物质奖励");
  }

  function deleteWish(wishId: string) {
    setWishes((current) => current.filter((wish) => wish.id !== wishId || wish.childId !== currentUser.id));
    setTasks((current) => current.map((task) => (task.linkedWishId === wishId ? { ...task, linkedWishId: undefined } : task)));
    if (editingWishId === wishId) setEditingWishId(null);
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const rewardType = String(data.get("rewardType")) as WishType;
    const rewardDescription = String(data.get("rewardDescription") ?? "").trim();
    const linkedWishId = String(data.get("linkedWishId") ?? "");
    const type = String(data.get("type")) as TaskType;
    const checkInDays = data.getAll("checkInDays").map(String) as Weekday[];
    const deadline = String(data.get("deadline") ?? "");
    const rewardPoints = Number(data.get("taskRewardPoints") ?? 0);
    if (!title || !rewardDescription || currentUser.role !== "parent") return;
    setTaskFormMessage("");
    if (tasks.some((task) => task.status !== "已完成" && task.id !== editingTaskId && normalizedTitle(task.title) === normalizedTitle(title))) {
      setTaskFormMessage("任务名重复，请修改后再提交。");
      return;
    }
    if (type === "打卡任务" && (!checkInDays.length || !deadline)) return;
    if (rewardType === "积分奖励" && (!Number.isFinite(rewardPoints) || rewardPoints <= 0)) {
      setTaskFormMessage("积分奖励必须填写大于 0 的积分数量。");
      return;
    }
    if (rewardType !== "积分奖励" && (!Number.isFinite(rewardPoints) || rewardPoints < 0)) {
      setTaskFormMessage("额外成长星不能小于 0。");
      return;
    }

    const nextLinkedWishId = linkedWishId || undefined;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      type,
      creatorId: currentUser.id,
      rewardType,
      rewardDescription,
      rewardPoints: Number.isFinite(rewardPoints) && rewardPoints > 0 ? rewardPoints : undefined,
      createdAt: todayKey(),
      submittedAt: submittedNow(),
      linkedWishId: nextLinkedWishId,
      status: "待申领",
      approvalStatus: "已通过",
      checkInDays: type === "打卡任务" ? checkInDays : undefined,
      deadline: type === "打卡任务" ? deadline : undefined,
      checkIns: type === "打卡任务" ? [] : undefined
    };
    const nextTasks = editingTaskId
      ? tasks.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title,
                type,
                reward: undefined,
                rewardType,
                rewardDescription,
                rewardPoints: Number.isFinite(rewardPoints) && rewardPoints > 0 ? rewardPoints : undefined,
                linkedWishId: nextLinkedWishId,
                checkInDays: type === "打卡任务" ? checkInDays : undefined,
                deadline: type === "打卡任务" ? deadline : undefined,
                checkIns: type === "打卡任务" ? task.checkIns ?? [] : undefined
              }
            : task
        )
      : [newTask, ...tasks];
    setTasks(nextTasks);
    refreshWishProgress(nextTasks);
    setEditingTaskId(null);
    setTaskFormType("打卡任务");
    setTaskRewardType("物质奖励");
    event.currentTarget.reset();
  }

  function proposeTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentUser.role !== "child") return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("proposalTitle") ?? "").trim();
    const description = String(data.get("proposalDescription") ?? "").trim();
    const suggestedPoints = Number(data.get("suggestedPoints") ?? 0);
    const rewardType = String(data.get("proposalRewardType") ?? "积分奖励") as WishType;
    const proposedRewardDescription = String(data.get("proposalRewardDescription") ?? "").trim();
    const type = String(data.get("proposalType") ?? "一次性任务") as TaskType;
    const proposalCheckInDays = data.getAll("proposalCheckInDays").map(String) as Weekday[];
    const proposalDeadline = String(data.get("proposalDeadline") ?? "");
    if (!title || !description) return;
    setProposalFormMessage("");
    if (tasks.some((task) => task.status !== "已完成" && normalizedTitle(task.title) === normalizedTitle(title))) {
      setProposalFormMessage("任务名重复，请修改后再提交。");
      return;
    }
    if (rewardType === "积分奖励" && (!Number.isFinite(suggestedPoints) || suggestedPoints <= 0 || suggestedPoints > 100)) {
      setProposalFormMessage("积分奖励必须在 1 到 100 成长星之间。");
      return;
    }
    if (rewardType !== "积分奖励" && !proposedRewardDescription) {
      setProposalFormMessage("请选择奖励类型并填写建议奖励说明。");
      return;
    }
    if (type === "打卡任务" && (!proposalCheckInDays.length || !proposalDeadline)) {
      setProposalFormMessage("打卡任务必须选择打卡频率并设置截止时间。");
      return;
    }

    setTasks((current) => [{
      id: crypto.randomUUID(),
      title,
      type,
      creatorId: currentUser.id,
      proposerId: currentUser.id,
      proposalDescription: description,
      suggestedPoints: rewardType === "积分奖励" ? suggestedPoints : undefined,
      rewardPoints: rewardType === "积分奖励" ? suggestedPoints : undefined,
      rewardType,
      rewardDescription: rewardType === "积分奖励" ? `建议奖励 ${suggestedPoints} 积分，等待父母确认` : proposedRewardDescription,
      createdAt: todayKey(),
      submittedAt: submittedNow(),
      status: "待申领",
      approvalStatus: "待审批",
      checkInDays: type === "打卡任务" ? proposalCheckInDays : undefined,
      deadline: type === "打卡任务" ? proposalDeadline : undefined,
      checkIns: type === "打卡任务" ? [] : undefined
    }, ...current]);
    event.currentTarget.reset();
    setProposalRewardType("积分奖励");
    setProposalTaskType("一次性任务");
  }

  function copyTask(taskId: string) {
    if (currentUser.role !== "parent") return;
    const source = tasks.find((task) => task.id === taskId);
    if (!source) return;
    const baseTitle = source.title.replace(/（副本(?: \d+)?）$/, "");
    let copyIndex = 1;
    let nextTitle = `${baseTitle}（副本）`;
    while (tasks.some((task) => task.status !== "已完成" && normalizedTitle(task.title) === normalizedTitle(nextTitle))) {
      copyIndex += 1;
      nextTitle = `${baseTitle}（副本 ${copyIndex}）`;
    }
    const copiedTask: Task = {
      ...source,
      id: crypto.randomUUID(),
      title: nextTitle,
      creatorId: currentUser.id,
      createdAt: todayKey(),
      submittedAt: submittedNow(),
      deadline: copiedDeadline(source),
      linkedWishId: undefined,
      assigneeId: undefined,
      status: "待申领",
      submitted: false,
      completionSubmittedAt: undefined,
      completedAt: undefined,
      checkIns: source.type === "打卡任务" ? [] : undefined,
      approvalStatus: "已通过",
      proposalDescription: undefined,
      suggestedPoints: undefined,
      proposerId: undefined
    };
    setTasks((current) => [copiedTask, ...current]);
  }

  function approveTaskProposal(taskId: string) {
    if (currentUser.role !== "parent") return;
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, approvalStatus: "已通过" } : task));
  }

  function deleteTask(taskId: string) {
    const nextTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(nextTasks);
    refreshWishProgress(nextTasks);
    if (editingTaskId === taskId) setEditingTaskId(null);
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name || currentUser.role !== "parent") return;
    const role = (editingMember?.role ?? String(data.get("role") ?? "child")) as Role;
    const title = String(data.get("title") ?? "妈妈") as ParentTitle;
    const gender = (role === "child" ? String(data.get("gender") ?? "男孩") : "男孩") as ChildGender;
    const childTitle = (role === "child" ? String(data.get("childTitle") ?? "弟弟") : "弟弟") as ChildTitle;
    const memberUsername = normalizeUsername(String(data.get("memberUsername") ?? ""));
    const memberPassword = String(data.get("memberPassword") ?? "");
    const memberConfirmPassword = String(data.get("memberConfirmPassword") ?? "");

    const nextMember = {
      name,
      role,
      title: role === "parent" ? title : undefined,
      gender: role === "child" ? gender : undefined,
      childTitle: role === "child" ? childTitle : undefined
    };

    if (editingMemberId) {
      setMembers((current) =>
        current.map((member) => (member.id === editingMemberId ? { ...member, ...nextMember } : member))
      );
      setEditingMemberId(null);
      setMemberFormRole("child");
      setActiveView("home");
    } else {
      if (!supabase || !sessionToken) return;
      if (!validateUsername(memberUsername)) {
        setAccountMessage("成员账号只能包含小写字母、数字、下划线，长度 3 到 32 位。");
        return;
      }
      if (!validatePassword(memberPassword)) {
        setAccountMessage("成员初始密码至少 8 位，并且必须包含字母和数字。");
        return;
      }
      if (memberPassword !== memberConfirmPassword) {
        setAccountMessage("成员账号两次输入的密码不一致。");
        return;
      }

      const { data: memberResult, error } = await supabase.rpc("create_family_member_account", {
        p_token: sessionToken,
        p_username: memberUsername,
        p_password: memberPassword,
        p_display_name: name,
        p_role: role,
        p_parent_title: title,
        p_gender: gender,
        p_child_title: childTitle
      });

      if (error) {
        setAccountMessage(`创建家庭成员账号失败：${error.message}`);
        return;
      }

      applyStoredData((memberResult as { data: Partial<StoredAppData> }).data);
      await loadEconomy();
      setAccountMessage(role === "parent" ? "父母账号已创建。" : "孩子账号已创建。");
      setMemberFormRole("child");
    }
    event.currentTarget.reset();
  }

  function removeMemberFromState(memberId: string) {
    if (memberId === currentUser.id) return;
    setMembers((current) => current.filter((member) => member.id !== memberId));
    setWishes((current) => current.filter((wish) => wish.childId !== memberId));
    setTasks((current) =>
      current
        .filter((task) => task.creatorId !== memberId)
        .map((task) => (task.assigneeId === memberId ? { ...task, assigneeId: undefined, status: "待申领", submitted: false, completionSubmittedAt: undefined, completedAt: undefined } : task))
    );
    setPetAdoptions((current) => current.filter((adoption) => adoption.memberId !== memberId));
    if (editingMemberId === memberId) setEditingMemberId(null);
  }

  async function deleteMember(memberId: string) {
    if (memberId === currentUser.id) return;
    if (!supabase || !sessionToken) {
      removeMemberFromState(memberId);
      return;
    }

    setAccountMessage("");
    const { data, error } = await supabase.rpc("delete_family_member_account", {
      p_token: sessionToken,
      p_member_id: memberId
    });

    if (error) {
      setAccountMessage(`删除家庭成员账号失败：${error.message}`);
      return;
    }

    applyStoredData((data as { data: Partial<StoredAppData> }).data);
    await loadEconomy();
    if (editingMemberId === memberId) setEditingMemberId(null);
    setAccountMessage("家庭成员账号已删除。");
  }

  function claimTask(taskId: string) {
    if (currentUser.role !== "child") return;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: "完成中", assigneeId: currentUser.id } : task
      )
    );
  }

  function submitTask(taskId: string) {
    if (currentUser.role !== "child") return;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId && task.assigneeId === currentUser.id ? { ...task, submitted: true, completionSubmittedAt: submittedNow() } : task
      )
    );
  }

  function checkInTask(taskId: string) {
    if (currentUser.role !== "child") return;
    const today = todayKey();
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId || !canCheckInToday(task, currentUser.id)) return task;
        const nextTask = {
          ...task,
          checkIns: [...(task.checkIns ?? []), { childId: currentUser.id, date: today }]
        };
        const { completed, required } = getCheckInProgress(nextTask);
        return required > 0 && completed >= required ? { ...nextTask, submitted: true, completionSubmittedAt: submittedNow() } : nextTask;
      })
    );
  }

  async function approveTask(taskId: string) {
    if (currentUser.role !== "parent") return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    if ((task.rewardPoints ?? 0) > 0) {
      if (!supabase || !sessionToken || !task.assigneeId) {
        setTaskFormMessage("积分奖励无法入账，请确认登录状态和孩子领取信息。");
        return;
      }
      const { error } = await supabase.rpc("award_task_points", {
        p_token: sessionToken,
        p_member_id: task.assigneeId,
        p_points: task.rewardPoints,
        p_task_id: task.id,
        p_description: `完成任务：${task.title}`
      });
      if (error) {
        setTaskFormMessage(`积分发放失败：${error.message}`);
        return;
      }
      await loadEconomy();
    }

    setTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, status: "已完成", submitted: false, completedAt: submittedNow() } : item))
    );
    if (task.linkedWishId) {
      setWishes((current) =>
        current.map((wish) => (wish.id === task.linkedWishId ? { ...wish, status: "兑现中" } : wish))
      );
    }
  }

  function archiveWish(wishId: string) {
    if (currentUser.role !== "parent") return;
    setWishes((current) =>
      current.map((wish) => (wish.id === wishId && wish.status === "兑现中" ? { ...wish, status: "已兑换" } : wish))
    );
  }

  async function claimPet(petId: PetId) {
    setPetMessage("");
    if (currentUser.role !== "child") {
      setPetMessage("父母账号不能领取电子宠物。");
      return;
    }
    const myAdoptions = petAdoptions.filter((adoption) => adoption.memberId === currentUser.id);
    if (myAdoptions.some((adoption) => adoption.petId === petId)) {
      setPetMessage("这只宠物已经领取过了。");
      return;
    }
    if (myAdoptions.length >= 2) {
      setPetMessage("每个孩子最多领取 2 只电子宠物。");
      return;
    }
    if (!supabase || !sessionToken) {
      setPetMessage("宠物领养必须连接 Supabase 数据库。");
      return;
    }
    const { data, error } = await supabase.rpc("adopt_app_pet", { p_token: sessionToken, p_pet_id: petId });
    if (error) {
      setPetMessage(`领养失败：${error.message}`);
      return;
    }
    await loadEconomy();
    const cost = Number((data as { cost?: number } | null)?.cost ?? 0);
    setPetMessage(cost === 0 ? "第一只电子宠物已免费领养。" : `电子宠物领取成功，已扣除 ${cost} 成长星。`);
  }

  async function redeemPointItem(itemId: string) {
    if (currentUser.role !== "child" || !supabase || !sessionToken) return;
    setPetMessage("");
    const { data, error } = await supabase.rpc("redeem_reward_item", { p_token: sessionToken, p_item_id: itemId });
    if (error) {
      setPetMessage(`兑换失败：${error.message}`);
      return;
    }
    await loadEconomy();
    const result = data as { itemName?: string; cost?: number } | null;
    setPetMessage(`已兑换${result?.itemName ?? "物品"}，扣除 ${result?.cost ?? 0} 成长星。`);
  }

  async function saveRewardItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentUser.role !== "parent" || !supabase || !sessionToken) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("rewardName") ?? "").trim();
    const description = String(data.get("rewardDescription") ?? "").trim();
    const cost = Number(data.get("rewardCost") ?? 0);
    const stock = rewardItemType === "physical" ? Number(data.get("rewardStock") ?? 0) : null;
    const icon = String(data.get("rewardIcon") ?? "🎁");
    if (!name || !description || !Number.isFinite(cost) || cost <= 0) {
      setEconomyMessage("请完整填写奖品名称、说明和有效价格。");
      return;
    }
    if (rewardItemType === "physical" && (!Number.isFinite(stock) || Number(stock) < 0)) {
      setEconomyMessage("实物奖品必须填写有效库存。");
      return;
    }

    const { error } = await supabase.rpc("save_reward_item", {
      p_token: sessionToken,
      p_item_id: editingRewardItemId,
      p_item_type: rewardItemType,
      p_name: name,
      p_description: description,
      p_cost: cost,
      p_stock: stock,
      p_icon: icon
    });
    if (error) {
      setEconomyMessage(`保存奖品失败：${error.message}`);
      return;
    }
    await loadEconomy();
    setEditingRewardItemId(null);
    setRewardItemType("physical");
    setEconomyMessage("奖品已保存并上架。");
    event.currentTarget.reset();
  }

  async function toggleRewardItem(item: RewardItem) {
    if (currentUser.role !== "parent" || !supabase || !sessionToken) return;
    const { error } = await supabase.rpc("set_reward_item_status", {
      p_token: sessionToken,
      p_item_id: item.id,
      p_is_active: !item.isActive
    });
    if (error) {
      setEconomyMessage(`调整奖品状态失败：${error.message}`);
      return;
    }
    await loadEconomy();
    setEconomyMessage(item.isActive ? "奖品已下架。" : "奖品已重新上架。");
  }

  function openPet(adoptionId: string) {
    setActivePetAdoptionId(adoptionId);
    setActiveView("pet");
  }

  async function interactPet(action: PetInteraction["action"], detail?: string) {
    if (currentUser.role !== "child" || !activePetAdoptionId || !supabase || !sessionToken) return;
    setPetMessage("");
    const motion: PetMotionAction = action === "feed" ? "feed" : action === "play" ? "play" : "greet";
    setPetMotionCommand((current) => ({ action: motion, nonce: (current?.nonce ?? 0) + 1 }));
    const { error } = await supabase.rpc("interact_app_pet", {
      p_token: sessionToken,
      p_adoption_id: activePetAdoptionId,
      p_action: action,
      p_detail: detail ?? null
    });
    if (error) {
      setPetMessage(`互动失败：${error.message}`);
      return;
    }
    await loadEconomy();
    const messages: Record<PetInteraction["action"], string> = {
      feed: "喂养完成，宠物吃得很满足。",
      play: "玩耍完成，宠物心情更好了。",
      dress: "新装扮已经保存。",
      pet_head: "它开心地回应了你的摸头。",
      pet_body: "它放松下来，安心地靠近你。",
      pet_paw: "它伸出爪子，和你击了个掌。"
    };
    setPetMessage(messages[action]);
  }

  async function abandonPet() {
    if (currentUser.role !== "child" || !activePetAdoptionId || !supabase || !sessionToken) return;
    if (!window.confirm("弃养将扣除 2000 成长星，且无法撤销本次领养记录。确定继续吗？")) return;
    setPetMessage("");
    const { error } = await supabase.rpc("abandon_app_pet", { p_token: sessionToken, p_adoption_id: activePetAdoptionId });
    if (error) {
      setPetMessage(`弃养失败：${error.message}`);
      return;
    }
    await loadEconomy();
    setActivePetAdoptionId(null);
    setActiveView("points");
    setPetMessage("宠物已弃养，扣除 2000 成长星。");
  }

  const visibleWishes = currentUser.role === "child" ? wishes.filter((wish) => wish.childId === currentUser.id) : wishes;
  const activeWishes = visibleWishes.filter((wish) => wish.status !== "已兑换");
  const archivedWishes = visibleWishes.filter((wish) => wish.status === "已兑换");
  const boardTasks = tasks.filter((task) => task.status !== "已完成" && task.approvalStatus !== "待审批");
  const activeTasks = tasks.filter((task) => task.status !== "已完成" && task.approvalStatus !== "待审批");
  const archivedTasks = tasks.filter((task) => task.status === "已完成");
  const proposalTasks = tasks.filter((task) => task.approvalStatus === "待审批");
  const myProposals = proposalTasks.filter((task) => task.proposerId === currentUser.id);
  const claimableTasks = tasks.filter((task) => task.status === "待申领" && task.approvalStatus !== "待审批");
  const myTasks = tasks.filter((task) => task.assigneeId === currentUser.id);
  const childPointRows = children
    .map((child) => ({ child, balance: pointAccounts.find((item) => item.memberId === child.id)?.balance ?? 0 }))
    .sort((first, second) => second.balance - first.balance);
  const currentChildPoints = currentUser.role === "child" ? pointAccounts.find((item) => item.memberId === currentUser.id) : null;
  const currentPointTransactions = currentUser.role === "child" ? pointTransactions.filter((item) => item.memberId === currentUser.id) : [];
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = currentPointTransactions.filter((item) => item.createdAt.slice(0, 7) === currentMonthKey);
  const currentMonthGain = currentMonthTransactions.filter((item) => item.amount > 0).reduce((total, item) => total + item.amount, 0);
  const currentMonthCost = Math.abs(currentMonthTransactions.filter((item) => item.amount < 0).reduce((total, item) => total + item.amount, 0));
  const myPetAdoptions = petAdoptions.filter((adoption) => adoption.memberId === currentUser.id);
  const activePetAdoption = petAdoptions.find((adoption) => adoption.id === activePetAdoptionId) ?? null;
  const editingRewardItem = rewardItems.find((item) => item.id === editingRewardItemId);

  if (isSessionLoading) {
    return (
      <main className="app-shell auth-shell">
        <section className="login-card loading-card">
          <p className="eyebrow">家庭许愿墙</p>
          <h1>正在检查登录状态</h1>
        </section>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="app-shell auth-shell">
        <section className="login-card">
          <div className="login-visual" aria-hidden="true">
            <img src="/images/family-login-hero.png" alt="" />
            <div className="login-visual-copy">
              <span>一起记录小小心愿</span>
              <strong>让每一次努力都有温暖回应</strong>
            </div>
          </div>
          <div className="login-content">
            <div className="login-brand">✦</div>
            <p className="eyebrow">家庭许愿墙</p>
            <h1>{authMode === "login" ? "欢迎回来" : "创建新家庭"}</h1>
            <p>{authMode === "login" ? "登录后继续管理家人的愿望和任务。" : "注册第一个父母账号，开始建立家庭许愿墙。"}</p>
            {!isSupabaseConfigured && <p className="auth-message">请先配置 Supabase 环境变量。</p>}
            <form className="login-form" onSubmit={submitAuth}>
            <label>
              账号
              <input name="identifier" placeholder="例如 dony" disabled={!isSupabaseConfigured || isAuthLoading} required />
            </label>
            <label>
              密码
              <span className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  disabled={!isSupabaseConfigured || isAuthLoading}
                  required
                />
                <button type="button" aria-label={showPassword ? "隐藏密码" : "显示密码"} onClick={() => setShowPassword((current) => !current)}>
                  <EyeIcon open={showPassword} />
                </button>
              </span>
            </label>
            {authMode === "signup" && (
              <>
                <label>
                  父母身份
                  <select name="parentTitle" disabled={!isSupabaseConfigured || isAuthLoading} defaultValue="爸爸">
                    <option>爸爸</option>
                    <option>妈妈</option>
                  </select>
                </label>
                <label>
                  确认密码
                  <span className="password-field">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="请再次输入密码"
                      disabled={!isSupabaseConfigured || isAuthLoading}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "隐藏确认密码" : "显示确认密码"}
                      onClick={() => setShowConfirmPassword((current) => !current)}
                    >
                      <EyeIcon open={showConfirmPassword} />
                    </button>
                  </span>
                </label>
              </>
            )}
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={!isSupabaseConfigured || isAuthLoading}>
                {authMode === "login" ? "登录" : "注册"}
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={!isSupabaseConfigured || isAuthLoading}
                onClick={() => setAuthMode((current) => (current === "login" ? "signup" : "login"))}
              >
                切换到{authMode === "login" ? "注册" : "登录"}
              </button>
            </div>
            </form>
            {authMessage && <p className="auth-message">{authMessage}</p>}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <p className="eyebrow">家庭许愿墙</p>
          <h1>一家人的愿望成长空间</h1>
        </div>
        <div className="topbar-account" data-testid="account-role">
          <div className="avatar-logo" aria-hidden="true"><img src={avatar.image} alt="" /></div>
          <div>
            <strong>{account.display_name || currentUser.name}</strong>
            <span>@{account.username} · {roleLabel}</span>
          </div>
        </div>
        <div className="topbar-actions">
          {currentUser.role === "parent" && <button className="secondary-button" onClick={() => setActiveView("family")}>家庭管理</button>}
          <button className="secondary-button" onClick={() => setActiveView("account")}>账号管理</button>
          <button className="secondary-button" onClick={signOut}>退出登录</button>
        </div>
      </header>

      {activeView !== "home" && <button className="page-back" onClick={() => setActiveView("home")}>← 返回首页</button>}

      {activeView === "home" && (
        <section className="dashboard-grid">
          <article className="dashboard-card wish-zone" role="link" tabIndex={0} onClick={() => setActiveView("wall")} onKeyDown={(event) => event.target === event.currentTarget && event.key === "Enter" && setActiveView("wall")}>
            <div className="dashboard-card-head">
              <strong>许愿墙</strong>
              {currentUser.role === "child" && <button className="animated-action" onClick={(event) => { event.stopPropagation(); setActiveView("wishes"); }}><span>＋</span>发布愿望</button>}
            </div>
            <div className="dashboard-live-preview">
              {activeWishes.length === 0 ? <p className="preview-empty">暂时没有未完成愿望</p> : (
                <div className="preview-track">{[...activeWishes, ...activeWishes].slice(0, 8).map((wish, index) => (
                  <div className="preview-item" key={`${wish.id}-${index}`}><span>✦</span><div><strong>{wish.title}</strong><small>{memberById.get(wish.childId)?.name} · {wish.status}</small><small className="preview-time">提交：{formatSubmittedAt(wish.submittedAt)}</small></div></div>
                ))}</div>
              )}
            </div>
            <h2>收集一家人的小小期待</h2>
            <p>{activeWishes.length} 个愿望正在成长，{archivedWishes.length} 个愿望已经兑现。</p>
          </article>

          <article className="dashboard-card task-zone" role="link" tabIndex={0} onClick={() => setActiveView(currentUser.role === "parent" ? "tasks" : "myTasks")} onKeyDown={(event) => event.target === event.currentTarget && event.key === "Enter" && setActiveView(currentUser.role === "parent" ? "tasks" : "myTasks")}>
            <div className="dashboard-card-head">
              <strong>任务公示</strong>
              <button className="animated-action" onClick={(event) => { event.stopPropagation(); setActiveView(currentUser.role === "parent" ? "tasks" : "myTasks"); }}><span>＋</span>{currentUser.role === "parent" ? "发布任务" : "申报任务"}</button>
            </div>
            <div className="dashboard-live-preview">
              {boardTasks.length === 0 ? <p className="preview-empty">暂时没有进行中的任务</p> : (
                <div className="preview-track">{[...boardTasks, ...boardTasks].slice(0, 8).map((task, index) => (
                  <div className="preview-item" key={`${task.id}-${index}`}><span>✓</span><div><strong>{task.title}</strong><small>{task.status} · {task.type}</small><small className="preview-time">提交：{formatSubmittedAt(task.submittedAt)}</small></div></div>
                ))}</div>
              )}
            </div>
            <h2>把努力变成看得见的进步</h2>
            <p>{boardTasks.length} 个任务进行中，{archivedTasks.length} 个任务已经完成。</p>
          </article>

          <article className="dashboard-card points-zone" role="link" tabIndex={0} onClick={() => setActiveView("points")} onKeyDown={(event) => event.target === event.currentTarget && event.key === "Enter" && setActiveView("points")}>
            <div className="dashboard-card-head"><strong>积分区</strong></div>
            {currentUser.role === "parent" ? (
              <div className="parent-points-preview">
                <p>孩子积分排行</p>
                <div className="ranking-list">{childPointRows.map((row, index) => {
                  const adoptedPets = petAdoptions.filter((adoption) => adoption.memberId === row.child.id);
                  return <div className="ranking-row" key={row.child.id}>
                    <b>{index + 1}</b>
                    <div><strong>{row.child.name}</strong><small>{row.balance} 成长星</small></div>
                    <small>{adoptedPets.length > 0 ? `${adoptedPets.length} 只宠物` : "未领养"}</small>
                  </div>;
                })}</div>
                <HomePetShowcase adoptions={petAdoptions} memberById={memberById} onSelect={(adoption) => openPet(adoption.id)} />
              </div>
            ) : (
              <div className="child-points-preview">
                <button className="point-balance" type="button" onClick={(event) => { event.stopPropagation(); setActiveView("points"); }}><small>当前积分</small><strong>{currentChildPoints?.balance ?? 0}</strong><span>成长星 · 查看详情</span></button>
                <div className="recent-point-change"><span>最近变化</span><b>{currentPointTransactions[0] ? `${currentPointTransactions[0].description} ${currentPointTransactions[0].amount > 0 ? "+" : ""}${currentPointTransactions[0].amount}` : "暂无记录"}</b></div>
                <HomePetShowcase adoptions={myPetAdoptions} memberById={memberById} onSelect={(adoption) => openPet(adoption.id)} />
              </div>
            )}
            {economyMessage && <small className="economy-warning">{economyMessage}</small>}
          </article>
        </section>
      )}

      {activeView === "wall" && (
        <section className="workspace wall-grid">
          <section>
            <div className="section-heading">
              <p>愿望进展</p>
              <strong>{activeWishes.length} 个愿望</strong>
            </div>
            <div className="card-list">
              {activeWishes.map((wish) => (
                <article className="wish-card" data-testid={`wish-card-${wish.id}`} key={wish.id}>
                  <div className="card-title-row">
                    <h2>{wish.title}</h2>
                    <StatusBadge label={wish.status} />
                  </div>
                  <p>
                    {memberById.get(wish.childId)?.name} · {wish.type} · 期望 {wish.fulfiller} 兑现
                  </p>
                  {wish.type === "积分奖励" && <small>积分数量：{wish.rewardPoints ?? 0}</small>}
                  <small className="submitted-time">提交时间：{formatSubmittedAt(wish.submittedAt)}</small>
                  {wish.description && <p className="detail-text">{wish.description}</p>}
                  {wish.expectedDate && <small>期望时间：{wish.expectedDate}</small>}
                  <ProgressRail status={wish.status} />
                  <small>{linkedTaskText(tasks, wish.id)}</small>
                  {currentUser.role === "parent" && wish.status === "兑现中" && (
                    <div className="card-actions">
                      <button className="primary-button" onClick={() => archiveWish(wish.id)}>确认已兑现</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="section-heading">
              <p>任务看板</p>
              <strong>{boardTasks.length} 个任务</strong>
            </div>
            <div className="card-list">
              {boardTasks.map((task) => (
                <article className="task-card" data-testid={`task-card-${task.id}`} key={task.id}>
                  <div className="card-title-row">
                    <h2>{task.title}</h2>
                    <StatusBadge label={task.status} />
                  </div>
                  <p>{task.type} · 奖励：{getRewardType(task)}</p>
                  <p className="detail-text">{getRewardDescription(task)}</p>
                  {(task.rewardPoints ?? 0) > 0 && <small>成长星奖励：{task.rewardPoints}</small>}
                  <small className="submitted-time">提交时间：{formatSubmittedAt(task.submittedAt)}</small>
                  <CheckInProgress task={task} />
                  <small>
                    {task.assigneeId ? `申领人：${memberById.get(task.assigneeId)?.name}` : "等待孩子申领"}
                    {task.submitted ? " · 待父母审核" : ""}
                  </small>
                  {currentUser.role === "child" && task.status === "待申领" && (
                    <div className="card-actions">
                      <button className="primary-button" onClick={() => claimTask(task.id)}>
                        申领任务
                      </button>
                    </div>
                  )}
                  {currentUser.role === "parent" && (
                    <div className="card-actions">
                      <button className="secondary-button" onClick={() => copyTask(task.id)}>复制同样任务</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {activeView === "wishes" && currentUser.role === "child" && (
        <section className="workspace two-column">
          <form className="panel form-panel" key={editingWish?.id ?? "new-wish"} onSubmit={saveWish}>
            <h2>{editingWish ? "编辑愿望" : "提交愿望"}</h2>
            <label>
              愿望名称
              <input name="title" defaultValue={editingWish?.title} placeholder="例如：周末去露营" required />
            </label>
            <label>
              愿望描述
              <textarea
                name="description"
                defaultValue={editingWish?.description}
                placeholder="写清楚你希望怎么实现这个愿望"
                rows={4}
              />
            </label>
            <label>
              愿望类型
              <select name="type" value={wishFormType} onChange={(event) => setWishFormType(event.target.value as WishType)}>
                <option>物质奖励</option>
                <option>旅游奖励</option>
                <option>陪玩奖励</option>
                <option>积分奖励</option>
                <option>其他愿望</option>
              </select>
            </label>
            {wishFormType === "积分奖励" && <label>成长星数量<input name="wishRewardPoints" type="number" min="1" max="100" step="1" defaultValue={editingWish?.rewardPoints ?? 50} required /><small>孩子申请的积分奖励最高为 100 成长星。</small></label>}
            <label>
              希望谁兑现
              <select name="fulfiller" defaultValue={editingWish?.fulfiller ?? "爸爸"}>
                <option>爸爸</option>
                <option>妈妈</option>
              </select>
            </label>
            <label>
              期望时间
              <input name="expectedDate" type="date" defaultValue={editingWish?.expectedDate ?? ""} />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                {editingWish ? "保存愿望" : "发布愿望"}
              </button>
              {editingWish && (
                <button className="secondary-button" type="button" onClick={() => setEditingWishId(null)}>
                  取消
                </button>
              )}
            </div>
            {wishFormMessage && <p className="form-message">{wishFormMessage}</p>}
          </form>

          <section>
            <div className="section-heading">
              <p>我的愿望</p>
              <strong>{activeWishes.length} 个</strong>
            </div>
            <div className="card-list">
              {activeWishes.map((wish) => (
                <article className="wish-card" data-testid={`wish-card-${wish.id}`} key={wish.id}>
                  <div className="card-title-row">
                    <h2>{wish.title}</h2>
                    <StatusBadge label={wish.status} />
                  </div>
                  <p>{wish.type} · 期望 {wish.fulfiller} 兑现</p>
                  {wish.type === "积分奖励" && <small>积分数量：{wish.rewardPoints ?? 0}</small>}
                  <small className="submitted-time">提交时间：{formatSubmittedAt(wish.submittedAt)}</small>
                  {wish.description && <p className="detail-text">{wish.description}</p>}
                  {wish.expectedDate && <small>期望时间：{wish.expectedDate}</small>}
                  <div className="card-actions">
                    <button className="secondary-button" data-testid={`edit-wish-${wish.id}`} onClick={() => { setEditingWishId(wish.id); setWishFormType(wish.type); setWishFormMessage(""); }}>
                      编辑
                    </button>
                    <button className="danger-button" data-testid={`delete-wish-${wish.id}`} onClick={() => deleteWish(wish.id)}>
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {archivedWishes.length > 0 && (
              <details className="archive-panel">
                <summary>历史愿望 · {archivedWishes.length} 个</summary>
                <div className="card-list">
                  {archivedWishes.map((wish) => (
                    <article className="wish-card archived-card" key={wish.id}>
                      <div className="card-title-row"><h2>{wish.title}</h2><StatusBadge label={wish.status} /></div>
                      <p>{wish.type} · 已由{wish.fulfiller}兑现</p>
                      {wish.description && <p className="detail-text">{wish.description}</p>}
                    </article>
                  ))}
                </div>
              </details>
            )}
          </section>

        </section>
      )}

      {activeView === "myTasks" && currentUser.role === "child" && (
        <section className="workspace two-column">
          <form className="panel form-panel full-span" onSubmit={proposeTask}>
            <div className="section-heading"><p>申报新任务</p><strong>提交后等待父母审批</strong></div>
            <label>任务名称<input name="proposalTitle" placeholder="例如：主动整理一周书包" required /></label>
            <label>任务类型
              <select name="proposalType" value={proposalTaskType} onChange={(event) => setProposalTaskType(event.target.value as TaskType)}><option>打卡任务</option><option>一次性任务</option><option>承诺任务</option></select>
            </label>
            {proposalTaskType === "打卡任务" && (
              <>
                <fieldset className="checkin-settings"><legend>打卡频率</legend><div className="weekday-grid">
                  {weekdays.map((weekday) => <label key={weekday}><input name="proposalCheckInDays" type="checkbox" value={weekday} /><span>{weekday}</span></label>)}
                </div></fieldset>
                <label>截止时间<input name="proposalDeadline" type="date" required /></label>
              </>
            )}
            <label>奖励类型
              <select name="proposalRewardType" value={proposalRewardType} onChange={(event) => setProposalRewardType(event.target.value as WishType)}>
                <option>物质奖励</option><option>旅游奖励</option><option>陪玩奖励</option><option>积分奖励</option><option>其他愿望</option>
              </select>
            </label>
            <label>申报说明<textarea name="proposalDescription" placeholder="说明希望完成什么、为什么申报" rows={3} required /></label>
            {proposalRewardType === "积分奖励"
              ? <label>建议成长星<input name="suggestedPoints" type="number" min="1" max="100" step="1" defaultValue="50" required /><small>孩子申报任务最高申请 100 成长星。</small></label>
              : <label>建议奖励说明<textarea name="proposalRewardDescription" placeholder="说明希望获得的奖励" rows={2} required /></label>}
            <div className="form-actions"><button className="primary-button" type="submit">提交父母审批</button></div>
            {proposalFormMessage && <p className="form-message">{proposalFormMessage}</p>}
            {myProposals.length > 0 && <small>当前有 {myProposals.length} 个申报任务等待审批。</small>}
          </form>

          <section>
            <div className="section-heading">
              <p>我的任务</p>
              <strong>{myTasks.length} 个</strong>
            </div>
            <div className="task-table">
              {myTasks.length === 0 && <p className="empty-state">还没有申领任务，可以到许愿墙上申领。</p>}
              {myTasks.map((task) => (
                <TaskProgressRow
                  key={task.id}
                  task={task}
                  currentUserId={currentUser.id}
                  onCheckIn={checkInTask}
                  onSubmit={submitTask}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="section-heading">
              <p>可申领任务</p>
              <strong>{claimableTasks.length} 个</strong>
            </div>
            <div className="task-table">
              {claimableTasks.length === 0 && <p className="empty-state">暂无可申领任务。</p>}
              {claimableTasks.map((task) => (
                <div className="task-row" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.type} · {getRewardType(task)}</span>
                    <p className="detail-text">{getRewardDescription(task)}</p>
                    <CheckInProgress task={task} />
                  </div>
                  <StatusBadge label={task.status} />
                  <button onClick={() => claimTask(task.id)}>申领</button>
                </div>
              ))}
            </div>
          </section>
        </section>
      )}

      {activeView === "tasks" && currentUser.role === "parent" && (
        <section className="workspace two-column">
          {proposalTasks.length > 0 && (
            <section className="panel full-span proposal-review">
              <div className="section-heading"><p>孩子申报审批</p><strong>{proposalTasks.length} 个待审批</strong></div>
              <div className="card-list">
                {proposalTasks.map((task) => (
                  <article className="task-card" key={task.id}>
                    <div className="card-title-row"><h2>{task.title}</h2><span className="status status-待申领">待审批</span></div>
                    <p>{memberById.get(task.proposerId ?? task.creatorId)?.name} · {task.type} · {getRewardType(task)}</p>
                    <p>{getRewardDescription(task)}</p>
                    <small className="submitted-time">提交时间：{formatSubmittedAt(task.submittedAt)}</small>
                    <p className="detail-text">{task.proposalDescription}</p>
                    <div className="card-actions">
                      <button className="primary-button" onClick={() => approveTaskProposal(task.id)}>审批通过并公示</button>
                      <button className="danger-button" onClick={() => deleteTask(task.id)}>删除申报</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <form className="panel form-panel" key={editingTask?.id ?? "new-task"} onSubmit={saveTask}>
            <h2>{editingTask ? "编辑任务" : "发布任务"}</h2>
            <label>
              任务名称
              <input name="title" defaultValue={editingTask?.title} placeholder="例如：连续 7 天早睡" required />
            </label>
            <label>
              任务类型
              <select name="type" value={taskFormType} onChange={(event) => setTaskFormType(event.target.value as TaskType)}>
                <option>打卡任务</option>
                <option>一次性任务</option>
                <option>承诺任务</option>
              </select>
            </label>
            {taskFormType === "打卡任务" && (
              <>
                <fieldset className="checkin-settings">
                  <legend>打卡频率</legend>
                  <div className="weekday-grid">
                    {weekdays.map((weekday) => (
                      <label key={weekday}>
                        <input
                          name="checkInDays"
                          type="checkbox"
                          value={weekday}
                          defaultChecked={(editingTask?.checkInDays ?? weekdays).includes(weekday)}
                        />
                        <span>{weekday}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label>
                  截止时间
                  <input name="deadline" type="date" defaultValue={editingTask?.deadline ?? "2026-06-30"} />
                </label>
              </>
            )}
            <label>
              奖励类型
              <select name="rewardType" value={taskRewardType} onChange={(event) => setTaskRewardType(event.target.value as WishType)}>
                <option>物质奖励</option>
                <option>旅游奖励</option>
                <option>陪玩奖励</option>
                <option>积分奖励</option>
                <option>其他愿望</option>
              </select>
            </label>
            <label key={taskRewardType}>{taskRewardType === "积分奖励" ? "成长星数量" : "额外成长星（可选）"}<input name="taskRewardPoints" type="number" min={taskRewardType === "积分奖励" ? "1" : "0"} step="1" defaultValue={editingTask?.rewardPoints ?? (taskRewardType === "积分奖励" ? 50 : 0)} required={taskRewardType === "积分奖励"} /><small>{taskRewardType === "积分奖励" ? "任务完成审核后发放成长星。" : "可与当前非积分奖励组合发放；填写 0 表示不额外奖励。"}</small></label>
            <label>
              奖励描述
              <textarea
                name="rewardDescription"
                defaultValue={editingTask?.rewardDescription ?? editingTask?.reward}
                placeholder="例如：周末一起看电影，或者兑现某个具体愿望"
                rows={4}
                required
              />
            </label>
            <label>
              关联愿望
              <select name="linkedWishId" defaultValue={editingTask?.linkedWishId ?? ""}>
                <option value="">不关联愿望</option>
                {wishes.map((wish) => (
                  <option key={wish.id} value={wish.id}>
                    {memberById.get(wish.childId)?.name} · {wish.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                {editingTask ? "保存任务" : "发布任务"}
              </button>
              {editingTask && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditingTaskId(null);
                    setTaskFormType("打卡任务");
                  }}
                >
                  取消
                </button>
              )}
            </div>
            {taskFormMessage && <p className="form-message">{taskFormMessage}</p>}
          </form>

          <section>
            <div className="section-heading">
              <p>任务审核</p>
              <strong>{activeTasks.filter((task) => task.submitted).length} 个待审核</strong>
            </div>
            <div className="card-list">
              {activeTasks.map((task) => (
                <article className="task-card" data-testid={`task-card-${task.id}`} key={task.id}>
                  <div className="card-title-row">
                    <h2>{task.title}</h2>
                    <StatusBadge label={task.status} />
                  </div>
                  <p>{task.type} · 奖励：{getRewardType(task)}</p>
                  <p className="detail-text">{getRewardDescription(task)}</p>
                  {(task.rewardPoints ?? 0) > 0 && <small>成长星奖励：{task.rewardPoints}</small>}
                  <small className="submitted-time">提交时间：{formatSubmittedAt(task.submittedAt)}</small>
                  <CheckInProgress task={task} />
                  {task.linkedWishId && <small>关联愿望：{wishById.get(task.linkedWishId)?.title}</small>}
                  <div className="card-actions">
                    {task.submitted && (
                      <button className="primary-button" onClick={() => approveTask(task.id)}>
                        审核通过
                      </button>
                    )}
                    <button
                      className="secondary-button"
                      data-testid={`edit-task-${task.id}`}
                      onClick={() => {
                        setEditingTaskId(task.id);
                        setTaskFormType(task.type);
                        setTaskRewardType(task.rewardType ?? "其他愿望");
                        setTaskFormMessage("");
                      }}
                    >
                      编辑
                    </button>
                    <button className="danger-button" data-testid={`delete-task-${task.id}`} onClick={() => deleteTask(task.id)}>
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {archivedTasks.length > 0 && (
              <details className="archive-panel">
                <summary>历史任务 · {archivedTasks.length} 个</summary>
                <div className="card-list">
                  {archivedTasks.map((task) => (
                    <article className="task-card archived-card" key={task.id}>
                      <div className="card-title-row"><h2>{task.title}</h2><StatusBadge label={task.status} /></div>
                      <p>{task.type} · 奖励：{getRewardType(task)}</p>
                      <p className="detail-text">{getRewardDescription(task)}</p>
                      <small className="submitted-time">任务提交时间：{formatSubmittedAt(task.submittedAt)}</small>
                      <small className="submitted-time">完成时间：{formatSubmittedAt(task.completedAt)}</small>
                    </article>
                  ))}
                </div>
              </details>
            )}
          </section>
        </section>
      )}

      {activeView === "points" && (
        <section className="points-page workspace">
          {currentUser.role === "parent" ? (
            <>
              <section className="points-hero panel">
                <div><p className="eyebrow">家庭成长积分</p><h2>孩子积分排行</h2><p>父母可以查看积分与宠物状态，但不能领取电子宠物。</p></div>
                <div className="points-summary"><span><small>孩子人数</small><strong>{children.length}</strong></span><span><small>已领养宠物</small><strong>{petAdoptions.length}</strong></span></div>
              </section>
              <section>
                <div className="section-heading"><p>孩子积分排行</p><strong>真实余额</strong></div>
                <div className="family-point-ranking">{childPointRows.map((row, index) => <article key={row.child.id}><b>{index + 1}</b><div><h2>{row.child.name}</h2><small>{petAdoptions.filter((item) => item.memberId === row.child.id).length} 只宠物</small></div><strong>{row.balance} 成长星</strong></article>)}</div>
              </section>
              <section>
                <div className="section-heading"><p>家庭宠物陈列</p><strong>自动滚动展示</strong></div>
                <HomePetShowcase adoptions={petAdoptions} memberById={memberById} onSelect={(adoption) => openPet(adoption.id)} />
              </section>
              <section className="reward-admin-grid">
                <form className="panel form-panel" key={editingRewardItem?.id ?? "new-reward"} onSubmit={saveRewardItem}>
                  <h2>{editingRewardItem ? "编辑兑换奖品" : "上架兑换奖品"}</h2>
                  <label>奖品类型<select name="rewardItemType" value={rewardItemType} onChange={(event) => setRewardItemType(event.target.value as RewardItem["itemType"])}><option value="physical">实物奖品</option><option value="virtual">虚拟奖品</option></select></label>
                  <label>奖品名称<input name="rewardName" defaultValue={editingRewardItem?.name} placeholder="例如：周末电影券" required /></label>
                  <label>奖品说明<textarea name="rewardDescription" defaultValue={editingRewardItem?.description} placeholder="说明兑换内容和使用方式" required /></label>
                  <label>兑换价格<input name="rewardCost" type="number" min="1" step="1" defaultValue={editingRewardItem?.cost ?? 100} required /></label>
                  {rewardItemType === "physical" && <label>库存数量<input name="rewardStock" type="number" min="0" step="1" defaultValue={editingRewardItem?.stock ?? 1} required /></label>}
                  <label>封面图标<select name="rewardIcon" defaultValue={editingRewardItem?.icon ?? "🎁"}><option>🎁</option><option>🎬</option><option>🧺</option><option>📚</option><option>🧸</option><option>🎮</option><option>👕</option><option>🏠</option></select></label>
                  <div className="form-actions"><button className="primary-button" type="submit">{editingRewardItem ? "保存奖品" : "保存并上架"}</button>{editingRewardItem && <button className="secondary-button" type="button" onClick={() => { setEditingRewardItemId(null); setRewardItemType("physical"); }}>取消编辑</button>}</div>
                </form>
                <section>
                  <div className="section-heading"><p>已配置奖品</p><strong>{rewardItems.length} 个</strong></div>
                  <div className="reward-admin-list">{rewardItems.length === 0 ? <p className="empty-state">还没有上架奖品。</p> : rewardItems.map((item) => <article key={item.id}><span>{item.icon}</span><div><h3>{item.name}</h3><small>{item.itemType === "physical" ? `实物 · 库存 ${item.stock ?? 0}` : "虚拟奖品"} · {item.cost} 成长星</small><p>{item.description}</p></div><div className="reward-admin-actions"><button className="secondary-button" type="button" onClick={() => { setEditingRewardItemId(item.id); setRewardItemType(item.itemType); }}>编辑</button><button className={item.isActive ? "danger-button" : "primary-button"} type="button" onClick={() => toggleRewardItem(item)}>{item.isActive ? "下架" : "重新上架"}</button></div></article>)}</div>
                </section>
              </section>
            </>
          ) : (
            <>
              <section className="points-hero panel">
                <div><p className="eyebrow">我的成长积分</p><h2>{currentChildPoints?.balance ?? 0} 成长星</h2><p>成长星账户、积分变化和兑换记录均保存到 Supabase 数据库。</p></div>
                <div className="points-summary"><span><small>本月累计</small><strong>+{currentMonthGain}</strong></span><span><small>本月消耗</small><strong>-{currentMonthCost}</strong></span><span><small>我的宠物</small><strong>{myPetAdoptions.length}/2</strong></span></div>
              </section>
              <section>
                <div className="section-heading"><p>积分累积</p><strong>成长星收入</strong></div>
                <div className="point-ledger">{currentPointTransactions.filter((item) => item.amount > 0).length === 0 ? <p className="empty-state">暂时没有积分收入。</p> : currentPointTransactions.filter((item) => item.amount > 0).map((item) => <span key={item.id}><strong>{item.description}</strong><small>{formatSubmittedAt(item.createdAt)}</small><b>+{item.amount}</b></span>)}</div>
              </section>
              <section>
                <div className="section-heading"><p>积分变化</p><strong>数据库流水</strong></div>
                <div className="point-ledger">{currentPointTransactions.length === 0 ? <p className="empty-state">暂时没有积分流水。</p> : currentPointTransactions.map((item) => <span key={item.id}><strong>{item.description}</strong><small>{formatSubmittedAt(item.createdAt)} · 余额 {item.balanceAfter}</small><b className={item.amount < 0 ? "point-cost" : ""}>{item.amount > 0 ? "+" : ""}{item.amount}</b></span>)}</div>
              </section>
              <section className="redemption-section">
                <div className="section-heading"><p>积分兑换</p><strong>宠物 + 实物 + 虚拟物品</strong></div>
                <h3>宠物领养</h3>
                <p className="redemption-rule">第一只免费，第二只需要 500 成长星；每个孩子最多领养 2 只。</p>
                <div className="pet-library">{petOptions.map((pet) => {
                  const adopted = myPetAdoptions.some((item) => item.petId === pet.id);
                  const limitReached = myPetAdoptions.length >= 2;
                  const cost = myPetAdoptions.length === 0 ? 0 : 500;
                  return <article className="pet-option" key={pet.id}>
                    <PetStatusCard petId={pet.id} adoption={myPetAdoptions.find((item) => item.petId === pet.id)} />
                    <button className={adopted ? "secondary-button" : "primary-button"} type="button" disabled={adopted || limitReached || (currentChildPoints?.balance ?? 0) < cost} onClick={() => claimPet(pet.id)}>{adopted ? "已领取" : limitReached ? "已达上限" : cost === 0 ? "免费领养" : `使用 ${cost} 成长星领养`}</button>
                  </article>;
                })}</div>
                <h3>实物兑换</h3>
                <div className="reward-grid">{rewardItems.filter((item) => item.itemType === "physical").length === 0 ? <p className="empty-state">父母还没有上架实物奖品。</p> : rewardItems.filter((item) => item.itemType === "physical").map((item) => <RedeemCard key={item.id} icon={item.icon} type="实物奖品" title={item.name} description={item.description} cost={item.cost} stock={item.stock} balance={currentChildPoints?.balance ?? 0} onRedeem={() => redeemPointItem(item.id)} />)}</div>
                <h3>虚拟兑换</h3>
                <div className="reward-grid">{rewardItems.filter((item) => item.itemType === "virtual").length === 0 ? <p className="empty-state">父母还没有上架虚拟奖品。</p> : rewardItems.filter((item) => item.itemType === "virtual").map((item) => <RedeemCard key={item.id} icon={item.icon} type="虚拟奖品" title={item.name} description={item.description} cost={item.cost} balance={currentChildPoints?.balance ?? 0} onRedeem={() => redeemPointItem(item.id)} />)}</div>
                {petMessage && <p className="auth-message">{petMessage}</p>}
              </section>
            </>
          )}
          {economyMessage && <p className="auth-message">{economyMessage}</p>}
        </section>
      )}

      {activeView === "pet" && (
        <section className="pet-page workspace">
          {!activePetAdoption ? <p className="empty-state">没有找到这只电子宠物，它可能已经被弃养。</p> : (() => {
            const pet = petOptions.find((item) => item.id === activePetAdoption.petId);
            if (!pet) return <p className="empty-state">宠物配置不存在。</p>;
            const owner = memberById.get(activePetAdoption.memberId);
            const profile = getPetDailyProfile(activePetAdoption);
            const recentInteractions = petInteractions.filter((item) => item.adoptionId === activePetAdoption.id).slice(0, 6);
            return <>
              <section className={`pet-interaction-layout panel ${currentUser.role === "parent" ? "parent-view" : ""}`}>
                {currentUser.role === "child" && <aside className="pet-control-column">
                  <div className="section-heading"><p>陪伴互动</p><strong>自动保存</strong></div>
                  <div className="pet-action-menu">
                    <button type="button" onClick={() => interactPet("feed")}><span>🥣</span><strong>喂养</strong><small>增加饱食和精力</small></button>
                    <button type="button" onClick={() => interactPet("play")}><span>🧶</span><strong>玩耍</strong><small>增加快乐，消耗精力</small></button>
                  </div>
                </aside>}
                <div className="pet-room-center">
                  <div className="pet-room-status">
                    <div><small>宠物伙伴</small><h2>{pet.name}</h2><p>{owner?.name ?? "孩子"} · 已领养 {profile.days} 天 · 成长值 {profile.growth}</p></div>
                    <div className="pet-stat-chips"><span>心情 {activePetAdoption.mood}</span><span>饱食 {activePetAdoption.hunger}</span><span>快乐 {activePetAdoption.happiness}</span><span>精力 {activePetAdoption.energy}</span></div>
                  </div>
                  <div className="pet-room-stage">
                    <div className="pet-avatar-shell">
                      <AnimatedPetImage petId={pet.id} command={petMotionCommand} />
                      <PetOutfit petId={pet.id} outfitId={activePetAdoption.outfitId} />
                      {currentUser.role === "child" && (["head", "body", "paw"] as const).map((zone) => {
                        const hit = pet.hitZones[zone];
                        const action = zone === "head" ? "pet_head" : zone === "body" ? "pet_body" : "pet_paw";
                        const label = zone === "head" ? "摸摸头" : zone === "body" ? "轻抚身体" : "碰碰爪子";
                        return <button key={zone} className={`pet-hit-zone hit-${zone}`} style={{ left: `${hit.left}%`, top: `${hit.top}%`, width: `${hit.width}%`, height: `${hit.height}%` }} type="button" aria-label={label} title={label} onClick={() => interactPet(action)} />;
                      })}
                    </div>
                    <blockquote>{activePetAdoption.dailyThought}</blockquote>
                  </div>
                </div>
                {currentUser.role === "child" && <aside className="pet-outfit-column">
                  <div className="section-heading"><p>宠物装扮</p><strong>选择即保存</strong></div>
                  <div className="outfit-picker">
                    {[{ id: "classic", label: "经典原装" }, { id: "star_hat", label: "星星帽" }, { id: "bow", label: "梦幻蝴蝶结" }, { id: "hoodie", label: "紫色连帽衫" }].map((outfit) => <button className={activePetAdoption.outfitId === outfit.id ? "selected" : ""} type="button" key={outfit.id} onClick={() => interactPet("dress", outfit.id)}>{outfit.label}</button>)}
                  </div>
                  <div className="pet-danger-zone"><div><strong>弃养宠物</strong><small>将扣除 2000 成长星</small></div><button className="danger-button" type="button" onClick={abandonPet}>确认弃养</button></div>
                </aside>}
              </section>

              <section>
                <div className="section-heading"><p>最近互动</p><strong>{recentInteractions.length} 条</strong></div>
                <div className="pet-interaction-list">{recentInteractions.length === 0 ? <p className="empty-state">还没有互动记录。</p> : recentInteractions.map((item) => <span key={item.id}><strong>{{ feed: "完成喂养", play: "一起玩耍", dress: "更换装扮", pet_head: "摸摸头", pet_body: "轻抚身体", pet_paw: "碰碰爪子" }[item.action]}</strong><small>{item.detail || "日常陪伴"} · {formatSubmittedAt(item.createdAt)}</small></span>)}</div>
              </section>
              {petMessage && <p className="auth-message">{petMessage}</p>}
            </>;
          })()}
        </section>
      )}

      {activeView === "account" && (
        <section className="account-page workspace two-column">
          <section className="panel profile-preview">
            <div className="avatar-logo avatar-large" aria-hidden="true"><img src={avatar.image} alt="" /></div>
            <h2>{account.display_name || currentUser.name}</h2>
            <p>@{account.username}</p>
            <span className="status status-兑换中">{roleLabel}</span>
            <small>头像编号：{avatar.id}</small>
          </section>
          <form className="panel form-panel" key={account.updated_at ?? account.id} onSubmit={saveAccount}>
            <h2>账号管理</h2>
            <label>账号昵称<input name="displayName" defaultValue={account.display_name ?? ""} required /></label>
            <label>动画头像
              <select name="avatarId" defaultValue={account.avatar_id ?? defaultAvatarId}>
                {avatarOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label>修改密码
              <span className="password-field">
                <input name="newPassword" type={showNewPassword ? "text" : "password"} placeholder="新密码，可不填" />
                <button type="button" aria-label={showNewPassword ? "隐藏新密码" : "显示新密码"} onClick={() => setShowNewPassword((current) => !current)}><EyeIcon open={showNewPassword} /></button>
              </span>
            </label>
            <label>确认新密码
              <span className="password-field">
                <input name="newPasswordConfirm" type={showNewPasswordConfirm ? "text" : "password"} placeholder="再次输入新密码" />
                <button type="button" aria-label={showNewPasswordConfirm ? "隐藏确认密码" : "显示确认密码"} onClick={() => setShowNewPasswordConfirm((current) => !current)}><EyeIcon open={showNewPasswordConfirm} /></button>
              </span>
            </label>
            <small>密码至少 8 位，并且必须包含字母和数字。</small>
            <div className="form-actions"><button className="primary-button" type="submit">保存账号资料</button></div>
            {accountMessage && <p className="auth-message">{accountMessage}</p>}
          </form>
        </section>
      )}

      {activeView === "family" && currentUser.role === "parent" && (
        <section className="workspace two-column">
          <form className="panel form-panel" key={editingMember?.id ?? "new-member"} onSubmit={saveMember}>
            <h2>{editingMember ? "编辑家庭成员" : "添加家庭成员账号"}</h2>
            <label>
              成员姓名
              <input name="name" defaultValue={editingMember?.name} placeholder="输入家庭成员昵称" required />
            </label>
            <label>
              角色
              <select
                name="role"
                value={memberFormRole}
                disabled={Boolean(editingMember)}
                onChange={(event) => setMemberFormRole(event.target.value as Role)}
              >
                <option value="child">孩子</option>
                <option value="parent">父母</option>
              </select>
            </label>
            {!editingMember && (
              <>
                <label>
                  登录账号
                  <input name="memberUsername" placeholder={memberFormRole === "parent" ? "例如 amy" : "例如 sophia"} required />
                </label>
                <label>
                  初始密码
                  <span className="password-field">
                    <input
                      name="memberPassword"
                      type={showMemberPassword ? "text" : "password"}
                      placeholder="至少 8 位，包含字母和数字"
                      required
                    />
                    <button type="button" aria-label={showMemberPassword ? "隐藏初始密码" : "显示初始密码"} onClick={() => setShowMemberPassword((current) => !current)}>
                      <EyeIcon open={showMemberPassword} />
                    </button>
                  </span>
                </label>
                <label>
                  确认初始密码
                  <span className="password-field">
                    <input
                      name="memberConfirmPassword"
                      type={showMemberConfirmPassword ? "text" : "password"}
                      placeholder="再次输入初始密码"
                      required
                    />
                    <button
                      type="button"
                      aria-label={showMemberConfirmPassword ? "隐藏确认初始密码" : "显示确认初始密码"}
                      onClick={() => setShowMemberConfirmPassword((current) => !current)}
                    >
                      <EyeIcon open={showMemberConfirmPassword} />
                    </button>
                  </span>
                </label>
              </>
            )}
            {memberFormRole === "parent" && (
              <label>
                父母身份
                <select name="title" defaultValue={editingMember?.title ?? "妈妈"}>
                  <option>爸爸</option>
                  <option>妈妈</option>
                </select>
              </label>
            )}
            {memberFormRole === "child" && (
              <>
                <label>
                  孩子性别
                  <select name="gender" defaultValue={editingMember?.gender ?? "男孩"}>
                    <option>男孩</option>
                    <option>女孩</option>
                  </select>
                </label>
                <label>
                  家庭称呼
                  <select name="childTitle" defaultValue={editingMember?.childTitle ?? "弟弟"}>
                    <option>哥哥</option>
                    <option>弟弟</option>
                    <option>姐姐</option>
                    <option>妹妹</option>
                  </select>
                </label>
              </>
            )}
            <div className="form-actions">
              <button className="primary-button" type="submit">
                {editingMember ? "保存成员资料" : "创建成员账号"}
              </button>
              {editingMember && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditingMemberId(null);
                    setMemberFormRole("child");
                  }}
                >
                  取消
                </button>
              )}
            </div>
          </form>

          <section>
            <div className="section-heading">
              <p>家庭成员</p>
              <strong>{members.length} 人</strong>
            </div>
            <div className="member-grid">
              {members.map((member) => (
                <article className="member-card" data-testid={`member-card-${member.id}`} key={member.id}>
                  <div className="member-avatar"><img src={getMemberAvatar(member).image} alt={`${member.name}头像`} /></div>
                  <strong>{member.name}</strong>
                  <span>
                    {member.role === "parent"
                      ? member.title ?? "父母"
                      : `${member.childTitle ?? "孩子"} · ${member.gender ?? "未设置性别"}`}
                  </span>
                  {member.accountUsername && <small>账号：{member.accountUsername}</small>}
                  <div className="card-actions">
                    <button
                      className="secondary-button"
                      data-testid={`edit-member-${member.id}`}
                      onClick={() => {
                        setEditingMemberId(member.id);
                        setMemberFormRole(member.role);
                      }}
                    >
                      编辑
                    </button>
                    <button className="danger-button" data-testid={`delete-member-${member.id}`} disabled={member.id === currentUser.id} onClick={() => deleteMember(member.id)}>
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}

function StatusBadge({ label }: { label: WishStatus | TaskStatus }) {
  return <span className={`status status-${label}`}>{label}</span>;
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
      {!open && <path className="eye-slash" d="m4 4 16 16" />}
    </svg>
  );
}

function RedeemCard({ icon, type, title, description, cost, stock, balance, onRedeem }: { icon: string; type: string; title: string; description?: string; cost: number; stock?: number; balance: number; onRedeem: () => void }) {
  const unavailable = stock !== undefined && stock <= 0;
  return (
    <article>
      <span>{icon}</span><small>{type}</small><h2>{title}</h2><strong>{cost} 成长星</strong>
      {description && <p>{description}</p>}{stock !== undefined && <small>剩余库存：{stock}</small>}
      <button className="primary-button" type="button" disabled={balance < cost || unavailable} onClick={onRedeem}>{unavailable ? "库存不足" : balance < cost ? "余额不足" : "立即兑换"}</button>
    </article>
  );
}

function AnimatedPetImage({ petId, className = "", command }: { petId: PetId; className?: string; command?: PetMotionCommand }) {
  const pet = petOptions.find((item) => item.id === petId);
  const [motion, setMotion] = useState<PetMotionAction>("idle");

  useEffect(() => {
    if (!pet) return;
    [pet.actionImage, pet.feedImage, pet.playImage].forEach((src) => {
      const preload = new window.Image();
      preload.src = src;
    });
  }, [pet]);

  useEffect(() => {
    if (!pet || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let resetTimer: number | undefined;
    let actionTimer: number | undefined;
    const scheduleAction = () => {
      actionTimer = window.setTimeout(() => {
        setMotion(Math.random() > 0.28 ? "greet" : "play");
        resetTimer = window.setTimeout(() => {
          setMotion("idle");
          scheduleAction();
        }, 1350 + Math.round(Math.random() * 500));
      }, 4500 + Math.round(Math.random() * 6500));
    };
    scheduleAction();
    return () => {
      if (actionTimer) window.clearTimeout(actionTimer);
      if (resetTimer) window.clearTimeout(resetTimer);
    };
  }, [pet]);

  useEffect(() => {
    if (!command) return;
    setMotion(command.action);
    const timer = window.setTimeout(() => setMotion("idle"), command.action === "feed" || command.action === "play" ? 1800 : 1400);
    return () => window.clearTimeout(timer);
  }, [command]);

  if (!pet) return null;
  const imageByMotion: Record<PetMotionAction, string> = { idle: pet.image, greet: pet.actionImage, feed: pet.feedImage, play: pet.playImage };
  const labelByMotion: Record<PetMotionAction, string> = { idle: "", greet: pet.actionLabel, feed: "开心吃饭", play: "开心玩耍" };
  return <img className={`${className} pet-motion-${motion}`} src={imageByMotion[motion]} alt={`${pet.name}${labelByMotion[motion] ? `正在${labelByMotion[motion]}` : ""}`} />;
}

function PetOutfit({ petId, outfitId }: { petId: PetId; outfitId: string }) {
  if (outfitId === "classic") return null;
  const pet = petOptions.find((item) => item.id === petId);
  if (!pet || !(outfitId in pet.outfitAnchors)) return null;
  const anchor = pet.outfitAnchors[outfitId as keyof typeof pet.outfitAnchors];
  const style = { left: `${anchor.left}%`, top: `${anchor.top}%`, width: `${anchor.width}%`, transform: `translate(-50%, -50%) rotate(${anchor.rotate}deg)` };
  return <div className={`pet-outfit fitted-${outfitId}`} style={style} aria-hidden="true">
    {outfitId === "star_hat" && <svg viewBox="0 0 120 80"><path d="M22 61c8-33 24-49 38-49s30 16 38 49" fill="#8f65e8"/><ellipse cx="60" cy="61" rx="51" ry="12" fill="#7150c8"/><path d="m60 22 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#ffd874"/></svg>}
    {outfitId === "bow" && <svg viewBox="0 0 120 70"><path d="M55 35C37 7 8 8 13 34c4 22 30 17 42 5Z" fill="#c58af1"/><path d="M65 35C83 7 112 8 107 34c-4 22-30 17-42 5Z" fill="#a86fe2"/><circle cx="60" cy="36" r="13" fill="#f3b2d8"/><circle cx="57" cy="32" r="4" fill="#fff" opacity=".7"/></svg>}
    {outfitId === "hoodie" && <svg viewBox="0 0 140 120"><path d="M35 25c8-12 21-19 35-19s27 7 35 19l14 72c-25 16-73 16-98 0Z" fill="#9a71e5" opacity=".94"/><path d="M45 24c10 16 40 16 50 0" fill="none" stroke="#efe5ff" strokeWidth="8" strokeLinecap="round"/><path d="M68 34v45" stroke="#f8f3ff" strokeWidth="4"/><circle cx="68" cy="83" r="8" fill="#ffd777"/></svg>}
  </div>;
}

function HomePetShowcase({
  adoptions,
  memberById,
  onSelect
}: {
  adoptions: PetAdoption[];
  memberById: Map<string, Member>;
  onSelect: (adoption: PetAdoption) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
    if (adoptions.length <= 1) return;
    const timer = window.setInterval(() => setCurrentIndex((current) => (current + 1) % adoptions.length), 7000);
    return () => window.clearInterval(timer);
  }, [adoptions.length]);

  if (adoptions.length === 0) {
    return <div className="home-pet-showcase home-pet-empty"><span>✦</span><strong>等待你的第一位宠物伙伴</strong><small>点击进入积分区，从 2 只狗狗和 2 只猫咪中领取。</small></div>;
  }

  const adoption = adoptions[Math.min(currentIndex, adoptions.length - 1)];
  const pet = petOptions.find((item) => item.id === adoption.petId);
  if (!pet) return null;
  const profile = getPetDailyProfile(adoption);
  const owner = memberById.get(adoption.memberId);

  return (
    <div className="home-pet-showcase">
      <button className="home-pet-display" type="button" onClick={(event) => { event.stopPropagation(); onSelect(adoption); }}>
        <div className="home-pet-figure"><span>{owner ? `${owner.name}的伙伴` : "今日陪伴"}</span><AnimatedPetImage petId={pet.id} /></div>
        <div className="home-pet-details">
          <small>{pet.species} · 已领养 {profile.days} 天</small>
          <h3>{pet.name}</h3>
          <dl><div><dt>成长值</dt><dd>{profile.growth}</dd></div><div><dt>心情</dt><dd>{profile.mood}</dd></div></dl>
          <blockquote>{profile.thought}</blockquote>
          <em>点击进入互动页</em>
        </div>
      </button>
      {adoptions.length > 1 && <div className="pet-carousel-status">{currentIndex + 1} / {adoptions.length}</div>}
    </div>
  );
}

function PetStatusCard({ petId, adoption, compact = false }: { petId: PetId; adoption?: PetAdoption; compact?: boolean }) {
  const pet = petOptions.find((item) => item.id === petId);
  if (!pet) return null;
  const profile = adoption ? getPetDailyProfile(adoption) : null;

  return (
    <div className={`pet-status-card${compact ? " pet-status-compact" : ""}`}>
      <div className="pet-image"><AnimatedPetImage petId={pet.id} /></div>
      <div className="pet-copy">
        <small>{pet.species} · {pet.personality}</small>
        <h3>{pet.name}</h3>
        <div className="pet-vitals"><span>心情 {profile?.mood ?? pet.mood}</span><span>{profile ? `成长值 ${profile.growth}` : `活力 ${pet.energy}%`}</span></div>
        {profile && <small className="pet-adopted-time">领养于 {profile.adoptedDate} · 第 {profile.days} 天</small>}
      </div>
    </div>
  );
}

function ProgressRail({ status }: { status: WishStatus }) {
  const steps: WishStatus[] = ["待申领", "兑换中", "兑现中", "已兑换"];
  const current = steps.indexOf(status);
  return (
    <div className="progress-rail" aria-label={`愿望状态：${status}`}>
      {steps.map((step, index) => (
        <span className={index <= current ? "done" : ""} key={step} />
      ))}
    </div>
  );
}

function CheckInProgress({ task }: { task: Task }) {
  if (task.type !== "打卡任务") return null;
  const { completed, required } = getCheckInProgress(task);
  const percent = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;

  return (
    <div className="checkin-progress">
      <div className="checkin-progress-text">
        <span>打卡进度 {completed}/{required}</span>
        <span>{task.deadline ? `截止 ${task.deadline}` : "未设置截止时间"}</span>
      </div>
      <div className="checkin-bar" aria-label={`打卡进度 ${completed}/${required}`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <small>频率：{task.checkInDays?.join("、") || "未设置"}</small>
    </div>
  );
}

function TaskProgressRow({
  task,
  currentUserId,
  onCheckIn,
  onSubmit
}: {
  task: Task;
  currentUserId: string;
  onCheckIn: (taskId: string) => void;
  onSubmit: (taskId: string) => void;
}) {
  return (
    <div className="task-row">
      <div>
        <strong>{task.title}</strong>
        <span>{task.type} · {getRewardType(task)}</span>
        <p className="detail-text">{getRewardDescription(task)}</p>
        <div className="task-time-list">
          <small>任务提交时间：{formatSubmittedAt(task.submittedAt)}</small>
          {task.completionSubmittedAt && <small>完成提交时间：{formatSubmittedAt(task.completionSubmittedAt)}</small>}
          {task.status === "已完成" && <small>完成时间：{formatSubmittedAt(task.completedAt)}</small>}
        </div>
        <CheckInProgress task={task} />
      </div>
      <StatusBadge label={task.status} />
      {task.type === "打卡任务" && task.status === "完成中" && !task.submitted && (
        <button disabled={!canCheckInToday(task, currentUserId)} onClick={() => onCheckIn(task.id)}>
          {canCheckInToday(task, currentUserId) ? "今日打卡" : "今日不可打卡"}
        </button>
      )}
      {task.type !== "打卡任务" && task.status === "完成中" && !task.submitted && (
        <button onClick={() => onSubmit(task.id)}>提交完成</button>
      )}
      {task.submitted && <em>等待审核</em>}
    </div>
  );
}

function linkedTaskText(tasks: Task[], wishId: string) {
  const task = tasks.find((item) => item.linkedWishId === wishId);
  if (!task) return "暂未关联任务";
  return `关联任务：${task.title} · ${task.status}`;
}

function getRewardType(task: Task) {
  return task.rewardType ?? "其他愿望";
}

function getRewardDescription(task: Task) {
  return task.rewardDescription ?? task.reward ?? "未填写奖励描述";
}
