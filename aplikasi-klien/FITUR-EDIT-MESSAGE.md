# Fitur Edit Message dengan Chat Branching

## Deskripsi
Fitur ini memungkinkan user untuk mengedit pesan yang sudah dikirim sebelumnya dalam chat dengan sistem **branching/versioning**. Implementasi ini diambil dari commit sebelum `eeb7785` (Remove edit input and pagination features from chat).

Ketika pesan diedit:
1. Pesan lama **TIDAK dihapus** - tetap tersimpan sebagai versi sebelumnya
2. Sistem membuat **branch baru** dengan pesan yang diedit
3. User dapat **navigasi** antara versi-versi pesan menggunakan tombol Previous/Next
4. Setiap versi memiliki respons AI yang berbeda

## Cara Menggunakan

### Mengedit Pesan
1. **Klik tombol edit** (ikon pensil) di **samping kiri** bubble pesan user
2. **Edit pesan** - Textarea akan muncul di dalam bubble
3. **Simpan perubahan**:
   - Klik tombol "Save & Resend" untuk membuat versi baru
   - Sistem akan mengirim pesan yang diedit ke AI
4. **Batal edit**:
   - Klik tombol "Cancel" untuk membatalkan

### Navigasi Antar Versi
Setelah mengedit pesan, navigasi versi akan muncul di **bawah bubble**:
- **Previous** (← Previous) - Kembali ke versi sebelumnya
- **Indikator halaman** - Menampilkan "2 / 2" (versi saat ini / total versi)
- **Next** (Next →) - Maju ke versi berikutnya

## UI/UX Design

### Posisi Elemen
1. **Tombol Edit**: Di samping kiri bubble (outside container)
2. **Navigasi Version**: Di bawah bubble, sejajar kanan
   - Format: `[← Previous] 2 / 2 [Next →]`
3. **Edit Mode**: Textarea muncul di dalam bubble dengan tombol Cancel dan Save & Resend

### Visual Design
- Tombol edit: Icon pensil dengan warna `#9CA3AF` (hover: `#FF7AD0`)
- Navigasi: Tombol dengan text "Previous" dan "Next" + arrow icons
- Background tombol: `#160D14` dengan border `#44273D`
- Disabled state: Opacity 30% dan background transparent
- Hover effects: Background `#160D14` dan border `#44273D`

## Implementasi Teknis

### File yang Dimodifikasi

1. **ChatBubble.jsx** (dari commit sebelum `eeb7785`)
   - Props: `message`, `activeChatId`, `onUpdateMessage`
   - State:
     - `isEditingUserMessage`: Track mode edit
     - `editedUserMessage`: Konten yang sedang diedit
     - `currentVersionIndex`: Index versi yang sedang ditampilkan
   - Handler:
     - `handleSaveUserMessage`: Membuat versi baru dan trigger regeneration
     - `handlePreviousVersion`: Navigate ke versi sebelumnya
     - `handleNextVersion`: Navigate ke versi berikutnya
   - UI:
     - Tombol edit di samping kiri bubble (outside container)
     - Navigasi version di bawah bubble (hanya untuk user messages dengan multiple versions)
     - Edit mode dengan textarea dan tombol Cancel/Save & Resend

2. **ChatRefined.jsx** (dari commit sebelum `eeb7785`)
   - Handler `handleUpdateMessage`: Menerima updated message dari ChatBubble
   - Menangani regeneration ketika user mengedit pesan
   - Meneruskan prop `onUpdateMessage` ke ChatBubble

### Data Structure

```javascript
// Message structure with versions
{
  id: "message-id-123",
  role: "user",
  content: "Current displayed content",
  versions: [
    {
      input: "Original message",
      outputMessageId: "ai-response-1",
      timestamp: "2024-01-01T00:00:00Z"
    },
    {
      input: "Edited message",
      outputMessageId: "ai-response-2",
      timestamp: "2024-01-01T00:05:00Z",
      isGenerating: true  // Flag saat menunggu AI response
    }
  ],
  currentVersionIndex: 1,  // Currently showing version 1
  isRegenerating: true  // Flag to trigger regeneration in parent
}
```

### Flow Edit Message

1. User klik tombol edit → `setIsEditingUserMessage(true)`
2. User edit pesan dan klik "Save & Resend"
3. `handleSaveUserMessage` dipanggil:
   - Ambil existing versions atau buat initial version
   - Tambahkan new version dengan `isGenerating: true`
   - Update message dengan `versions` dan `currentVersionIndex`
   - Set `isRegenerating: true` untuk trigger regeneration
   - Panggil `onUpdateMessage(updatedMessage)`
4. Parent (ChatRefined) menerima updated message:
   - Deteksi `isRegenerating: true`
   - Kirim pesan yang diedit ke AI
   - Simpan AI response dengan link ke version yang sesuai
5. User bisa navigate antar versi dengan Previous/Next

## Fitur Tambahan

- **Visual feedback**: 
  - Tombol navigasi disabled jika sudah di ujung (first/last version)
  - Counter menampilkan posisi saat ini (contoh: "2 / 2")
  - Hover effects pada semua tombol interaktif
  - Disabled button memiliki opacity 30% dan background transparent
- **Timestamp**: Setiap message menampilkan timestamp di bawah bubble
- **Responsive**: Tombol dan navigasi menyesuaikan dengan ukuran layar

## Design System

Mengikuti design system SpecWeave yang sudah ada:
- Background textarea: `#0A0A0A`
- Border: `#44273D` 
- Primary color: `#FF7AD0` untuk tombol dan icon (hover state)
- Text color: `#FFFFFF`
- Secondary text: `rgba(255, 255, 255, 0.5)` untuk counter
- Disabled opacity: `30%`
- Button background: `#160D14` (active), `transparent` (disabled)

## Restore dari Git

File ini di-restore dari commit sebelum `eeb7785`:
```bash
git show eeb7785^:aplikasi-klien/src/components/chat/ChatBubble.jsx > ChatBubble_old.jsx
git show eeb7785^:aplikasi-klien/src/pages/ChatRefined.jsx > ChatRefined_old.jsx
```

Kemudian di-copy ke lokasi aslinya untuk mengembalikan fitur edit message dengan branching.
