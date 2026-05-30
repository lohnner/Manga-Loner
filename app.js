import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query as firestoreQuery,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const DB_NAME = "manga-loner-db";
const DB_VERSION = 1;
const ACTIVE_USER_KEY = "manga-loner-db:active-user";
const DEFAULT_AVATAR_ID = "level-1-luffy";

const defaultCatalog = [
  {
    key: "gachiakuta",
    title: "Gachiakuta",
    author: "Kei Urana",
    cover: "assets/covers/gachiakuta.jpg",
    defaultPages: 71,
  },
  {
    key: "one-piece",
    title: "One Piece",
    author: "Eiichiro Oda",
    cover: "assets/covers/one-piece.jpg",
    defaultPages: 60,
  },
  {
    key: "naruto",
    title: "Naruto",
    author: "Masashi Kishimoto",
    cover: "assets/covers/naruto.webp",
    defaultPages: 54,
  },
  {
    key: "alien-headbutt",
    title: "Alien Headbutt",
    author: "Akira Inui",
    cover: "assets/covers/alien-headbutt.jpg",
    defaultPages: 50,
  },
];

const defaultChapterCatalog = [
  {
    id: "local-gachiakuta-1",
    mangaKey: "gachiakuta",
    mangaTitle: "Gachiakuta",
    author: "Kei Urana",
    cover: "assets/covers/gachiakuta.jpg",
    chapterNumber: 1,
    xp: 71,
    pages: 71,
  },
  {
    id: "local-gachiakuta-2",
    mangaKey: "gachiakuta",
    mangaTitle: "Gachiakuta",
    author: "Kei Urana",
    cover: "assets/covers/gachiakuta.jpg",
    chapterNumber: 2,
    xp: 42,
    pages: 42,
  },
  {
    id: "local-alien-headbutt-1",
    mangaKey: "alien-headbutt",
    mangaTitle: "Alien Headbutt",
    author: "Akira Inui",
    cover: "assets/covers/alien-headbutt.jpg",
    chapterNumber: 1,
    xp: 50,
    pages: 50,
  },
  {
    id: "local-naruto-1",
    mangaKey: "naruto",
    mangaTitle: "Naruto",
    author: "Masashi Kishimoto",
    cover: "assets/covers/naruto.webp",
    chapterNumber: 1,
    xp: 54,
    pages: 54,
  },
  {
    id: "local-one-piece-1",
    mangaKey: "one-piece",
    mangaTitle: "One Piece",
    author: "Eiichiro Oda",
    cover: "assets/covers/one-piece.jpg",
    chapterNumber: 1,
    xp: 60,
    pages: 60,
  },
  {
    id: "local-one-piece-2",
    mangaKey: "one-piece",
    mangaTitle: "One Piece",
    author: "Eiichiro Oda",
    cover: "assets/covers/one-piece.jpg",
    chapterNumber: 2,
    xp: 25,
    pages: 25,
  },
];

const avatarCatalog = [
  {
    id: "level-1-luffy",
    name: "Luffy",
    requiredLevel: 1,
    src: "assets/avatars/level-1-luffy.png",
  },
  {
    id: "level-5-naruto",
    name: "Naruto",
    requiredLevel: 5,
    src: "assets/avatars/level-5-naruto.png",
  },
];

const state = {
  db: null,
  firebase: null,
  supabase: null,
  user: null,
  chapters: [],
  chapterCatalog: [...defaultChapterCatalog],
  ranking: [],
  search: "",
  toastTimer: null,
};

const dom = {
  authScreen: document.querySelector("#auth-screen"),
  appShell: document.querySelector("#app-shell"),
  loginTab: document.querySelector("#login-tab"),
  registerTab: document.querySelector("#register-tab"),
  loginForm: document.querySelector("#login-form"),
  registerForm: document.querySelector("#register-form"),
  logoutButton: document.querySelector("#logout-button"),
  navButtons: document.querySelectorAll(".nav-button"),
  views: document.querySelectorAll(".view"),
  miniAvatar: document.querySelector("#mini-avatar"),
  miniName: document.querySelector("#mini-name"),
  miniLevel: document.querySelector("#mini-level"),
  quickAddButton: document.querySelector("#quick-add-button"),
  avatarButton: document.querySelector("#avatar-button"),
  profileAvatar: document.querySelector("#profile-avatar"),
  profileName: document.querySelector("#profile-name"),
  profileLogin: document.querySelector("#profile-login"),
  rankLabel: document.querySelector("#rank-label"),
  levelValue: document.querySelector("#level-value"),
  xpFill: document.querySelector("#xp-fill"),
  xpCurrent: document.querySelector("#xp-current"),
  xpNext: document.querySelector("#xp-next"),
  totalXp: document.querySelector("#total-xp"),
  chaptersRead: document.querySelector("#chapters-read"),
  mangaCount: document.querySelector("#manga-count"),
  pagesRead: document.querySelector("#pages-read"),
  profileMangaSummary: document.querySelector("#profile-manga-summary"),
  profileMangaList: document.querySelector("#profile-manga-list"),
  historySummary: document.querySelector("#history-summary"),
  historyList: document.querySelector("#history-list"),
  mangaSearch: document.querySelector("#manga-search"),
  mangaOptions: document.querySelector("#manga-options"),
  chapterForm: document.querySelector("#chapter-form"),
  mangaTitleInput: document.querySelector("#manga-title-input"),
  chapterNumberInput: document.querySelector("#chapter-number-input"),
  pageCountInput: document.querySelector("#page-count-input"),
  readDateInput: document.querySelector("#read-date-input"),
  mangaList: document.querySelector("#manga-list"),
  rankingSummary: document.querySelector("#ranking-summary"),
  rankingList: document.querySelector("#ranking-list"),
  databaseStatus: document.querySelector("#database-status"),
  databaseUser: document.querySelector("#database-user"),
  databaseRecords: document.querySelector("#database-records"),
  databaseCreated: document.querySelector("#database-created"),
  exportButton: document.querySelector("#export-button"),
  importButton: document.querySelector("#import-button"),
  importInput: document.querySelector("#import-input"),
  avatarModal: document.querySelector("#avatar-modal"),
  closeAvatarModal: document.querySelector("#close-avatar-modal"),
  avatarGallery: document.querySelector("#avatar-gallery"),
  toast: document.querySelector("#toast"),
};

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 404) {
    return null;
  }

  let payload = null;
  const text = await response.text();

  if (text) {
    payload = JSON.parse(text);
  }

  if (!response.ok) {
    const error = new Error(payload?.error || "Erro no servidor.");
    error.name = payload?.code || response.statusText || "ApiError";
    error.status = response.status;
    throw error;
  }

  return payload;
}

function isApiDatabase() {
  return state.db?.type === "api";
}

function getFirebaseSettings() {
  const config = window.MANGA_LONER_FIREBASE_CONFIG || {};
  const requiredFields = ["apiKey", "authDomain", "projectId", "appId"];
  const hasRequiredFields = requiredFields.every((field) => {
    const value = String(config[field] || "").trim();
    return value && !value.includes("COLE_") && !value.includes("SEU_");
  });

  return hasRequiredFields ? config : null;
}

function isFirebaseDatabase() {
  return state.db?.type === "firebase";
}

function getSupabaseSettings() {
  const settings = window.MANGA_LONER_SUPABASE || {};
  const url = String(settings.url || "").trim();
  const anonKey = String(settings.anonKey || "").trim();

  if (!url || !anonKey || url.includes("COLE_") || anonKey.includes("COLE_")) {
    return null;
  }

  return { url, anonKey };
}

