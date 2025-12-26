/**
 * Scroll Animation Hook
 * Custom hook for intersection observer-based scroll animations
 */

import { useState, useEffect, useRef } from 'react';
import { createScrollObserver } from '../../utils/helpers/landingHelpers.js';

export const useScrollAnimation = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = createScrollObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      options
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return [ref, isVisible];
};