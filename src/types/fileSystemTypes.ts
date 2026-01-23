// Updated file system types for TypeScript with proper browser API definitions
export interface FileSystemFileHandle {
  name: string;
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemHandle {
  name: string;
}

declare global {
  interface Window {
    showDirectoryPicker: (options?: { mode: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
}