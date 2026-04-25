import React, { createContext, useState, useContext } from 'react';

const TabsContext = createContext();

export const TabsProvider = ({ children }) => {
  const [openTabs, setOpenTabs] = useState([]);

  const addTab = (tournament) => {
    setOpenTabs((prev) => {

      if (prev.find(t => t.id === tournament.id)) return prev;
      return [...prev, tournament];
    });
  };

  const closeTab = (id) => {
    setOpenTabs((prev) => prev.filter(t => t.id !== id));
  };

  return (
    <TabsContext.Provider value={{ openTabs, addTab, closeTab }}>
      {children}
    </TabsContext.Provider>
  );
};

export const useTabs = () => useContext(TabsContext);