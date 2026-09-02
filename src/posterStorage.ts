// Revision: IndexedDB poster storage — supports large poster files and up to 3 attachments

export interface PosterItem {
  id: string;
  title: string;
  fileType: string;
  dateAdded: string;
  attachedEvent: string;
  image: string;
}

const DB_NAME = "ramsdaleEventDesk";
const DB_VERSION = 1;
const STORE_NAME = "posterLibrary";
const LEGACY_STORAGE_KEY = "posterLibrary";

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const getPosterLibrary = async (): Promise<PosterItem[]> => {
  if (typeof indexedDB === "undefined") return [];

  const db = await openDatabase();

  const posters = await new Promise<PosterItem[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => resolve(request.result as PosterItem[]);
    request.onerror = () => reject(request.error);
  });

  db.close();

  if (posters.length > 0) return posters;

  // One-time migration from the old localStorage library.
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return [];

    const parsed = JSON.parse(legacy);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    await savePosterLibrary(parsed as PosterItem[]);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return parsed as PosterItem[];
  } catch (error) {
    console.error("Failed to migrate poster library", error);
    return [];
  }
};

export const savePosterLibrary = async (
  posters: PosterItem[]
): Promise<void> => {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this browser.");
  }

  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.clear();
    posters.forEach((poster) => store.put(poster));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Poster storage transaction aborted."));
  });

  db.close();
};

export const savePoster = async (poster: PosterItem): Promise<void> => {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this browser.");
  }

  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(poster);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Poster storage transaction aborted."));
  });

  db.close();
};

export const deletePoster = async (posterId: string): Promise<void> => {
  if (typeof indexedDB === "undefined") return;

  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(posterId);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Poster deletion transaction aborted."));
  });

  db.close();
};
