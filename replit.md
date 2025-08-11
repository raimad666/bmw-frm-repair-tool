# BMW FRM D-Flash to EEPROM Converter

## Overview

This is a professional BMW FRM repair tool that converts corrupted D-Flash dumps to working EEPROM files. The application supports FRM2, FRM3, XEQ384, and XET512 variants with a 92% success rate, designed specifically for automotive diagnostic professionals dealing with BMW Footwell Module (FRM) repairs.

The system provides file upload capabilities for BMW FRM D-Flash dumps (.bin, .hex, .eep files), analyzes the corruption level and vehicle data, and converts the D-Flash data to working EEPROM format for repair purposes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with CSS custom properties for theming (neutral color scheme)
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **File Handling**: Custom file utilities for BMW FRM file validation and processing

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **File Processing**: Multer middleware for file uploads with validation for BMW FRM files
- **API Design**: RESTful endpoints for file upload, analysis, and conversion operations
- **Storage**: In-memory storage implementation with interface for future database integration
- **Development Server**: Custom Vite integration for development mode with HMR support

### Data Storage Solutions
- **Current Implementation**: In-memory storage using TypeScript classes and Maps
- **Database Ready**: Drizzle ORM configured with PostgreSQL schema ready for production deployment
- **Schema Design**: 
  - Users table for authentication
  - FRM repairs table for tracking repair jobs with binary data storage
  - Support for repair status tracking and analysis data storage

### Authentication and Authorization
- **Schema Prepared**: User authentication schema defined with username/password fields
- **Session Management**: PostgreSQL session store configured (connect-pg-simple)
- **Implementation Status**: Authentication endpoints and middleware ready for implementation

### External Dependencies
- **Database**: Neon Database (PostgreSQL) configured via environment variables
- **File Storage**: Binary data stored in database bytea fields for original and repaired files
- **Development Tools**: Replit integration with cartographer plugin for development environment
- **Build Tools**: ESBuild for production bundling with platform-specific configurations

The application follows a monorepo structure with shared schemas and types between client and server, enabling type-safe communication and consistent data validation throughout the system.