function isSupabaseDatabase() {
  return state.db?.type === "supabase";
}

async function openDatabase() {
  const firebaseSettings = getFirebaseSettings();

  if (firebaseSettings) {
    const app = initializeApp(firebaseSettings);
    state.firebase = {
      app,
      auth: getAuth(app),
      firestore: getFirestore(app),
    };
    return { type: "firebase" };
  }

  const supabaseSettings = getSupabaseSettings();

  if (supabaseSettings && window.supabase?.createClient) {
    state.supabase = window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey);
    return { type: "supabase" };
  }

  try {
    const health = await apiRequest("/api/health");

    if (health?.ok) {
      return { type: "api", health };
    }
  } catch (error) {
    console.info("Servidor central indisponivel; usando IndexedDB local.", error);
  }

  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB nao esta disponivel neste navegador."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("users")) {
        const users = database.createObjectStore("users", { keyPath: "id" });
        users.createIndex("loginKey", "loginKey", { unique: true });
        users.createIndex("emailKey", "emailKey", { unique: true });
      }

      if (!database.objectStoreNames.contains("chapters")) {
        const chapters = database.createObjectStore("chapters", { keyPath: "id" });
        chapters.createIndex("userId", "userId", { unique: false });
        chapters.createIndex("userMangaKey", "userMangaKey", { unique: false });
        chapters.createIndex("readAt", "readAt", { unique: false });
      }
    });

    request.addEventListener("success", () => resolve({ type: "indexeddb", database: request.result }));
    request.addEventListener("error", () => reject(request.error));
  });
}

function runStore(storeName, mode, callback) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;
    let settled = false;

    function fail(error) {
      if (!settled) {
        settled = true;
        reject(error);
      }
    }

    try {
      const request = callback(store);

      if (request && typeof request.addEventListener === "function") {
        request.addEventListener("success", () => {
          result = request.result;
        });
        request.addEventListener("error", () => fail(request.error));
      } else {
        result = request;
      }
    } catch (error) {
      fail(error);
      return;
    }

    transaction.addEventListener("complete", () => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    });
    transaction.addEventListener("error", () => fail(transaction.error));
    transaction.addEventListener("abort", () => fail(transaction.error || new Error("Transacao cancelada.")));
  });
}

function addRecord(storeName, value) {
  if (isApiDatabase() && storeName === "users") {
    return apiRequest("/api/users", {
      method: "POST",
      body: JSON.stringify(value),
    });
  }

  return runStore(storeName, "readwrite", (store) => store.add(value));
}

function putRecord(storeName, value) {
  if (isApiDatabase() && storeName === "users") {
    return apiRequest(`/api/users/${encodeURIComponent(value.id)}`, {
      method: "PUT",
      body: JSON.stringify(value),
    });
  }

  if (isApiDatabase() && storeName === "chapters") {
    return apiRequest(`/api/chapters/${encodeURIComponent(value.id)}`, {
      method: "PUT",
      body: JSON.stringify(value),
    });
  }

  return runStore(storeName, "readwrite", (store) => store.put(value));
}

function getRecord(storeName, key) {
  if (isApiDatabase() && storeName === "users") {
    return apiRequest(`/api/users/${encodeURIComponent(key)}`);
  }

  if (isApiDatabase() && storeName === "chapters") {
    return apiRequest(`/api/chapters/${encodeURIComponent(key)}`);
  }

  return runStore(storeName, "readonly", (store) => store.get(key));
}

function getByIndex(storeName, indexName, key) {
  if (isApiDatabase() && storeName === "users") {
    const params = new URLSearchParams({ indexName, key });
    return apiRequest(`/api/users/by-index?${params.toString()}`);
  }

  return runStore(storeName, "readonly", (store) => store.index(indexName).get(key));
}

function getAllByIndex(storeName, indexName, key) {
  if (isApiDatabase() && storeName === "chapters" && indexName === "userId") {
    const params = new URLSearchParams({ userId: key });
    return apiRequest(`/api/chapters?${params.toString()}`);
  }

  return runStore(storeName, "readonly", (store) => store.index(indexName).getAll(key));
}

function getAllRecords(storeName) {
  if (isApiDatabase() && storeName === "ranking") {
    return apiRequest("/api/ranking");
  }

  return runStore(storeName, "readonly", (store) => store.getAll());
}

