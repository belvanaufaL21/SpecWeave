/**
 * Animated Counter Component
 * Displays animated counting numbers with intersection observer
 */

import { useState, useEffect } from 'react';
import { useScrollAnimation } from '../../hooks/ui/useScrollAnimation.js';
import { formatCounterValue } from '../../utils/helpers/landingHelpers.js';

const AnimatedCounter = ({ end, duration = 2000, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useScrollAnimation();

  useEffect(() => {
    if (!isVisible) return;
    
    // Handle non-numeric values
    if (typeof end === 'string') {
      setCount(end);
      return;
    }
    
    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref}>
      {formatCounterValue(count, end, suffix)}
    </span>
  );
};

export default AnimatedCounter;