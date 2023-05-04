<template>
  <!--    https://element-plus.org/zh-CN/component/table.html  -->
    <el-table :data="data" style="width: 100%" @row-click="clickRow">
        <el-table-column label="名称">
            <template #default="scope">
                <FileItem :info="scope.row"/>
            </template>
        </el-table-column>
        <el-table-column prop="modifyDateTime" label="修改日期" width="190"/>
        <el-table-column prop="compressedSize" label="压缩后大小" width="100"/>
        <el-table-column prop="fileSize" label="原始大小" width="80"/>
        <el-table-column prop="fileSize" label="操作" width="80">
            <template #default="scope">
                <el-popconfirm width="220" confirm-button-text="OK" cancel-button-text="Cancel" :icon="InfoFilled"
                               title="Are you sure to delete this?" :hide-after="0"
                               @confirm="reqDelete(scope.row)">
                    <template #reference>
                        <el-button type="danger" size="small" :icon="Delete"></el-button>
                    </template>
                </el-popconfirm>
            </template>
        </el-table-column>
    </el-table>
</template>
<script lang="ts" setup>
import FileItem from "@/components/zip/FileItem.vue";
import type {PropType} from "vue";
import {FileInfo} from "@/components/zip/zipTypes";
import {onMounted, ref, watch} from "vue";
import {filterDir} from "@/components/zip/zipActions";
import {getVscodeEvent} from "@/vscode";
import {
    Delete, InfoFilled
} from '@element-plus/icons-vue'
import {TableV2SortOrder} from "element-plus";
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

const reqDelete = (entry: FileInfo) => {
    vscodeEvent.emit('removeFile',entry.entryName)
}

const clickRow = (entry: FileInfo, column: any) => {
    if (column.no != 0) return;
    vscodeEvent.emit('openPath', {
        isDirectory: entry.isDirectory,
        entryName: entry.entryName
    })
}

defineExpose({
    updateData
})
</script>
