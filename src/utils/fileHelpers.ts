import { get } from 'idb-keyval';

// Helper function - will be moved to a utilities file later
async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  return (await get("savedDirHandle")) ?? null;
}

async function verifyPermission(handle: FileSystemHandle, mode: "read" | "readwrite" = "readwrite"): Promise<boolean> {
  const opts = { mode };

  const query = await (handle as any).queryPermission(opts);
  if (query === "granted") return true;

  const request = await (handle as any).requestPermission(opts);
  return request === "granted";
}

async function tryUseCachedFolder(): Promise< FileSystemDirectoryHandle | null> {
  let dirHandle = await loadDirectoryHandle();

  if (!dirHandle || !(await verifyPermission(dirHandle))) {
    return null;
  }
  return dirHandle;
}

export { 
  loadDirectoryHandle, 
  verifyPermission, 
  tryUseCachedFolder 
};