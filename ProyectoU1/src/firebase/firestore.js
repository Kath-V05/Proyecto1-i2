// =============================================
// Firestore Service — KittyTasks
// All CRUD + real-time listeners
// =============================================
import { app } from './init.js';
import {
    getFirestore,
    collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
    getDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp,
    increment, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export const db = getFirestore(app);

// Local copy to avoid circular import from main.js
function computeLevel(xp) {
    const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];
    let level = 1;
    for (let i = 0; i < thresholds.length; i++) {
        if (xp >= thresholds[i]) level = i + 1; else break;
    }
    return level;
}


// ─── USER PROFILE ────────────────────────────────────────────────────────────

export async function createUserProfile(uid, data) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        // Brand new user — set all defaults
        await setDoc(ref, {
            displayName: data.displayName || '',
            email: data.email || '',
            photoURL: data.photoURL || null,
            points: 0,
            level: 1,
            streak: 0,
            lastActiveDate: null,
            xp: 0,
            badges: [],
            catAccessories: [],
            equippedSkin: 'default',
            unlockedSkins: ['default'],
            friends: [],
            createdAt: serverTimestamp()
        });
    } else {
        // Existing user — only update non-progress identity fields
        const updates = {};
        if (data.displayName && !snap.data().displayName) updates.displayName = data.displayName;
        if (data.email) updates.email = data.email;
        if (data.photoURL !== undefined) updates.photoURL = data.photoURL;
        // Ensure skin fields exist for old accounts
        if (snap.data().equippedSkin === undefined) updates.equippedSkin = 'default';
        if (snap.data().unlockedSkins === undefined) updates.unlockedSkins = ['default'];
        if (Object.keys(updates).length) await updateDoc(ref, updates);
    }
}


export function listenUserProfile(uid, callback) {
    return onSnapshot(doc(db, 'users', uid), snap => {
        if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
}

export async function updateUserProfile(uid, data) {
    return updateDoc(doc(db, 'users', uid), data);
}

export async function getUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}


export async function addPoints(uid, points) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        points: increment(points),
        xp: increment(points)
    });
    // Re-read to get new xp total and persist level
    const snap = await getDoc(userRef);
    if (snap.exists()) {
        const newXp = (snap.data().xp || 0);
        const newLevel = computeLevel(newXp);
        await updateDoc(userRef, { level: newLevel });
        return newLevel;
    }
    return 1;
}

// ─── TASKS ────────────────────────────────────────────────────────────────────


export function listenTasks(uid, callback) {
    // No orderBy — avoids composite index requirement. Sort in memory.
    const q = query(collection(db, 'users', uid, 'tasks'));
    return onSnapshot(q,
        snap => {
            const tasks = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            callback(tasks);
        },
        err => { console.error('[KittyTasks] listenTasks error:', err?.code, err?.message); callback([]); }
    );
}


export async function addTask(uid, task) {
    const coll = task.projectId
        ? collection(db, 'projects', task.projectId, 'tasks')
        : collection(db, 'users', uid, 'tasks');

    return addDoc(coll, {
        title: task.title,
        description: task.description || '',
        difficulty: task.difficulty || 'normal',
        completed: false,
        archived: false,
        dueDate: task.dueDate || null,
        dueTime: task.dueTime || null,
        projectId: task.projectId || null,
        tags: task.tags || [],
        authorUid: uid, // Track who created it
        createdAt: serverTimestamp()
    });
}

export async function updateTask(uid, taskId, data, projectId = null) {
    const pid = projectId || null;
    const ref = pid
        ? doc(db, 'projects', pid, 'tasks', taskId)
        : doc(db, 'users', uid, 'tasks', taskId);
    try {
        return await updateDoc(ref, data);
    } catch (err) {
        console.error(`[Firestore] Error updating task ${taskId} (pid: ${pid}):`, err);
        throw err;
    }
}