function mapSupabaseProfile(profile, authUser) {
  return {
    id: profile.id,
    displayName: profile.display_name,
    email: authUser?.email || "",
    login: profile.login,
    avatarId: profile.avatar_id || DEFAULT_AVATAR_ID,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function mapSupabaseChapter(row) {
  const catalog = row.chapter_catalog || row;

  return {
    id: row.id,
    userId: row.user_id,
    userMangaKey: `${row.user_id}:${catalog.manga_key}`,
    mangaKey: catalog.manga_key,
    mangaTitle: catalog.manga_title,
    cover: catalog.cover || "",
    chapterNumber: Number(catalog.chapter_number),
    pages: Number(catalog.pages || catalog.xp || 0),
    xp: Number(catalog.xp || 0),
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.created_at,
    chapterCatalogId: catalog.id,
  };
}

function mapSupabaseCatalog(row) {
  return {
    id: row.id,
    mangaKey: row.manga_key,
    mangaTitle: row.manga_title,
    author: row.author || "Catalogo",
    cover: row.cover || "",
    chapterNumber: Number(row.chapter_number),
    xp: Number(row.xp),
    pages: Number(row.pages || row.xp),
  };
}

function mapSupabaseRanking(row) {
  return {
    position: Number(row.position),
    id: row.id,
    displayName: row.display_name,
    login: row.login,
    avatarId: row.avatar_id,
    totalXp: Number(row.total_xp || 0),
    pages: Number(row.pages || 0),
    chapters: Number(row.chapters || 0),
    mangas: Number(row.mangas || 0),
    lastReadAt: row.last_read_at,
  };
}

async function refreshSupabaseCatalog() {
  if (!isSupabaseDatabase()) {
    state.chapterCatalog = [...defaultChapterCatalog];
    return;
  }

  const { data, error } = await state.supabase
    .from("chapter_catalog")
    .select("id,manga_key,manga_title,author,cover,chapter_number,xp,pages")
    .eq("active", true)
    .order("manga_title", { ascending: true })
    .order("chapter_number", { ascending: true });

  if (error) {
    throw error;
  }

  state.chapterCatalog = (data || []).map(mapSupabaseCatalog);
}

async function ensureSupabaseProfile(authUser) {
  const metadata = authUser.user_metadata || {};
  let { data: profile, error } = await state.supabase
    .from("profiles")
    .select("id,display_name,login,avatar_id,created_at,updated_at")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!profile) {
    const login = normalizeLogin(metadata.login || authUser.email?.split("@")[0] || `leitor-${authUser.id.slice(0, 6)}`);
    const displayName = String(metadata.display_name || login || "Leitor").trim();
    const payload = {
      id: authUser.id,
      display_name: displayName,
      login,
      avatar_id: metadata.avatar_id || DEFAULT_AVATAR_ID,
    };
    const inserted = await state.supabase
      .from("profiles")
      .insert(payload)
      .select("id,display_name,login,avatar_id,created_at,updated_at")
      .single();

    if (inserted.error) {
      throw inserted.error;
    }

    profile = inserted.data;
  }

  return mapSupabaseProfile(profile, authUser);
}

function getChapterByCatalogId(chapterId) {
  return state.chapterCatalog.find((chapter) => chapter.id === chapterId)
    || defaultChapterCatalog.find((chapter) => chapter.id === chapterId);
}

function mapFirebaseProfile(profileData, authUser) {
  return {
    id: authUser.uid,
    displayName: profileData?.displayName || authUser.displayName || "Leitor",
    email: authUser.email || "",
    login: profileData?.login || authUser.email?.split("@")[0] || "leitor",
    avatarId: profileData?.avatarId || DEFAULT_AVATAR_ID,
    createdAt: profileData?.createdAt || new Date().toISOString(),
    updatedAt: profileData?.updatedAt || profileData?.createdAt || new Date().toISOString(),
  };
}

function mapFirebaseChapter(docSnapshot) {
  const data = docSnapshot.data();
  const catalogChapter = getChapterByCatalogId(data.chapterId);

  if (!catalogChapter) {
    return null;
  }

  return {
    id: docSnapshot.id,
    userId: data.userId,
    userMangaKey: `${data.userId}:${catalogChapter.mangaKey}`,
    mangaKey: catalogChapter.mangaKey,
    mangaTitle: catalogChapter.mangaTitle,
    cover: catalogChapter.cover || "",
    chapterNumber: Number(catalogChapter.chapterNumber),
    pages: Number(catalogChapter.pages || catalogChapter.xp || 0),
    xp: Number(catalogChapter.xp || 0),
    readAt: data.readAt || data.createdAt || new Date().toISOString(),
    createdAt: data.createdAt || data.readAt || new Date().toISOString(),
    updatedAt: data.createdAt || data.readAt || new Date().toISOString(),
    chapterCatalogId: catalogChapter.id,
  };
}

async function ensureFirebaseProfile(authUser, fallback = {}) {
  const profileRef = doc(state.firebase.firestore, "profiles", authUser.uid);
  const profileSnapshot = await getDoc(profileRef);

  if (profileSnapshot.exists()) {
    return mapFirebaseProfile(profileSnapshot.data(), authUser);
  }

  const now = new Date().toISOString();
  const login = normalizeLogin(fallback.login || authUser.email?.split("@")[0] || `leitor-${authUser.uid.slice(0, 6)}`);
  const profile = {
    displayName: String(fallback.displayName || login || "Leitor").trim(),
    email: authUser.email || fallback.email || "",
    login,
    avatarId: DEFAULT_AVATAR_ID,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(profileRef, profile);
  return mapFirebaseProfile(profile, authUser);
}

async function loginExistsInFirebase(login) {
  const loginQuery = firestoreQuery(
    collection(state.firebase.firestore, "profiles"),
    where("login", "==", normalizeLogin(login))
  );
  const result = await getDocs(loginQuery);

  return !result.empty;
}

function getFirebaseCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(state.firebase.auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

function normalizeLogin(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function makeId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function makeSalt() {
  if (crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fallbackHash(value) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return `fallback-${(hash >>> 0).toString(16)}`;
}

async function hashPassword(password, salt) {
  const payload = `${salt}:${password}`;

  if (crypto.subtle && window.TextEncoder) {
    const bytes = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return bufferToHex(digest);
  }

  return fallbackHash(payload);
}

function xpForLevel(level) {
  if (level <= 1) {
    return 0;
  }

  return Math.floor((50 * (level ** 3 - 6 * level ** 2 + 17 * level - 12)) / 3);
}

function getLevelFromXp(totalXp) {
  let level = 1;

  while (xpForLevel(level + 1) <= totalXp) {
    level += 1;
  }

  return level;
}

function getLevelTitle(level) {
  if (level >= 50) return "Lenda";
  if (level >= 20) return "Veterano";
  if (level >= 8) return "Aventureiro";
  if (level >= 2) return "Aprendiz";
  return "Novato";
}

function getStats(chapters = state.chapters) {
  const totalXp = chapters.reduce((total, chapter) => total + Number(chapter.xp || 0), 0);
  const pages = chapters.reduce((total, chapter) => total + Number(chapter.pages || 0), 0);
  const mangaKeys = new Set(chapters.map((chapter) => chapter.mangaKey));
  const level = getLevelFromXp(totalXp);
  const nextLevelXp = xpForLevel(level + 1);
  const levelStartXp = xpForLevel(level);
  const xpIntoLevel = totalXp - levelStartXp;
  const xpNeeded = nextLevelXp - levelStartXp;

  return {
    totalXp,
    pages,
    chapters: chapters.length,
    mangas: mangaKeys.size,
    level,
    nextLevelXp,
    xpIntoLevel,
    xpNeeded,
    fill: Math.min(100, Math.max(0, (xpIntoLevel / xpNeeded) * 100)),
  };
}

function getAvatarById(avatarId) {
  return avatarCatalog.find((avatar) => avatar.id === avatarId) || avatarCatalog[0];
}

function getActiveAvatar() {
  const stats = getStats();
  const selected = getAvatarById(state.user?.avatarId || DEFAULT_AVATAR_ID);

  if (stats.level < selected.requiredLevel) {
    return getAvatarById(DEFAULT_AVATAR_ID);
  }

  return selected;
}

function getCatalogByKey(key) {
  return defaultCatalog.find((item) => item.key === key);
}

function getCatalogByTitle(title) {
  const key = slugify(title);
  return getCatalogByKey(key);
}

function getDefaultPages(title) {
  const mangaKey = slugify(title);
  const firstChapter = state.chapterCatalog.find((chapter) => chapter.mangaKey === mangaKey);

  return firstChapter?.xp || getCatalogByTitle(title)?.defaultPages || 35;
}

function getCatalogChapter(title, chapterNumber) {
  const mangaKey = slugify(title);

  return state.chapterCatalog.find((chapter) => {
    return chapter.mangaKey === mangaKey && Number(chapter.chapterNumber) === Number(chapterNumber);
  });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileDate(value) {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("-");
}

function toDatetimeLocal(value = new Date()) {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");

  state.toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, 3200);
}

function switchAuth(mode) {
  const isLogin = mode === "login";
  dom.loginTab.classList.toggle("is-active", isLogin);
  dom.registerTab.classList.toggle("is-active", !isLogin);
  dom.loginForm.classList.toggle("is-hidden", !isLogin);
  dom.registerForm.classList.toggle("is-hidden", isLogin);
}

function setView(viewId) {
  dom.views.forEach((view) => {
    view.classList.toggle("is-active", view.id === viewId);
  });

  dom.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewId);
  });
}

function showAuth() {
  state.user = null;
  state.chapters = [];
  switchAuth("login");
  dom.authScreen.classList.remove("is-hidden");
  dom.appShell.classList.add("is-hidden");
  dom.loginForm.reset();
  dom.loginForm.querySelector("input").focus();
}

async function showAppForUser(user) {
  state.user = user;
  localStorage.setItem(ACTIVE_USER_KEY, user.id);
  await refreshSupabaseCatalog();
  await refreshChapters(false);
  await refreshRanking(false);
  dom.authScreen.classList.add("is-hidden");
  dom.appShell.classList.remove("is-hidden");
  setView("profile-view");
  renderAll();
}

async function refreshChapters(shouldRender = true) {
  if (!state.user) {
    state.chapters = [];
    return;
  }

  if (isFirebaseDatabase()) {
    const readQuery = firestoreQuery(
      collection(state.firebase.firestore, "readChapters"),
      where("userId", "==", state.user.id)
    );
    const result = await getDocs(readQuery);
    state.chapters = result.docs
      .map(mapFirebaseChapter)
      .filter(Boolean)
      .sort((a, b) => new Date(b.readAt) - new Date(a.readAt));
  } else if (isSupabaseDatabase()) {
    const { data, error } = await state.supabase
      .from("read_chapters")
      .select(`
        id,
        user_id,
        read_at,
        created_at,
        chapter_catalog (
          id,
          manga_key,
          manga_title,
          cover,
          chapter_number,
          xp,
          pages
        )
      `)
      .eq("user_id", state.user.id)
      .order("read_at", { ascending: false });

    if (error) {
      throw error;
    }

    state.chapters = (data || []).map(mapSupabaseChapter);
  } else {
    const records = await getAllByIndex("chapters", "userId", state.user.id);
    state.chapters = records.sort((a, b) => new Date(b.readAt) - new Date(a.readAt));
  }

  if (shouldRender) {
    renderAll();
  }
}

async function refreshRanking(shouldRender = true) {
  if (isFirebaseDatabase()) {
    const [profileSnapshots, readSnapshots] = await Promise.all([
      getDocs(collection(state.firebase.firestore, "profiles")),
      getDocs(collection(state.firebase.firestore, "readChapters")),
    ]);
    const statsByUser = new Map();

    profileSnapshots.docs.forEach((profileDoc) => {
      const profile = profileDoc.data();
      statsByUser.set(profileDoc.id, {
        id: profileDoc.id,
        displayName: profile.displayName || "Leitor",
        login: profile.login || "leitor",
        avatarId: profile.avatarId || DEFAULT_AVATAR_ID,
        createdAt: profile.createdAt,
        totalXp: 0,
        pages: 0,
        chapters: 0,
        mangas: new Set(),
        lastReadAt: "",
      });
    });

    readSnapshots.docs.forEach((readDoc) => {
      const read = readDoc.data();
      const stats = statsByUser.get(read.userId);
      const catalogChapter = getChapterByCatalogId(read.chapterId);

      if (!stats || !catalogChapter) {
        return;
      }

      stats.totalXp += Number(catalogChapter.xp || 0);
      stats.pages += Number(catalogChapter.pages || catalogChapter.xp || 0);
      stats.chapters += 1;
      stats.mangas.add(catalogChapter.mangaKey);

      if (!stats.lastReadAt || new Date(read.readAt || read.createdAt || 0) > new Date(stats.lastReadAt)) {
        stats.lastReadAt = read.readAt || read.createdAt || "";
      }
    });

    state.ranking = Array.from(statsByUser.values())
      .map((entry) => ({ ...entry, mangas: entry.mangas.size }))
      .sort((a, b) => {
        return (
          b.totalXp - a.totalXp ||
          b.chapters - a.chapters ||
          b.pages - a.pages ||
          new Date(b.lastReadAt || 0) - new Date(a.lastReadAt || 0)
        );
      })
      .map((entry, index) => ({ ...entry, position: index + 1 }));
  } else if (isSupabaseDatabase()) {
    const { data, error } = await state.supabase.rpc("get_ranking");

    if (error) {
      throw error;
    }

    state.ranking = (data || []).map(mapSupabaseRanking);
  } else if (isApiDatabase()) {
    state.ranking = await getAllRecords("ranking");
  } else {
    const users = await getAllRecords("users");
    const chapters = await getAllRecords("chapters");
    const statsByUser = new Map();

    users.forEach((user) => {
      statsByUser.set(user.id, {
        id: user.id,
        displayName: user.displayName,
        login: user.login,
        avatarId: user.avatarId,
        createdAt: user.createdAt,
        totalXp: 0,
        pages: 0,
        chapters: 0,
        mangas: new Set(),
        lastReadAt: "",
      });
    });

    chapters.forEach((chapter) => {
      const stats = statsByUser.get(chapter.userId);
      if (!stats) {
        return;
      }

      stats.totalXp += Number(chapter.xp || 0);
      stats.pages += Number(chapter.pages || 0);
      stats.chapters += 1;
      stats.mangas.add(chapter.mangaKey);

      if (!stats.lastReadAt || new Date(chapter.readAt) > new Date(stats.lastReadAt)) {
        stats.lastReadAt = chapter.readAt;
      }
    });

    state.ranking = Array.from(statsByUser.values())
      .map((entry) => ({ ...entry, mangas: entry.mangas.size }))
      .sort((a, b) => {
        return (
          b.totalXp - a.totalXp ||
          b.chapters - a.chapters ||
          b.pages - a.pages ||
          new Date(b.lastReadAt || 0) - new Date(a.lastReadAt || 0)
        );
      })
      .map((entry, index) => ({ ...entry, position: index + 1 }));
  }

  if (shouldRender) {
    renderAll();
  }
}

function buildMangaSummaries(includeCatalog = false) {
  const map = new Map();

  state.chapters.forEach((chapter) => {
    if (!map.has(chapter.mangaKey)) {
      const catalog = getCatalogByKey(chapter.mangaKey);
      map.set(chapter.mangaKey, {
        mangaKey: chapter.mangaKey,
        title: catalog?.title || chapter.mangaTitle,
        cover: catalog?.cover || chapter.cover || "",
        author: catalog?.author || "Catalogo pessoal",
        defaultPages: catalog?.defaultPages || 35,
        chapters: [],
        pages: 0,
        xp: 0,
        latestReadAt: chapter.readAt,
        catalogOnly: false,
      });
    }

    const summary = map.get(chapter.mangaKey);
    summary.chapters.push(chapter);
    summary.pages += Number(chapter.pages || 0);
    summary.xp += Number(chapter.xp || 0);

    if (new Date(chapter.readAt) > new Date(summary.latestReadAt)) {
      summary.latestReadAt = chapter.readAt;
    }
  });

  if (includeCatalog) {
    defaultCatalog.forEach((manga) => {
      if (!map.has(manga.key)) {
        map.set(manga.key, {
          mangaKey: manga.key,
          title: manga.title,
          cover: manga.cover,
          author: manga.author,
          defaultPages: manga.defaultPages,
          chapters: [],
          pages: 0,
          xp: 0,
          latestReadAt: "",
          catalogOnly: true,
        });
      }
    });
  }

  return Array.from(map.values())
    .map((summary) => {
      const chapterNumbers = summary.chapters
        .map((chapter) => Number(chapter.chapterNumber))
        .sort((a, b) => a - b);
      const maxChapter = chapterNumbers.length ? Math.max(...chapterNumbers) : 0;

      return {
        ...summary,
        chapterNumbers,
        maxChapter,
        nextChapter: maxChapter + 1,
      };
    })
    .sort((a, b) => {
      if (a.catalogOnly !== b.catalogOnly) {
        return a.catalogOnly ? 1 : -1;
      }

      if (!a.catalogOnly && !b.catalogOnly) {
        return new Date(b.latestReadAt) - new Date(a.latestReadAt);
      }

      return a.title.localeCompare(b.title, "pt-BR");
    });
}

function renderAll() {
  renderUserSurface();
  renderProfile();
  renderMangaOptions();
  renderMangaList();
  renderRanking();
  renderDatabase();
}

function renderUserSurface() {
  if (!state.user) {
    return;
  }

  const stats = getStats();
  const avatar = getActiveAvatar();

  dom.miniAvatar.src = avatar.src;
  dom.miniAvatar.alt = `${avatar.name} - avatar`;
  dom.miniName.textContent = state.user.displayName;
  dom.miniLevel.textContent = `Level ${stats.level}`;
}

function renderProfile() {
  if (!state.user) {
    return;
  }

  const stats = getStats();
  const avatar = getActiveAvatar();
  const summaries = buildMangaSummaries(false);
  const recentHistory = state.chapters.slice(0, 8);

  dom.profileAvatar.src = avatar.src;
  dom.profileAvatar.alt = `${avatar.name} - avatar do perfil`;
  dom.profileName.textContent = state.user.displayName;
  dom.profileLogin.textContent = `@${state.user.login} - ${state.user.email}`;
  dom.rankLabel.textContent = `${getLevelTitle(stats.level)} - Level`;
  dom.levelValue.textContent = stats.level;
  dom.xpFill.style.width = `${stats.fill}%`;
  dom.xpCurrent.textContent = `${stats.totalXp} XP`;
  dom.xpNext.textContent = `${stats.nextLevelXp - stats.totalXp} XP para o level ${stats.level + 1}`;
  dom.totalXp.textContent = stats.totalXp;
  dom.chaptersRead.textContent = stats.chapters;
  dom.mangaCount.textContent = stats.mangas;
  dom.pagesRead.textContent = stats.pages;
  dom.profileMangaSummary.textContent = `${stats.mangas} mangas`;
  dom.historySummary.textContent = `${stats.chapters} capitulos`;

  if (!summaries.length) {
    dom.profileMangaList.innerHTML = `
      <div class="empty-state">
        <strong>Nenhum manga no perfil</strong>
        <span>Os capitulos salvos entram aqui.</span>
      </div>
    `;
  } else {
    dom.profileMangaList.innerHTML = summaries
      .slice(0, 6)
      .map((summary) => {
        return `
          <div class="compact-manga-item">
            <div>
              <strong>${escapeHtml(summary.title)}</strong>
              <span>${summary.chapters.length} capitulos - ultimo capitulo ${summary.maxChapter}</span>
            </div>
            <span>${summary.xp} XP</span>
          </div>
        `;
      })
      .join("");
  }

  if (!recentHistory.length) {
    dom.historyList.innerHTML = `
      <div class="empty-state">
        <strong>Nenhum capitulo lido ainda</strong>
        <span>Use a aba Mangas para registrar sua leitura.</span>
      </div>
    `;
  } else {
    dom.historyList.innerHTML = recentHistory
      .map((chapter) => {
        return `
          <div class="history-item">
            <div>
              <strong>${escapeHtml(chapter.mangaTitle)} - Capitulo ${chapter.chapterNumber}</strong>
              <span>${chapter.pages} paginas - ${formatDate(chapter.readAt)}</span>
            </div>
            <span>+${chapter.xp} XP</span>
          </div>
        `;
      })
      .join("");
  }
}

function renderMangaOptions() {
  const options = Array.from(
    new Map(
      state.chapterCatalog.map((chapter) => [chapter.mangaKey, chapter.mangaTitle])
    ).values()
  );

  dom.mangaOptions.innerHTML = options
    .map((title) => `<option value="${escapeHtml(title)}"></option>`)
    .join("");
}

function renderCover(summary) {
  if (summary.cover) {
    return `<img class="manga-cover" src="${escapeHtml(summary.cover)}" alt="Capa de ${escapeHtml(summary.title)}">`;
  }

  const initials = summary.title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return `<div class="manga-cover manga-cover-placeholder" aria-label="Capa de ${escapeHtml(summary.title)}">${escapeHtml(initials || "ML")}</div>`;
}

function renderMangaList() {
  const search = state.search.trim().toLowerCase();
  const summaries = buildMangaSummaries(true).filter((summary) => {
    return summary.title.toLowerCase().includes(search);
  });

  if (!summaries.length) {
    dom.mangaList.innerHTML = `
      <div class="empty-state">
        <strong>Nenhum manga encontrado</strong>
        <span>Tente pesquisar por outro nome.</span>
      </div>
    `;
    return;
  }

  dom.mangaList.innerHTML = summaries
    .map((summary) => {
      const chapters = summary.chapterNumbers.slice(-10);
      const chapterTags = chapters.length
        ? chapters.map((number) => `<span>${number}</span>`).join("")
        : "<span>Sem capitulos</span>";
      const catalogChapters = state.chapterCatalog
        .filter((chapter) => chapter.mangaKey === summary.mangaKey)
        .sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber));
      const nextCatalogChapter = catalogChapters.find((chapter) => {
        return !summary.chapterNumbers.includes(Number(chapter.chapterNumber));
      });
      const actionButton = nextCatalogChapter
        ? `
          <button
            class="primary-action"
            type="button"
            data-register-chapter-id="${nextCatalogChapter.id}"
          >
            Registrar Cap. ${nextCatalogChapter.chapterNumber}
          </button>
        `
        : `<span class="muted">${catalogChapters.length ? "Todos os capitulos do catalogo foram registrados." : "Sem capitulos no catalogo."}</span>`;

      return `
        <article class="manga-card">
          ${renderCover(summary)}
          <div class="manga-body">
            <div>
              <p class="eyebrow">${escapeHtml(summary.author)}</p>
              <h3>${escapeHtml(summary.title)}</h3>
              <p class="muted">${summary.catalogOnly ? "Biblioteca inicial" : `Ultima leitura: ${formatDate(summary.latestReadAt)}`}</p>
            </div>
            <div class="manga-stats">
              <span>${summary.chapters.length} lidos</span>
              <span>${summary.pages} paginas</span>
              <span>${summary.xp} XP</span>
            </div>
            <div class="chapter-tags" aria-label="Capitulos registrados">
              ${chapterTags}
            </div>
            <div class="manga-actions">
              ${actionButton}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  dom.mangaList.querySelectorAll("[data-register-chapter-id]").forEach((button) => {
    button.addEventListener("click", () => {
      registerCatalogChapter(button.dataset.registerChapterId);
    });
  });
}

function renderRanking() {
  if (!state.user) {
    return;
  }

  dom.rankingSummary.textContent = `${state.ranking.length} usuarios`;

  if (!state.ranking.length) {
    dom.rankingList.innerHTML = `
      <div class="empty-state">
        <strong>Ninguem no ranking ainda</strong>
        <span>Quando usuarios cadastrarem capitulos, o XP aparece aqui.</span>
      </div>
    `;
    return;
  }

  dom.rankingList.innerHTML = state.ranking
    .map((entry) => {
      const avatar = getAvatarById(entry.avatarId);
      const level = getLevelFromXp(Number(entry.totalXp || 0));
      const isCurrent = entry.id === state.user.id;

      return `
        <article class="ranking-item ${isCurrent ? "is-current" : ""}">
          <span class="ranking-position">${entry.position}</span>
          <div class="ranking-user">
            <img src="${avatar.src}" alt="${escapeHtml(avatar.name)} - avatar">
            <div>
              <strong>${escapeHtml(entry.displayName)}</strong>
              <span>@${escapeHtml(entry.login)} - Level ${level} - ${escapeHtml(getLevelTitle(level))}</span>
            </div>
          </div>
          <div class="ranking-score">
            <strong>${Number(entry.totalXp || 0)} XP</strong>
            <span>${Number(entry.chapters || 0)} capitulos - ${Number(entry.mangas || 0)} mangas</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDatabase() {
  if (!state.user) {
    return;
  }

  dom.databaseStatus.textContent = isFirebaseDatabase()
    ? "Firebase"
    : isApiDatabase()
      ? "Servidor SQLite"
      : "IndexedDB";
  dom.databaseUser.textContent = `${state.user.displayName} (@${state.user.login})`;
  dom.databaseRecords.textContent = `${state.chapters.length} capitulos`;
  dom.databaseCreated.textContent = formatDate(state.user.createdAt);
}

function renderAvatarGallery() {
  const stats = getStats();

  dom.avatarGallery.innerHTML = avatarCatalog
    .map((avatar) => {
      const unlocked = stats.level >= avatar.requiredLevel;
      const selected = getActiveAvatar().id === avatar.id;

      return `
        <button
          class="avatar-option ${selected ? "is-selected" : ""} ${unlocked ? "" : "is-locked"}"
          type="button"
          data-avatar-id="${avatar.id}"
          ${unlocked ? "" : "disabled"}
        >
          <img src="${avatar.src}" alt="${escapeHtml(avatar.name)}">
          <strong>${escapeHtml(avatar.name)}</strong>
          <span>Level ${avatar.requiredLevel}</span>
        </button>
      `;
    })
    .join("");

  dom.avatarGallery.querySelectorAll("[data-avatar-id]").forEach((button) => {
    button.addEventListener("click", () => selectAvatar(button.dataset.avatarId));
  });
}

function openAvatarModal() {
  renderAvatarGallery();
  dom.avatarModal.classList.remove("is-hidden");
}

function closeAvatarModal() {
  dom.avatarModal.classList.add("is-hidden");
}

async function selectAvatar(avatarId) {
  const avatar = getAvatarById(avatarId);
  const stats = getStats();

  if (stats.level < avatar.requiredLevel) {
    showToast(`Esse avatar libera no level ${avatar.requiredLevel}.`);
    return;
  }

  state.user.avatarId = avatar.id;
  state.user.updatedAt = new Date().toISOString();

  if (isFirebaseDatabase()) {
    const updatedAt = new Date().toISOString();
    await setDoc(
      doc(state.firebase.firestore, "profiles", state.user.id),
      { avatarId: avatar.id, updatedAt },
      { merge: true }
    );
    state.user.avatarId = avatar.id;
    state.user.updatedAt = updatedAt;
  } else if (isSupabaseDatabase()) {
    const { data, error } = await state.supabase
      .from("profiles")
      .update({ avatar_id: avatar.id, updated_at: state.user.updatedAt })
      .eq("id", state.user.id)
      .select("id,display_name,login,avatar_id,created_at,updated_at")
      .single();

    if (error) {
      showToast(error.message || "Nao consegui salvar o avatar.");
      return;
    }

    state.user = mapSupabaseProfile(data, { email: state.user.email });
  } else {
    state.user = (await putRecord("users", state.user)) || state.user;
  }

  await refreshRanking(false);
  renderAll();
  renderAvatarGallery();
  showToast(`${avatar.name} selecionado.`);
}

function prefillChapterForm(title = "", chapterNumber = 1, pages = 35) {
  setView("manga-view");
  dom.mangaTitleInput.value = title;
  dom.chapterNumberInput.value = Math.max(1, chapterNumber || 1);
  dom.pageCountInput.value = Math.max(1, pages || getDefaultPages(title));
  dom.readDateInput.value = toDatetimeLocal();
  dom.mangaTitleInput.focus();
}

async function handleRegister(event) {
  event.preventDefault();

  const formData = new FormData(dom.registerForm);
  const displayName = String(formData.get("displayName") || "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") || "").trim();
  const login = String(formData.get("login") || "").trim().replace(/\s+/g, "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (displayName.length < 2) {
    showToast("Digite um nome de perfil valido.");
    return;
  }

  if (!email.includes("@") || !email.includes(".")) {
    showToast("Digite um email valido.");
    return;
  }

  if (!/^[a-zA-Z0-9._-]{3,24}$/.test(login)) {
    showToast("Use login com 3 a 24 letras, numeros, ponto, traco ou underline.");
    return;
  }

  if (password.length < 6) {
    showToast("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }

  if (password !== confirmPassword) {
    showToast("As senhas nao conferem.");
    return;
  }

  if (isFirebaseDatabase()) {
    await handleFirebaseRegister({ displayName, email, login, password });
    return;
  }

  if (isSupabaseDatabase()) {
    await handleSupabaseRegister({ displayName, email, login, password });
    return;
  }

  const salt = makeSalt();
  const now = new Date().toISOString();
  const user = {
    id: makeId(),
    displayName,
    email,
    emailKey: normalizeEmail(email),
    login,
    loginKey: normalizeLogin(login),
    passwordSalt: salt,
    passwordHash: await hashPassword(password, salt),
    avatarId: DEFAULT_AVATAR_ID,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await addRecord("users", user);
    dom.registerForm.reset();
    await showAppForUser(user);
    showToast(`Conta criada, ${displayName}.`);
  } catch (error) {
    if (error?.name === "ConstraintError") {
      showToast("Esse email ou login ja esta cadastrado.");
      return;
    }

    console.error(error);
    showToast("Nao consegui criar a conta.");
  }
}

async function handleFirebaseRegister({ displayName, email, login, password }) {
  try {
    if (await loginExistsInFirebase(login)) {
      showToast("Esse login ja esta cadastrado.");
      return;
    }

    const credential = await createUserWithEmailAndPassword(state.firebase.auth, email, password);
    const profile = {
      displayName,
      email,
      login: normalizeLogin(login),
      avatarId: DEFAULT_AVATAR_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(state.firebase.firestore, "profiles", credential.user.uid), profile);
    dom.registerForm.reset();
    await showAppForUser(mapFirebaseProfile(profile, credential.user));
    showToast(`Conta online criada, ${displayName}.`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "Nao consegui criar a conta no Firebase.");
  }
}

async function handleSupabaseRegister({ displayName, email, login, password }) {
  const loginKey = normalizeLogin(login);
  const existing = await state.supabase
    .from("profiles")
    .select("id")
    .eq("login", loginKey)
    .maybeSingle();

  if (existing.error) {
    showToast(existing.error.message || "Nao consegui validar esse login.");
    return;
  }

  if (existing.data) {
    showToast("Esse login ja esta cadastrado.");
    return;
  }

  const { data, error } = await state.supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        login: loginKey,
        avatar_id: DEFAULT_AVATAR_ID,
      },
    },
  });

  if (error) {
    showToast(error.message || "Nao consegui criar a conta online.");
    return;
  }

  if (!data.session) {
    dom.registerForm.reset();
    switchAuth("login");
    showToast("Conta criada. Confirme o email e depois entre.");
    return;
  }

  try {
    const payload = {
      id: data.user.id,
      display_name: displayName,
      login: loginKey,
      avatar_id: DEFAULT_AVATAR_ID,
    };
    const inserted = await state.supabase
      .from("profiles")
      .insert(payload)
      .select("id,display_name,login,avatar_id,created_at,updated_at")
      .single();

    if (inserted.error) {
      throw inserted.error;
    }

    dom.registerForm.reset();
    await showAppForUser(mapSupabaseProfile(inserted.data, data.user));
    showToast(`Conta online criada, ${displayName}.`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "Conta criada, mas nao consegui salvar o perfil.");
  }
}

