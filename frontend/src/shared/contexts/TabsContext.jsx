import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';

const TabsContext = createContext();

// Завжди порівнюємо id як рядки — id з useParams() є рядком,
// а id з API може бути числом. Без нормалізації filter/find не спрацьовує.
const sameId = (a, b) => String(a) === String(b);

/**
 * Повертає поточний userId з localStorage.
 * Використовується щоб прив'язати стан вкладок до конкретного акаунту.
 */
const getCurrentUserId = () => localStorage.getItem('userId') ?? null;

const tabsKey = (uid) => `vector_tabs_${uid ?? 'guest'}`;
const pinnedKey = (uid) => `vector_pinned_${uid ?? 'guest'}`;

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const TabsProvider = ({ children }) => {
  // Ключ поточного юзера — при його зміні стан вкладок скидається.
  const [currentUserId, setCurrentUserId] = useState(getCurrentUserId);
  const [openTabs, setOpenTabs] = useState(() => readJSON(tabsKey(getCurrentUserId()), []));
  const [pinnedIds, setPinnedIds] = useState(() => readJSON(pinnedKey(getCurrentUserId()), []).map(String));
  const [activeTabId, setActiveTabId] = useState(null);

  // Id вкладок, доданих після маунту провайдера і ще не показаних.
  // NavBar живе всередині кожної сторінки і перемонтовується при навігації,
  // тому CSS enter-анімацію можна грати лише для справді нових id —
  // інакше вона б програвалась при кожному кліку по сайдбару.
  const freshIds = useRef(new Set());

  const isFreshTab = useCallback((id) => freshIds.current.has(String(id)), []);
  const markTabSeen = useCallback((id) => {
    freshIds.current.delete(String(id));
  }, []);
  // Щоб не затирати localStorage пустим станом під час першого маунту
  // до того як прочитали актуальні дані — пропускаємо перший запис,
  // якщо юзер змінився ми вже встановили свіжий стан через sync.
  const hydratedFor = useRef(currentUserId);

  // Персист відкритих вкладок + пінів (per-user).
  useEffect(() => {
    if (hydratedFor.current !== currentUserId) {
      hydratedFor.current = currentUserId;
      return;
    }
    try {
      localStorage.setItem(tabsKey(currentUserId), JSON.stringify(openTabs));
    } catch {}
  }, [openTabs, currentUserId]);

  useEffect(() => {
    if (hydratedFor.current !== currentUserId) return;
    try {
      localStorage.setItem(pinnedKey(currentUserId), JSON.stringify(pinnedIds));
    } catch {}
  }, [pinnedIds, currentUserId]);

  // Слухаємо зміни userId (login / logout / зміна акаунту).
  // NavBar при logout очищає localStorage і викидає подію 'auth-changed'.
  useEffect(() => {
    const sync = () => {
      const nextId = getCurrentUserId();
      setCurrentUserId((prev) => {
        if (prev === nextId) return prev;
        // Акаунт змінився — підвантажуємо його вкладки/піни
        hydratedFor.current = nextId;
        setOpenTabs(readJSON(tabsKey(nextId), []));
        setPinnedIds(readJSON(pinnedKey(nextId), []).map(String));
        setActiveTabId(null);
        return nextId;
      });
    };

    window.addEventListener('auth-changed', sync);
    window.addEventListener('storage', sync);          // зміни з інших вкладок браузера
    return () => {
      window.removeEventListener('auth-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const addTab = useCallback((tournament) => {
    if (tournament?.id == null) return;
    setOpenTabs((prev) => {
      const existing = prev.find((t) => sameId(t.id, tournament.id));
      if (existing) {
        // Оновлюємо назву, якщо змінилась (напр. після редагування)
        if (tournament.name && existing.name !== tournament.name) {
          return prev.map((t) => (sameId(t.id, tournament.id) ? { ...t, name: tournament.name } : t));
        }
        return prev;
      }
      // Справді нова вкладка — їй належить enter-анімація при першому показі.
      freshIds.current.add(String(tournament.id));
      return [...prev, { id: tournament.id, name: tournament.name ?? `Турнір ${tournament.id}` }];
    });
    setActiveTabId(tournament.id);
  }, []);

  const pinnedRef = useRef([]);
  useEffect(() => {
    pinnedRef.current = pinnedIds;
  }, [pinnedIds]);

  const closeTab = useCallback((id) => {
    // Закріплені вкладки не закриваємо мовчки — спочатку треба відкріпити.
    if (pinnedRef.current.some((p) => sameId(p, id))) return false;
    setOpenTabs((prev) => prev.filter((t) => !sameId(t.id, id)));
    setActiveTabId((prev) => (prev != null && sameId(prev, id) ? null : prev));
    return true;
  }, []);

  /**
   * Викликається ззовні, коли користувача виключено з турніру
   * або турнір було видалено. Закріплення не рятує — видаляємо примусово.
   */
  const removeTabById = useCallback((id) => {
    setPinnedIds((prev) => prev.filter((p) => !sameId(p, id)));
    setOpenTabs((prev) => prev.filter((t) => !sameId(t.id, id)));
    setActiveTabId((prev) => (prev != null && sameId(prev, id) ? null : prev));
  }, []);

  /**
   * Оновити метадані вкладки (наприклад, назву турніру після редагування).
   */
  const updateTab = useCallback((id, patch) => {
    setOpenTabs((prev) =>
      prev.map((t) => (sameId(t.id, id) ? { ...t, ...patch } : t))
    );
  }, []);

  const pinTab = useCallback((id) => {
    setPinnedIds((prev) => (prev.some((p) => sameId(p, id)) ? prev : [...prev, String(id)]));
  }, []);

  const unpinTab = useCallback((id) => {
    setPinnedIds((prev) => prev.filter((p) => !sameId(p, id)));
  }, []);

  const togglePin = useCallback((id) => {
    setPinnedIds((prev) =>
      prev.some((p) => sameId(p, id)) ? prev.filter((p) => !sameId(p, id)) : [...prev, String(id)]
    );
  }, []);

  const isPinned = useCallback((id) => pinnedIds.some((p) => sameId(p, id)), [pinnedIds]);

  // Закріплені завжди першими, зберігаючи відносний порядок.
  const sortedTabs = openTabs.slice().sort((a, b) => {
    const pa = pinnedIds.some((p) => sameId(p, a.id)) ? 0 : 1;
    const pb = pinnedIds.some((p) => sameId(p, b.id)) ? 0 : 1;
    return pa - pb;
  });

  return (
    <TabsContext.Provider
      value={{
        openTabs: sortedTabs,
        activeTabId,
        addTab,
        closeTab,
        removeTabById,
        updateTab,
        pinnedIds,
        pinTab,
        unpinTab,
        togglePin,
        isPinned,
        isFreshTab,
        markTabSeen,
      }}
    >
      {children}
    </TabsContext.Provider>
  );
};

export const useTabs = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used inside <TabsProvider>');
  return ctx;
};
