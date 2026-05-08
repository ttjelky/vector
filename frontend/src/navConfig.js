// ─────────────────────────────────────────────────────────────────
//  navConfig.js
//  Єдине місце де описана навігація для кожної ролі.
//  Щоб додати нову вкладку — просто додай об'єкт у потрібний масив.
//  Щоб додати нову роль — додай новий ключ у ROLE_TABS.
// ─────────────────────────────────────────────────────────────────

export const COMMON_TABS = [
  { key: "profile",  label: "Мій профіль", path: "/profile"  },
  { key: "settings", label: "Налаштування", path: "/settings" },
  { key: "help",     label: "Допомога",     path: "/help"     },
];

export const ROLE_TABS = {
  admin: [
    { key: "home",        label: "Головна",    path: "/admindashboard" },
    { key: "tournaments", label: "Турніри",    path: "/tournaments"    },
    { key: "stats",       label: "Статистика", path: "/stats"          },
  ],

  jury: [
    { key: "home",        label: "Головна", path: "/jury"        },
    { key: "tournaments", label: "Турніри", path: "/tournaments" },
  ],

  participant: [
    { key: "home",        label: "Головна", path: "/dashboard"   },
    { key: "tournaments", label: "Турніри", path: "/tournaments" },
    { key: "news",        label: "Новини",  path: "/news"        },
  ],
};

// Головний маршрут після логіну для кожної ролі
export const ROLE_HOME = {
  admin:       "/admindashboard",
  jury:        "/jury",
  participant: "/dashboard",
};

/**
 * Повертає лише роль-специфічні вкладки (без COMMON_TABS).
 * COMMON_TABS рендеряться окремо в NavBar у секції "Інше".
 * @param {string} role
 * @returns {{ key: string, label: string, path: string }[]}
 */
export function getTabsForRole(role) {
  return ROLE_TABS[role] ?? ROLE_TABS.participant;
}