async function findUserByCredential(credential) {
  const normalized = normalizeLogin(credential);

  if (normalized.includes("@")) {
    const byEmail = await getByIndex("users", "emailKey", normalizeEmail(credential));
    if (byEmail) {
      return byEmail;
    }
  }

  const byLogin = await getByIndex("users", "loginKey", normalized);
  if (byLogin) {
    return byLogin;
  }

  return getByIndex("users", "emailKey", normalizeEmail(credential));
}

async function handleLogin(event) {
  event.preventDefault();

  const formData = new FormData(dom.loginForm);
  const credential = String(formData.get("credential") || "").trim();
  const password = String(formData.get("password") || "");

  if (isFirebaseDatabase()) {
    await handleFirebaseLogin(credential, password);
    return;
  }

  if (isSupabaseDatabase()) {
    await handleSupabaseLogin(credential, password);
    return;
  }

  const user = await findUserByCredential(credential);

  if (!user) {
    showToast("Conta nao encontrada.");
    return;
  }

  const passwordHash = await hashPassword(password, user.passwordSalt);

  if (passwordHash !== user.passwordHash) {
    showToast("Senha incorreta.");
    return;
  }

  await showAppForUser(user);
  showToast(`Bem-vindo, ${user.displayName}.`);
}

async function handleFirebaseLogin(credential, password) {
  if (!credential.includes("@")) {
    showToast("No Firebase, entre usando o email cadastrado.");
    return;
  }

  try {
    const result = await signInWithEmailAndPassword(state.firebase.auth, credential, password);
    const profile = await ensureFirebaseProfile(result.user);
    await showAppForUser(profile);
    showToast(`Bem-vindo, ${profile.displayName}.`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "Nao consegui entrar no Firebase.");
  }
}

