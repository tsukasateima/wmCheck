<script lang="ts" setup>
import { useRouter } from "vue-router";
import { onMounted, reactive, Ref, ref } from "vue";
import { ElMessage } from "element-plus";
import { getNestedDirectoryHandle } from "@/utils/common/index";
import {
  pickAndPersistDirectory,
  restoreDirectoryHandle
} from "@/utils/RecursionDrop/storage";
import { baseTables, resetTables } from "./txtPath";
import { checkCommonCellById } from "@/utils/RecursionDrop";
import {
  DuplicateIdError,
  FatherCommonCellErr,
  NotFindIdError,
  NotFindNotifyErr
} from "@/utils/RecursionDrop/types";

const versionRadio = ref("Main");
const serverRadio = ref("Base");
// 文件路径FileSystemDirectoryHandle
const mainDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
const tyDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
// txt数据
const baseTablesPath = ref(baseTables);
const resetTablesPath = ref(resetTables);
const allTables = reactive([baseTablesPath, resetTablesPath]);

onMounted(async () => {
  // 恢复句柄（页面刷新后）
  await restoreDirectoryHandle(mainDirectoryHandle, "mainDirectoryHandle", {
    warnMessage: "Main 句柄恢复失败或无权限"
  });

  await restoreDirectoryHandle(tyDirectoryHandle, "tyDirectoryHandle", {
    warnMessage: "Ty 句柄恢复失败或无权限"
  });

  await findAllTxtFiles();
});

// 选择文件夹触发方法
const selectMainFolder = async () => {
  await pickAndPersistDirectory(
    mainDirectoryHandle,
    "mainRecursionDirectoryHandle",
    { successMessage: "Main 文件夹选择成功,已持久化" }
  );
};
const selectTyFolder = async () => {
  await pickAndPersistDirectory(
    tyDirectoryHandle,
    "tyRecursionDirectoryHandle",
    {
      successMessage: "Ty 文件夹选择成功，已持久化"
    }
  );
};

// 在目录下查找目标 txt 文件
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
//清空所有表格内容
const clearAllTables = () => {
  for (const files of allTables) {
    for (const file of files.value) {
      file.content = null;
    }
  }
};

// 一键检查
const quickCheckClick = async () => {};
//基础检查相关变量
const recursionDropIdsString = ref<string>("");
const recursionDropIdsStringArray: Ref<string[]> = ref([]);
const commonCheckCollapseNames = ref<string[]>([]);
const checkCommonCellByIdLoading = ref(false);
const correctItems = ref([]); // 用于存储唯一性通过的物品
const notFindIdsItems = ref([]); // 用于存储未找到的id
const duplicateItems = ref([]); // 用于存储重复的id
const notFindNotifyItems = ref([]); // 用于存储找不到公告的物品
const fatherCommonCellErrItems = ref([]); // 用于存储父基础信息出错的物品
const correctItemTags = ref([]); // 存储通过的items 用于tag
/**
 *检查基础信息
 */
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

  let recursionDropTxt = null;
  let dropNotifyTxt = null;
  if (serverRadio.value === "Base") {
    recursionDropTxt = baseTablesPath.value.find(
      tables => tables.tableName === "RecursionDrop.txt"
    );
    dropNotifyTxt = baseTablesPath.value.find(
      tables => tables.tableName === "DropNotify.txt"
    );
  } else if (serverRadio.value === "Reset") {
    recursionDropTxt = resetTablesPath.value.find(
      tables => tables.tableName === "RecursionDrop.txt"
    );
    dropNotifyTxt = resetTablesPath.value.find(
      tables => tables.tableName === "DropNotify.txt"
    );
  }

  try {
    for await (const id of recursionDropIdsStringArray.value) {
      try {
        const item = await checkCommonCellById(
          recursionDropTxt,
          dropNotifyTxt,
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
    const shouldCheckCnt = recursionDropIdsStringArray.value.length;
    const rightCnt = correctItems.value.length;
    if (shouldCheckCnt === rightCnt) {
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

defineOptions({
  name: "NewRecursionDrop"
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
            <el-radio size="large" value="Main">Main</el-radio>
            <el-radio size="large" value="TY">TY</el-radio>
          </el-radio-group>
        </div>
        <!-- 服务器选择 -->
        <div class="server-radio-container info-container">
          <div class="title">服务器选择</div>
          <el-radio-group v-model="serverRadio">
            <el-radio size="large" value="Base">基础版</el-radio>
            <el-radio size="large" value="Reset">重置版</el-radio>
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
              v-for="(file, index) in baseTablesPath"
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
              v-for="(file, index) in resetTablesPath"
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
          <p>请输入RecursionDrop物品id，每行一个id</p>
          <el-input
            v-model="recursionDropIdsString"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="Please input"
            style="width: 240px"
            type="textarea"
          />
        </div>
      </div>
      <div class="right-info-container" />
    </div>

    <div class="check-container">
      <div class="father-common-check-container">
        <div class="quick-check-container">
          <el-button
            style="width: 40%; margin-bottom: 30px"
            type="warning"
            @click="quickCheckClick"
            >一键检查</el-button
          >
        </div>
      </div>
    </div>

    <el-button
      :loading="checkCommonCellByIdLoading"
      style="width: 40%"
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
            <el-table-column label="Id" prop="Id" />
            <el-table-column label="描述" prop="Desc" />
            <el-table-column label="种类 1：常规概率 2:权重包" prop="Type" />
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
            <el-table-column label="Id" prop="Id" />
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
            <el-table-column label="Id" prop="Id" />
            <el-table-column label="描述" prop="Desc" />
            <el-table-column label="种类 1：常规概率 2:权重包" prop="Type" />
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
            <el-table-column label="Id" prop="Id" />
            <el-table-column label="描述" prop="Desc" />
            <el-table-column label="公告ID" prop="NotifyId" />
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
            <el-table-column label="Id" prop="Id" />
            <el-table-column label="描述" prop="Desc" />
            <el-table-column label="种类 1：常规概率 2:权重包" prop="Type" />
            <el-table-column
              label="物品绑定概率(0:非绑定，1:绑定，0-1之间为概率绑定)"
              prop="BindRate"
            />
            <el-table-column label="错误单元格" prop="ErrCells" />
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "./newPureRecursionStyle.scss";
</style>
