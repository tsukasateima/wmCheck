export const getNestedDirectoryHandle = async (
  baseHandle: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemDirectoryHandle> => {
  const parts = path.split("/");

  let currentHandle = baseHandle;

  for (const part of parts) {
    currentHandle = await currentHandle.getDirectoryHandle(part, {
      create: false
    });
  }

  return currentHandle;
};