async function handleSupabaseLogin(credential, password) {
  if (!credential.includes("@")) {
    showToast("No banco online, entre usando o email cadastrado.");
    return;
  }

  const { data, error } = await state.supabase.auth.signInWithPassword({
    email: credential,
    password,
  });

  if (error) {
    showToast(error.message || "Nao consegui entrar.");
    return;
  }

  try {
    const profile = await ensureSupabaseProfile(data.user);
    await showAppForUser(profile);
    showToast(`Bem-vindo, ${profile.displayName}.`);
  } catch (profileError) {
    console.error(profileError);
    showToast(profileError.message || "Login feito, mas nao consegui carregar o perfil.");
  }
}

function logout() {
  if (isFirebaseDatabase()) {
    signOut(state.firebase.auth);
  }

  if (isSupabaseDatabase()) {
    state.supabase.auth.signOut();
  }

  localStorage.removeItem(ACTIVE_USER_KEY);
  showAuth();
}

async function registerCatalogChapter(chapterId) {
  if (!state.user) {
    showToast("Entre na conta antes de registrar capitulos.");
    return;
  }

  const catalogChapter = getChapterByCatalogId(chapterId);

  if (!catalogChapter) {
    showToast("Esse capitulo ainda nao esta no catalogo de XP.");
    return;
  }

  if (isFirebaseDatabase()) {
    await saveFirebaseChapter(catalogChapter);
    return;
  }

  if (isSupabaseDatabase()) {
    await saveSupabaseChapter(catalogChapter, "");
    return;
  }

  await saveLocalCatalogChapter(catalogChapter);
}

