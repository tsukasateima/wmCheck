import { del, get, set } from "idb-keyval";
import { ElMessage } from "element-plus";

const HANDLE_KEY_PREFIX = "fs-handle:";
/**
 * 选择文件夹并持久化
 */
export async function pickAndPersistDirectory(
  targetRef: { value: FileSystemDirectoryHandle | null },
  persistKey: string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
  }
) {
  options.successMessage =
    options?.successMessage ?? "文件夹选择成功，已持久化";
  options.errorMessage = options?.errorMessage ?? "文件夹选择失败";
  try {
    // @ts-ignore
    // 使用 File System Access API
    const directoryHandle = await window.showDirectoryPicker();

    targetRef.value = directoryHandle;
    await persistHandle(persistKey, directoryHandle);

    ElMessage.success(options.successMessage);
    return directoryHandle;
  } catch (error) {
    ElMessage.error(options.errorMessage);
    console.error(options.errorMessage, error);
    return null;
  }
}
/**
 * 页面刷新恢复句柄
 */
export async function restoreDirectoryHandle(
  targetRef: { value: FileSystemDirectoryHandle | null },
  persistKey: string,
  options?: {
    warnMessage?: string;
  }
) {
  const warnMessage = options?.warnMessage ?? "句柄恢复失败或无权限";
  try {
    const handle = (await restoreHandle<FileSystemDirectoryHandle>(
      persistKey
    )) as any;

    if (
      handle &&
      (await handle.queryPermission({ mode: "read" })) === "granted"
    ) {
      targetRef.value = handle;
      return handle;
    }

    console.warn(warnMessage);
    return null;
  } catch (error) {
    console.warn(warnMessage, error);
    return null;
  }
}
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
