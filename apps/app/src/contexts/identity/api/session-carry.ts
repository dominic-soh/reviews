const storageKey = 'reviews.session';
const databaseName = 'reviews';
const storeName = 'session';

type TokenStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type TokenRequest = {
  result: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
};

type TokenDatabase = {
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore: (name: string) => void;
  transaction: (
    name: string,
    mode: 'readonly' | 'readwrite',
  ) => {
    objectStore: (name: string) => {
      get: (key: string) => TokenRequest;
      put: (value: string, key: string) => void;
    };
  };
};

type OpenRequest = TokenRequest & {
  result: TokenDatabase;
  onupgradeneeded: (() => void) | null;
};

let memoryToken: string | undefined;
let ready: Promise<void> | undefined;

function pageStorage(): TokenStorage | undefined {
  try {
    const storage = globalThis.localStorage;
    if (!storage) {
      return undefined;
    }
    return storage;
  } catch {
    return undefined;
  }
}

function readPage(): string | undefined {
  const storage = pageStorage();
  if (!storage) {
    return undefined;
  }
  const value = storage.getItem(storageKey);
  if (!value) {
    return undefined;
  }
  return value;
}

function writePage(token: string): void {
  const storage = pageStorage();
  if (!storage) {
    return;
  }
  storage.setItem(storageKey, token);
}

// The Lynx background thread has no localStorage. IndexedDB is what survives a reload there.
function indexedDb():
  | { open: (name: string, version: number) => OpenRequest }
  | undefined {
  const factory = (
    globalThis as {
      indexedDB?: { open: (name: string, version: number) => OpenRequest };
    }
  ).indexedDB;
  if (!factory) {
    return undefined;
  }
  return factory;
}

function openDatabase(): Promise<TokenDatabase | undefined> {
  const factory = indexedDb();
  if (!factory) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    const request = factory.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains(storeName)) {
        return;
      }
      database.createObjectStore(storeName);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      resolve(undefined);
    };
  });
}

function readIndexed(): Promise<string | undefined> {
  return openDatabase().then((database) => {
    if (!database) {
      return undefined;
    }
    return new Promise((resolve) => {
      const request = database
        .transaction(storeName, 'readonly')
        .objectStore(storeName)
        .get(storageKey);
      request.onsuccess = () => {
        const value = request.result;
        if (typeof value !== 'string' || !value) {
          resolve(undefined);
          return;
        }
        resolve(value);
      };
      request.onerror = () => {
        resolve(undefined);
      };
    });
  });
}

function writeIndexed(token: string): void {
  void openDatabase().then((database) => {
    if (!database) {
      return;
    }
    database
      .transaction(storeName, 'readwrite')
      .objectStore(storeName)
      .put(token, storageKey);
  });
}

export function prepareSession(): Promise<void> {
  if (ready) {
    return ready;
  }
  const stored = readPage();
  if (stored) {
    memoryToken = memoryToken ?? stored;
    ready = Promise.resolve();
    return ready;
  }
  ready = readIndexed().then((token) => {
    if (memoryToken || !token) {
      return;
    }
    memoryToken = token;
  });
  return ready;
}

export function readStoredSession(): string | undefined {
  if (memoryToken) {
    return memoryToken;
  }
  return readPage();
}

function writeStoredSession(token: string): void {
  memoryToken = token;
  writePage(token);
  writeIndexed(token);
}

export function authHeaders(): Record<string, string> {
  const token = readStoredSession();
  if (!token) {
    return {};
  }
  return { authorization: `Bearer ${token}` };
}

export function rememberSession(response: Response): void {
  const token = response.headers.get('set-auth-token');
  if (!token) {
    return;
  }
  writeStoredSession(token);
}
