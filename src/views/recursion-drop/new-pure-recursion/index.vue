<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref, Ref, onMounted, onBeforeUnmount, computed, reactive } from "vue";
import { ElMessage } from "element-plus";
import { getNestedDirectoryHandle } from "@/utils/RecursionDrop";
import { persistHandle, restoreHandle } from "@/utils/RecursionDrop/storage";
import {
  basePublicTables,
  baseServerTables,
  resetPublicTables,
  resetServerTables
} from "./txtPath";

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

onMounted(async () => {
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
const quickCheckClick = async () => {};

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
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "./newPureRecursionStyle.scss";
</style>
