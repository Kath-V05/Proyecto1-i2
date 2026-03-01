// =============================================
// Firebase Auth Service — KittyTasks
// =============================================
import { app } from './init.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as fbSignOut,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export async function registerUser(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    return cred.user;
}

export async function loginUser(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

export async function signOut() {
    return fbSignOut(auth);
}

export async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
}

export async function signInWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
}

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}
