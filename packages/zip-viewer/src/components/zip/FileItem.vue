<template>
  <!--  悬浮时显示删除按钮  -->
    <div v-if="info?.isDirectory">
        <el-icon>
            <Folder/>
        </el-icon>
        {{ info.name }}
    </div>
    <div v-else>
        <el-icon>
            <Document/>
        </el-icon>
        {{ info.name }}
    </div>
</template>

<script lang="ts" setup>
import {FileInfo} from "@/components/zip/zipTypes";
import {Folder, Document} from "@element-plus/icons-vue";
import type {PropType} from "vue";

defineProps({
    info: Object as PropType<FileInfo>
})
</script>