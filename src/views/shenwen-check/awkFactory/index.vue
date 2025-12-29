<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref, Ref, onMounted, onBeforeUnmount, nextTick, computed } from "vue";
import { ElMessage } from "element-plus";
import { getNestedDirectoryHandle } from "@/utils/common/index";
import { DropRecord, DropTreeNode } from "@/utils/RecursionDrop/types";
import { persistHandle, restoreHandle } from "@/utils/RecursionDrop/storage";

import { findAllShenBingCiTiaoMakeItems } from "@/utils/shenwenTools";
import { ShenBingCiTiaoMakeItem } from "@/utils/shenwenTools/types";

const allShenWens = ref<ShenBingCiTiaoMakeItem[]>([]);

const versionRadio = ref("Main");
const serverRadio = ref("Base");
// 文件路径FileSystemDirectoryHandle
const mainServerDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
const tyServerDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
// txt数据
const shouldTxtNames = [
  "ShenBingDaZao.txt",
  "ShenBingCiTiaoMake.txt",
  "ShenBingCiTiaoAttr.txt",
  "ShenBingCiTiaoKu.txt"
];
const txtFiles = ref<File[]>();

const selectedShenWenIds = ref<number[]>([]);

onMounted(async () => {
  // 恢复句柄（页面刷新后）
  const savedMainHandle = (await restoreHandle<FileSystemDirectoryHandle>(
    "mainDirectoryHandle"
  )) as any;

  if (
    savedMainHandle &&
    (await savedMainHandle.queryPermission({ mode: "read" })) === "granted"
  ) {
    mainServerDirectoryHandle.value = savedMainHandle;
    await findAllTxtFiles();
    await findAllShenWenGroups();
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
    tyServerDirectoryHandle.value = savedTyHandle;
    await findAllTxtFiles();
    await findAllShenWenGroups();
  } else {
    console.warn("句柄ty恢复失败或无权限");
  }
});

const findAllShenWenGroups = async () => {
  for (const txtFile of txtFiles.value) {
    if (txtFile.name === "ShenBingCiTiaoMake.txt") {
      allShenWens.value = await findAllShenBingCiTiaoMakeItems(txtFile);
    }
  }
};

// 选择文件夹触发方法
const selectMainFolder = async () => {
  try {
    // @ts-ignore
    // 使用 File System Access API 打开文件夹选择对话框
    const directoryHandle = await window.showDirectoryPicker();
    mainServerDirectoryHandle.value = await getNestedDirectoryHandle(
      directoryHandle,
      "Server"
    );
    await persistHandle("mainDirectoryHandle", mainServerDirectoryHandle.value);
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
    tyServerDirectoryHandle.value = await getNestedDirectoryHandle(
      directoryHandle,
      "Server"
    );
    await persistHandle("tyDirectoryHandle", tyServerDirectoryHandle.value);
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
    await findAllTxtFilesFromAddress(mainServerDirectoryHandle);
  } else {
    await findAllTxtFilesFromAddress(tyServerDirectoryHandle);
  }
};
// 参数是项目地址
const findAllTxtFilesFromAddress = async (
  address: Ref<FileSystemDirectoryHandle>
) => {
  try {
    // 清空txt数据
    txtFiles.value = [];
    if (versionRadio.value === "Main") {
      if (serverRadio.value === "Base") {
        // main基础版
        const mainBaseServerTables = await getNestedDirectoryHandle(
          address.value,
          "Config"
        );

        await findTxtFiles(mainBaseServerTables, shouldTxtNames);
      } else {
        // main重置版
        const mainResetServerTables = await address.value.getDirectoryHandle(
          "Config_Reset",
          { create: false }
        );
        await findTxtFiles(mainResetServerTables, shouldTxtNames);
      }
    } else {
      // ty基础版
      if (serverRadio.value === "Base") {
        const tyBaseServerTables = await address.value.getDirectoryHandle(
          "Config",
          { create: false }
        );
        await findTxtFiles(tyBaseServerTables, shouldTxtNames);
      } else {
        //ty重置版
        const tyResetServerTables = await address.value.getDirectoryHandle(
          "Config_Reset",
          { create: false }
        );
        await findTxtFiles(tyResetServerTables, shouldTxtNames);
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
            <el-tag v-if="mainServerDirectoryHandle == null" type="danger"
              >未找到</el-tag
            >
            <el-tag v-else type="success">查找成功</el-tag>
          </div>
          <div class="ty-path-container info-container">
            <el-button @click="selectTyFolder">选择TY项目文件夹</el-button>
            <el-tag v-if="tyServerDirectoryHandle == null" type="danger"
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
        <!-- 神纹选择container -->
        <div class="shenwen-select-container">
          <p>请选择需要改造的神纹</p>
          <el-checkbox-group v-model="selectedShenWenIds" size="large">
            <div class="shenwen-group">
              <el-checkbox-button
                v-for="shenwen in allShenWens"
                :key="shenwen.Id"
                :value="shenwen.Id"
                class="shenwen"
              >
                {{ shenwen.Desc }}
              </el-checkbox-button>
            </div>
          </el-checkbox-group>
        </div>
        <!-- 展示词条container -->
        <div class="show-selected-shenwen-citiao-container">
          <p>请选择需要的词条</p>
          <el-card v-for="selectId in selectedShenWenIds"> a </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
::v-deep(.el-checkbox-button__inner) {
  border-left-color: #4c4d4f;
}
.recursoin-drop-form {
  display: flex;
  justify-content: space-between;
  .left-form-container {
    width: 50%;
  }
  .right-info-container {
    width: 40%;
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

.shenwen-select-container {
  p {
    margin-bottom: 10px;
  }
  .shenwen-group {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .shenwen {
    width: 18%; /* 使每个按钮宽度充满网格单元 */
    margin: 1px 0;
  }
}

.show-selected-shenwen-citiao-container {
  p {
    margin: 10px 0;
  }
}
</style>
