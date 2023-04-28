<template>
  <!--  悬浮时显示删除按钮  -->
    <div>
        <el-icon>
            <Folder v-if="info?.isDirectory"/>
            <Document v-else/>
        </el-icon>
        <span>
          {{ info.name }}
        </span>
    </div>
</template>

<script lang="ts" setup>
import {FileInfo} from "@/components/zip/zipTypes";
import {Document, Folder} from "@element-plus/icons-vue";
import type {PropType} from "vue";

defineProps({
    info: Object as PropType<FileInfo>
})

</script>