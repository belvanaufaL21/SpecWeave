import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import integrationService from './services/integrationService.js'
import startupLogger from './utils/startupLogger.js'
import cleanLogger from './config/cleanLogging.js'

// Show startup message
cleanLogger.startup();

// Initialize optimization components with clean logging
integrationService.initialize().catch(error => {
  startupLogger.criticalError('IntegrationService', error);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
