# SpecWeave

SpecWeave is an intelligent Gherkin scenario generation platform that combines AI-powered natural language processing with automated quality evaluation using the METEOR metric system. The application helps teams create high-quality BDD (Behavior-Driven Development) scenarios and seamlessly integrate them with JIRA for project management.

## 🚀 Features

### Core Functionality
- **AI-Powered Gherkin Generation**: Generate BDD scenarios from natural language requirements
- **METEOR Quality Evaluation**: Automated quality assessment using METEOR metrics
- **JIRA Integration**: Export scenarios as user stories directly to JIRA
- **Template Management**: Create and manage reusable scenario templates
- **Reference Library**: Maintain a library of reference scenarios for consistency

### User Experience
- **Interactive Chat Interface**: Conversational approach to scenario generation
- **Real-time Quality Feedback**: Instant quality metrics and suggestions
- **Dashboard Analytics**: Track scenario quality trends and team performance
- **Multi-project Support**: Manage multiple JIRA projects and epics

### Technical Features
- **Authentication System**: Secure user management with Supabase
- **Responsive Design**: Modern UI built with React and Tailwind CSS
- **RESTful API**: Clean backend architecture with Express.js
- **Database Integration**: SQLite for local development, Supabase for production

## 🏗️ Architecture

```
SpecWeave/
├── aplikasi-klien/          # React frontend application
├── aplikasi-server/         # Node.js backend server
├── basis-data/             # Database schemas and migrations
├── skrip-utilitas/         # Utility scripts and Python METEOR evaluator
├── konfigurasi/            # Environment configurations
└── pengembangan/           # Development documentation and specs
```

## 🛠️ Technology Stack

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** for responsive styling
- **React Router** for navigation
- **Supabase Client** for authentication

### Backend
- **Node.js** with Express.js framework
- **Supabase** for authentication and database
- **SQLite** for local development
- **CORS** enabled for cross-origin requests

### AI & Evaluation
- **Python** for METEOR evaluation system
- **NLTK** for natural language processing
- **Custom AI integration** for Gherkin generation

### DevOps & Tools
- **Git** for version control
- **npm/yarn** for package management
- **Batch scripts** for easy deployment

## 📋 Prerequisites

Before running SpecWeave, ensure you have:

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **Git** for version control
- **Supabase account** (for production)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/MuhammadGhazivedaBelvanaufal/SpecWeave.git
cd SpecWeave
```

### 2. Setup Environment Variables

#### Frontend (.env in aplikasi-klien/)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:5003
```

#### Backend (.env in aplikasi-server/)
```env
PORT=5003
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
NODE_ENV=development
```

### 3. Install Dependencies

#### Frontend
```bash
cd aplikasi-klien
npm install
```

#### Backend
```bash
cd aplikasi-server
npm install
```

#### Python Dependencies
```bash
cd skrip-utilitas
pip install -r requirements.txt
```

### 4. Database Setup
```bash
# Run database migrations
cd basis-data
node migrate-epic-context.js
```

### 5. Start the Application

#### Using Utility Scripts (Recommended)
```bash
# Start both frontend and backend
cd skrip-utilitas
setup-lengkap.bat
```

#### Manual Start
```bash
# Terminal 1 - Backend
cd aplikasi-server
npm start

# Terminal 2 - Frontend
cd aplikasi-klien
npm run dev
```

### 6. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5003

## 📖 Usage Guide

### 1. Authentication
- Register or login using the landing page
- Authentication is handled through Supabase

### 2. JIRA Setup (Optional)
- Configure JIRA connection in settings
- Add your JIRA server URL and credentials
- Select projects and epics for integration

### 3. Generate Scenarios
- Use the chat interface to describe your requirements
- The AI will generate Gherkin scenarios
- Review quality metrics provided by METEOR evaluation

### 4. Export to JIRA
- Select generated scenarios
- Choose target JIRA project and epic
- Export as user stories with one click

### 5. Manage Templates
- Create reusable scenario templates
- Organize templates by category
- Use templates for consistent scenario structure

## 🔧 Configuration

### Environment Setup
- Copy `.env.example` files and configure with your values
- Ensure all required environment variables are set
- Configure JIRA credentials for integration features

### Database Configuration
- SQLite is used for local development
- Supabase PostgreSQL for production
- Run migrations before first use

### METEOR Evaluation
- Python environment setup required
- NLTK data will be downloaded automatically
- Custom evaluation metrics can be configured

## 🧪 Testing

### Run Frontend Tests
```bash
cd aplikasi-klien
npm test
```

### Run Backend Tests
```bash
cd aplikasi-server
npm test
```

### METEOR Evaluation Test
```bash
cd skrip-utilitas
python meteor_evaluator.py --test
```

## 📁 Project Structure

### Frontend (aplikasi-klien/)
```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── services/           # API and external service integrations
├── hooks/              # Custom React hooks
├── contexts/           # React context providers
├── utils/              # Utility functions and constants
└── assets/             # Static assets and styles
```

### Backend (aplikasi-server/)
```
src/
├── controllers/        # Request handlers
├── routes/            # API route definitions
├── services/          # Business logic services
├── middlewares/       # Express middlewares
└── config/            # Configuration files
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Gherkin Generation
- `POST /api/gherkin/generate` - Generate scenarios from requirements
- `GET /api/gherkin/history` - Get user's scenario history

### JIRA Integration
- `POST /api/jira/connect` - Connect to JIRA instance
- `GET /api/jira/projects` - Get available projects
- `POST /api/jira/export` - Export scenarios to JIRA

### METEOR Evaluation
- `POST /api/meteor/evaluate` - Evaluate scenario quality
- `GET /api/meteor/metrics` - Get quality metrics

## 🐛 Troubleshooting

### Common Issues

#### Frontend won't start
- Check Node.js version (v16+ required)
- Verify environment variables are set
- Clear npm cache: `npm cache clean --force`

#### Backend connection errors
- Ensure backend is running on correct port
- Check Supabase configuration
- Verify database migrations are complete

#### METEOR evaluation fails
- Check Python installation and version
- Install required packages: `pip install -r requirements.txt`
- Verify NLTK data is downloaded

#### JIRA integration issues
- Verify JIRA credentials and permissions
- Check network connectivity to JIRA server
- Ensure JIRA API is enabled

### Getting Help
- Check existing issues on GitHub
- Create a new issue with detailed description
- Include error logs and environment details

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Muhammad Ghaziveda Belvanaufal** - Lead Developer
- **Contributors** - See [CONTRIBUTORS.md](CONTRIBUTORS.md)

## 🙏 Acknowledgments

- METEOR evaluation system for quality metrics
- Supabase for backend infrastructure
- React and Node.js communities
- JIRA API for integration capabilities

## 📊 Project Status

- ✅ Core functionality complete
- ✅ JIRA integration working
- ✅ METEOR evaluation system active
- ✅ Authentication system implemented
- ✅ Template management functional
- 🔄 Continuous improvements and bug fixes

## 🔮 Future Roadmap

- [ ] Advanced AI model integration
- [ ] Multi-language support
- [ ] Enhanced analytics dashboard
- [ ] Mobile application
- [ ] Enterprise features
- [ ] API rate limiting and caching
- [ ] Advanced JIRA workflow integration

---

For more information, visit our [documentation](./pengembangan/README.md) or contact the development team.