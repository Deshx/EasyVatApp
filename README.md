# EasyVat

A modern VAT invoice management platform specifically designed for filling stations. EasyVat simplifies VAT compliance and invoice generation with AI-powered receipt processing and automated workflows.

## 🚀 Features

### Core Functionality
- **Quick Invoice Generation** - Create professional VAT invoices in seconds
- **AI-Powered Receipt Processing** - Automatic OCR and data extraction from receipts
- **Fuel Price Management** - Real-time fuel price tracking and management (Admin)
- **Session-Based Workflows** - Secure, session-managed invoice creation process
- **Bill Validation** - Recheck and validate bills for accuracy
- **Tax Compliance** - Automated VAT calculations and compliance checks
- **Secure Storage** - Firebase-backed secure document storage

### AI Integrations
- **OpenAI** - Receipt parsing, image OCR, and chat functionality
- **Anthropic** - Advanced text processing and analysis
- **Deepgram** - Real-time audio transcription
- **Replicate** - Image generation capabilities

## 🔄 User Flow

### 1. **Landing & Authentication**
- Users arrive at the landing page showcasing EasyVat's benefits
- Click "Get Started" to begin the authentication process
- Secure login via Firebase Authentication

### 2. **Profile Setup**
- New users are redirected to profile setup
- Enter filling station details and business information
- Complete onboarding to access the dashboard

### 3. **Dashboard**
- Central hub displaying current fuel prices
- Quick access to all main features
- User profile management and admin controls (if applicable)

### 4. **Invoice Creation Workflow**
```
Dashboard → Create Invoice → Generate Session → Invoice Form → AI Processing → Final Invoice
```
- Click "Create Invoice" to start a new session
- System generates a unique UUID session for tracking
- Fill out invoice details or upload receipts for AI processing
- AI extracts data from receipts automatically
- Review and finalize the invoice

### 5. **Receipt Processing**
- Upload receipt images for automatic data extraction
- AI-powered OCR extracts relevant information
- Manual review and correction capabilities
- Integration with invoice creation workflow

### 6. **Bill Validation**
- Recheck existing bills for accuracy
- Session-based validation process
- Compare against current fuel prices and tax rates

### 7. **Administration (Super Admin)**
- Manage fuel prices across the platform
- Monitor user activity and system usage
- Configure system-wide settings

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Hook Form + Zod** - Form handling and validation

### Backend & Services
- **Firebase** - Authentication, Firestore database, Storage
- **Vercel AI SDK** - AI model integrations and streaming

### AI & ML Services
- **OpenAI** - GPT models for text processing and image analysis
- **Anthropic Claude** - Advanced reasoning and text generation
- **Deepgram** - Speech-to-text transcription
- **Replicate** - Image generation models

### UI Components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons
- **Class Variance Authority** - Component styling patterns

## 📁 Project Structure

```
src/
├── app/                        # Next.js 14 App Router
│   ├── api/                   # API routes
│   │   ├── openai/           # OpenAI integrations
│   │   ├── anthropic/        # Anthropic integrations
│   │   ├── deepgram/         # Audio transcription
│   │   └── replicate/        # Image generation
│   ├── create-invoice/       # Invoice creation workflow
│   │   └── [sessionId]/      # Session-based invoice pages
│   ├── dashboard/            # Main dashboard
│   ├── login/                # Authentication
│   ├── profile-setup/        # User onboarding
│   ├── recheck-bills/        # Bill validation
│   │   └── [sessionId]/      # Session-based validation
│   ├── settings/             # User settings
│   └── fuel-prices/          # Fuel price management (Admin)
├── components/               # Reusable UI components
│   └── ui/                   # UI component library
├── lib/                      # Utility functions and configurations
│   ├── contexts/             # React contexts (Auth, Deepgram, etc.)
│   ├── firebase/             # Firebase configuration and utilities
│   └── hooks/                # Custom React hooks
└── hooks/                    # Additional custom hooks
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project setup
- API keys for AI services (OpenAI, Anthropic, etc.)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd EasyVat
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env.local` file with the following variables:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# AI Service API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
REPLICATE_API_TOKEN=your_replicate_api_token
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:3000` (or `http://localhost:3001` if 3000 is in use)

## 🏗 Development

### Key Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Important Notes
- The app uses session-based workflows with UUID tracking
- Firebase security rules should be configured for production
- AI API keys should be secured and rate-limited appropriately
- Super admin privileges are managed through Firebase user claims

## 🔐 Security & Authentication

- **Firebase Authentication** - Secure user management
- **Session Management** - UUID-based session tracking for invoice workflows
- **Route Protection** - Authenticated routes with automatic redirects
- **Role-Based Access** - Super admin features for privileged users
- **Secure API Routes** - Protected API endpoints with proper validation

## 📱 Responsive Design

EasyVat is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile devices
- Various screen sizes and orientations

## 🚀 Deployment

The application is designed to be deployed on Vercel with optimal performance:
- Automatic optimizations for Next.js
- Edge functions for AI integrations
- CDN for static assets
- Serverless function scaling

## 📄 License

This project is private and proprietary.

---

Built with ❤️ for efficient VAT management in the fuel industry.
