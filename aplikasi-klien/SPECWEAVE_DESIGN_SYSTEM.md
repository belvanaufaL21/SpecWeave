# SpecWeave Design System

## 🎨 Identitas Visual SpecWeave

SpecWeave memiliki identitas visual yang khas dengan fokus pada **Purple-Pink Gradient** sebagai signature brand, dikombinasikan dengan **Dark Theme** yang elegan dan profesional.

---

## 🌈 Color Palette

### Primary Colors (Signature)
```
Purple: #9333ea (purple-600) → #a855f7 (purple-500)
Pink:   #db2777 (pink-600)   → #ec4899 (pink-500)
```

### Gradient Combinations
```css
/* Primary Gradient - SpecWeave Signature */
from-purple-600 to-pink-600

/* METEOR Test Type */
from-purple-600 to-purple-500

/* Sentence-BERT Test Type */
from-pink-600 to-pink-500

/* Subtle Background Gradient */
from-purple-500/20 to-pink-500/20
```

### Neutral Colors
```
Background: #020203 (almost black)
Card:       #0a0a0f (dark gray with opacity)
Border:     white/5 to white/10 (subtle)
Text:       white, gray-300, gray-400
```

---

## ✨ Signature Design Elements

### 1. Gradient Text
```jsx
<h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
  SpecWeave Title
</h1>
```

### 2. Glow Effect (Subtle)
```jsx
<div className="relative">
  {/* Glow layer */}
  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-5 blur-2xl rounded-xl"></div>
  
  {/* Content */}
  <div className="relative">Content here</div>
</div>
```

### 3. Icon Badge with Gradient
```jsx
<div className="relative">
  {/* Glow */}
  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 opacity-20 blur-md rounded-xl"></div>
  
  {/* Badge */}
  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
    <span className="text-xl">🎯</span>
  </div>
</div>
```

### 4. Accent Line (Vertical)
```jsx
<div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
```

### 5. Signature Border
```jsx
<div className="relative">
  {/* Gradient border glow */}
  <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20 rounded-2xl blur-sm"></div>
  
  {/* Content */}
  <div className="relative bg-[#0a0a0f]/60 backdrop-blur-xl rounded-2xl border border-white/10">
    Content
  </div>
</div>
```

### 6. Button with Gradient Overlay
```jsx
<button className="group relative px-4 py-2 rounded-lg overflow-hidden">
  {/* Gradient background */}
  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
  
  {/* Text */}
  <span className="relative text-white">Button Text</span>
</button>
```

### 7. Hover Accent Line
```jsx
<div className="group relative">
  {/* Accent line appears on hover */}
  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
  
  <div className="pl-4">Content</div>
</div>
```

---

## 🎯 Component Patterns

### Tab Navigation (SpecWeave Style)
```jsx
<div className="flex gap-2 bg-[#0a0a0f]/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5">
  <button className="group relative flex-1 rounded-xl overflow-hidden">
    {/* Active state gradient */}
    {isActive && (
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-20"></div>
    )}
    
    {/* Border with glow */}
    <div className={`absolute inset-0 rounded-xl border ${
      isActive 
        ? 'border-purple-500/40 shadow-lg shadow-purple-500/10' 
        : 'border-white/5'
    }`}></div>
    
    {/* Content */}
    <div className="relative px-5 py-3.5">
      <span className={isActive ? 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent' : 'text-gray-400'}>
        Tab Label
      </span>
    </div>
  </button>
</div>
```

### Card with Signature Border
```jsx
<div className="relative">
  {/* Signature gradient border */}
  <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20 rounded-2xl blur-sm"></div>
  
  {/* Card content */}
  <div className="relative bg-[#0a0a0f]/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
    Card Content
  </div>
</div>
```

### Section Header with Accent
```jsx
<div className="flex items-center gap-2 mb-4">
  {/* Vertical accent line */}
  <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
  
  <h3 className="text-lg font-bold text-white">Section Title</h3>
  <span className="text-lg">🔬</span>
</div>
```

---

## 🚫 Don'ts

