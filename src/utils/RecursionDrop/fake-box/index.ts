import type { FakeBoxPubItem, FakeBoxServerItem } from "./type";
import { ItemDiffErr, NotFindIdErr } from "./type";

/**
 * 读取文件内容并解析为指定编码
 * @param file 文件
 * @param encoding 编码
 * @returns 字符串Promise
 */
function readFileWithEncoding(file: File, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const decoder = new TextDecoder(encoding);
      resolve(decoder.decode(buffer));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function makeItemsByTable<T>(
  table: File, // 文件对象，传入的txt文件
  tableHeaderLinesNum: number // 表头行数，需要跳过的行数
): Promise<T[]> {
  // 读取文件并指定编码（假设是 gb18030）
  const text = await readFileWithEncoding(table, "gb18030");

  // 按行分割文本内容
  const lines = text.split(/\r?\n/);

  // 检查文件是否至少有表头和一些数据
  if (lines.length <= tableHeaderLinesNum) {
    throw new Error("文件内容行数不足，无法读取正常数据");
  }

  // 获取表头，假设表头行是文本的第一行
  const headers = lines[tableHeaderLinesNum].trim().split(/\t+/);

  // 获取数据行，跳过表头和无效的空行
  const dataLines = lines
    .slice(tableHeaderLinesNum + 1)
    .filter(line => line.trim().length > 0);

  // 用来存储解析出来的物品对象
  const items: T[] = [];

  // 遍历每一行数据
  for (const line of dataLines) {
    const cols = line.split(/\t+/); // 按制表符分割每一列的数据

    // 创建一个新的物品对象
    const item: any = {}; // 使用 `any` 类型，稍后将其转换为泛型T

    // 遍历表头并将数据行与表头匹配
    headers.forEach((header, i) => {
      item[header] = cols[i] ?? ""; // 如果列为空，赋值为""
    });

    // 将解析出的物品对象添加到数组中
    items.push(item);
  }

  // 返回解析出来的物品数组
  return items as T[];
}
export async function checkItemSameById(
  itemId: number,
  pubTable: File,
  serverTable: File
): Promise<FakeBoxPubItem> {
  const pubItems = await makeItemsByTable<FakeBoxPubItem>(pubTable, itemId);
  const serverItems = await makeItemsByTable<FakeBoxServerItem>(
    serverTable,
    itemId
  );

  const pubItem = pubItems.find(item => item.Id === itemId);
  const serverItem = serverItems.find(item => item.Id === itemId);

  // const errItems = { FakeBoxPubItem: [], FakeBoxServerItem: [] };

  // if (!pubItem && !serverItem) {
  //   const pubErrItem = new FakeBoxPubItem();
  // }

  if (!pubItem) {
    throw new NotFindIdErr(
      "pubTable中未找到该物品",
      501,
      pubTable.name,
      itemId
    );
  }
  if (!serverItem) {
    throw new NotFindIdErr(
      "serverTable中未找到该物品",
      500,
      serverTable.name,
      itemId
    );
  }
  if (pubItems.filter(item => item.Id === itemId).length > 1) {
    throw new NotFindIdErr(
      "pubTable中存在重复物品",
      502,
      pubTable.name,
      itemId
    );
  }
  if (serverItems.filter(item => item.Id === itemId).length > 1) {
    throw new NotFindIdErr(
      "serverTable中存在重复物品",
      501,
      serverTable.name,
      itemId
    );
  }

  const pubItemKeys = Object.keys(pubItem);
  const serverItemKeys = Object.keys(serverItem);

  // 确保 pubItem 和 serverItem 有相同的属性
  const commonKeys = pubItemKeys.filter(key => serverItemKeys.includes(key));

  for (const key of commonKeys) {
    if (pubItem[key] !== serverItem[key]) {
      throw new ItemDiffErr(
        "Public和Server中配置物品属性不一致",
        502,
        pubTable.name,
        pubItem,
        serverItem
      );
    }
  }
  return pubItem;
}
