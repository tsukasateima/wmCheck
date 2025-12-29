import { get, set, del } from "idb-keyval";

const HANDLE_KEY_PREFIX = "fs-handle:";

/**
 * 将 FileSystemHandle 保存到 IndexedDB
 */
export async function persistHandle(
  key: string,
  handle: FileSystemHandle
): Promise<void> {
  await set(HANDLE_KEY_PREFIX + key, handle);
}

/**
 * 从 IndexedDB 恢复 FileSystemHandle
 */
export async function restoreHandle<T extends FileSystemHandle>(
  key: string
): Promise<T | null> {
  const handle = await get(HANDLE_KEY_PREFIX + key);
  return handle ?? null;
}

/**
 * 删除已保存的 Handle
 */
export async function removeHandle(key: string): Promise<void> {
  await del(HANDLE_KEY_PREFIX + key);
}
