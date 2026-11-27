/**
 * Firebase Web App Configuration (Free Spark Tier)
 * -------------------------------------------------
 * Replace the placeholder values below with your own Firebase project's config
 * from: Firebase Console -> Project Settings -> Your Apps -> Web App (</>).
 *
 * Until you replace YOUR_API_KEY, the app runs in Local Offline Sandbox mode
 * using your browser's storage so you can explore every module immediately.
 */
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/** Default domain suffix appended when users sign in with a short username */
export const USERNAME_EMAIL_DOMAIN = "curatech.hospital";

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes("YOUR_") &&
    !firebaseConfig.projectId.includes("YOUR_")
  );
}
