import { createContext, useContext } from 'react';

// True while a page is rendered inside the signed-in app shell (sidebar layout), so it can skip its own public navbar.
export const ShellContext = createContext(false);
export const useInShell = () => useContext(ShellContext);
