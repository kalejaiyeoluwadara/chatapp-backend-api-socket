# 🚀 ChatApp Backend API

A full-fledged real-time chat backend API service with user management, friend system, and Socket.IO integration.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Socket.IO Events](#-socketio-events)
- [Database Schema](#-database-schema)
- [Security Features](#-security-features)
- [Deployment](#-deployment)

## ✨ Features

### 🔐 Authentication & User Management

- **User Registration** with email verification via SendGrid
- **JWT-based Authentication** with secure token management
- **Password Reset** functionality
- **Profile Management** with Cloudinary image upload
- **Email Verification** system

### 👥 Friend System

- **Send/Accept/Reject** friend requests
- **Friend List Management**
- **Online/Offline Status** tracking
- **User Search** functionality

### 💬 Real-time Chat

- **Socket.IO Integration** for real-time messaging
- **Message History** with pagination
- **File & Image Sharing** via Cloudinary
- **Typing Indicators**
- **Read Receipts**
- **Message Reply** functionality
- **Conversation Management**

### 🛡️ Security & Performance

- **Rate Limiting** to prevent abuse
- **Input Validation** with express-validator
- **Password Hashing** with bcrypt
- **CORS Configuration**
- **Helmet Security Headers**
- **Database Indexing** for performance

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Cloudinary
- **Email Service**: SendGrid
- **Security**: bcrypt, helmet, rate-limiting
- **Validation**: express-validator

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- SendGrid account (for email service)
- Cloudinary account (for file uploads)

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd socket
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

4. **Configure your environment variables** (see Configuration section)

5. **Start the server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## ⚙️ Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/chat_app

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender@example.com

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Verification
VERIFICATION_TOKEN_EXPIRES_IN=24h
BASE_URL=http://localhost:5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login User

```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Verify Email

```http
GET /auth/verify-email?token=verification_token_here
```

#### Forgot Password

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### User Management Endpoints

#### Get Profile

```http
GET /user/profile
Authorization: Bearer <jwt_token>
```

#### Update Profile

```http
PATCH /user/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Updated bio"
}
```

#### Upload Profile Picture

```http
POST /user/profile/picture
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

profilePicture: <image_file>
```

#### Search Users

```http
GET /user/search?q=john&limit=10
Authorization: Bearer <jwt_token>
```

### Friend System Endpoints

#### Send Friend Request

```http
POST /friend/request
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "username": "jane_doe"
}
```

#### Accept Friend Request

```http
POST /friend/accept/:requestId
Authorization: Bearer <jwt_token>
```

#### Get Friend Requests

```http
GET /friend/requests
Authorization: Bearer <jwt_token>
```

#### Get Friends List

```http
GET /friend/list
Authorization: Bearer <jwt_token>
```

### Chat Endpoints

#### Get Conversation

```http
GET /chat/conversation/:friendId?limit=50&skip=0
Authorization: Bearer <jwt_token>
```

#### Send Message

```http
POST /chat/message
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "Hello!",
  "receiverId": "friend_user_id",
  "replyTo": "optional_reply_message_id"
}
```

#### Send Image

```http
POST /chat/image/:receiverId
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

image: <image_file>
replyTo: optional_reply_message_id
```

#### Get Conversations

```http
GET /chat/conversations
Authorization: Bearer <jwt_token>
```

#### Mark Messages as Read

```http
PATCH /chat/read/:friendId
Authorization: Bearer <jwt_token>
```

## 🔌 Socket.IO Events

### Client to Server Events

#### Send Message

```javascript
socket.emit("send_message", {
  receiverId: "user_id",
  content: "Hello!",
  messageType: "text",
  replyTo: "optional_reply_id",
});
```

#### Typing Indicators

```javascript
// Start typing
socket.emit("typing_start", { receiverId: "user_id" });

// Stop typing
socket.emit("typing_stop", { receiverId: "user_id" });
```

#### Mark Message as Read

```javascript
socket.emit("mark_read", {
  messageId: "message_id",
  senderId: "sender_user_id",
});
```

#### Friend Request

```javascript
socket.emit("friend_request", {
  username: "target_username",
});
```

#### Friend Request Response

```javascript
socket.emit("friend_request_response", {
  requestId: "request_id",
  action: "accept", // or 'reject'
});
```

### Server to Client Events

#### New Message

```javascript
socket.on("new_message", (data) => {
  console.log("New message:", data.message);
  console.log("From:", data.sender);
});
```

#### Message Sent Confirmation

```javascript
socket.on("message_sent", (data) => {
  console.log("Message sent:", data.message);
  console.log("Status:", data.status);
});
```

#### Typing Indicators

```javascript
socket.on("user_typing", (data) => {
  console.log(`${data.username} is typing...`);
});

socket.on("user_stop_typing", (data) => {
  console.log(`${data.username} stopped typing`);
});
```

#### Friend Status

```javascript
socket.on("friend_online", (data) => {
  console.log(`${data.username} is now online`);
});

socket.on("friend_offline", (data) => {
  console.log(`${data.username} is now offline`);
});
```

## 🗄️ Database Schema

### User Model

```javascript
{
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String (required),
  lastName: String (required),
  profilePicture: String,
  bio: String,
  isEmailVerified: Boolean,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastSeen: Date,
  isOnline: Boolean,
  friends: [ObjectId],
  friendRequests: [{
    from: ObjectId,
    status: String,
    createdAt: Date
  }],
  sentFriendRequests: [{
    to: ObjectId,
    status: String,
    createdAt: Date
  }]
}
```

### Message Model

```javascript
{
  sender: ObjectId (ref: User),
  receiver: ObjectId (ref: User),
  content: String (required),
  messageType: String (enum: ['text', 'image', 'file']),
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  isRead: Boolean,
  readAt: Date,
  isDeleted: Boolean,
  deletedAt: Date,
  replyTo: ObjectId (ref: Message)
}
```

## 🛡️ Security Features

- **JWT Authentication** with secure token management
- **Password Hashing** using bcrypt with salt rounds
- **Rate Limiting** to prevent abuse
- **Input Validation** with express-validator
- **CORS Configuration** for cross-origin requests
- **Helmet Security Headers** for enhanced security
- **Email Verification** for account security
- **File Upload Validation** and size limits

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_secure_jwt_secret
SENDGRID_API_KEY=your_sendgrid_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
BASE_URL=https://your-domain.com
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start server.js --name "chatapp-backend"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Docker Deployment

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions, please open an issue in the repository or contact the development team.

---

**Happy Chatting! 🎉**