async function saveLocalCatalogChapter(catalogChapter) {
  const recordId = `${state.user.id}:${catalogChapter.mangaKey}:${catalogChapter.chapterNumber}`;
  const previous = await getRecord("chapters", recordId);

  if (previous) {
    showToast("Esse capitulo ja estava registrado. XP nao duplica.");
    return;
  }

  const oldLevel = getStats().level;
  const now = new Date().toISOString();
  const record = {
    id: recordId,
    userId: state.user.id,
    userMangaKey: `${state.user.id}:${catalogChapter.mangaKey}`,
    mangaKey: catalogChapter.mangaKey,
    mangaTitle: catalogChapter.mangaTitle,
    cover: catalogChapter.cover || "",
    chapterNumber: catalogChapter.chapterNumber,
    pages: catalogChapter.pages,
    xp: catalogChapter.xp,
    readAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await putRecord("chapters", record);
  await refreshChapters(false);
  await refreshRanking(false);
  renderAll();

  const nextLevel = getStats().level;
  if (nextLevel > oldLevel) {
    showToast(`Level up! Voce chegou ao level ${nextLevel}.`);
  } else {
    showToast(`Capitulo registrado. +${catalogChapter.xp} XP.`);
  }
}

async function handleChapterSubmit(event) {
  event.preventDefault();

  if (!state.user) {
    showToast("Entre na conta antes de salvar.");
    return;
  }

  const formData = new FormData(dom.chapterForm);
  const rawTitle = String(formData.get("mangaTitle") || "").trim().replace(/\s+/g, " ");
  const chapterNumber = Number(formData.get("chapterNumber"));
  const pages = Number(formData.get("pages"));
  const readAtInput = String(formData.get("readAt") || "");

  if (!rawTitle) {
    showToast("Digite o nome do manga.");
    return;
  }

  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    showToast("Digite um numero de capitulo valido.");
    return;
  }

  const mangaKey = slugify(rawTitle);

  if (!mangaKey) {
    showToast("Digite um nome de manga valido.");
    return;
  }

  const catalogChapter = getCatalogChapter(rawTitle, chapterNumber);

  if (!catalogChapter) {
    showToast("Esse capitulo ainda nao esta no catalogo de XP.");
    return;
  }

  if (isSupabaseDatabase()) {
    await saveSupabaseChapter(catalogChapter, readAtInput);
    return;
  }

  if (!Number.isInteger(pages) || pages < 1 || pages > 300) {
    showToast("Digite XP entre 1 e 300.");
    return;
  }

  const catalog = getCatalogByKey(mangaKey);
  const mangaTitle = catalog?.title || rawTitle;
  const now = new Date().toISOString();
  const readAt = readAtInput ? new Date(readAtInput).toISOString() : now;
  const recordId = `${state.user.id}:${mangaKey}:${chapterNumber}`;
  const previous = await getRecord("chapters", recordId);
  const oldLevel = getStats().level;
  const record = {
    id: recordId,
    userId: state.user.id,
    userMangaKey: `${state.user.id}:${mangaKey}`,
    mangaKey,
    mangaTitle: catalogChapter.mangaTitle || mangaTitle,
    cover: catalogChapter.cover || catalog?.cover || "",
    chapterNumber,
    pages: catalogChapter.pages,
    xp: catalogChapter.xp,
    readAt,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  };

  await putRecord("chapters", record);
  await refreshChapters(false);
  await refreshRanking(false);
  renderAll();

  const nextLevel = getStats().level;
  dom.chapterNumberInput.value = chapterNumber + 1;
  dom.pageCountInput.value = catalog?.defaultPages || pages;
  dom.readDateInput.value = toDatetimeLocal();

  if (nextLevel > oldLevel) {
    showToast(`Level up! Voce chegou ao level ${nextLevel}.`);
  } else if (previous) {
    showToast("Capitulo atualizado no banco.");
  } else {
    showToast(`Capitulo salvo. +${catalogChapter.xp} XP.`);
  }
}

