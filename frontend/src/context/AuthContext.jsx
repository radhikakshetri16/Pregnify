import { createContext, useContext } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut, openSignIn, openSignUp } = useClerk();

  const formattedUser = user
    ? {
        id: user.id,
        fullName: user.fullName || user.firstName || "User",
        firstName: user.firstName || "User",
        email: user.primaryEmailAddress?.emailAddress || "",
        imageUrl: user.imageUrl || "",
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
        user: formattedUser,
        signInWithGoogle: () => openSignIn({}),
        signUp: () => openSignUp({}),
        signOut: () => signOut(),
        isClerkActive: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
