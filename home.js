import { DEFAULT_AVATAR_PATH } from "./utils.js";
import { renderCoinProgress } from "./coin.js";

const PRIVILEGED_ROLES = ["GOD", "OWNER", "RESELLER"];

export function initHomeNavigation(navigateFn) {
  document.querySelectorAll(".feature-card[data-nav]").forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.dataset.nav;
      if (target) navigateFn(target);
    });
  });
}

export function renderHomeProfile(profile) {
  if (!profile) return;

  const avatarUrl = profile.photoURL || DEFAULT_AVATAR_PATH;
  const username = profile.username || "Pengguna";
  const userClass = profile.userClass || "-";
  const gender = profile.gender || "-";
  const coins = Number(profile.coins || 0);
  const isPremium = Boolean(profile.isPremium);
  const rawRole = String(profile.role || "MEMBER").toUpperCase();
  const displayRole = PRIVILEGED_ROLES.includes(rawRole) ? rawRole : isPremium ? "PREMIUM" : "MEMBER";

  // Header & Sidebar avatars
  const headerAvatar = document.getElementById("header-avatar");
  const sidebarAvatar = document.getElementById("sidebar-avatar");
  const homeAvatar = document.getElementById("home-profile-avatar");
  if (headerAvatar) headerAvatar.src = avatarUrl;
  if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
  if (homeAvatar) homeAvatar.src = avatarUrl;

  // Text details
  const sidebarUsername = document.getElementById("sidebar-username");
  const homeUsername = document.getElementById("home-username");
  const heroWelcomeName = document.getElementById("hero-welcome-name");
  if (sidebarUsername) sidebarUsername.textContent = username;
  if (homeUsername) homeUsername.textContent = username;
  if (heroWelcomeName) heroWelcomeName.textContent = username;

  const classTag = document.getElementById("home-class-tag");
  const genderTag = document.getElementById("home-gender-tag");
  const coinCount = document.getElementById("home-coin-count");
  const roleStatus = document.getElementById("home-role-status");

  if (classTag) classTag.textContent = `Kelas: ${userClass}`;
  if (genderTag) genderTag.textContent = `Gender: ${gender}`;
  if (coinCount) coinCount.textContent = `${coins} COIN`;
  if (roleStatus) roleStatus.textContent = displayRole;

  // Badges
  const homeBadge = document.getElementById("home-premium-badge");
  const sidebarBadge = document.getElementById("sidebar-role-badge");

  if (homeBadge) {
    homeBadge.textContent = isPremium ? "PREMIUM" : "STANDARD";
    homeBadge.className = `status-pill ${isPremium ? "premium" : "standard"}`;
  }

  if (sidebarBadge) {
    sidebarBadge.textContent = displayRole;
    sidebarBadge.className = `role-badge ${displayRole.toLowerCase()}`;
  }

  renderCoinProgress(profile);
}
