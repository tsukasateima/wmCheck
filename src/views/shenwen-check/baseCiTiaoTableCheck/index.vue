<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref, Ref, onMounted, onBeforeUnmount, nextTick, computed } from "vue";
import { ElMessage } from "element-plus";
import {
  getNestedDirectoryHandle,
  checkCommonCellById,
  findDropRecordById,
  buildDropTreeRootNode,
  offspringCheck
} from "@/utils/RecursionDrop";
import {
  NotFindIdError,
  DuplicateIdError,
  FatherCommonCellErr,
  NotFindNotifyErr,
  DropRecord,
  DropTreeNode
} from "@/utils/RecursionDrop/types";
import { persistHandle, restoreHandle } from "@/utils/RecursionDrop/storage";

import * as echarts from "echarts/core";
import { TreeChart } from "echarts/charts";
import { TitleComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([TreeChart, TitleComponent, TooltipComponent, CanvasRenderer]);

const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;
function convertDropTreeToEchartsTree(node: DropTreeNode): any {
  let name = "";
  let itemStyle = {
    color: node.hasErr ? "#d9534f" : "#337ab7", // 红/蓝
    borderColor: node.hasErr ? "#d9534f" : "#337ab7"
  };
  let label = {
    color: "#ffffff"
  };

  // 设置展示文本
  if (node.type === "leaf") {
    name = `【Leaf】\nID: ${node.commonItem.Id}\n${node.commonItem.Desc}\n${node.commonItem.Name}`;
  } else if (node.type === "node") {
    name = `【Node】\nID: ${node.recursionDrop.Id}\n${node.recursionDrop.Desc}\nDropType: ${node.dropChild.DropType}\nCount: ${node.dropChild.Count}`;
  } else if (node.type === "invalid") {
    name = `【Invalid】\n${node.msg}\nID: ${node.dropChild.ItemID}\nDropType: ${node.dropChild.DropType}\nCount: ${node.dropChild.Count}`;
  }
  const lineCount = name.split("\n").length;
  const height = 28 * lineCount; // 每行文字大概28px
  const echartsNode: any = {
    name,
    label,
    itemStyle,
    symbolSize: [220, height] // ✅ 每个节点独立设置
  };

  if (node.type === "node" && node.children?.length) {
    echartsNode.children = node.children.map(child =>
      convertDropTreeToEchartsTree(child)
    );
  }

  return echartsNode;
}

// 递归包错误日志
const offspringPackLogList = ref([]);
const treeGroups = computed(() => {
  return offspringPackLogList.value.map((root, index) => ({
    title: `掉落包 ${index + 1}（ID：${root.recursionDrop.Id}）`,
    treeData: convertToTreeData([root])
  }));
});
const echartsTreeData = offspringPackLogList.value.map(root =>
  convertDropTreeToEchartsTree(root)
);

const option = {
  tooltip: {
    trigger: "item",
    triggerOn: "mousemove"
  },
  series: [
    {
      type: "tree",
      data: echartsTreeData,
      top: "1%",
      left: "10%",
      bottom: "1%",
      right: "20%",
      symbolSize: 10,
      label: {
        position: "left",
        verticalAlign: "middle",
        align: "right",
        fontSize: 12,
        backgroundColor: "#f0f0f0",
        padding: 4
      },
      leaves: {
        label: {
          position: "right",
          verticalAlign: "middle",
          align: "left"
        }
      },
      expandAndCollapse: true,
      initialTreeDepth: 3,
      animationDuration: 550,
      animationDurationUpdate: 750
    }
  ]
};

// 渲染图表
const renderChart = () => {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value);
  chartInstance.setOption(option);
};

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeChart);
  chartInstance?.dispose();
});

function resizeChart() {
  chartInstance?.resize();
}

const versionRadio = ref("Main");
const serverRadio = ref("Base");
// 文件路径FileSystemDirectoryHandle
const mainPublicDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
const tyPublicDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
// txt数据
const shouldTxtNames = [
  "CommonItem.txt",
  "UsableItem.txt",
  "ItemDetail.txt",
  "DropNotify.txt",
  "RecursionDrop.txt"
];
const txtFiles = ref<File[]>();

