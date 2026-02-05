<script lang="ts" setup>
import { useRouter } from "vue-router";
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { getNestedDirectoryHandle } from "@/utils/RecursionDrop/new-recursion-drop";
import {
  pickAndPersistDirectory,
  restoreDirectoryHandle
} from "@/utils/RecursionDrop/storage";
import { baseTables, resetTables } from "./txtPath";

const versionRadio = ref("Main");
const serverRadio = ref("Base");
// 文件路径FileSystemDirectoryHandle
const mainDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
const tyDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
// txt数据
const baseTablesPath = ref(baseTables);
const resetTablesPath = ref(resetTables);
const allTables = reactive([baseTablesPath, resetTablesPath]);
// fakeBox物品id
const recursionDropIdsString = ref<string>("");

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

// 一键检查
const quickCheckClick = async () => {};

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

    <!--    <el-button-->
    <!--      :loading="checkCommonCellByIdLoading"-->
    <!--      style="width: 40%"-->
    <!--      type="primary"-->
    <!--      @click="checkCommonCellByIdClick"-->
    <!--      >批量基础检查</el-button-->
    <!--    >-->
  </div>
</template>

<style lang="scss" scoped>
@use "./newPureRecursionStyle.scss";
</style>