export async function deleteTask(uid, taskId, projectId = null) {
    const pid = projectId || null;
    const ref = pid
        ? doc(db, 'projects', pid, 'tasks', taskId)
        : doc(db, 'users', uid, 'tasks', taskId);
    try {
        return await deleteDoc(ref);
    } catch (err) {
        console.error(`[Firestore] Error deleting task ${taskId} (pid: ${pid}):`, err);
        throw err;
    }
}


export async function archiveTask(uid, taskId, projectId = null) {
    const pid = projectId || null;
    const ref = pid
        ? doc(db, 'projects', pid, 'tasks', taskId)
        : doc(db, 'users', uid, 'tasks', taskId);
    try {
        return await updateDoc(ref, { archived: true });
    } catch (err) {
        console.error(`[Firestore] Error archiving task ${taskId} (pid: ${pid}):`, err);
        throw err;
    }
}



export async function completeTask(uid, taskId, difficulty, projectId = null) {
    const pointsMap = { easy: 10, normal: 25, hard: 50 };
    const points = pointsMap[difficulty] || 25;
    const pid = projectId || null;
    const ref = pid
        ? doc(db, 'projects', pid, 'tasks', taskId)
        : doc(db, 'users', uid, 'tasks', taskId);

    try {
        await updateDoc(ref, {
            completed: true,
            completedAt: serverTimestamp()
        });
        await addPoints(uid, points);
        return points;
    } catch (err) {
        console.error(`[Firestore] Error completing task ${taskId} (pid: ${pid}):`, err);
        throw err;
    }
}




// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

export async function checkAndGrantAchievements(uid) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return [];

    const profile = userSnap.data();
    const earned = profile.badges || [];
    const xp = profile.xp || 0;
    const streak = profile.streak || 0;
    const level = computeLevel(xp);

    // Fetch tasks to count
    const tasksSnap = await getDocs(collection(db, 'users', uid, 'tasks'));
    const tasks = tasksSnap.docs.map(d => d.data());
    const completedTasks = tasks.filter(t => t.completed);
    const hardDone = completedTasks.filter(t => t.difficulty === 'hard').length;

    // Fetch notes/projects count
    const notesSnap = await getDocs(collection(db, 'users', uid, 'notes'));
    const projSnap = await getDocs(query(collection(db, 'projects'), where('ownerUid', '==', uid)));

    const newBadges = [];
    const newSkins = [...(profile.unlockedSkins || ['default'])];

    const grant = (id) => {
        if (!earned.includes(id)) { newBadges.push(id); }
    };

    // Evaluate each achievement
    if (completedTasks.length >= 1) grant('first_task');
    if (streak >= 3) grant('streak_3');
    if (streak >= 7) { grant('streak_7'); if (!newSkins.includes('ghost')) newSkins.push('ghost'); }
    if (hardDone >= 5) grant('hard_5');
    if (level >= 5) grant('level_5');
    if (level >= 10) grant('level_10');
    if (notesSnap.size >= 10) grant('notes_10');
    if (projSnap.size >= 3) grant('projects_3');

    // Unlock skins by level
    if (level >= 3 && !newSkins.includes('orange')) newSkins.push('orange');
    if (level >= 7 && !newSkins.includes('galaxy')) newSkins.push('galaxy');
    if (hardDone >= 10 && !newSkins.includes('black')) newSkins.push('black');

    if (newBadges.length > 0 || newSkins.length !== (profile.unlockedSkins || ['default']).length) {
        await updateDoc(userRef, {
            badges: arrayUnion(...newBadges),
            unlockedSkins: newSkins
        });
    }

    return newBadges;
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

export function listenProjects(uid, callback) {
    // Single-field query only — no composite index required
    // Sorting is done client-side to avoid needing a (ownerUid + createdAt) composite index
    const q = query(
        collection(db, 'projects'),
        where('members', 'array-contains', uid)
    );

    return onSnapshot(q,
        snap => {
            const projects = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            callback(projects);
        },
        err => {
            console.error('[KittyTasks] Error cargando proyectos:', err?.code, err?.message);
            callback([]);
        }
    );
}

export async function addProjectMember(projectId, friendUid) {
    const ref = doc(db, 'projects', projectId);
    await updateDoc(ref, { members: arrayUnion(friendUid) });
}