// 随机掉落物品id
const recursionDropIdsString = ref<string>("");
const recursionDropIdsStringArray: Ref<string[]> = ref([]);
// 激活抽屉
const commonCheckCollapseNames = ref<string[]>([]);
// 检测id唯一性
const checkCommonCellByIdLoading = ref(false);
const correctItems = ref([]); // 用于存储唯一性通过的物品
const notFindIdsItems = ref([]); // 用于存储未找到的id
const duplicateItems = ref([]); // 用于存储重复的id
const notFindNotifyItems = ref([]); // 用于存储找不到公告的物品
const fatherCommonCellErrItems = ref([]); // 用于存储父基础信息出错的物品
const correctItemTags = ref([]); // 存储通过的items 用于tag

onMounted(async () => {
  // 绘制图表
  renderChart();
  // 恢复句柄（页面刷新后）
  const savedMainHandle = (await restoreHandle<FileSystemDirectoryHandle>(
    "mainDirectoryHandle"
  )) as any;

  if (
    savedMainHandle &&
    (await savedMainHandle.queryPermission({ mode: "read" })) === "granted"
  ) {
    mainPublicDirectoryHandle.value = savedMainHandle;
    await findAllTxtFiles();
  } else {
    console.warn("句柄恢复失败或无权限");
  }
  const savedTyHandle = (await restoreHandle<FileSystemDirectoryHandle>(
    "tyDirectoryHandle"
  )) as any;
  if (
    savedTyHandle &&
    (await savedTyHandle.queryPermission({ mode: "read" })) === "granted"
  ) {
    tyPublicDirectoryHandle.value = savedTyHandle;
    await findAllTxtFiles();
  } else {
    console.warn("句柄ty恢复失败或无权限");
  }
});
const quickCheckClick = async () => {
  await checkCommonCellByIdClick();
  await offspringCheckClick();
};

const checkCommonCellByIdClick = async () => {
  checkCommonCellByIdLoading.value = true;
  // 置空旧数据
  correctItems.value = [];
  correctItemTags.value = [];
  notFindIdsItems.value = [];
  duplicateItems.value = [];
  notFindNotifyItems.value = [];
  commonCheckCollapseNames.value = [] as string[];
  fatherCommonCellErrItems.value = [];
  recursionDropIdsStringArray.value = [];

  const tempRecursionDropIdsStringArray = recursionDropIdsString.value
    .split("\n")
    .map(id => id.trim())
    .filter(line => line !== ""); // 去除空行
  for (const line of tempRecursionDropIdsStringArray) {
    const num = Number(line);
    if (!Number.isInteger(num) || num <= 0) {
      checkCommonCellByIdLoading.value = false;
      ElMessage.error("输入的ID必须为正整数！请检查输入");
      return null; // ❌ 非正整数，立即返回
    }
  }
  recursionDropIdsStringArray.value = tempRecursionDropIdsStringArray;

  const recursionDropTxt = txtFiles.value.find(
    file => file.name === "RecursionDrop.txt"
  );
  const DropNotifyTxt = txtFiles.value.find(
    file => file.name === "DropNotify.txt"
  );
  try {
    for await (const id of recursionDropIdsStringArray.value) {
      try {
        const item = await checkCommonCellById(
          recursionDropTxt,
          DropNotifyTxt,
          Number(id)
        );
        correctItems.value.push(item);
        correctItemTags.value.push(item);
        commonCheckCollapseNames.value.push("correct");
      } catch (err) {
        if (err instanceof NotFindIdError) {
          notFindIdsItems.value.push({ Id: err.targetId });
          commonCheckCollapseNames.value.push("notFindErr");
        } else if (err instanceof DuplicateIdError) {
          duplicateItems.value.push(...err.records);
          commonCheckCollapseNames.value.push("duplicateErr");
        } else if (err instanceof NotFindNotifyErr) {
          notFindNotifyItems.value.push(err.dropRecord);
          commonCheckCollapseNames.value.push("notifyErr");
        } else if (err instanceof FatherCommonCellErr) {
          err.dropRecord.ErrCells = err.errCells.join(",");
          fatherCommonCellErrItems.value.push(err.dropRecord);
          commonCheckCollapseNames.value.push("commonCellErr");
        }
      }
    }
    checkCommonCellByIdLoading.value = false;
    const shoudCheckCnt = recursionDropIdsStringArray.value.length;
    const rightCnt = correctItems.value.length;
    if (shoudCheckCnt === rightCnt) {
      ElMessage.success("全部递归包本包基础信息均正确！");
    } else {
      ElMessage.error("存在递归包基础信息错误，请查看展开的表格");
    }
  } catch (error) {
    ElMessage({
      message: "存在其他错误，联系管理员",
      type: "error"
    });
  }
};

