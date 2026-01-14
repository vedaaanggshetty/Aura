import React from 'react';
import { 
  ClerkProvider, 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton, 
  useAuth as useClerkAuth, 
  useUser as useClerkUser 
} from '@clerk/clerk-react';
import { clerkPubKey } from '../constants';

// --- CLERK PROVIDER ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if we have a valid Clerk key (not placeholder)
  const isValidKey = clerkPubKey && !clerkPubKey.includes('YOUR_CLERK_PUBLISHABLE_KEY_HERE');
  
  if (!isValidKey) {
    // Fallback to mock provider for development
    const MockContext = React.createContext({
      isSignedIn: false,
      user: null,
      signIn: () => {},
      signOut: () => {}
    });
    
    return (
      <MockContext.Provider value={{ isSignedIn: false, user: null, signIn: () => {}, signOut: () => {} }}>
        {children}
      </MockContext.Provider>
    );
  }
  
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      {children}
    </ClerkProvider>
  );
};

// --- EXPORT CLERK COMPONENTS ---
export { SignedIn, SignedOut, SignInButton, UserButton };

// --- HOOKS ---
export const useUser = () => {
  try {
    const clerkUser = useClerkUser();
    return { 
      isSignedIn: !!clerkUser.isSignedIn, 
      user: clerkUser.user ? {
        id: clerkUser.user.id,
        fullName: clerkUser.user.fullName || '',
        firstName: clerkUser.user.firstName || '',
        imageUrl: clerkUser.user.imageUrl
      } : null 
    };
  } catch {
    // Fallback for mock context
    return { isSignedIn: false, user: null };
  }
};

export const useAuth = () => {
  try {
    const clerkAuth = useClerkAuth();
    return { signOut: clerkAuth.signOut };
  } catch {
    // Fallback for mock context
    return { signOut: () => {} };
  }
};
