<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref, Ref, onMounted, onBeforeUnmount, nextTick, computed } from "vue";
import { ElMessage } from "element-plus";
import { getNestedDirectoryHandle } from "@/utils/common/index";
import { persistHandle, restoreHandle } from "@/utils/RecursionDrop/storage";
import { ShenBingCiTiaoMakeItem } from "@/utils/shenwenTools/types";

const versionRadio = ref("Main");
const serverRadio = ref("Base");
const yuanBaoShopNameString = ref<string>("");
const yuanBaoShopNameStringArray: Ref<string[]> = ref([]);
// 文件路径FileSystemDirectoryHandle
const mainServerDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
const tyServerDirectoryHandle = ref<FileSystemDirectoryHandle | null>(null);
const shouldTxtNames = [
  {
    version: "Base",
    tableName: "YuanBaoShop.txt",
    desc: "YuanBaoShop.txt(public)",
    path: "Public/PublicTables",
    finded: false,
    content: null
  },
  {
    version: "Base",
    tableName: "YuanBaoShop.txt",
    desc: "YuanBaoShop.txt(server)",
    path: "Server/Config",
    finded: false,
    content: null
  },
  {
    version: "Base",
    tableName: "LimitShop.txt",
    desc: "LimitShop.txt(public)",
    path: "Public/ServerTables",
    finded: false,
    content: null
  },
  {
    version: "Base",
    tableName: "LimitShop.txt",
    desc: "LimitShop.txt(server)",
    path: "Server/Config",
    finded: false,
    content: null
  },
  {
    version: "Reset",
    tableName: "YuanBaoShop.txt",
    desc: "YuanBaoShop.txt(public)",
    path: "Public/Reset/PublicResetTables",
    finded: false,
    content: null
  },
  {
    version: "Reset",
    tableName: "YuanBaoShop.txt",
    desc: "YuanBaoShop.txt(server)",
    path: "Server/Config_Reset",
    finded: false,
    content: null
  },
  {
    version: "Reset",
    tableName: "LimitShop.txt",
    desc: "LimitShop.txt(public)",
    path: "Public/Reset/ServerResetTables",
    finded: false,
    content: null
  },
  {
    version: "Reset",
    tableName: "LimitShop.txt",
    desc: "LimitShop.txt(server)",
    path: "Server/Config_Reset",
    finded: false,
    content: null
  }
];
const txtFiles = ref() as any;

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
  } else {
    console.warn("句柄ty恢复失败或无权限");
  }
});

// 选择文件夹触发方法
const selectMainFolder = async () => {
  try {
    // @ts-ignore
    // 使用 File System Access API 打开文件夹选择对话框
    mainServerDirectoryHandle.value = await window.showDirectoryPicker();
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
    tyServerDirectoryHandle.value = await window.showDirectoryPicker();
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
    for (const file of shouldTxtNames) {
      if (file.version === serverRadio.value) {
        const folder = await getNestedDirectoryHandle(address.value, file.path);

        // @ts-ignore
        for await (const entry of folder.values()) {
          if (entry.kind === "file") {
            if (file.tableName === entry.name) {
              file.content = await entry.getFile();
              file.finded = true;
              txtFiles.value.push(file);
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

const yuanBaoShopItemsFind = async () => {
  // 以顿号为分隔符，将字符串分割成数组
  yuanBaoShopNameStringArray.value = yuanBaoShopNameString.value.split("、");
  console.log(yuanBaoShopNameStringArray.value);
};
const defaultProps = {
  children: "children",
  label: "label"
};

defineOptions({
  name: "yuanbao-shop-check"
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
              <span
                v-if="file.version === serverRadio"
                style="margin-right: 40px"
                >{{ file.desc }}</span
              >
              <el-tag
                v-show="file.version === serverRadio && !file.finded"
                type="danger"
                >未找到</el-tag
              >
              <el-tag
                v-show="file.version === serverRadio && file.finded"
                type="success"
                >查找成功</el-tag
              >
            </li>
            <!-- 显示文件名 -->
          </ul>
        </div>
        <!-- 输入随机掉落物id container -->
        <div class="recursionDrop-input-container info-container">
          <p>请输入查找物品名称，以 、 分割</p>
          <el-input
            v-model="yuanBaoShopNameString"
            style="width: 240px"
            :autosize="{ minRows: 2, maxRows: 4 }"
            type="textarea"
            placeholder="Please input"
          />
        </div>
        <el-button
          class="yuanBaoShopCheckBtn"
          type="warning"
          @click="yuanBaoShopItemsFind"
          >查找所有物品</el-button
        >
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

.yuanBaoShopCheckBtn {
  width: 100%;
}
.show-selected-shenwen-citiao-container {
  p {
    margin: 10px 0;
  }
}
</style>
