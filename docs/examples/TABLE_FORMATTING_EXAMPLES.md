# Table Formatting Examples

## Table Support Added to GeneralResponseFormatter

### Example 1: Simple Data Table

#### Input (Markdown Table):
```
| Name | Age | Role |
|------|-----|------|
| John | 25 | Developer |
| Jane | 30 | Designer |
| Bob | 28 | Manager |
```

#### Output (Formatted Table):
```
┌─────────────────────────────────────────┐
│ Name    │ Age │ Role      │             │
├─────────────────────────────────────────┤
│ John    │ 25  │ Developer │ (striped)   │
│ Jane    │ 30  │ Designer  │             │
│ Bob     │ 28  │ Manager   │ (striped)   │
└─────────────────────────────────────────┘
```

**Features:**
- ✅ Header row with dark background
- ✅ Alternating row colors (striped)
- ✅ Proper borders and spacing
- ✅ Responsive horizontal scrolling
- ✅ Inline text formatting support

### Example 2: API Documentation Table

#### Input:
```
| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/users` | GET | Get all users | **Active** |
| `/api/users/:id` | GET | Get user by ID | **Active** |
| `/api/users` | POST | Create new user | `Deprecated` |
| `/api/auth/login` | POST | User authentication | **Active** |
```

#### Output:
```
┌─────────────────────────────────────────────────────────────┐
│ Endpoint        │ Method │ Description         │ Status     │
├─────────────────────────────────────────────────────────────┤
│ /api/users      │ GET    │ Get all users       │ Active     │ <- Bold text
│ /api/users/:id  │ GET    │ Get user by ID      │ Active     │
│ /api/users      │ POST   │ Create new user     │ Deprecated │ <- Inline code
│ /api/auth/login │ POST   │ User authentication │ Active     │
└─────────────────────────────────────────────────────────────┘
```

### Example 3: Comparison Table

#### Input:
```
| Feature | Free Plan | Pro Plan | Enterprise |
|---------|-----------|----------|------------|
| Users | Up to 5 | Up to 50 | **Unlimited** |
| Storage | 1GB | 100GB | `Custom` |
| Support | Email | Priority | **24/7 Phone** |
| Price | $0/month | $29/month | Contact Sales |
```

#### Output:
```
┌─────────────────────────────────────────────────────────────┐
│ Feature │ Free Plan │ Pro Plan  │ Enterprise    │           │
├─────────────────────────────────────────────────────────────┤
│ Users   │ Up to 5   │ Up to 50  │ Unlimited     │ <- Bold   │
│ Storage │ 1GB       │ 100GB     │ Custom        │ <- Code   │
│ Support │ Email     │ Priority  │ 24/7 Phone    │ <- Bold   │
│ Price   │ $0/month  │ $29/month │ Contact Sales │           │
└─────────────────────────────────────────────────────────────┘
```

### Example 4: Mixed Content with Table

#### Input:
```
# Database Schema

Here's the user table structure:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | `INTEGER` | **PRIMARY KEY** | Unique identifier |
| email | `VARCHAR(255)` | **UNIQUE, NOT NULL** | User email address |
| name | `VARCHAR(100)` | NOT NULL | Full name |
| created_at | `TIMESTAMP` | DEFAULT NOW() | Account creation time |

## Usage Example

```sql
SELECT id, email, name 
FROM users 
WHERE created_at > '2024-01-01';
```

> **Note**: Always use prepared statements to prevent SQL injection.
```

#### Output:
```
🗂️ Database Schema                          <- H1 Header

Here's the user table structure:            <- Regular paragraph

┌─────────────────────────────────────────────────────────────┐
│ Column     │ Type         │ Constraints      │ Description   │
├─────────────────────────────────────────────────────────────┤
│ id         │ INTEGER      │ PRIMARY KEY      │ Unique...     │
│ email      │ VARCHAR(255) │ UNIQUE, NOT NULL │ User email... │
│ name       │ VARCHAR(100) │ NOT NULL         │ Full name     │
│ created_at │ TIMESTAMP    │ DEFAULT NOW()    │ Account...    │
└─────────────────────────────────────────────────────────────┘

📋 Usage Example                            <- H2 Header

┌─────────────────────────────────────────┐
│ sql                                     │ <- Code block
│ SELECT id, email, name                  │    with language
│ FROM users                              │    indicator
│ WHERE created_at > '2024-01-01';       │
└─────────────────────────────────────────┘

┃ Note: Always use prepared statements to prevent SQL injection. <- Blockquote
```

## Technical Implementation

### Table Detection Logic
```javascript
// Detects markdown tables with | separators
if (trimmed.includes('|') && trimmed.split('\n').length >= 2) {
  const lines = paragraph.split('\n').filter(line => line.trim());
  const hasTableStructure = lines.length >= 2 && 
    lines[0].includes('|') && 
    lines[1].includes('|') &&
    (lines[1].includes('-') || lines[1].includes('='));
}
```

### Styling Features
- **Responsive Design**: Horizontal scroll for wide tables
- **Striped Rows**: Alternating background colors for readability
- **Header Styling**: Dark background for table headers
- **Border System**: Clean borders with proper spacing
- **Inline Formatting**: Supports bold text, inline code in cells
- **Typography**: Consistent font sizes and spacing

### CSS Classes Used
```css
.overflow-x-auto                    /* Horizontal scrolling */
.border-collapse                    /* Clean table borders */
.bg-gray-800/50                     /* Header background */
.bg-gray-900/20, .bg-gray-800/20    /* Striped row backgrounds */
.border-gray-600/30                 /* Border colors */
.px-3 py-2                          /* Cell padding */
```

## Benefits

1. **Professional Appearance**: Tables look clean and organized
2. **Responsive**: Works on mobile and desktop
3. **Accessible**: Proper table structure for screen readers
4. **Consistent**: Matches the overall design system
5. **Flexible**: Supports various table sizes and content types

Tables are now properly formatted and integrate seamlessly with other content types in general responses!