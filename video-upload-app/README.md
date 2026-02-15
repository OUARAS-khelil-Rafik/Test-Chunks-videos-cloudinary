# 🎥 Cloudinary Video Platform

A modern, production-ready full-stack web application for uploading and managing videos with Cloudinary integration. Built with Next.js 14, React 18, TypeScript, and MongoDB.

## ✨ Features

- 🔐 **Authentication System**: Secure user registration and login with NextAuth and JWT
- 📤 **Signed Uploads**: Direct secure uploads to Cloudinary with signed parameters
- 🎨 **Premium UI**: Glassmorphism design with dark/light mode toggle
- 📱 **Responsive Design**: Mobile-first approach with Tailwind CSS
- 🎬 **Video Management**: Complete CRUD operations for videos
- 🔍 **Search & Filter**: Search by title/description with sorting options
- 📊 **Metadata Extraction**: Automatic extraction of video properties (codec, resolution, bitrate, etc.)
- 🎞️ **Video Player**: Stream and playback complete videos with React Player
- 📈 **Upload Progress**: Real-time upload progress tracking
- 🗂️ **Pagination**: Efficient pagination for large video collections
- 💾 **MongoDB Integration**: Persistent storage with Mongoose ODM
- 🎭 **Smooth Animations**: Framer Motion animations throughout

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB database (local or Atlas)
- Cloudinary account

### Installation

1. **Clone the repository**
```bash
cd video-upload-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/video-platform
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/video-platform

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

4. **Generate NextAuth secret**
```bash
openssl rand -base64 32
```

5. **Start the development server**
```bash
npm run dev
```

6. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
video-upload-app/
├── src/
│   ├── app/                          # Next.js 14 App Router
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/    # NextAuth configuration
│   │   │   │   └── register/         # User registration
│   │   │   ├── cloudinary/
│   │   │   │   └── signature/        # Signed upload parameters
│   │   │   └── videos/               # Video CRUD operations
│   │   │       ├── route.ts          # List/Create videos
│   │   │       └── [id]/route.ts     # Get/Update/Delete video
│   │   ├── auth/
│   │   │   ├── signin/               # Sign in page
│   │   │   └── signup/               # Sign up page
│   │   ├── upload/                   # Upload page
│   │   ├── videos/                   # Videos listing
│   │   │   ├── page.tsx              # Videos grid page
│   │   │   └── [id]/page.tsx         # Video detail page
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   └── globals.css               # Global styles
│   ├── components/                   # React Components
│   │   ├── Navbar.tsx                # Navigation bar
│   │   ├── Providers.tsx             # Session provider wrapper
│   │   ├── ThemeProvider.tsx         # Theme management
│   │   ├── VideoUploader.tsx         # Upload interface
│   │   ├── VideoGrid.tsx             # Videos grid/list
│   │   └── VideoDetail.tsx           # Video player & details
│   ├── lib/                          # Utility libraries
│   │   ├── cloudinary.ts             # Cloudinary integration
│   │   └── db.ts                     # MongoDB connection
│   ├── models/                       # Database models
│   │   ├── User.ts                   # User schema
│   │   └── Video.ts                  # Video schema
│   └── store/                        # State management
│       └── index.ts                  # Zustand stores
├── public/                           # Static assets
├── .env.local                        # Environment variables (create this)
├── next.config.js                    # Next.js configuration
├── tailwind.config.js                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies
```

## 🔧 Configuration

### Cloudinary Setup

