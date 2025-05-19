# Firebase Setup for EasyVat

This file contains instructions for setting up Firebase correctly for the EasyVat application.

## Firestore Security Rules

The application requires specific security rules to function properly. You need to configure these rules in your Firebase console.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database
4. Click on the "Rules" tab
5. Replace the rules with the following:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write only their own profile
    match /userProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // For invoices, users can only see their own invoices
    match /invoices/{invoiceId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Default deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click "Publish" to apply the rules

## Firebase Authentication

Ensure Google Authentication is enabled:

1. In Firebase Console, go to Authentication
2. Under "Sign-in method" tab, enable Google
3. Configure the OAuth consent screen if prompted
4. Add your domain to the authorized domains list

## Environment Variables

Make sure your `.env.local` file contains all necessary Firebase configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Firestore Database Structure

The application expects the following collections:

1. `userProfiles` - Stores user profile information
   - Document ID: User's UID from authentication
   - Fields:
     - stationName: string
     - address: string
     - telephone: string
     - email: string
     - vatNumber: string
     - userId: string (same as document ID)
     - updatedAt: timestamp

2. `invoices` - Stores invoice data (will be created as needed)
   - Document ID: Auto-generated
   - Fields will include userId to link to the user who created it 