// 选择文件夹触发方法
const selectMainFolder = async () => {
  try {
    // @ts-ignore
    // 使用 File System Access API 打开文件夹选择对话框
    const directoryHandle = await window.showDirectoryPicker();
    mainPublicDirectoryHandle.value = await directoryHandle.getDirectoryHandle(
      "Public",
      {
        create: false
      }
    );
    await persistHandle("mainDirectoryHandle", mainPublicDirectoryHandle.value);
    ElMessage.success("Main 文件夹选择成功，已持久化");
  } catch (error) {
    ElMessage({
      message: "文件选择或读取失败,请检查文件路径是否正确",
      type: "error"
    });
    console.error("文件选择或读取失败", error);
  }
};
const selectTyFolder = async () => {
  try {
    // @ts-ignore
    const directoryHandle = await window.showDirectoryPicker();
    tyPublicDirectoryHandle.value = await directoryHandle.getDirectoryHandle(
      "Public",
      {
        create: false
      }
    );
    await persistHandle("tyDirectoryHandle", tyPublicDirectoryHandle.value);
    ElMessage.success("ty文件夹选择成功，已持久化");
  } catch (error) {
    ElMessage({
      message: "文件选择或读取失败,请检查文件路径是否正确",
      type: "error"
    });
    console.error("文件选择或读取失败", error);
  }
};

// 在三个目录下查找目标 txt 文件
const findAllTxtFiles = async () => {
  if (versionRadio.value === "Main") {
    await findAllTxtFilesFromAddress(mainPublicDirectoryHandle);
  } else {
    await findAllTxtFilesFromAddress(tyPublicDirectoryHandle);
  }
};
// 参数是项目地址
const findAllTxtFilesFromAddress = async (
  address: Ref<FileSystemDirectoryHandle>
) => {
  try {
    // 清空txt数据
    txtFiles.value = [];

    if (serverRadio.value === "Base") {
      const publicTables = await address.value.getDirectoryHandle(
        "PublicTables",
        {
          create: false
        }
      );
      const clientTables = await address.value.getDirectoryHandle(
        "ClientTables",
        {
          create: false
        }
      );
      const serverTables = await address.value.getDirectoryHandle(
        "ServerTables",
        {
          create: false
        }
      );
      if (versionRadio.value === "Main") {
        await findTxtFiles(publicTables, ["CommonItem.txt", "UsableItem.txt"]);
        await findTxtFiles(clientTables, ["ItemDetail.txt"]);
        await findTxtFiles(serverTables, [
          "DropNotify.txt",
          "RecursionDrop.txt"
        ]);
      } else {
        await findTxtFiles(publicTables, ["CommonItem.txt", "UsableItem.txt"]);
        await findTxtFiles(clientTables, ["ItemDetail.txt"]);
        await findTxtFiles(serverTables, [
          "DropNotify.txt",
          "RecursionDrop.txt"
        ]);
      }
    } else if (serverRadio.value === "Reset") {
      const publicResetTables = await getNestedDirectoryHandle(
        address.value,
        "Reset/PublicResetTables"
      );
      const clientResetTables = await getNestedDirectoryHandle(
        address.value,
        "Reset/ClientResetTables"
      );
      const serverResetTables = await getNestedDirectoryHandle(
        address.value,
        "Reset/ServerResetTables"
      );
      const publicServerTables = await address.value.getDirectoryHandle(
        "ServerTables",
        { create: false }
      );
      if (versionRadio.value === "Main") {
        await findTxtFiles(publicResetTables, [
          "CommonItem.txt",
          "UsableItem.txt"
        ]);
        await findTxtFiles(clientResetTables, ["ItemDetail.txt"]);
        await findTxtFiles(serverResetTables, ["RecursionDrop.txt"]);
        await findTxtFiles(publicServerTables, ["DropNotify.txt"]);
      } else {
        await findTxtFiles(publicResetTables, [
          "CommonItem.txt",
          "UsableItem.txt"
        ]);
        await findTxtFiles(clientResetTables, ["ItemDetail.txt"]);
        await findTxtFiles(serverResetTables, ["RecursionDrop.txt"]);
        await findTxtFiles(publicServerTables, ["DropNotify.txt"]);
      }
    }
  } catch (error) {
    ElMessage({
      message: "发生错误，请联系管理员",
      type: "error"
    });
  }
};
const findTxtFiles = async (
  findDictionary: FileSystemDirectoryHandle,
  txtNames: string[]
) => {
  // @ts-ignore
  for await (const entry of findDictionary.values()) {
    if (entry.kind === "file") {
      if (txtNames.includes(entry.name)) {
        txtFiles.value.push(await entry.getFile());
      }
    }
  }
};
const springCheckLoading = ref(false);
const defaultProps = {
  children: "children",
  label: "label"
};

