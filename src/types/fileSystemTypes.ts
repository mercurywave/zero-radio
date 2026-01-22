// Updated file system types for TypeScript with proper browser API definitions
export interface FileSystemFileHandle {
  name: string;
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle {
  name: string;
  kind: 'directory';
  entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}

export interface FileSystemHandle {
  name: string;
}

declare global {
  interface Window {
    showDirectoryPicker: (options?: { mode: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
}