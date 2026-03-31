# General Response Formatting Examples

## Before vs After Comparison

### Example 1: Technical Documentation

#### Input:
```
# API Documentation

## Authentication
Use the `Authorization` header with your API key.

### Example Request
```javascript
fetch('/api/users', {
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
})
```

## Available Endpoints
- GET /api/users - List all users
- POST /api/users - Create new user
- PUT /api/users/:id - Update user

### Response Format
1. Status code (200, 400, 500)
2. Data payload
3. Error messages (if any)

> **Important**: Always validate input data before processing.

Use **caution** when handling sensitive data.
```

#### Before (Raw Text):
```
# API Documentation

## Authentication
Use the `Authorization` header with your API key.

### Example Request
```javascript
fetch('/api/users', {
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
})
```

## Available Endpoints
- GET /api/users - List all users
- POST /api/users - Create new user
- PUT /api/users/:id - Update user

### Response Format
1. Status code (200, 400, 500)
2. Data payload
3. Error messages (if any)

> **Important**: Always validate input data before processing.

Use **caution** when handling sensitive data.
```

#### After (Formatted):
```
📋 API Documentation                    <- H1: Large, bold, white text with bottom border
  📄 Authentication                     <- H2: Medium, semibold, white text
    Use the Authorization header with your API key.  <- Regular paragraph

    🔧 Example Request                  <- H3: Smaller, medium weight
    ┌─────────────────────────────────┐
    │ javascript                      │ <- Language indicator
    │ fetch('/api/users', {           │ <- Code block: gray background,
    │   headers: {                    │    monospace font, syntax colors
    │     'Authorization': 'Bearer...' │
    │   }                             │
    │ })                              │
    └─────────────────────────────────┘

  📄 Available Endpoints               <- H2: Medium, semibold
    • GET /api/users - List all users  <- Bullet list: blue dots,
    • POST /api/users - Create new user   proper spacing
    • PUT /api/users/:id - Update user

    🔧 Response Format                 <- H3: Smaller, medium weight
    ① Status code (200, 400, 500)     <- Numbered list: purple badges,
    ② Data payload                        clean alignment
    ③ Error messages (if any)

    ┃ Important: Always validate input data before processing.  <- Blockquote: left border,
                                                                   italic text, blue background

    Use caution when handling sensitive data.  <- Bold text: white color emphasis
```

### Example 2: Tutorial Content

#### Input:
```
# Getting Started Guide

Follow these steps to set up the project:

## Prerequisites
- Node.js 16 or higher
- npm or yarn package manager
- Git for version control

## Installation Steps
1. **Clone the repository**
   ```bash
   git clone https://github.com/user/project.git
   cd project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Copy `.env.example` to `.env`
   - Update database credentials
   - Set your API keys

4. **Start development server**
   ```bash
   npm run dev
   ```

> The server will start on `http://localhost:3000`

**Congratulations!** Your setup is complete.
```

#### After (Formatted):
```
🚀 Getting Started Guide              <- H1: Large title with proper spacing

Follow these steps to set up the project:  <- Regular paragraph

📋 Prerequisites                      <- H2: Section header
  • Node.js 16 or higher             <- Bullet list with blue dots
  • npm or yarn package manager
  • Git for version control

📋 Installation Steps                 <- H2: Section header
  ① Clone the repository             <- Numbered list with purple badges
    ┌─────────────────────────────┐
    │ bash                        │  <- Code block with language
    │ git clone https://github... │     indicator and styling
    │ cd project                  │
    └─────────────────────────────┘

  ② Install dependencies
    ┌─────────────────────────────┐
    │ bash                        │
    │ npm install                 │
    └─────────────────────────────┘

  ③ Configure environment
    • Copy .env.example to .env    <- Nested bullet list
    • Update database credentials
    • Set your API keys

  ④ Start development server
    ┌─────────────────────────────┐
    │ bash                        │
    │ npm run dev                 │
    └─────────────────────────────┘

  ┃ The server will start on http://localhost:3000  <- Blockquote styling

  Congratulations! Your setup is complete.  <- Bold text emphasis
```

### Example 3: Mixed Content Response

#### Input:
```
Here's how to implement user authentication:

## Backend Setup
Create a new file `auth.js`:

```javascript
const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET);
}
```

## Frontend Integration
1. Store token in localStorage
2. Add to request headers
3. Handle token expiration

### Key Points
- Always use HTTPS in production
- Set appropriate token expiration
- Implement refresh token mechanism

> **Security Note**: Never store sensitive data in localStorage

For more details, check the `README.md` file.
```

#### After (Formatted):
```
Here's how to implement user authentication:  <- Regular paragraph

🔧 Backend Setup                      <- H2: Section header
Create a new file auth.js:            <- Regular paragraph

┌─────────────────────────────────────┐
│ javascript                          │  <- Code block with language
│ const jwt = require('jsonwebtoken'); │     indicator, proper syntax
│                                     │     highlighting simulation
│ function generateToken(user) {      │
│   return jwt.sign({ id: user.id },  │
│     process.env.JWT_SECRET);        │
│ }                                   │
└─────────────────────────────────────┘

🔧 Frontend Integration               <- H2: Section header
① Store token in localStorage         <- Numbered list with badges
② Add to request headers
③ Handle token expiration

  📝 Key Points                       <- H3: Subsection
  • Always use HTTPS in production    <- Bullet list with dots
  • Set appropriate token expiration
  • Implement refresh token mechanism

  ┃ Security Note: Never store sensitive data in localStorage  <- Blockquote

For more details, check the README.md file.  <- Inline code styling
```

## Visual Improvements Summary

### Typography
- ✅ **Headers**: Proper hierarchy with different sizes and weights
- ✅ **Paragraphs**: Optimal line height and spacing
- ✅ **Code**: Monospace font with proper background

### Visual Elements
- ✅ **Lists**: Styled bullets (blue dots) and numbers (purple badges)
- ✅ **Code Blocks**: Gray background with border and language indicator
- ✅ **Blockquotes**: Left border with background tint
- ✅ **Inline Code**: Background highlight with blue text

### Color Scheme
- ✅ **Headers**: White text for emphasis
- ✅ **Body Text**: Gray-200 for readability
- ✅ **Code**: Blue-300 for inline, Gray-300 for blocks
- ✅ **Accents**: Purple for numbers, Blue for bullets

### Spacing & Layout
- ✅ **Consistent**: Proper spacing between elements
- ✅ **Readable**: Optimal line heights and margins
- ✅ **Organized**: Clear visual hierarchy

The result is professional, readable, and visually appealing formatting that makes general responses as polished as the Connextra-formatted responses.