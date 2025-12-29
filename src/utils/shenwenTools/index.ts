import type { ShenBingCiTiaoMakeItem } from "./types";
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

/**
 * 从 txt 文件返回所以
 * @param file 通过 <input type="file"> 获取的 txt 文件
 * @returns 返回找到的所有的对象，文件表头不够就报错
 */
// 读取文件并转换为 ShenBingCiTiaoMakeItem 类型
export async function findAllShenBingCiTiaoMakeItems(
  file: File
): Promise<ShenBingCiTiaoMakeItem[]> {
  const text = await readFileWithEncoding(file, "utf-8");
  const lines = text.split(/\r?\n/);

  if (lines.length <= 4) {
    throw new Error("文件内容行数不足，无法读取正常数据");
  }

  const dataLines = lines.slice(4).filter(line => line.trim().length > 0);

  const matchedRecords: ShenBingCiTiaoMakeItem[] = [];

  for (const line of dataLines) {
    const cols = line.split(/\t+/); // 使用制表符分割每一列

    const record: ShenBingCiTiaoMakeItem = {
      Id: parseInt(cols[0]) || 0, // 项目ID，确保转换为数字
      Desc: cols[1], // 描述
      GuDingCiTiaoCnt: parseInt(cols[2]) || 0, // 固定词条数
      GuDingCiTiaoKu: parseInt(cols[3]) || 0, // 固定词条库
      RandCiTiaoCntWeight1: parseInt(cols[4]) || 0, // 随机1条词条库权重
      RandCiTiaoCntWeight2: parseInt(cols[5]) || 0, // 随机2条词条库权重
      RandCiTiaoCntWeight3: parseInt(cols[6]) || 0, // 随机3条词条库权重
      RandCiTiaoCntWeight4: parseInt(cols[7]) || 0, // 随机4条词条库权重
      RandCiTiaoCntWeight5: parseInt(cols[8]) || 0, // 随机5条词条库权重
      RandCiTiaoCntWeight6: parseInt(cols[9]) || 0, // 随机6条词条库权重
      RandCiTiaoCntWeight7: parseInt(cols[10]) || 0, // 随机7条词条库权重
      RandCiTiaoCntWeight8: parseInt(cols[11]) || 0, // 随机8条词条库权重
      RandCiTiaoCntKu1: parseInt(cols[12]) || 0, // 随机1条词条库
      RandCiTiaoCntKu2: parseInt(cols[13]) || 0, // 随机2条词条库
      RandCiTiaoCntKu3: parseInt(cols[14]) || 0, // 随机3条词条库
      RandCiTiaoCntKu4: parseInt(cols[15]) || 0, // 随机4条词条库
      RandCiTiaoCntKu5: parseInt(cols[16]) || 0, // 随机5条词条库
      RandCiTiaoCntKu6: parseInt(cols[17]) || 0, // 随机6条词条库
      RandCiTiaoCntKu7: parseInt(cols[18]) || 0, // 随机7条词条库
      RandCiTiaoCntKu8: parseInt(cols[19]) || 0, // 随机8条词条库
      ChaiJieItemId1: parseInt(cols[20]) || 0, // 分解得到物品ID 1
      ChaiJieItemNum1: parseInt(cols[21]) || 0, // 分解得到物品数量 1
      ChaiJieItemId2: parseInt(cols[22]) || 0, // 分解得到物品ID 2
      ChaiJieItemNum2: parseInt(cols[23]) || 0, // 分解得到物品数量 2
      ZhiHuanCostItemId: parseInt(cols[24]) || 0, // 置换消耗道具
      ZhiHuanCostItemCnt: parseInt(cols[25]) || 0, // 置换消耗道具数量
      ZhiHuanCostYinBi: parseInt(cols[26]) || 0, // 置换消耗银币
      XiLianCostItemId: parseInt(cols[27]) || 0, // 洗炼消耗道具
      XiLianCostItemCnt: parseInt(cols[28]) || 0, // 洗炼消耗道具数量
      XiLianCostGoldCoin: parseInt(cols[29]) || 0, // 洗炼消耗金币
      XiLianLockCostItemId: parseInt(cols[30]) || 0, // 洗炼加锁消耗额外道具ID
      XiLianLockCostCnt1: parseInt(cols[31]) || 0, // 洗炼加锁1条总共消耗额外道具数量
      XiLianLockCostCnt2: parseInt(cols[32]) || 0, // 洗炼加锁2条总共消耗额外道具数量
      XiLianLockCostCnt3: parseInt(cols[33]) || 0, // 洗炼加锁3条总共消耗额外道具数量
      XiLianLockCostGoldCoin1: parseInt(cols[34]) || 0, // 洗炼加锁1条消耗额外金币
      XiLianLockCostGoldCoin2: parseInt(cols[35]) || 0, // 洗炼加锁2条消耗额外金币
      XiLianLockCostGoldCoin3: parseInt(cols[36]) || 0, // 洗炼加锁3条消耗额外金币
      XiLianLockCostXiLianCnt1: parseInt(cols[37]) || 0, // 洗炼加锁1条消耗洗炼次数
      XiLianLockCostXiLianCnt2: parseInt(cols[38]) || 0, // 洗炼加锁2条消耗洗炼次数
      XiLianLockCostXiLianCnt3: parseInt(cols[39]) || 0, // 洗炼加锁3条消耗洗炼次数
      ShengJieNewItemId: parseInt(cols[40]) || 0, // 升阶后新物品ID
      PTSJCostItemCnt: parseInt(cols[41]) || 0, // 普通品质升阶消耗数量
      ZPSJCostItemCnt: parseInt(cols[42]) || 0 // 珍品升阶消耗数量
    };

    matchedRecords.push(record); // 将每一行的记录添加到数组中
  }

  return matchedRecords;
}

// export async function findAllShenBingCiTiaoKuItems(
//   file: File,
//   Id: number
// ): Promise<number[]> {
//   const text = await readFileWithEncoding(file, "utf-8");
//   const lines = text.split(/\r?\n/);

//   if (lines.length <= 4) {
//     throw new Error("文件内容行数不足，无法读取正常数据");
//   }

//   const dataLines = lines.slice(4).filter(line => line.trim().length > 0);

//   const ciTiaoGroup: number[] = [];

//   for (const line of dataLines) {
//     const cols = line.split(/\t+/); // 使用制表符分割每一列
//   }
// }
