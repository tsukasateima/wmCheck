export type ShenBingCiTiaoMakeItem = {
  Id: number; // 物品ID
  Desc: string; // 描述
  GuDingCiTiaoCnt: number; // 固定词条数
  GuDingCiTiaoKu: number; // 固定词条库
  RandCiTiaoCntWeight1: number; // 随机1条词条库权重
  RandCiTiaoCntWeight2: number; // 随机2条词条库权重
  RandCiTiaoCntWeight3: number; // 随机3条词条库权重
  RandCiTiaoCntWeight4: number; // 随机4条词条库权重
  RandCiTiaoCntWeight5: number; // 随机5条词条库权重
  RandCiTiaoCntWeight6: number; // 随机6条词条库权重
  RandCiTiaoCntWeight7: number; // 随机7条词条库权重
  RandCiTiaoCntWeight8: number; // 随机8条词条库权重
  RandCiTiaoCntKu1: number; // 随机1条词条库
  RandCiTiaoCntKu2: number; // 随机2条词条库
  RandCiTiaoCntKu3: number; // 随机3条词条库
  RandCiTiaoCntKu4: number; // 随机4条词条库
  RandCiTiaoCntKu5: number; // 随机5条词条库
  RandCiTiaoCntKu6: number; // 随机6条词条库
  RandCiTiaoCntKu7: number; // 随机7条词条库
  RandCiTiaoCntKu8: number; // 随机8条词条库
  ChaiJieItemId1: number; // 分解得到物品ID 1
  ChaiJieItemNum1: number; // 分解得到物品数量 1
  ChaiJieItemId2: number; // 分解得到物品ID 2
  ChaiJieItemNum2: number; // 分解得到物品数量 2
  ZhiHuanCostItemId: number; // 置换消耗道具
  ZhiHuanCostItemCnt: number; // 置换消耗道具数量
  ZhiHuanCostYinBi: number; // 置换消耗银币
  XiLianCostItemId: number; // 洗炼消耗道具
  XiLianCostItemCnt: number; // 洗炼消耗道具数量
  XiLianCostGoldCoin: number; // 洗炼消耗金币
  XiLianLockCostItemId: number; // 洗炼加锁消耗额外道具ID
  XiLianLockCostCnt1: number; // 洗炼加锁1条总共消耗额外道具数量
  XiLianLockCostCnt2: number; // 洗炼加锁2条总共消耗额外道具数量
  XiLianLockCostCnt3: number; // 洗炼加锁3条总共消耗额外道具数量
  XiLianLockCostGoldCoin1: number; // 洗炼加锁1条消耗额外金币
  XiLianLockCostGoldCoin2: number; // 洗炼加锁2条消耗额外金币
  XiLianLockCostGoldCoin3: number; // 洗炼加锁3条消耗额外金币
  XiLianLockCostXiLianCnt1: number; // 洗炼加锁1条消耗洗炼次数
  XiLianLockCostXiLianCnt2: number; // 洗炼加锁2条消耗洗炼次数
  XiLianLockCostXiLianCnt3: number; // 洗炼加锁3条消耗洗炼次数
  ShengJieNewItemId: number; // 升阶后新物品ID
  PTSJCostItemCnt: number; // 普通品质升阶消耗数量
  ZPSJCostItemCnt: number; // 珍品升阶消耗数量
};

export type ShenBingCiTiaoKuItem = {
  Id: number; // 词条ID
  Desc: string; // 描述
  Group: number; // 词条组
};

export type ShenBingCiTiaoAttrItem = {
  Id: number; // 词条ID
  Desc: string; // 描述
  Group: number; // 组ID
  StrDicId: number; // 字典ID
  BatchXiLianStrDicId: number; // 批量洗炼字典ID
  CiTiaoType: number; // 词条类型
  Param1: number; // 参数1
  Param2: number; // 参数2
  Param3: number; // 参数3
  Weight: number; // 权重
  RandValMin1: number; // 随机值最小值1
  RandValMax1: number; // 随机值最大值1
  RandWeight1: number; // 随机权重1
  RandValMinFloorValue1: number; // 随机最小值下限1
  RandValFloorValue1: number; // 随机下限值1
  Combat1: number; // 战斗1
  RandValMin2: number; // 随机值最小值2
  RandValMax2: number; // 随机值最大值2
  RandWeight2: number; // 随机权重2
  RandValMinFloorValue2: number; // 随机最小值下限2
  RandValFloorValue2: number; // 随机下限值2
  Combat2: number; // 战斗2
  RandValMin3: number; // 随机值最小值3
  RandValMax3: number; // 随机值最大值3
  RandWeight3: number; // 随机权重3
  RandValMinFloorValue3: number; // 随机最小值下限3
  RandValFloorValue3: number; // 随机下限值3
  Combat3: number; // 战斗3
  RandValMin4: number; // 随机值最小值4
  RandValMax4: number; // 随机值最大值4
  RandWeight4: number; // 随机权重4
  RandValMinFloorValue4: number; // 随机最小值下限4
  RandValFloorValue4: number; // 随机下限值4
  Combat4: number; // 战斗4
  RandValMin5: number; // 随机值最小值5
  RandValMax5: number; // 随机值最大值5
  RandWeight5: number; // 随机权重5
  RandValMinFloorValue5: number; // 随机最小值下限5
  RandValFloorValue5: number; // 随机下限值5
  Combat5: number; // 战斗5
  PTSJCostItemCnt: number; // 普通品质升阶消耗数量
  ZPSJCostItemCnt: number; // 珍品升阶消耗数量
};