### ❌ Avoid These Colors
- Blue (except in legacy components being migrated)
- Green (use purple for success states)
- Red (use pink for error states)
- Orange, Yellow, Teal, Cyan, etc.

### ❌ Avoid These Patterns
- Solid color backgrounds (use gradients or dark neutrals)
- Bright, saturated colors (keep it subtle and elegant)
- Multiple competing gradients in one view
- Harsh borders (use subtle white/5 to white/10)

---

## ✅ Do's

### ✅ Use These Patterns
- Purple-Pink gradients for brand elements
- Dark backgrounds (#020203, #0a0a0f)
- Subtle borders (white/5 to white/10)
- Gradient text for emphasis
- Glow effects for depth (opacity 5-20%)
- Smooth transitions (300ms duration)

### ✅ Spacing & Typography
- Consistent padding: p-4, p-6 (avoid p-8 unless needed)
- Consistent gaps: gap-2, gap-3, gap-4
- Font sizes: text-xs, text-sm, text-base, text-lg, text-xl
- Font weights: font-medium, font-semibold, font-bold
- Line heights: leading-tight, leading-normal

---

## 🎨 Color Usage by Context

### Success States
```jsx
// Use purple instead of green
<div className="bg-purple-500/10 border border-purple-500/20 text-purple-300">
  Success message
</div>
```

### Error States
```jsx
// Use pink instead of red
<div className="bg-pink-500/10 border border-pink-500/20 text-pink-300">
  Error message
</div>
```

### Info States
```jsx
// Use purple gradient
<div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
  Info message
</div>
```

### Score Display
```jsx
// Use gradient for scores
<div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
  85.5%
</div>
```

---

## 📐 Layout Principles

### Container Hierarchy
```
1. Page Container: max-w-7xl mx-auto px-6 py-6
2. Section Container: mb-6 (consistent spacing)
3. Card Container: rounded-2xl border border-white/10
4. Inner Content: p-4 or p-6
```

### Border Radius
```
Small elements:  rounded-lg  (8px)
Medium elements: rounded-xl  (12px)
Large elements:  rounded-2xl (16px)
```

### Opacity Levels
```
Subtle:    opacity-5  to opacity-10  (backgrounds)
Moderate:  opacity-20 to opacity-40  (overlays)
Visible:   opacity-60 to opacity-90  (active states)
Full:      opacity-100               (primary content)
```

---

## 🎭 Animation & Transitions

### Standard Transitions
```css
transition-all duration-300
transition-opacity duration-300
transition-colors duration-300
```

### Hover Effects
```jsx
// Subtle background change
hover:bg-white/5

// Opacity change
group-hover:opacity-100

// Border glow
hover:border-white/20
hover:shadow-lg hover:shadow-purple-500/10
```

### Pulse Animation (for indicators)
```jsx
<div className="w-1.5 h-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-pulse"></div>
```

---

## 📱 Responsive Considerations

### Mobile First
- Use flex-col on mobile, flex-row on desktop
- Adjust padding: px-4 on mobile, px-6 on desktop
- Stack cards vertically on mobile

### Breakpoints
```
sm:  640px  (small tablets)
md:  768px  (tablets)
lg:  1024px (laptops)
xl:  1280px (desktops)
2xl: 1536px (large desktops)
```

---

## 🔧 Implementation Checklist

When creating new components:

- [ ] Use purple-pink gradient for brand elements
- [ ] Use dark backgrounds (#020203, #0a0a0f)
- [ ] Use subtle borders (white/5 to white/10)
- [ ] Add glow effects for depth (optional)
- [ ] Use gradient text for emphasis
- [ ] Add smooth transitions (300ms)
- [ ] Avoid forbidden colors (blue, green, red, etc.)
- [ ] Test hover states
- [ ] Ensure consistent spacing
- [ ] Check mobile responsiveness

---

## 📚 Reference Files

- Brand Colors: `aplikasi-klien/src/utils/brandColors.js`
- Example Implementation: `aplikasi-klien/src/pages/TestResultsDetailPage.jsx`
- Design Tokens: Use Tailwind CSS classes consistently

---

**Last Updated:** 2026-02-18
**Version:** 1.0.0
**Maintained by:** SpecWeave Team
