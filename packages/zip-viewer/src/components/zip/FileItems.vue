<template>
  <!--    https://element-plus.org/zh-CN/component/table.html  -->
    <el-table :data="data" style="width: 100%" @row-click="clickRow">
        <el-table-column label="名称" width="380">
            <template #default="scope">
                <FileItem :info="scope.row"/>
            </template>
        </el-table-column>
        <el-table-column prop="modifyDateTime" label="修改日期" width="220"/>
        <el-table-column prop="compressedSize" label="压缩后大小" width="180"/>
        <el-table-column prop="fileSize" label="原始大小" width="180"/>
    </el-table>
</template>
<script lang="ts" setup>
import FileItem from "@/components/zip/FileItem.vue";
import type {PropType} from "vue";
import {FileInfo} from "@/components/zip/zipTypes";
import {onMounted, ref, watch} from "vue";
import {filterDir} from "@/components/zip/zipActions";
import {getVscodeEvent} from "@/vscode";
// https://element-plus.org/zh-CN/component/table.html
const props = defineProps({
    items: Object as PropType<FileInfo[]>
})
const data = ref(props.items)
watch(() => props.items, (items) => {
    data.value = items
})
const updateData = (items: FileInfo[]) => {
    data.value = items
}

const vscodeEvent = getVscodeEvent()
const clickRow = (entry:FileInfo) => {
    vscodeEvent.emit('openPath', {
        isDirectory: entry.isDirectory,
        entryName: entry.entryName
    })
}

defineExpose({
    updateData
})
</script>
