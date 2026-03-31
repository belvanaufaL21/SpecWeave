# SpecWeave JIRA Integration Documentation

This directory contains documentation for the JIRA integration in SpecWeave.

## Documentation Structure

- **[README](./README.md)** - This overview document

## Quick Start

1. **For Users**: Use the JIRA setup modal in SpecWeave to configure your connection with API tokens
2. **For Troubleshooting**: Check the application logs and verify your JIRA credentials

## Overview

The JIRA integration provides a secure way to connect SpecWeave with JIRA instances using API token authentication. It supports both Atlassian Cloud and Server deployments.

### Key Features

- **Secure Authentication**: API token-based authentication with encryption
- **User-Friendly**: Simple setup process with clear instructions
- **Comprehensive Support**: Works with JIRA Cloud, Server, and Data Center
- **Multi-Environment**: Development and production configurations
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   SpecWeave     │    │      JIRA       │
│   Application   │◄──►│   Instance      │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   SpecWeave     │    │   Project       │
│   Backend       │    │   Data          │
└─────────────────┘    └─────────────────┘
```

## Support

For additional support:
- Check the application logs for error messages
- Verify your JIRA credentials and permissions
- Contact your system administrator for configuration issues