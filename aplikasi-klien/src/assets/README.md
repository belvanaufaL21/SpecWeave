# Assets Folder

Place your images, icons, and other static assets here.

## Structure
- `/images` - Image files (png, jpg, svg)
  - `logo.svg` - Main SpecWeave logo (32x32)
  - `logo-large.svg` - Large SpecWeave logo (48x48)
  - `logo-icon-only.svg` - Icon only version (32x32)
  - `favicon.svg` - Favicon version (64x64)
- `/fonts` - Custom fonts (if any)

## Logo Usage

The SpecWeave logo features a modern weave pattern combining the letters "S" and "W" with connecting dots to represent the weaving concept. The logo uses a gradient from purple to pink to blue.

### Logo Component

Use the `Logo` component from `../components/common/Logo.jsx` for consistent branding:

```jsx
import Logo from '../components/common/Logo';

// Different sizes
<Logo size="sm" />   // 24x24
<Logo size="md" />   // 32x32 (default)
<Logo size="lg" />   // 48x48
<Logo size="xl" />   // 64x64

// With or without text
<Logo showText={true} />   // Shows "SpecWeave" text
<Logo showText={false} />  // Icon only

// Custom styling
<Logo 
  size="lg" 
  showText={true}
  className="custom-class"
  textClassName="text-lg font-bold"
/>
```

### Direct SVG Usage

For cases where you need direct SVG access:
- `logo.svg` - Standard logo with background circle
- `logo-icon-only.svg` - Clean icon without background
- `favicon.svg` - Square format for favicons
