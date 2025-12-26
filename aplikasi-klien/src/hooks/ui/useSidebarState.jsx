import { useState, useCallback } from 'react';

/**
 * Custom hook untuk mengelola state sidebar
 */
const useSidebarState = () => {
  // State untuk sidebar behavior
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [ignoreHover, setIgnoreHover] = useState(false);
  
  // State untuk menu
  const [openMenuId, setOpenMenuId] = useState(null);
  const [sidebarMenuPos, setSidebarMenuPos] = useState({ x: 0, y: 0 });

  // Computed state - sidebar visible jika pinned, hovered, atau ada menu terbuka
  const isSidebarVisible = isPinned || (isHovered && !ignoreHover) || openMenuId !== null;

  /**
   * Toggle pin state sidebar
   */
  const toggleSidebarPin = useCallback(() => {
    if (isPinned) {
      setIsPinned(false);
      setIsHovered(false);
      setIgnoreHover(true);
      // Reset ignore hover setelah animasi selesai
      setTimeout(() => setIgnoreHover(false), 600);
    } else {
      setIsPinned(true);
    }
  }, [isPinned]);

  /**
   * Handle mouse enter pada trigger zone
   */
  const handleTriggerEnter = useCallback(() => {
    if (!isPinned && !ignoreHover) {
      setIsHovered(true);
    }
  }, [isPinned, ignoreHover]);

  /**
   * Handle mouse leave dari sidebar
   */
  const handleSidebarLeave = useCallback(() => {
    if (!isPinned) {
      setIsHovered(false);
    }
  }, [isPinned]);

  /**
   * Toggle menu sidebar dengan posisi
   */
  const toggleSidebarMenu = useCallback((event, menuId) => {
    event.stopPropagation();
    
    if (openMenuId === menuId) {
      setOpenMenuId(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setSidebarMenuPos({
        x: rect.right + 5,
        y: rect.top - 10
      });
      setOpenMenuId(menuId);
    }
  }, [openMenuId]);

  /**
   * Close semua menu
   */
  const closeAllMenus = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  /**
   * Reset semua state sidebar
   */
  const resetSidebarState = useCallback(() => {
    setIsHovered(false);
    setIsPinned(false);
    setIgnoreHover(false);
    setOpenMenuId(null);
    setSidebarMenuPos({ x: 0, y: 0 });
  }, []);

  return {
    // State
    isHovered,
    isPinned,
    ignoreHover,
    openMenuId,
    sidebarMenuPos,
    isSidebarVisible,
    
    // Actions
    toggleSidebarPin,
    handleTriggerEnter,
    handleSidebarLeave,
    toggleSidebarMenu,
    closeAllMenus,
    resetSidebarState,
    
    // Setters (untuk kasus khusus)
    setOpenMenuId,
    setSidebarMenuPos
  };
};

export default useSidebarState;