async function saveSupabaseChapter(catalogChapter, readAtInput) {
  const oldLevel = getStats().level;
  const readAt = readAtInput ? new Date(readAtInput).toISOString() : new Date().toISOString();
  const { error } = await state.supabase
    .from("read_chapters")
    .insert({
      user_id: state.user.id,
      chapter_id: catalogChapter.id,
      read_at: readAt,
    });

  if (error) {
    if (error.code === "23505") {
      showToast("Esse capitulo ja estava registrado. XP nao duplica.");
      return;
    }

    showToast(error.message || "Nao consegui salvar no banco online.");
    return;
  }

  await refreshChapters(false);
  await refreshRanking(false);
  renderAll();

  const nextLevel = getStats().level;
  dom.chapterNumberInput.value = Number(catalogChapter.chapterNumber) + 1;
  dom.pageCountInput.value = getCatalogChapter(catalogChapter.mangaTitle, Number(catalogChapter.chapterNumber) + 1)?.xp || catalogChapter.xp;
  dom.readDateInput.value = toDatetimeLocal();

  if (nextLevel > oldLevel) {
    showToast(`Level up! Voce chegou ao level ${nextLevel}.`);
  } else {
    showToast(`Capitulo salvo online. +${catalogChapter.xp} XP.`);
  }
}

