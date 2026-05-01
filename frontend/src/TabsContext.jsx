import React, { createContext, useState, useContext, useCallback } from 'react';

const TabsContext = createContext();

export const TabsProvider = ({ children }) => {
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  const addTab = useCallback((tournament) => {
    setOpenTabs((prev) => {
      if (prev.find((t) => t.id === tournament.id)) return prev;
      return [...prev, tournament];
    });
    setActiveTabId(tournament.id);
  }, []);

  const closeTab = useCallback((id) => {
    setOpenTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      return filtered;
    });
    setActiveTabId((prev) => (prev === id ? null : prev));
  }, []);

  /**
   * Викликаєтьсяззовні, коли користувача виключено з турніру
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
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
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
