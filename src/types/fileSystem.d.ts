// Type definitions for File System Access API
declare global {
  interface FileSystemHandle {
    name: string;
    kind: 'file' | 'directory';
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
  }

  interface Window {
    showDirectoryPicker(options?: { mode: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
  }
}

export {};