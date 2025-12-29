<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref, Ref, onMounted, onBeforeUnmount, computed, reactive } from "vue";
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
import { checkItemSameById } from "@/utils/RecursionDrop/fake-box/index";
import { NotFindIdErr, ItemDiffErr } from "@/utils/RecursionDrop/fake-box/type";
import {
  basePublicTables,
  baseServerTables,
  resetPublicTables,
  resetServerTables
} from "./txtPath";

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
    name = `【物品】\nID: ${node.commonItem.Id}\n${node.commonItem.Desc}\n概率${node.dropChild.ItemDropRate}\n数量${node.dropChild.Count}`;
  } else if (node.type === "node") {
    name = `【包节点】\nID: ${node.recursionDrop.Id}\n${node.recursionDrop.Desc}\n概率模型: ${node.dropChild.DropType == 1 ? "常规概率" : "权重概率"}\nCount: ${node.dropChild.Count}\n概率：${node.dropChild.ItemDropRate}`;
  } else if (node.type === "invalid") {
    name = `【非法】\n${node.msg}\nID: ${node.dropChild.ItemID}\nDropType: ${node.dropChild.DropType}\nCount: ${node.dropChild.Count}`;
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
      animationDurationUpdate: 750,

      // 使节点支持拖动
      draggable: true, // 启用拖拽功能

      // 设置力导向图（有助于避免节点重叠）
      force: {
        repulsion: 100, // 排斥力
        edgeLength: 50, // 节点间的默认距离
        layoutAnimation: true
      }
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
const mainDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
const tyDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
// txt数据
const basePublicTablesPath = ref(basePublicTables);
const baseServerTablesPath = ref(baseServerTables);
const resetPublicTablesPath = ref(resetPublicTables);
const resetServerTablesPath = ref(resetServerTables);

const allTables = reactive([
  basePublicTablesPath,
  baseServerTablesPath,
  resetPublicTablesPath,
  resetServerTablesPath
]);
const txtFiles = ref<File[]>();

// fakeBox物品id
const fakeBoxIdsString = ref<string>("");
const fakeBoxIdArray: Ref<number[]> = ref([]);

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
const diffBetweenPublicAndServerItems = ref([]); // 用于存储公共和服务器表中不同的物品

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
    mainDirectoryHandle.value = savedMainHandle;
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
    tyDirectoryHandle.value = savedTyHandle;
  } else {
    console.warn("句柄ty恢复失败或无权限");
  }

  await findAllTxtFiles();
});
// 一键检查
const quickCheckClick = async () => {
  // 检查fakeBox输入
  const tempfakeBoxIdArray = fakeBoxIdsString.value
    .split("\n")
    .map(id => id.trim())
    .filter(line => line !== ""); // 去除空行

  for (const line of tempfakeBoxIdArray) {
    const num = parseInt(line);
    if (isNaN(num)) {
      checkCommonCellByIdLoading.value = false;
      ElMessage.error("输入的ID必须是正整数！请检查输入");
      return null;
    }
    fakeBoxIdArray.value.push(num);
  }
  // 检查 FakeBox表
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
  fakeBoxIdArray.value = [];

  // 进行表一致性检查
  let fakeBoxTableInPub = null;
  let fakeBoxTableInServer = null;
  let usableItemTableInPub = null;
  let usableItemTableInServer = null;

  if (serverRadio.value === "Base") {
    fakeBoxTableInPub = basePublicTablesPath.value.find(
      t => t.tableName === "FakeBox.txt"
    );
    usableItemTableInPub = basePublicTablesPath.value.find(
      t => t.tableName === "UsableItem.txt"
    );
  } else if (serverRadio.value === "Reset") {
    fakeBoxTableInServer = baseServerTablesPath.value.find(
      t => t.tableName === "FakeBox.txt"
    );
    usableItemTableInServer = baseServerTablesPath.value.find(
      t => t.tableName === "UsableItem.txt"
    );
  }

  if (
    fakeBoxTableInPub === null ||
    usableItemTableInPub === null ||
    fakeBoxTableInServer === null ||
    usableItemTableInServer === null
  ) {
    ElMessage({
      message: "文件不齐全，请检查",
      type: "error"
    });
    return;
  }

  try {
    for await (const fakeBoxId of fakeBoxIdArray.value) {
      try {
        checkItemSameById(fakeBoxId, fakeBoxTableInPub, fakeBoxTableInServer);
      } catch (error) {}
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
    mainDirectoryHandle.value = directoryHandle;

    await persistHandle("mainDirectoryHandle", mainDirectoryHandle.value);
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
    tyDirectoryHandle.value = directoryHandle;

    await persistHandle("tyDirectoryHandle", tyDirectoryHandle.value);
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
  try {
    // 清空txt数据
    clearAllTables();
    if (versionRadio.value === "Main") {
      for (const tables of allTables) {
        for (const table of tables.value) {
          const folder = await getNestedDirectoryHandle(
            mainDirectoryHandle.value,
            table.path
          );
          // @ts-ignore
          for await (const entry of folder.values()) {
            if (entry.kind === "file") {
              if (table.tableName === entry.name) {
                table.content = await entry.getFile();
              }
            }
          }
        }
      }
    } else if (versionRadio.value === "Ty") {
      for (const tables of allTables) {
        for (const table of tables.value) {
          const folder = await getNestedDirectoryHandle(
            tyDirectoryHandle.value,
            table.path
          );
          // @ts-ignore
          for await (const entry of folder.values()) {
            if (entry.kind === "file") {
              if (table.tableName === entry.name) {
                table.content = entry.getFile();
              }
            }
          }
        }
      }
    }
  } catch (error) {
    ElMessage({
      message: "发生错误，请联系管理员",
      type: "error"
    });
  }
};
// 参数是项目地址
const clearAllTables = () => {
  for (const files of allTables) {
    for (const file of files.value) {
      file.content = null;
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
    let label = "";
    if (node.type === "node") {
      label +=
        node.recursionDrop.Id +
        "-" +
        node.recursionDrop.Desc +
        "-随机" +
        node.recursionDrop.RandTimes +
        "次";

      label += "-概率" + node.dropChild.ItemDropRate; // 需要概率标蓝
      if (node.recursionDrop.Type == "1") {
        label += " - 常规概率";
      } else if (node.recursionDrop.Type == "2") {
        label += " - 权重概率";
      }

      return {
        label: label,
        children: convertToTreeData(node.children),
        hasErr: node.hasErr
      };
    }

    if (node.type === "leaf") {
      label += `${node.commonItem.Id} -${node.commonItem.Name} - 概率${node.dropChild.ItemDropRate}`;
      return {
        label: label,
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
  name: "RecursionDrop"
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
            <el-tag v-if="mainDirectoryHandle == null" type="danger"
              >未找到</el-tag
            >
            <el-tag v-else type="success">查找成功</el-tag>
          </div>
          <div class="ty-path-container info-container">
            <el-button @click="selectTyFolder">选择TY项目文件夹</el-button>
            <el-tag v-if="tyDirectoryHandle == null" type="danger"
              >未找到</el-tag
            >
            <el-tag v-else type="success">查找成功</el-tag>
          </div>
        </div>
        <!-- 显示找到的txt文件 -->
        <div class="txt-files-info-container info-container">
          <el-button @click="findAllTxtFiles">查找txt文件</el-button>

          <ul v-if="serverRadio === 'Base'" class="txt-files-list">
            <li
              v-for="(file, index) in basePublicTablesPath"
              :key="index"
              class="txt-files-list-item"
            >
              <span style="margin-right: 40px">{{ file.desc }}</span>
              <el-tag v-show="file.content === null" type="danger"
                >未找到</el-tag
              >
              <el-tag v-show="file.content !== null" type="success"
                >查找成功</el-tag
              >
            </li>
            <!-- 显示文件名 -->
          </ul>
          <ul v-if="serverRadio === 'Reset'" class="txt-files-list">
            <li
              v-for="(file, index) in resetPublicTablesPath"
              :key="index"
              class="txt-files-list-item"
            >
              <span style="margin-right: 40px">{{ file.desc }}</span>
              <el-tag v-show="file.content === null" type="danger"
                >未找到</el-tag
              >
              <el-tag v-show="file.content !== null" type="success"
                >查找成功</el-tag
              >
            </li>
            <!-- 显示文件名 -->
          </ul>
        </div>
        <!-- 输入随机掉落物id container -->
        <div class="recursionDrop-input-container info-container">
          <p>请输入FakeBox物品id，每行一个id</p>
          <el-input
            v-model="fakeBoxIdsString"
            style="width: 240px"
            :autosize="{ minRows: 2, maxRows: 4 }"
            type="textarea"
            placeholder="Please input"
          />
        </div>
      </div>
      <div class="right-info-container" />
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
            <el-collapse-item name="DiffBetweenPublicAndServer">
              <template #title>
                <div class="unique-items-container" style="color: red">
                  Public和Server配置不同
                </div>
              </template>
              <el-table
                v-loading="checkCommonCellByIdLoading"
                :data="diffBetweenPublicAndServerItems"
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
                  FakeBox未查询到Id
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
                  FakeBox查询的Id重复
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
          style="width: 40%; margin: 30px 0"
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
    display: flex;
    flex-wrap: wrap;
    width: 55%;
    padding: 10px;
    font-size: 12px;

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
    display: flex;
    align-items: center;
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
  background-color: rgb(203 230 196);
}

.offspring-pack-log {
  margin-bottom: 10px;
}
</style>
