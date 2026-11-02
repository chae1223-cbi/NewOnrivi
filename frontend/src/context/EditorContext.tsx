"use client";

import React, { createContext, useContext } from 'react';

// MainEditorApp의 모든 상태와 함수를 담는 거대한 보따리
export const EditorContext = createContext<any>(null);

export function EditorProvider({ children, value }: { children: React.ReactNode, value: any }) {
  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
}
