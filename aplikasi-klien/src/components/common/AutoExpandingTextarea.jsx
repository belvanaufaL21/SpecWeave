import { useEffect, useRef, forwardRef } from 'react';

const AutoExpandingTextarea = forwardRef(({ 
  value, 
  onChange, 
  placeholder, 
  className = '', 
  minRows = 2,
  maxRows = 10,
  ...props 
}, ref) => {
  const textareaRef = useRef(null);

  // Use the forwarded ref if provided, otherwise use internal ref
  const actualRef = ref || textareaRef;

  const adjustHeight = () => {
    const textarea = actualRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the number of rows based on content
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
    const padding = parseInt(window.getComputedStyle(textarea).paddingTop) + 
                   parseInt(window.getComputedStyle(textarea).paddingBottom);
    
    const contentHeight = textarea.scrollHeight - padding;
    const actualRows = Math.ceil(contentHeight / lineHeight);
    const displayRows = Math.max(minRows, Math.min(maxRows, actualRows));
    
    // Set the height based on calculated rows
    textarea.style.height = `${displayRows * lineHeight + padding}px`;
    
    // Enable/disable scrolling based on whether content exceeds maxRows
    if (actualRows > maxRows) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  useEffect(() => {
    adjustHeight();
  }, []);

  const handleChange = (e) => {
    onChange(e);
    // Small delay to ensure the value is updated before adjusting height
    setTimeout(adjustHeight, 0);
  };

  return (
    <textarea
      ref={actualRef}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={`resize-none ${className}`}
      style={{ minHeight: `${minRows * 1.5}rem` }}
      {...props}
    />
  );
});

AutoExpandingTextarea.displayName = 'AutoExpandingTextarea';

export default AutoExpandingTextarea;