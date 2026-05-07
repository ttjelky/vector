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

export const TabsProvider = ({ children }) => {
  // Ключ поточного юзера — при його зміні стан вкладок скидається.
  const [currentUserId, setCurrentUserId] = useState(getCurrentUserId);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  // Слухаємо зміни userId (login / logout / зміна акаунту).
  // NavBar при logout очищає localStorage і викидає подію 'auth-changed'.
  useEffect(() => {
    const sync = () => {
      const nextId = getCurrentUserId();
      setCurrentUserId(prev => {
        if (prev !== nextId) {
          // Акаунт змінився — скидаємо всі вкладки
          setOpenTabs([]);
          setActiveTabId(null);
        }
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
    setOpenTabs((prev) => {
      if (prev.find((t) => sameId(t.id, tournament.id))) return prev;
      return [...prev, tournament];
    });
    setActiveTabId(tournament.id);
  }, []);

  const closeTab = useCallback((id) => {
    setOpenTabs((prev) => prev.filter((t) => !sameId(t.id, id)));
    setActiveTabId((prev) => (sameId(prev, id) ? null : prev));
  }, []);

  /**
   * Викликається ззовні, коли користувача виключено з турніру
   * або турнір було видалено. Ідентично closeTab, але семантично окреме.
   */
  const removeTabById = useCallback((id) => {
    closeTab(id);
  }, [closeTab]);

  /**
   * Оновити метадані вкладки (наприклад, назву турніру після редагування).
   */
  const updateTab = useCallback((id, patch) => {
    setOpenTabs((prev) =>
      prev.map((t) => (sameId(t.id, id) ? { ...t, ...patch } : t))
    );
  }, []);

  return (
    <TabsContext.Provider
      value={{ openTabs, activeTabId, addTab, closeTab, removeTabById, updateTab }}
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
