const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// 1. generatePassword
exports.generatePassword = functions.https.onCall((data, context) => {
  const length = data.length || 16;
  const options = data.options || { upper: true, lower: true, numbers: true, symbols: true };
  
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

  let chars = "";
  if (options.upper) chars += upper;
  if (options.lower) chars += lower;
  if (options.numbers) chars += numbers;
  if (options.symbols) chars += symbols;

  if (chars === "") chars = lower + numbers;

  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return { password };
});

// 2. analyzePasswordStrength
exports.analyzePasswordStrength = functions.https.onCall((data, context) => {
  const password = data.password;
  if (!password) {
    throw new functions.https.HttpsError("invalid-argument", "Password is required");
  }

  let score = 0;
  if (password.length > 8) score += 10;
  if (password.length > 12) score += 20;
  if (password.length >= 16) score += 30;

  if (/[A-Z]/.test(password)) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  return { score: Math.min(100, score) };
});

// 3. detectDuplicatePasswords
// NOTE: In a true Zero-Knowledge architecture, the server CANNOT detect duplicate passwords
// because it cannot see the plaintext passwords. This function is a placeholder that
// throws an error explaining this security principle.
exports.detectDuplicatePasswords = functions.https.onCall((data, context) => {
  throw new functions.https.HttpsError(
    "failed-precondition",
    "Zero-Knowledge Architecture Violation: Server cannot analyze encrypted passwords."
  );
});

// 4. syncVault
exports.syncVault = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
  }

  const userId = context.auth.uid;
  const db = admin.firestore();
  
  // Example sync logic: update last sync timestamp
  await db.collection("users").doc(userId).set({
    lastSync: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { status: "success", message: "Vault synced" };
});

// 5. auditSecurityScore
// NOTE: Similar to detectDuplicatePasswords, full audit requires client-side decryption.
// The server can only audit metadata (e.g., age of passwords).
exports.auditSecurityScore = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
  }

  const userId = context.auth.uid;
  const db = admin.firestore();
  
  const loginsSnapshot = await db.collection("logins").where("user_id", "==", userId).get();
  
  let oldPasswords = 0;
  const now = new Date();

  loginsSnapshot.forEach(doc => {
    const login = doc.data();
    const createdAt = new Date(login.created_at);
    const diffDays = Math.ceil(Math.abs(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 90) {
      oldPasswords++;
    }
  });

  return { 
    oldPasswords,
    totalLogins: loginsSnapshot.size,
    message: "Audit complete based on metadata."
  };
});
