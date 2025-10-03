// tools/purge-users.js (run with: node purge-users.js serviceAccount.json uid1 uid2 ...)
const admin = require('firebase-admin');
const fs = require('fs');

if (process.argv.length < 4) {
  console.error('Usage: node purge-users.js <serviceAccount.json> <uid1> [uid2 uid3 ...]');
  process.exit(1);
}

const svcPath = process.argv[2];
const uids = process.argv.slice(3);

admin.initializeApp({
  credential: admin.credential.cert(require(svcPath)),
  storageBucket: '<YOUR_PROJECT_ID>.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function deleteDocsByQuery(queryRef) {
  while (true) {
    const snap = await queryRef.limit(500).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

async function purgeUser(uid) {
  console.log('Purge', uid);
  try {
    await db.doc(`users/${uid}`).delete().catch(()=>{});
    await db.doc(`user_counters/${uid}`).delete().catch(()=>{});

    // notifications
    await deleteDocsByQuery(db.collection('notifications').where('toUserId','==',uid));
    await deleteDocsByQuery(db.collection('notifications').where('fromUserId','==',uid));

    // comments authored
    await deleteDocsByQuery(db.collection('comments').where('authorId','==',uid));

    // remove likes: find comments where likedBy contains uid
    const q = db.collection('comments').where('likedBy','array-contains',uid);
    while (true) {
      const snap = await q.limit(500).get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach(d => {
        const data = d.data();
        const ref = d.ref;
        const newCount = Math.max(0, (data.likeCount || 0) - 1);
        batch.update(ref, { likedBy: admin.firestore.FieldValue.arrayRemove(uid), likeCount: newCount });
      });
      await batch.commit();
    }

    // delete avatar files
    const [files] = await bucket.getFiles({ prefix: `avatars/${uid}/` });
    if (files.length) {
      for (const f of files) await f.delete().catch(()=>{});
    }

    console.log('Purged', uid);
  } catch (e) {
    console.error('Error purging', uid, e);
  }
}

(async () => {
  for (const uid of uids) {
    await purgeUser(uid);
  }
  console.log('Done');
  process.exit(0);
})();