1. Create an account at [cloudinary.com](https://cloudinary.com)
2. Get your credentials from the dashboard:
   - Cloud Name
   - API Key
   - API Secret
3. Add them to `.env.local`

### MongoDB Setup

**Option 1: Local MongoDB**
```bash
# Install MongoDB locally
brew install mongodb-community # macOS
# OR
sudo apt-get install mongodb # Linux

# Start MongoDB
mongod --dbpath /path/to/data/directory
```

**Option 2: MongoDB Atlas (Cloud)**
1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Add to `.env.local`

## 📜 API Routes

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/signin` - Sign in (handled by NextAuth)
- `POST /api/auth/signout` - Sign out (handled by NextAuth)

### Videos

- `GET /api/videos` - List videos with pagination, search, and sorting
  - Query params: `page`, `limit`, `search`, `sortBy`, `order`
- `POST /api/videos` - Create video record after upload
- `GET /api/videos/[id]` - Get single video
- `PATCH /api/videos/[id]` - Update video (title, description)
- `DELETE /api/videos/[id]` - Delete video (from DB and Cloudinary)

### Cloudinary

- `GET /api/cloudinary/signature` - Get signed upload parameters

## 🎨 UI Components

### VideoUploader
- Drag-and-drop interface
- File validation (100MB limit, video formats only)
- Real-time upload progress
- Form fields for title/description
- Success/error animations

### VideoGrid
- Grid/list layout
- Search functionality
- Sort controls (date, title, duration, size)
- Pagination
- Hover animations

### VideoDetail
- Video player with React Player
- Complete metadata display
- Edit title/description
- Download option
- Delete functionality

### Navbar
- Responsive navigation
- Authentication state
- Dark/light theme toggle
- Logo and links

## 🎯 Features in Detail

### Authentication Flow
1. User signs up with email/password
2. Password hashed with bcrypt
3. User signs in with credentials
4. JWT session created with NextAuth
5. Protected routes check session

### Upload Flow
1. User selects video file (drag-drop or click)
2. Client requests signed upload parameters from API
3. File uploaded directly to Cloudinary with progress tracking
4. Metadata extracted from Cloudinary response
5. Video record saved to MongoDB
6. User redirected to video detail page

### Video Management
- List all videos with pagination
- Search by title/description (MongoDB text index)
- Sort by date, title, duration, or size
- View detailed metadata
- Stream video in browser
- Edit video details
- Delete video (removes from both DB and Cloudinary)

## 🛠️ Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS
- **Framer Motion**: Animation library
- **Zustand**: State management
- **React Dropzone**: File upload
- **React Player**: Video playback
- **Lucide React**: Icon library

### Backend
- **Next.js API Routes**: RESTful API
- **NextAuth**: Authentication
- **MongoDB**: Database
- **Mongoose**: ODM
- **Cloudinary**: Video hosting
- **bcryptjs**: Password hashing

## 📊 Database Schema

### User Model
```typescript
{
  name: string;
  email: string (unique, indexed);
  password: string (hashed);
  createdAt: Date;
  updatedAt: Date;
}
```

### Video Model
```typescript
{
  userId: ObjectId (ref: User);
  publicId: string;
  secureUrl: string;
  thumbnail: string;
  title: string;
  description?: string;
  format: string;
  duration: number;
  width: number;
  height: number;
  bitRate: number;
  frameRate: number;
  audioCodec: string;
  videoCodec: string;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production
```env
MONGODB_URI=your-production-mongodb-uri
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Build Command
```bash
npm run build
```

### Start Command
```bash
npm start
```

## 🔒 Security Features

- Signed Cloudinary uploads prevent unauthorized uploads
- Password hashing with bcrypt
- JWT-based authentication
- Environment variables for sensitive data
- Input validation on client and server
- Protected API routes
- CORS configuration

## 🎨 Customization

### Theme Colors
Edit [src/app/globals.css](src/app/globals.css):
```css
:root {
  --primary: #3b82f6;
  --secondary: #9333ea;
  /* ... */
}
```

### Upload Limits
Edit [src/components/VideoUploader.tsx](src/components/VideoUploader.tsx):
```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
```

### Pagination Size
Edit [src/app/api/videos/route.ts](src/app/api/videos/route.ts):
```typescript
const limit = parseInt(url.searchParams.get('limit') || '12');
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string format
- Verify network access (Atlas IP whitelist)

### Cloudinary Upload Fails
- Verify API credentials
- Check file size limits
- Ensure signed upload is configured

### NextAuth Errors
- Generate proper NEXTAUTH_SECRET
- Set correct NEXTAUTH_URL
- Clear browser cookies

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and Cloudinary
