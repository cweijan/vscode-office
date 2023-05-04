<template>
  <!--  悬浮时显示删除按钮  -->
    <div :class="{active}">
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
    active: Boolean,
    info: Object as PropType<FileInfo>
})

</script>

<style scoped>
.active{
  background: #f1f1f1;
}
</style>