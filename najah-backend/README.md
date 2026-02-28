# Najah Tutors Backend API

A comprehensive Node.js backend for the Najah Tutors educational platform with admin dashboard.

## Features

- **Authentication**: JWT-based authentication system
- **User Management**: Students, Teachers, and Admin roles
- **Course Management**: Create and manage courses with subjects
- **Enrollment System**: Track student enrollments and payments
- **Live Classes**: Schedule and manage live online classes
- **Admin Dashboard**: Complete admin interface for managing all aspects of the platform

## Tech Stack

- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **JWT** for authentication
- **bcryptjs** for password hashing

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/najah_tutors
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

3. Make sure MongoDB is running on your system

4. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

## Creating Admin User

You can create an admin user using MongoDB or through the API:

```javascript
// Using MongoDB shell
db.users.insertOne({
  name: "Admin User",
  email: "admin@najah.com",
  password: "$2a$10$...", // hashed password for "admin123"
  role: "admin"
})
```

Or use the registration endpoint:
```bash
POST /api/auth/register
{
  "name": "Admin User",
  "email": "admin@najah.com",
  "password": "admin123",
  "role": "admin"
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Students
- `GET /api/students` - Get all students (Admin only)
- `POST /api/students/enroll` - Enroll student (Public)
- `GET /api/students/:id` - Get single student (Admin only)
- `PUT /api/students/:id` - Update student (Admin only)
- `DELETE /api/students/:id` - Delete student (Admin only)

### Courses
- `GET /api/courses` - Get all courses (Public)
- `GET /api/courses/:id` - Get single course (Public)
- `POST /api/courses` - Create course (Admin only)
- `PUT /api/courses/:id` - Update course (Admin only)
- `DELETE /api/courses/:id` - Delete course (Admin only)

### Enrollments
- `GET /api/enrollments` - Get all enrollments (Admin only)
- `POST /api/enrollments` - Create enrollment (Protected)
- `GET /api/enrollments/:id` - Get single enrollment (Admin only)
- `PUT /api/enrollments/:id` - Update enrollment (Admin only)
- `DELETE /api/enrollments/:id` - Delete enrollment (Admin only)

### Live Classes
- `GET /api/live-classes` - Get all live classes (Public)
- `GET /api/live-classes/:id` - Get single live class (Public)
- `POST /api/live-classes` - Create live class (Admin only)
- `PUT /api/live-classes/:id` - Update live class (Admin only)
- `DELETE /api/live-classes/:id` - Delete live class (Admin only)
- `POST /api/live-classes/:id/enroll` - Enroll in live class (Protected)

### Admin
- `GET /api/admin/stats` - Get dashboard statistics (Admin only)
- `GET /api/admin/teachers` - Get all teachers (Admin only)
- `POST /api/admin/teachers` - Create teacher (Admin only)
- `PUT /api/admin/teachers/:id` - Update teacher (Admin only)

## Admin Dashboard

Access the admin dashboard at: `http://localhost:5000/admin/index.html`

Default login credentials (create this user first):
- Email: admin@najah.com
- Password: admin123

## Project Structure

```
najah-backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── adminController.js   # Admin operations
│   ├── authController.js    # Authentication
│   ├── courseController.js  # Course management
│   ├── enrollmentController.js
│   ├── liveClassController.js
│   └── studentController.js
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── errorHandler.js      # Error handling
├── models/
│   ├── Course.js
│   ├── Enrollment.js
│   ├── LiveClass.js
│   └── User.js
├── routes/
│   ├── admin.js
│   ├── auth.js
│   ├── courses.js
│   ├── enrollments.js
│   ├── liveClasses.js
│   └── students.js
├── public/
│   └── admin/               # Admin dashboard frontend
│       ├── index.html
│       ├── login.html
│       └── admin.js
├── server.js                # Main server file
└── package.json
```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRE` - JWT expiration time
- `NODE_ENV` - Environment (development/production)

## License

ISC

