import {
  type DropRecord,
  DuplicateIdError,
  FatherCommonCellErr,
  NotFindIdError,
  NotFindNotifyErr
} from "@/utils/RecursionDrop/types";
import { findNotifyInfoById } from "@/utils/RecursionDrop";
import { readFileWithEncoding } from "@/utils/common/index";

/*
 * 基础配置项检测
 * 只检测是否空 不符合表头的情况 不检测逻辑性错误
 * 找不到抛出 NotFindIdError
 * 如果重复，抛出 DuplicateIdError
 * @param recursionDropTxt - txt 文件
 * @param dropItemId - 要查找的 id
 */
export async function checkCommonCellById(
  recursionDropTxt: File,
  dropNotifyTxt: File,
  dropItemId: number
): Promise<DropRecord> {
  const dropItems = await findDropRecordById(recursionDropTxt, dropItemId); // 物品，对象形式

  if (dropItems.length === 0) {
    throw new NotFindIdError(dropItemId.toString());
  }

  if (dropItems.length > 1) {
    throw new DuplicateIdError(dropItems);
  }
  const dropItem = dropItems[0];

  // 判断是否能找到公告
  if (Number(dropItem.NotifyId) !== -1) {
    const notify = await findNotifyInfoById(dropNotifyTxt, dropItem.NotifyId);
    if (notify === null) throw new NotFindNotifyErr(dropItem);
  }

  //#region -----------基础cells检查-------------
  const errCells: string[] = [];
  // 遍历属性，每个属性都不能为空
  for (const key in dropItem) {
    if (dropItem[key] === "") {
      errCells.push(key);
    }
  }
  //  检查Id是否合规
  if (Number(dropItem.Id) > 999999) {
    errCells.push("Id");
  }
  // 检测掉落类型是否合规
  if (dropItem.Type !== "1" && dropItem.Type !== "2") {
    errCells.push("Type");
  }
  // 检测物品绑定概率是否合规
  if (Number(dropItem.BindRate) > 1 || Number(dropItem.BindRate) < 0) {
    errCells.push("BindRate");
  }
  if (errCells.length > 0) {
    throw new FatherCommonCellErr(dropItem, errCells);
  }
  //#endregion  -----------基础cells检查 end-------------

  return dropItem;
}

/**
 * 从 txt 文件中找到指定 Id 的记录，并返回对象格式。
 * @param file 通过 <input type="file"> 获取的 txt 文件
 * @param targetId 要查找的 Id（整数）
 * @returns 返回找到的所有的对象，文件表头不够就报错
 */
export async function findDropRecordById(
  file: File,
  targetId: number
): Promise<DropRecord[]> {
  const text = await readFileWithEncoding(file, "gb18030");
  const lines = text.split(/\r?\n/);

  if (lines.length <= 4) {
    throw new Error("文件内容行数不足，无法读取正常数据");
  }

  const headers = lines[0].trim().split(/\t+/);
  const dataLines = lines.slice(4).filter(line => line.trim().length > 0);

  const matchedRecords: DropRecord[] = [];

  for (const line of dataLines) {
    const cols = line.split(/\t+/);
    const lineId = parseInt(cols[0], 10);

    if (lineId === targetId) {
      const record: DropRecord = {};
      headers.forEach((key, i) => {
        record[key] = cols[i] ?? "";
      });
      matchedRecords.push(record);
    }
  }
  return matchedRecords;
}
