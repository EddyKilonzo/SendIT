# SendIT 🚚

A full-stack delivery management application built with NestJS (backend) and Angular (frontend). SendIT enables users to create, track, and manage parcel deliveries with real-time updates and driver assignment capabilities.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Cloning the Repository](#cloning-the-repository)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- **User Authentication & Authorization**
  - Secure JWT-based authentication
  - Role-based access control (Customer, Driver, Admin)
  - User profile management with profile pictures

- **Parcel Management**
  - Create and track parcels
  - Real-time status updates
  - Parcel history and details

- **Driver Management**
  - Driver application system
  - Driver assignment to parcels
  - Real-time driver location tracking
  - Driver performance metrics and ratings

- **Real-time Updates**
  - WebSocket integration for live updates
  - Push notifications for parcel status changes

- **Email Notifications**
  - Welcome emails
  - Parcel status updates
  - Driver assignment notifications
  - Password reset emails

- **Admin Dashboard**
  - User management
  - Driver approval system
  - System overview and statistics

## 🛠 Tech Stack

### Backend
- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (Passport.js)
- **Real-time**: Socket.io
- **File Upload**: Cloudinary
- **Email**: Nodemailer
- **Validation**: Class-validator, Joi

### Frontend
- **Framework**: Angular 20
- **Styling**: Tailwind CSS
- **Icons**: Font Awesome
- **Maps**: Leaflet
- **Real-time**: Socket.io Client

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (cloud)
- **Git** - [Download](https://git-scm.com/)

### Additional Services (Optional but Recommended)

- **Cloudinary Account** (for image uploads) - [Sign up](https://cloudinary.com/)
- **SMTP Email Service** (Gmail, SendGrid, etc.) - for email notifications
- **Mapbox Token** (for map features) - [Get token](https://www.mapbox.com/)

## 🚀 Getting Started

### Cloning the Repository

1. **Clone the repository** using one of the following methods:

   **Using HTTPS:**
   ```bash
   git clone https://github.com/yourusername/SendIT.git
   ```

   **Using SSH:**
   ```bash
   git clone git@github.com:yourusername/SendIT.git
   ```

2. **Navigate to the project directory:**
   ```bash
   cd SendIT
   ```

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the `backend` directory with the following variables:
   ```env
   # Database (MongoDB)
   # For local MongoDB:
   DATABASE_URL="mongodb://localhost:27017/sendit_db"
   # For MongoDB with authentication:
   # DATABASE_URL="mongodb://username:password@localhost:27017/sendit_db?authSource=admin"
   # For MongoDB Atlas (cloud):
   # DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/sendit_db?retryWrites=true&w=majority"

   # JWT Secrets
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production

   # Server
   PORT=3000
   FRONTEND_URL=http://localhost:4200

   # Email Configuration (SMTP)
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USER=your-email@gmail.com
   MAIL_PASSWORD=your-app-password
   MAIL_FROM=your-email@gmail.com

   # Cloudinary (Optional - for profile picture uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

   > **Note**: See [Environment Configuration](#environment-configuration) for detailed setup instructions.

4. **Set up the database:**
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Push schema to MongoDB (MongoDB doesn't use traditional migrations)
   npx prisma db push
   ```

   > **Note**: MongoDB uses `prisma db push` instead of migrations. This will sync your schema with the database.

5. **Start the development server:**
   ```bash
   npm run start:dev
   ```

   The backend API will be available at `http://localhost:3000/api`

### Frontend Setup

1. **Navigate to the frontend directory** (in a new terminal):
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Update `frontend/src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000/api',
     mapboxToken: 'your_mapbox_token_here', // Optional
   };
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

   The frontend application will be available at `http://localhost:4200`

## 🔧 Environment Configuration

### Database Setup

1. **Set up MongoDB:**
   
   **Option A: Local MongoDB**
   - Install MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Start MongoDB service
   - Update the DATABASE_URL in your `.env` file:
   ```env
   DATABASE_URL="mongodb://localhost:27017/sendit_db"
   ```

   **Option B: MongoDB Atlas (Cloud)**
   - Sign up for free at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a cluster and database user
   - Get your connection string and update `.env`:
   ```env
   DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/sendit_db?retryWrites=true&w=majority"
   ```

   **Option C: Docker**
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo
   ```
   Then use: `DATABASE_URL="mongodb://localhost:27017/sendit_db"`

### Email Configuration

#### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password":
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the app password in your `.env` file:
   ```env
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USER=your-email@gmail.com
   MAIL_PASSWORD=your-16-character-app-password
   MAIL_FROM=your-email@gmail.com
   ```

#### SendGrid Setup

1. Create a SendGrid account and verify your sender email
2. Generate an API key
3. Configure your `.env` file:
   ```env
   MAIL_HOST=smtp.sendgrid.net
   MAIL_PORT=587
   MAIL_USER=apikey
   MAIL_PASSWORD=your-sendgrid-api-key
   MAIL_FROM=verified-sender@yourdomain.com
   ```

### Cloudinary Setup (Optional)

1. Sign up for a free Cloudinary account
2. Get your credentials from the dashboard
3. Add to your `.env` file:
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

## 🏃 Running the Application

### Development Mode

**Backend:**
```bash
cd backend
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm start
```

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm run start:prod
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the dist/frontend directory with your preferred server (nginx, Apache, etc.)
```

## 📁 Project Structure

```
SendIT/
├── backend/                 # NestJS Backend
│   ├── src/
│   │   ├── admin/          # Admin module
│   │   ├── auth/           # Authentication module
│   │   ├── common/         # Shared utilities, guards, pipes
│   │   ├── database/       # Prisma service
│   │   ├── drivers/        # Driver management
│   │   ├── mailer/         # Email service
│   │   ├── notifications/  # Notification service
│   │   ├── parcels/        # Parcel management
│   │   ├── reviews/        # Review system
│   │   └── users/          # User management
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   ├── restClient/         # API testing files
│   └── package.json
│
├── frontend/               # Angular Frontend
│   ├── src/
│   │   ├── app/           # Application code
│   │   │   ├── auth/      # Authentication components
│   │   │   ├── dashboard/ # Dashboard components
│   │   │   ├── parcels/   # Parcel components
│   │   │   ├── drivers/   # Driver components
│   │   │   └── shared/    # Shared components
│   │   └── environments/  # Environment configuration
│   └── package.json
│
└── README.md              # This file
```

## 📚 API Documentation

When the backend server is running, the API documentation is available at:
- Swagger UI (if configured): `http://localhost:3000/api/docs`
- REST Client files: See `backend/restClient/` directory for example API calls

### API Endpoints

- **Authentication**: `/api/auth/*`
- **Users**: `/api/users/*`
- **Parcels**: `/api/parcels/*`
- **Drivers**: `/api/drivers/*`
- **Admin**: `/api/admin/*`
- **Reviews**: `/api/reviews/*`
- **Notifications**: `/api/notifications/*`

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend Tests

```bash
cd frontend

# Unit tests
npm run test
```

## 🐛 Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready` or check your PostgreSQL service
- Confirm DATABASE_URL is correct in `.env`
- Ensure the database exists: `psql -U postgres -l`

### Email Not Sending

1. Check SMTP configuration in `.env`
2. For Gmail: Ensure you're using an App Password, not your regular password
3. Check backend logs for SMTP error messages
4. Test with the email test endpoint (if available)

### Port Already in Use

- Backend (3000): Change `PORT` in `.env` or kill the process using port 3000
- Frontend (4200): Use `ng serve --port 4201` or kill the process using port 4200

### Prisma Migration Issues

```bash
# Reset database and re-run migrations
npx prisma migrate reset

# Or generate Prisma Client manually
npx prisma generate
```

### Node Version Issues

Ensure you're using Node.js v18 or higher:
```bash
node --version
```

If needed, use a version manager like `nvm`:
```bash
nvm install 18
nvm use 18
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - [Your GitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- Angular team for the robust frontend framework
- Prisma team for the excellent ORM

---

**Note**: Remember to never commit `.env` files or sensitive credentials to version control. Always use environment variables for configuration.