async function saveFirebaseChapter(catalogChapter) {
  const oldLevel = getStats().level;
  const readId = `${state.user.id}_${catalogChapter.id}`;
  const readRef = doc(state.firebase.firestore, "readChapters", readId);
  const existing = await getDoc(readRef);

  if (existing.exists()) {
    showToast("Esse capitulo ja estava registrado. XP nao duplica.");
    return;
  }

  const now = new Date().toISOString();

  try {
    await setDoc(readRef, {
      userId: state.user.id,
      chapterId: catalogChapter.id,
      readAt: now,
      createdAt: now,
    });
  } catch (error) {
    console.error(error);
    showToast(error.message || "Nao consegui registrar no Firebase.");
    return;
  }

  await refreshChapters(false);
  await refreshRanking(false);
  renderAll();

  const nextLevel = getStats().level;
  if (nextLevel > oldLevel) {
    showToast(`Level up! Voce chegou ao level ${nextLevel}.`);
  } else {
    showToast(`Capitulo registrado online. +${catalogChapter.xp} XP.`);
  }
}

function exportCurrentUserData() {
  if (!state.user) {
    return;
  }

  const exportedAt = new Date().toISOString();
  const payload = {
    app: DB_NAME,
    version: 1,
    exportedAt,
    profile: {
      displayName: state.user.displayName,
      login: state.user.login,
      email: state.user.email,
      avatarId: state.user.avatarId,
      createdAt: state.user.createdAt,
    },
    chapters: state.chapters.map((chapter) => ({
      mangaTitle: chapter.mangaTitle,
      mangaKey: chapter.mangaKey,
      chapterNumber: chapter.chapterNumber,
      pages: chapter.pages,
      xp: chapter.xp,
      readAt: chapter.readAt,
      createdAt: chapter.createdAt,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `manga-loner-${slugify(state.user.login)}-${formatFileDate(exportedAt)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Backup exportado.");
}

function openImportPicker() {
  dom.importInput.value = "";
  dom.importInput.click();
}

async function importCurrentUserData(event) {
  const file = event.target.files?.[0];

  if (!file || !state.user) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const chapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
    let imported = 0;

    for (const item of chapters) {
      const mangaTitle = String(item.mangaTitle || "").trim().replace(/\s+/g, " ");
      const mangaKey = slugify(item.mangaKey || mangaTitle);
      const chapterNumber = Number(item.chapterNumber);
      const pages = Number(item.pages || item.xp || 35);

      if (!mangaTitle || !mangaKey || !Number.isInteger(chapterNumber) || chapterNumber < 1) {
        continue;
      }

      if (!Number.isInteger(pages) || pages < 1 || pages > 300) {
        continue;
      }

      const catalog = getCatalogByKey(mangaKey);
      const recordId = `${state.user.id}:${mangaKey}:${chapterNumber}`;
      const previous = await getRecord("chapters", recordId);
      const now = new Date().toISOString();
      const record = {
        id: recordId,
        userId: state.user.id,
        userMangaKey: `${state.user.id}:${mangaKey}`,
        mangaKey,
        mangaTitle: catalog?.title || mangaTitle,
        cover: catalog?.cover || "",
        chapterNumber,
        pages,
        xp: pages,
        readAt: item.readAt || now,
        createdAt: previous?.createdAt || item.createdAt || now,
        updatedAt: now,
      };

      await putRecord("chapters", record);
      imported += 1;
    }

    if (parsed.profile?.avatarId) {
      state.user.avatarId = parsed.profile.avatarId;
      state.user.updatedAt = new Date().toISOString();
      await putRecord("users", state.user);
    }

    await refreshChapters(false);
    await refreshRanking();
    showToast(`${imported} capitulos importados.`);
  } catch (error) {
    console.error(error);
    showToast("Nao consegui importar esse JSON.");
  }
}

function updatePagesFromTitle() {
  const title = dom.mangaTitleInput.value;
  const chapterNumber = Number(dom.chapterNumberInput.value || 1);
  const pages = getCatalogChapter(title, chapterNumber)?.xp || getDefaultPages(title);

  dom.pageCountInput.value = pages;
}

async function boot() {
  try {
    state.db = await openDatabase();
    await refreshSupabaseCatalog();
    renderMangaOptions();
    dom.readDateInput.value = toDatetimeLocal();

    if (isFirebaseDatabase()) {
      const authUser = await getFirebaseCurrentUser();

      if (authUser) {
        const profile = await ensureFirebaseProfile(authUser);
        await showAppForUser(profile);
        return;
      }
    }

    if (isSupabaseDatabase()) {
      const { data, error } = await state.supabase.auth.getSession();

      if (error) {
        console.error(error);
      }

      if (data?.session?.user) {
        const profile = await ensureSupabaseProfile(data.session.user);
        await showAppForUser(profile);
        return;
      }
    }

    const activeUserId = localStorage.getItem(ACTIVE_USER_KEY);
    if (activeUserId) {
      const user = await getRecord("users", activeUserId);

      if (user) {
        await showAppForUser(user);
        return;
      }
    }

    localStorage.removeItem(ACTIVE_USER_KEY);
    showAuth();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Nao consegui abrir o banco local.");
  }
}

dom.loginTab.addEventListener("click", () => switchAuth("login"));
dom.registerTab.addEventListener("click", () => switchAuth("register"));
dom.loginForm.addEventListener("submit", handleLogin);
dom.registerForm.addEventListener("submit", handleRegister);
dom.logoutButton.addEventListener("click", logout);
dom.quickAddButton.addEventListener("click", () => setView("manga-view"));
dom.chapterForm.addEventListener("submit", handleChapterSubmit);
dom.mangaSearch.addEventListener("input", () => {
  state.search = dom.mangaSearch.value;
  renderMangaList();
});
dom.mangaTitleInput.addEventListener("change", updatePagesFromTitle);
dom.chapterNumberInput.addEventListener("input", updatePagesFromTitle);
dom.exportButton.addEventListener("click", exportCurrentUserData);
dom.importButton.addEventListener("click", openImportPicker);
dom.importInput.addEventListener("change", importCurrentUserData);
dom.avatarButton.addEventListener("click", openAvatarModal);
dom.closeAvatarModal.addEventListener("click", closeAvatarModal);
dom.avatarModal.addEventListener("click", (event) => {
  if (event.target === dom.avatarModal) {
    closeAvatarModal();
  }
});

dom.navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

boot();
