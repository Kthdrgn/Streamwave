const DB_NAME = 'StreamWaveDB';
const STORE_NAME = 'downloadedEpisodes';
const DB_VERSION = 1;

let dbPromise = null;
const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    // Check for IndexedDB support
    if (!('indexedDB' in window)) {
        console.error("This browser doesn't support IndexedDB");
        return reject("This browser doesn't support IndexedDB");
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });
  return dbPromise;
};

// Helper function to promisify an IndexedDB request
const promisifyRequest = (request) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const offlineDb = {
  async saveEpisode(episodeId, audioBlob) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    return promisifyRequest(store.put(audioBlob, episodeId));
  },
  async getEpisode(episodeId) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return promisifyRequest(store.get(episodeId));
  },
  async deleteEpisode(episodeId) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    return promisifyRequest(store.delete(episodeId));
  },
  async listDownloadedEpisodeIds() {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return promisifyRequest(store.getAllKeys());
  },
};