export type ServerYuanBaoShopItems = {
  Id: number; // 物品ID
  Desc: string; // 描述
  TabIndex: number; // 分页（1宠物 2宝石 3坐骑 4VIP 5杂货 6炼器 7灌注 8法宝 9时装 10面部 11雕琢 12星魂 13幻灵石 14元婴 15表情包 16仙府 17新推荐配置在YuanBaoShopPushTab. 18阵灵 19炼丹 20挂件 21外观框 22锻体 23子女 24灵符）
  ItemId: number; // 物品ID
  Stack: number; // 堆叠数量
  Price: number; // 价格
  Discount: number; // 折扣价
  OnSale: number; // 是否打折
  DiscountStart: number; // 打折开始时间
  DiscountEnd: number; // 打折结束时间
  SellStart: number; // 出售起始时间
  SellEnd: number; // 出售结束时间
  IsRecommend: number; // 是否在上新分页进行推荐（1，推荐 0，不推荐）
  IsPrecious: number; // 是否是精品（元宝购买）
  IsSell: number; // 是否出售
  ShowPack: number; // 是否整合格子
  IsBind: number; // 是否是绑定（优先级弱于CommonItem）
  IsPresent: number; // 是否可以赠送
  FriendPointReq: number; // 赠送需要友好度
  VipLevelBuy: number; // 可购买VIP等级（目前只在VIP分页生效）
  SaveIndex: number; // 定期限购存储索引（0~29 不限购填-1）
  SaveIndex_mk2: number; // 新定期限购存储索引（0~29 不限购填-1）
  ShowSort: number; // 显示顺序（-1按id显示 0往上越小越靠前显示）
  RecommendSort: number; // 推荐页排序，只在推荐页生效（-1按id显示 0往上越小越靠前显示）
  CanBuyInBigWorld: number; // 是否可以在大世界购买(0不可以 1可以)
};