function convertToTreeData(nodes: DropTreeNode[]): any[] {
  return nodes.map(node => {
    if (node.type === "node") {
      return {
        label: `${node.recursionDrop.Id} - ${node.recursionDrop.Desc}`,
        children: convertToTreeData(node.children),
        hasErr: node.hasErr
      };
    }

    if (node.type === "leaf") {
      return {
        label: `${node.commonItem.Id} - ${node.commonItem.Desc} - ${node.commonItem.Name}`,
        hasErr: node.hasErr,
        children: []
      };
    }

    return {
      label: node.msg,
      hasErr: true,
      children: []
    };
  });
}

const offspringCheckClick = async () => {
  springCheckLoading.value = true;
  const recursionDropTxt = txtFiles.value.find(
    file => file.name === "RecursionDrop.txt"
  );
  const commonItemTxt = txtFiles.value.find(
    file => file.name === "CommonItem.txt"
  );
  offspringPackLogList.value = [];
  for (const item of correctItemTags.value) {
    const root = await offspringCheck(item, recursionDropTxt, commonItemTxt);
    offspringPackLogList.value.push(root);
  }

  const dataList = offspringPackLogList.value.map(root =>
    convertDropTreeToEchartsTree(root)
  );
  const newOption = {
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      backgroundColor: "#dfdfdf",
      textStyle: {
        color: "black"
      }
    },
    series: dataList.map((tree, index) => ({
      type: "tree",
      data: [tree], // 一棵树的数据放在数组里
      top: `${index * 100}px`, // 纵向偏移，防止重叠
      left: "10%",
      bottom: "10%",
      right: "10%",
      symbol: "roundRect",
      symbolSize: [300, 90],
      orient: "horizontal",
      edgeShape: "polyline",
      edgeForkPosition: "50%",
      initialTreeDepth: 2,
      roam: true,
      expandAndCollapse: true,
      animationDuration: 550,
      animationDurationUpdate: 750,
      label: {
        show: true,
        position: "inside",
        fontSize: 14,
        color: "#fff",
        lineHeight: 22
      },
      leaves: {
        label: {
          position: "inside",
          color: "#fff"
        },
        itemStyle: {
          color: "#dfdfdf",
          borderColor: "#dfdfdf"
        }
      },
      lineStyle: {
        color: "#7b7b7b",
        width: 3
      }
    }))
  };
  chartInstance.setOption(newOption, true);
  springCheckLoading.value = false;
};
const handleTagClose = (item: DropRecord) => {
  correctItemTags.value.splice(correctItemTags.value.indexOf(item), 1);
};
defineOptions({
  name: "shenwen-Check"
});

const router = useRouter();
</script>

