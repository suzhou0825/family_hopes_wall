"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Role = "parent" | "child";
type ParentTitle = "爸爸" | "妈妈";
type ChildGender = "男孩" | "女孩";
type ChildTitle = "哥哥" | "弟弟" | "姐姐" | "妹妹";
type WishStatus = "待申领" | "兑换中" | "兑现中";
type TaskStatus = "待申领" | "完成中" | "已完成";
type WishType = "物质奖励" | "旅游奖励" | "陪玩奖励" | "其他愿望";
type TaskType = "打卡任务" | "一次性任务" | "承诺任务";
type Weekday = "周一" | "周二" | "周三" | "周四" | "周五" | "周六" | "周日";

type CheckIn = {
  childId: string;
  date: string;
};

type StoredAppData = {
  members: Member[];
  wishes: Wish[];
  tasks: Task[];
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
  const [showMemberPassword, setShowMemberPassword] = useState(false);
  const [showMemberConfirmPassword, setShowMemberConfirmPassword] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("p1");
  const [activeView, setActiveView] = useState("wall");
  const [editingWishId, setEditingWishId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [taskFormType, setTaskFormType] = useState<TaskType>("打卡任务");
  const [memberFormRole, setMemberFormRole] = useState<Role>("child");

  const currentUser = members.find((member) => member.id === currentUserId) ?? members[0] ?? initialMembers[0];
  const parents = members.filter((member) => member.role === "parent");
  const children = members.filter((member) => member.role === "child");
  const roleLabel = getFamilyRoleLabel(currentUser);

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

  function applyAuthPayload(payload: { token?: string; account?: AppAccount; data?: Partial<StoredAppData> }) {
    if (!payload.token || !payload.account) {
      setAuthMessage("登录返回数据不完整。");
      return;
    }
    setSessionToken(payload.token);
    setAccount(payload.account);
    window.localStorage.setItem(sessionStorageKey, payload.token);
    applyStoredData(payload.data);
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
    if (!displayName) return;

    setAccountMessage("");
    if (newPassword) {
      if (!validatePassword(newPassword)) {
        setAccountMessage("新密码至少 8 位，并且必须包含字母和数字。");
        return;
      }
    }
    const { data: savedAccount, error } = await supabase.rpc("update_app_account", {
      p_token: sessionToken,
      p_display_name: displayName,
      p_new_password: newPassword || null
    });
    if (error) {
      setAccountMessage(`保存账号资料失败：${error.message}`);
      return;
    }
    const nextAccount = (savedAccount as { account: AppAccount }).account;
    setAccount(nextAccount);
    if (newPassword) event.currentTarget.reset();
    setAccountMessage("账号资料已保存。");
  }

  async function signOut() {
    window.localStorage.removeItem(sessionStorageKey);
    setSessionToken(null);
    setAccount(null);
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
    if (!title || currentUser.role !== "child") return;

    if (editingWishId) {
      setWishes((current) =>
        current.map((wish) =>
          wish.id === editingWishId && wish.childId === currentUser.id
            ? {
                ...wish,
                title,
                description,
                type: String(data.get("type")) as WishType,
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
        type: String(data.get("type")) as WishType,
        childId: currentUser.id,
        fulfiller: String(data.get("fulfiller")) as ParentTitle,
        expectedDate: expectedDate || undefined,
        status: "待申领"
      };

      setWishes((current) => [wish, ...current]);
    }
    event.currentTarget.reset();
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
    if (!title || !rewardDescription || currentUser.role !== "parent") return;
    if (type === "打卡任务" && (!checkInDays.length || !deadline)) return;

    const nextLinkedWishId = linkedWishId || undefined;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      type,
      creatorId: currentUser.id,
      rewardType,
      rewardDescription,
      createdAt: todayKey(),
      linkedWishId: nextLinkedWishId,
      status: "待申领",
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
    event.currentTarget.reset();
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
      setActiveView("wall");
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
        .map((task) => (task.assigneeId === memberId ? { ...task, assigneeId: undefined, status: "待申领", submitted: false } : task))
    );
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
        task.id === taskId && task.assigneeId === currentUser.id ? { ...task, submitted: true } : task
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
        return required > 0 && completed >= required ? { ...nextTask, submitted: true } : nextTask;
      })
    );
  }

  function approveTask(taskId: string) {
    if (currentUser.role !== "parent") return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    setTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, status: "已完成", submitted: false } : item))
    );
    if (task.linkedWishId) {
      setWishes((current) =>
        current.map((wish) => (wish.id === task.linkedWishId ? { ...wish, status: "兑现中" } : wish))
      );
    }
  }

  const visibleWishes = currentUser.role === "child" ? wishes.filter((wish) => wish.childId === currentUser.id) : wishes;
  const claimableTasks = tasks.filter((task) => task.status === "待申领");
  const myTasks = tasks.filter((task) => task.assigneeId === currentUser.id);

  if (isSessionLoading) {
    return (
      <main className="app-shell auth-shell">
        <section className="login-card">
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
          <p className="eyebrow">家庭许愿墙</p>
          <h1>登录后管理家庭愿望和任务</h1>
          <p>请输入应用账号和密码登录。没有账号可以先注册。</p>
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
                  {showPassword ? "隐藏" : "显示"}
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
                      {showConfirmPassword ? "隐藏" : "显示"}
                    </button>
                  </span>
                </label>
              </>
            )}
            <small>账号只能包含小写字母、数字、下划线；密码至少 8 位，并且必须包含字母和数字，字母区分大小写。</small>
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
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">家庭许愿墙</p>
          <h1>把愿望、任务和兑现放到同一面墙上</h1>
        </div>
        <label className="account-switcher">
          <span>家庭角色：{roleLabel}</span>
          <select
            data-testid="account-select"
            value={currentUserId}
            onChange={(event) => {
              setCurrentUserId(event.target.value);
              setActiveView("wall");
              setEditingWishId(null);
              setEditingTaskId(null);
              setEditingMemberId(null);
              setTaskFormType("打卡任务");
              setMemberFormRole("child");
            }}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {getFamilyRoleLabel(member)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="auth-panel">
        <div>
          <strong>账号管理</strong>
          <p>
            当前登录：{account.username}
          </p>
          <p>账号昵称：{account.display_name ?? "未设置"}</p>
          <small>{saveStatus}</small>
        </div>
        <form className="account-form" key={account.updated_at ?? account.display_name ?? account.id} onSubmit={saveAccount}>
          <input name="displayName" defaultValue={account.display_name ?? ""} placeholder="账号昵称" required />
          <span className="password-field">
            <input name="newPassword" type={showNewPassword ? "text" : "password"} placeholder="新密码，可不填" />
            <button type="button" aria-label={showNewPassword ? "隐藏新密码" : "显示新密码"} onClick={() => setShowNewPassword((current) => !current)}>
              {showNewPassword ? "隐藏" : "显示"}
            </button>
          </span>
          <button className="primary-button" type="submit">保存账号</button>
          <button className="secondary-button" type="button" onClick={signOut}>
            退出登录
          </button>
        </form>
        {accountMessage && <p className="auth-message">{accountMessage}</p>}
      </section>

      <nav className="tabs" aria-label="主导航">
        <button className={activeView === "wall" ? "active" : ""} onClick={() => setActiveView("wall")}>
          许愿墙
        </button>
        {currentUser.role === "child" && (
          <button className={activeView === "wishes" ? "active" : ""} onClick={() => setActiveView("wishes")}>
            许愿板块
          </button>
        )}
        {currentUser.role === "child" && (
          <button className={activeView === "myTasks" ? "active" : ""} onClick={() => setActiveView("myTasks")}>
            我的任务
          </button>
        )}
        {currentUser.role === "parent" && (
          <button className={activeView === "tasks" ? "active" : ""} onClick={() => setActiveView("tasks")}>
            任务发布
          </button>
        )}
        {currentUser.role === "parent" && (
          <button className={activeView === "family" ? "active" : ""} onClick={() => setActiveView("family")}>
            家庭管理
          </button>
        )}
      </nav>

      {activeView === "wall" && (
        <section className="workspace wall-grid">
          <section>
            <div className="section-heading">
              <p>愿望进展</p>
              <strong>{wishes.length} 个愿望</strong>
            </div>
            <div className="card-list">
              {wishes.map((wish) => (
                <article className="wish-card" data-testid={`wish-card-${wish.id}`} key={wish.id}>
                  <div className="card-title-row">
                    <h2>{wish.title}</h2>
                    <StatusBadge label={wish.status} />
                  </div>
                  <p>
                    {memberById.get(wish.childId)?.name} · {wish.type} · 期望 {wish.fulfiller} 兑现
                  </p>
                  {wish.description && <p className="detail-text">{wish.description}</p>}
                  {wish.expectedDate && <small>期望时间：{wish.expectedDate}</small>}
                  <ProgressRail status={wish.status} />
                  <small>{linkedTaskText(tasks, wish.id)}</small>
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="section-heading">
              <p>任务看板</p>
              <strong>{tasks.length} 个任务</strong>
            </div>
            <div className="card-list">
              {tasks.map((task) => (
                <article className="task-card" data-testid={`task-card-${task.id}`} key={task.id}>
                  <div className="card-title-row">
                    <h2>{task.title}</h2>
                    <StatusBadge label={task.status} />
                  </div>
                  <p>{task.type} · 奖励：{getRewardType(task)}</p>
                  <p className="detail-text">{getRewardDescription(task)}</p>
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
              <select name="type" defaultValue={editingWish?.type ?? "物质奖励"}>
                <option>物质奖励</option>
                <option>旅游奖励</option>
                <option>陪玩奖励</option>
                <option>其他愿望</option>
              </select>
            </label>
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
          </form>

          <section>
            <div className="section-heading">
              <p>我的愿望</p>
              <strong>{visibleWishes.length} 个</strong>
            </div>
            <div className="card-list">
              {visibleWishes.map((wish) => (
                <article className="wish-card" data-testid={`wish-card-${wish.id}`} key={wish.id}>
                  <div className="card-title-row">
                    <h2>{wish.title}</h2>
                    <StatusBadge label={wish.status} />
                  </div>
                  <p>{wish.type} · 期望 {wish.fulfiller} 兑现</p>
                  {wish.description && <p className="detail-text">{wish.description}</p>}
                  {wish.expectedDate && <small>期望时间：{wish.expectedDate}</small>}
                  <div className="card-actions">
                    <button className="secondary-button" data-testid={`edit-wish-${wish.id}`} onClick={() => setEditingWishId(wish.id)}>
                      编辑
                    </button>
                    <button className="danger-button" data-testid={`delete-wish-${wish.id}`} onClick={() => deleteWish(wish.id)}>
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

        </section>
      )}

      {activeView === "myTasks" && currentUser.role === "child" && (
        <section className="workspace two-column">
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
              <select name="rewardType" defaultValue={editingTask?.rewardType ?? "物质奖励"}>
                <option>物质奖励</option>
                <option>旅游奖励</option>
                <option>陪玩奖励</option>
                <option>其他愿望</option>
              </select>
            </label>
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
          </form>

          <section>
            <div className="section-heading">
              <p>任务审核</p>
              <strong>{tasks.filter((task) => task.submitted).length} 个待审核</strong>
            </div>
            <div className="card-list">
              {tasks.map((task) => (
                <article className="task-card" data-testid={`task-card-${task.id}`} key={task.id}>
                  <div className="card-title-row">
                    <h2>{task.title}</h2>
                    <StatusBadge label={task.status} />
                  </div>
                  <p>{task.type} · 奖励：{getRewardType(task)}</p>
                  <p className="detail-text">{getRewardDescription(task)}</p>
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
          </section>
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
                      {showMemberPassword ? "隐藏" : "显示"}
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
                      {showMemberConfirmPassword ? "隐藏" : "显示"}
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

function ProgressRail({ status }: { status: WishStatus }) {
  const steps: WishStatus[] = ["待申领", "兑换中", "兑现中"];
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
