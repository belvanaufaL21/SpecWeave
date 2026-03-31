/**
 * Active Section Hook
 * Tracks which section is currently in view for navigation highlighting
 */

import { useState, useEffect } from 'react';

export const useActiveSection = (sectionIds = [], offset = 100) => {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offset;

      // Find the section that is currently in view
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const element = document.getElementById(sectionIds[i]);
        if (element) {
          const elementTop = element.offsetTop;
          if (scrollPosition >= elementTop) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }

      // If we're at the top of the page, no section is active
      if (window.scrollY < 100) {
        setActiveSection('');
      }
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [sectionIds, offset]);

  return activeSection;
};

export default useActiveSection;