<template>
  <div class="recursion-drop-container">
    <div class="recursoin-drop-form">
      <div class="left-form-container">
        <!-- 版本选择 -->
        <div class="version-radio-container info-container">
          <div class="title">版本选择</div>
          <el-radio-group v-model="versionRadio">
            <el-radio value="Main" size="large">Main</el-radio>
            <el-radio value="TY" size="large">TY</el-radio>
          </el-radio-group>
        </div>
        <!-- 服务器选择 -->
        <div class="server-radio-container info-container">
          <div class="title">服务器选择</div>
          <el-radio-group v-model="serverRadio">
            <el-radio value="Base" size="large">基础版</el-radio>
            <el-radio value="Reset" size="large">重置版</el-radio>
          </el-radio-group>
        </div>
        <!-- Main路径选择 -->
        <div class="path-container">
          <!-- 选择项目文件夹按钮 -->
          <div class="main-path-container info-container">
            <el-button @click="selectMainFolder">选择Main项目文件夹</el-button>
            <el-tag v-if="mainPublicDirectoryHandle == null" type="danger"
              >未找到</el-tag
            >
            <el-tag v-else type="success">查找成功</el-tag>
          </div>
          <div class="ty-path-container info-container">
            <el-button @click="selectTyFolder">选择TY项目文件夹</el-button>
            <el-tag v-if="tyPublicDirectoryHandle == null" type="danger"
              >未找到</el-tag
            >
            <el-tag v-else type="success">查找成功</el-tag>
          </div>
        </div>
        <!-- 显示找到的txt文件 -->
        <div class="txt-files-info-container info-container">
          <el-button @click="findAllTxtFiles">查找txt文件</el-button>

          <ul class="txt-files-list">
            <li
              v-for="(file, index) in shouldTxtNames"
              :key="index"
              class="txt-files-list-item"
            >
              <span style="margin-right: 40px">{{ file }}</span>
              <el-tag
                v-show="
                  !txtFiles || txtFiles.find(f => f.name === file) === null
                "
                type="danger"
                >未找到</el-tag
              >
              <el-tag
                v-show="txtFiles && txtFiles.find(f => f.name === file) != null"
                type="success"
                >查找成功</el-tag
              >
            </li>
            <!-- 显示文件名 -->
          </ul>
        </div>

        <!-- 输入随机掉落物id container -->
        <div class="recursionDrop-input-container info-container">
          <p>请输入随机掉落物品id，每行一个id</p>
          <el-input
            v-model="recursionDropIdsString"
            style="width: 240px"
            :autosize="{ minRows: 2, maxRows: 4 }"
            type="textarea"
            placeholder="Please input"
          />
        </div>
      </div>
      <div class="right-info-container">
        <el-card shadow="hover" class="card-item">
          <span>批量基础检查只检查该包本包的基础配置，包括以下检查项目</span>
          <ul>
            <li>1. 输入物品Id的存在性；</li>
            <li>2. 输入物品Id的唯一性；</li>
            <li>3. 输入物品的公告ID（NotifyId）若存在是否能找到；</li>
            <li>4. 输入物品Id的合规性（&lt;=999999）；</li>
            <li>5. 输入物品的掉落类型合规性(值为1或2)；</li>
            <li>
              6. 输入物品的物品绑定概率（BindRate）数值合规性（0&lt;=t&lt;=1）；
            </li>
            <li>条目4，5，6合并为一个错误在“单元格存在错误”表中</li>
          </ul>
        </el-card>
        <el-card shadow="hover" class="card-item">
          <span>全量检查检查该包及其递归子包的配置，包括以下检查项目</span>
          <ul>
            <li>
              1. 以“读表到第几个物品”（ItemMax）为标准，是否存在未配置的子包；
            </li>
            <li>2. 当子节点为CommonItem时，是否能在表中找到对应的物品；</li>
            <li>3. 当子节点为RecusionDrop时，是否能在表中找到对应的物品；</li>
            <li>
              4.
              当子节点为RecusionDrop时，是否在表中存在多个配置id对应的递归包；
            </li>
            <li>
              5.
              概率配置出错，包括掉落当掉落类型为常规概率（值为1时），后面概率配置超过上限（10）或掉落类型为权重（值为2）时，后面概率不是大于一的整数；
            </li>
          </ul>
        </el-card>
      </div>
    </div>

    <div class="check-container">
      <div class="father-common-check-container">
        <div class="quick-check-container">
          <el-button
            type="warning"
            style="width: 40%; margin-bottom: 30px"
            @click="quickCheckClick"
            >一键检查</el-button
          >
        </div>
        <el-button
          style="width: 40%"
          :loading="checkCommonCellByIdLoading"
          type="primary"
          @click="checkCommonCellByIdClick"
          >批量基础检查</el-button
        >
        <div class="father-common-check-collapse">
          <el-collapse v-model="commonCheckCollapseNames">
            <el-collapse-item name="correct">
              <template #title>
                <div class="unique-items-container" style="color: green">
                  基础检查通过随机掉落包物品信息
                </div>
              </template>
              <el-table
                v-loading="checkCommonCellByIdLoading"
                :data="correctItems"
                border
              >
                <el-table-column prop="Id" label="Id" />
                <el-table-column prop="Desc" label="描述" />
                <el-table-column
                  prop="Type"
                  label="种类 1：常规概率 2:权重包"
                />
              </el-table>
            </el-collapse-item>
            <el-collapse-item name="notFindErr">
              <template #title>
                <div class="unique-items-container" style="color: red">
                  未查询到的随机掉落包Id
                </div>
              </template>
              <el-table
                v-loading="checkCommonCellByIdLoading"
                :data="notFindIdsItems"
                border
              >
                <el-table-column prop="Id" label="Id" />
              </el-table>
            </el-collapse-item>
            <el-collapse-item name="duplicateErr">
              <template #title>
                <div class="unique-items-container" style="color: red">
                  ID存在重复，查看重复随机掉落物信息
                </div>
              </template>
              <el-table
                v-loading="checkCommonCellByIdLoading"
                :data="duplicateItems"
                border
              >
                <el-table-column prop="Id" label="Id" />
                <el-table-column prop="Desc" label="描述" />
                <el-table-column
                  prop="Type"
                  label="种类 1：常规概率 2:权重包"
                />
              </el-table>
            </el-collapse-item>

            <el-collapse-item name="notifyErr">
              <template #title>
                <div class="unique-items-container" style="color: red">
                  存在公告，但是DropNotify找不到该配置Id
                </div>
              </template>
              <el-table
                v-loading="checkCommonCellByIdLoading"
                :data="notFindNotifyItems"
                border
              >
                <el-table-column prop="Id" label="Id" />
                <el-table-column prop="Desc" label="描述" />
                <el-table-column prop="NotifyId" label="公告ID" />
              </el-table>
            </el-collapse-item>
            <el-collapse-item name="commonCellErr">
              <template #title>
                <div class="unique-items-container" style="color: red">
                  单元格存在错误，错误递归包信息
                </div>
              </template>
              <el-table
                v-loading="checkCommonCellByIdLoading"
                :data="fatherCommonCellErrItems"
                border
              >
                <el-table-column prop="Id" label="Id" />
                <el-table-column prop="Desc" label="描述" />
                <el-table-column
                  prop="Type"
                  label="种类 1：常规概率 2:权重包"
                />
                <el-table-column
                  prop="BindRate"
                  label="物品绑定概率(0:非绑定，1:绑定，0-1之间为概率绑定)"
                />
                <el-table-column prop="ErrCells" label="错误单元格" />
              </el-table>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <div class="offspring-pack-check-container">
        <div class="tags-container">
          <el-Tag
            v-for="item in correctItemTags"
            :key="item.Id"
            style="margin: 20px 8px 0 0"
            size="large"
            closable
            :disable-transitions="false"
            @close="handleTagClose(item)"
            >Id:{{ item.Id }},Desc:{{ item.Desc }}</el-Tag
          >
        </div>
        <el-button
          type="primary"
          style="width: 40%; margin: 30px 0 30px 0"
          @click="offspringCheckClick"
          >对所有Tag进行递归包检查</el-button
        >
        <div class="offspring-pack-log">
          <el-card v-loading="springCheckLoading">
            <div v-for="(group, index) in treeGroups" :key="index" class="mb-4">
              <el-card shadow="hover">
                <template #header>
                  <span>{{ group.title }}</span>
                </template>
                <el-tree
                  :data="group.treeData"
                  :props="defaultProps"
                  node-key="label"
                  :highlight-current="true"
                  default-expand-all
                >
                  <template #default="{ node, data }">
                    <span :style="{ color: data.hasErr ? 'red' : 'inherit' }">
                      {{ node.label }}
                    </span>
                  </template>
                </el-tree>
              </el-card>
            </div>
          </el-card>
        </div>
        <div ref="chartRef" class="chart-container" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.recursoin-drop-form {
  display: flex;
  justify-content: space-between;
  .left-form-container {
    width: 40%;
  }
  .right-info-container {
    width: 55%;
    padding: 10px;
    font-size: 12px;
    display: flex;
    flex-wrap: wrap;
    .card-item {
      width: 40%;
      margin: 0 10px 10px 0;
      span {
        display: block;
        margin-bottom: 10px;
      }
    }
  }
  .info-container {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }
}

.txt-files-list-item {
  display: flex;
  justify-content: space-between;
}
.father-common-check-collapse {
  margin-top: 20px;
}
.chart-container {
  width: 80%;
  height: 100vh;
  background-color: rgb(203, 230, 196);
}
.offspring-pack-log {
  margin-bottom: 10px;
}
</style>
