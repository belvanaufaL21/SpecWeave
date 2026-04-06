# Responsive Improvements untuk Layar Kecil

## Ringkasan Perubahan

Aplikasi telah dioptimalkan untuk layar kecil (mobile) dengan perubahan berikut:

### 1. Hook useResponsive
**File**: `src/hooks/useResponsive.js`

Custom hook untuk mendeteksi ukuran layar:
- `isMobile`: < 768px
- `isTablet`: 768px - 1024px  
- `isDesktop`: > 1024px

### 2. Panel Testing Scenario yang Minimizable
**File**: `src/components/common/MinimizableTestingPanel.jsx`

- **Desktop**: Panel bisa di-minimize menjadi icon saja (60px width)
- **Mobile**: Panel muncul sebagai floating button, ketika diklik muncul full-screen modal dari kanan

### 3. Header yang Responsive
**File**: `src/components/layout/ChatHeader.jsx`

Perubahan untuk layar kecil:
- Tombol Template: Hanya menampilkan icon
- Tombol JIRA Connection: Hanya menampilkan icon
- Tombol Epic Selection: Hanya menampilkan icon
- Header AI info (Groq Llama 3.1): Disembunyikan di mobile

### 4. Chat Input yang Responsive
**File**: `src/components/chat/ResponsiveChatInput.jsx`

Komponen baru dengan fitur:
- Tombol Format Guide: Icon only di mobile
- Tombol Use Format: Icon only di mobile
- Dropdown AI Model: Icon only di mobile (dengan tooltip)
- Tombol Send: Icon only di mobile
- Textarea auto-resize dengan max-height yang disesuaikan

### 5. Sidebar yang Responsive
**File**: `src/components/layout/ChatSidebar.jsx`

- **Desktop**: Sidebar 280px dengan hover behavior
- **Mobile**: Sidebar full-width (100%) yang menutupi seluruh layar
- Backdrop overlay untuk menutup sidebar di mobile

## Cara Menggunakan

### Mengintegrasikan MinimizableTestingPanel

```jsx
import MinimizableTestingPanel from './components/common/MinimizableTestingPanel';

// Di ChatRefined.jsx
<MinimizableTestingPanel 
  activeChatId={activeChatId}
  chatMessages={messages}
/>
```

### Mengintegrasikan ResponsiveChatInput

```jsx
import ResponsiveChatInput from './components/chat/ResponsiveChatInput';

<ResponsiveChatInput
  value={input}
  onChange={setInput}
  onSubmit={handleSubmit}
  onFormatGuideClick={() => setShowFormatGuide(true)}
  onUseFormatClick={handleUseFormat}
  activeAI={currentAI}
  availableAIs={availableModels}
  onAIChange={handleAIChange}
  disabled={isLoading}
/>
```

## Breakpoints

- **Mobile**: < 768px
  - Sidebar full-width
  - Testing panel sebagai floating button + full-screen modal
  - Semua tombol icon-only
  
- **Tablet**: 768px - 1024px
  - Sidebar 280px
  - Testing panel minimizable
  - Tombol dengan text
  
- **Desktop**: > 1024px
  - Sidebar 280px
  - Testing panel minimizable
  - Semua fitur lengkap

## Testing

Untuk menguji responsive design:

1. Buka Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Pilih device preset atau custom size
4. Test di berbagai ukuran:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1024px+)

## Notes

- Semua perubahan menggunakan Tailwind CSS untuk styling
- Animasi menggunakan Framer Motion untuk smooth transitions
- State management menggunakan React hooks
- Responsive behavior otomatis berdasarkan window.innerWidth
