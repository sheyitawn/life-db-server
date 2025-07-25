const db = require('../firebase');

const getData = async (path) => {
  const snap = await db.ref(path).once('value');
  return snap.val();
};

const setData = async (path, value) => {
  if (Array.isArray(value)) {
    throw new Error(`❌ Tried to set array at "${path}". Firebase prefers key-based objects.`);
  }
  await db.ref(path).set(value);
};

const updateData = async (path, value) => {
  await db.ref(path).update(value);
};

const fetchAsArray = async (path) => {
  try {
    const snap = await db.ref(path).once('value');
    const data = snap.val();
    return Array.isArray(data) ? data : Object.values(data || {});
  } catch (err) {
    console.error(`❌ Failed to fetch "${path}" from Firebase:`, err.message);
    return [];
  }
};

module.exports = {
  getData,
  setData,
  updateData,
  fetchAsArray
};