export async function removeProjectMember(projectId, memberUid) {
    const ref = doc(db, 'projects', projectId);
    await updateDoc(ref, { members: arrayRemove(memberUid) });
}



export async function getProjects(uid) {
    const q = query(collection(db, 'projects'), where('members', 'array-contains', uid));

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createProject(uid, project) {
    return addDoc(collection(db, 'projects'), {
        name: project.name,
        description: project.description || '',
        ownerUid: uid,
        members: [uid],
        memberRoles: { [uid]: 'owner' },
        archived: false,
        tags: project.tags || [],
        color: project.color || '#7c6ff7',
        createdAt: serverTimestamp()
    });
}

export async function updateProject(projectId, data) {
    return updateDoc(doc(db, 'projects', projectId), data);
}

export async function deleteProject(projectId) {
    return deleteDoc(doc(db, 'projects', projectId));
}

export async function archiveProject(projectId, archived = true) {
    return updateDoc(doc(db, 'projects', projectId), { archived });
}

export async function inviteMember(projectId, email) {
    return addDoc(collection(db, 'projectInvites'), {
        projectId,
        toEmail: email,
        status: 'pending',
        createdAt: serverTimestamp()
    });
}

// Project tasks
export function listenProjectTasks(projectId, callback) {
    const q = query(
        collection(db, 'projects', projectId, 'tasks'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q,
        snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => {
            console.error(`[Firestore] listenProjectTasks error (pid: ${projectId}):`, err);
            callback([]);
        }
    );
}


export async function addProjectTask(uid, projectId, task) {
    return addTask(uid, { ...task, projectId });
}

export async function deleteProjectTask(projectId, taskId) {
    return deleteDoc(doc(db, 'projects', projectId, 'tasks', taskId));
}


// Project notes
export function listenProjectNotes(projectId, callback) {
    const q = query(
        collection(db, 'projects', projectId, 'notes'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function addProjectNote(uid, projectId, note) {
    return addDoc(collection(db, 'projects', projectId, 'notes'), {
        ...note,
        authorUid: uid,
        projectId, // Keep for backward compat/linking
        createdAt: serverTimestamp()
    });
}

export async function updateProjectNote(projectId, noteId, data) {
    return updateDoc(doc(db, 'projects', projectId, 'notes', noteId), data);
}

export async function deleteProjectNote(projectId, noteId) {
    return deleteDoc(doc(db, 'projects', projectId, 'notes', noteId));
}

// ─── NOTES ────────────────────────────────────────────────────────────────────

export function listenNotes(uid, callback) {
    const q = query(
        collection(db, 'users', uid, 'notes'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function addNote(uid, note) {
    return addDoc(collection(db, 'users', uid, 'notes'), {
        title: note.title,
        content: note.content || '',
        tags: note.tags || [],
        utilityScore: 0,
        linkedTaskId: note.linkedTaskId || null,
        projectId: note.projectId || null,
        color: note.color || null,
        createdAt: serverTimestamp()
    });
}

export async function updateNote(uid, noteId, data) {
    return updateDoc(doc(db, 'users', uid, 'notes', noteId), data);
}

export async function deleteNote(uid, noteId) {
    return deleteDoc(doc(db, 'users', uid, 'notes', noteId));
}

// ─── ACHIEVEMENTS / STREAK ───────────────────────────────────────────────────

export async function updateStreak(uid) {
    try {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;

        const data = snap.data();
        const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
        // lastActiveDate stored as ISO string (or legacy Timestamp)
        let lastActive = data.lastActiveDate;
        if (lastActive && typeof lastActive === 'object' && lastActive.seconds) {
            lastActive = new Date(lastActive.seconds * 1000).toISOString().split('T')[0];
        }

        if (lastActive === today) return; // Already updated today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const newStreak = (!lastActive || lastActive !== yesterdayStr) ? 1 : (data.streak || 0) + 1;

        await updateDoc(userRef, { streak: newStreak, lastActiveDate: today });
        return newStreak;
    } catch (err) {
        console.error('[KittyTasks] updateStreak error:', err?.message);
    }
}


// ─── FRIENDS ─────────────────────────────────────────────────────────────────

export async function sendFriendRequest(fromUid, toEmail) {
    // Lookup the recipient by email
    const toUser = await findUserByEmail(toEmail);
    if (!toUser) throw new Error('Usuario no encontrado');
    if (toUser.id === fromUid) throw new Error('No puedes enviarte una solicitud a ti mismo');

    // Check for duplicates — single-field query only (avoids composite index requirement)
    const existingSnap = await getDocs(query(
        collection(db, 'friendRequests'),
        where('fromUid', '==', fromUid)
    ));
    const hasPending = existingSnap.docs.some(d => {
        const data = d.data();
        return data.toUid === toUser.id && data.status === 'pending';
    });
    if (hasPending) throw new Error('Ya enviaste una solicitud a este usuario');

    // Also check they are not already friends
    const friends = await getFriends(fromUid);
    if (friends.includes(toUser.id)) throw new Error('Ya son amigos');


    // Get sender display name
    const senderSnap = await getDoc(doc(db, 'users', fromUid));
    const senderData = senderSnap.exists() ? senderSnap.data() : {};

    return addDoc(collection(db, 'friendRequests'), {
        fromUid,
        fromDisplayName: senderData.displayName || senderData.email || 'Usuario',
        fromEmail: senderData.email || '',
        toUid: toUser.id,
        toEmail,
        status: 'pending',
        createdAt: serverTimestamp()
    });
}




export function listenFriendRequests(uid, email, callback) {
    // Single-field query — no composite index required
    // (Firestore only allows compound queries with indexes)
    const q = query(
        collection(db, 'friendRequests'),
        where('toUid', '==', uid)
    );
    return onSnapshot(q,
        snap => {
            // Filter pending in memory to avoid composite index requirement
            const pending = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(r => r.status === 'pending');
            callback(pending);
        },
        err => {
            console.error('[KittyTasks] friendRequests listener error:', err);
            callback([]);
        }
    );
}


export async function getFriends(uid) {
    const q1 = query(collection(db, 'friendRequests'), where('fromUid', '==', uid), where('status', '==', 'accepted'));
    const q2 = query(collection(db, 'friendRequests'), where('toUid', '==', uid), where('status', '==', 'accepted'));
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const friends = new Set();
    s1.docs.forEach(d => friends.add(d.data().toUid));
    s2.docs.forEach(d => friends.add(d.data().fromUid));
    return Array.from(friends);
}

// Real-time friend synchronization
export function listenFriends(uid, callback) {
    const q1 = query(collection(db, 'friendRequests'), where('fromUid', '==', uid), where('status', '==', 'accepted'));
    const q2 = query(collection(db, 'friendRequests'), where('toUid', '==', uid), where('status', '==', 'accepted'));

    let f1 = [], f2 = [];
    const notify = () => {
        const set = new Set([...f1, ...f2]);
        callback(Array.from(set));
    };

    const unsub1 = onSnapshot(q1, snap => {
        f1 = snap.docs.map(d => d.data().toUid);
        notify();
    });
    const unsub2 = onSnapshot(q2, snap => {
        f2 = snap.docs.map(d => d.data().fromUid);
        notify();
    });

    return () => { unsub1(); unsub2(); };
}



export async function respondFriendRequest(requestId, fromUid, toUid, accept) {

    // We only update the request status.
    // getFriends() will now derive the friends list from these accepted requests.
    return updateDoc(doc(db, 'friendRequests', requestId), {
        status: accept ? 'accepted' : 'rejected'
    });
}


// ─── USER SEARCH ─────────────────────────────────────────────────────────────

export async function findUserByEmail(email) {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
}

// ─── TIMER SESSIONS ──────────────────────────────────────────────────────────

export async function saveTimerSession(uid, session) {
    return addDoc(collection(db, 'users', uid, 'timerSessions'), {
        type: session.type,
        duration: session.duration,
        projectId: session.projectId || null,
        createdAt: serverTimestamp()
    });
}
