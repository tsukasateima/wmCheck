// 父对象，包含公共的字段
export class FakeBoxItem {
  Id: number; // 物品ID
  Desc: string; // 描述（程序不读）
  SaveIndex: number; // 存储索引（0~299）
  BoxType: number; // 宝箱类型（0普通 1特定次数后特殊 2珍贵宝箱 3一次珍贵掉落宝箱）
  FirstFakeDrop: number; // 是否初次特殊掉落（1是，0否）
  FirstDropId: number; // 初次掉落Id（初次特殊掉落时 FirstDrop生效 FakeDrop、LimitDrop不生效）
  FakeDrop: number; // 伪随机掉落ID
  FakeCycle: number; // 伪随机掉落周期（宝箱类型0时填-1 1时表示第XX次并以此循环，第n次触发 2，3时表示连续没有珍贵掉落的次数，第n+1次触发）
  LimitDropId: number; // 起始掉落ID
  LimitTime: number; // 起始掉落次数（只对BoxType 2，3类型有效，不使用填-1，前n次使用LimitDropId，如果有首次特殊，第1次使用FirstDropId）
  ClientDisplay: number; // 客户端是否显示（0否，1是）
  SyncClient: number; // 绮愿风铃（0否，1是）
  constructor(
    id: number = 0, // 默认值 0
    desc: string = "", // 默认值 空字符串
    saveIndex: number = 0, // 默认值 0
    boxType: number = 0, // 默认值 0
    firstFakeDrop: number = 0, // 默认值 0
    firstDropId: number = 0, // 默认值 0
    fakeDrop: number = 0, // 默认值 0
    fakeCycle: number = -1, // 默认值 -1
    limitDropId: number = 0, // 默认值 0
    limitTime: number = -1, // 默认值 -1
    clientDisplay: number = 0, // 默认值 0
    syncClient: number = 0
  ) {
    this.Id = id;
    this.Desc = desc;
    this.SaveIndex = saveIndex;
    this.BoxType = boxType;
    this.FirstFakeDrop = firstFakeDrop;
    this.FirstDropId = firstDropId;
    this.FakeDrop = fakeDrop;
    this.FakeCycle = fakeCycle;
    this.LimitDropId = limitDropId;
    this.LimitTime = limitTime;
    this.ClientDisplay = clientDisplay;
    this.SyncClient = syncClient;
  }
}

export class FakeBoxPubItem extends FakeBoxItem {
  constructor(
    id: number = 0, // 默认值 0
    desc: string = "", // 默认值 空字符串
    saveIndex: number = 0, // 默认值 0
    boxType: number = 0, // 默认值 0
    firstFakeDrop: number = 0, // 默认值 0
    firstDropId: number = 0, // 默认值 0
    fakeDrop: number = 0, // 默认值 0
    fakeCycle: number = -1, // 默认值 -1
    limitDropId: number = 0, // 默认值 0
    limitTime: number = -1, // 默认值 -1
    clientDisplay: number = 0, // 默认值 0
    syncClient: number = 0
  ) {
    super(
      id,
      desc,
      saveIndex,
      boxType,
      firstFakeDrop,
      firstDropId,
      fakeDrop,
      fakeCycle,
      limitDropId,
      limitTime,
      clientDisplay,
      syncClient
    );
  }
}

export class FakeBoxServerItem extends FakeBoxItem {
  constructor(
    id: number = 0, // 默认值 0
    desc: string = "", // 默认值 空字符串
    saveIndex: number = 0, // 默认值 0
    boxType: number = 0, // 默认值 0
    firstFakeDrop: number = 0, // 默认值 0
    firstDropId: number = 0, // 默认值 0
    fakeDrop: number = 0, // 默认值 0
    fakeCycle: number = -1, // 默认值 -1
    limitDropId: number = 0, // 默认值 0
    limitTime: number = -1, // 默认值 -1
    clientDisplay: number = 0, // 默认值 0
    syncClient: number = 0
  ) {
    super(
      id,
      desc,
      saveIndex,
      boxType,
      firstFakeDrop,
      firstDropId,
      fakeDrop,
      fakeCycle,
      limitDropId,
      limitTime,
      clientDisplay,
      syncClient
    );
  }
}
export class NotFindIdErr extends Error {
  public message: string;
  public code: number;
  public errTableName: string;
  public errTableId: number;
  constructor(
    message: string,
    code: number,
    errTableName: string,
    errTableId: number
  ) {
    super(message);
    this.message = message;
    this.code = code;
    this.errTableName = errTableName;
    this.errTableId = errTableId;
  }
}

export class DuplicateIdErr extends Error {
  public message: string;
  public code: number;
  public errTableName: string;
  public errItemId: number;
  public errItems: any[];
  constructor(
    message: string,
    code: number,
    errTableName: string,
    errItemId: number,
    errItems: any[]
  ) {
    super(message);
    this.message = message;
    this.code = code;
    this.errTableName = errTableName;
    this.errItemId = errItemId;
    this.errItems = errItems;
  }
}

export class ItemDiffErr extends Error {
  public message: string;
  public code: number;
  public errTableName: string;
  public pubItem: any;
  public serverItem: any;
  constructor(
    message: string,
    code: number,
    errTableName: string,
    pubItem: any,
    serverItem: any
  ) {
    super(message);
    this.message = message;
    this.code = code;
    this.errTableName = errTableName;
    this.pubItem = pubItem;
    this.serverItem = serverItem;
  }
}
