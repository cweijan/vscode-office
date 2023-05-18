<template>
  <!--    https://element-plus.org/zh-CN/component/table.html  -->
    <el-table :data="data" style="width: 100%" @row-click="clickRow" :max-height="remainHeight" v-loading="loadingFile">
        <el-table-column label="Name" width="350">
            <template #default="scope">
                <FileItem :info="scope.row"/>
            </template>
        </el-table-column>
        <el-table-column prop="modifyDateTime" label="Modified" width="190"/>
        <el-table-column prop="compressedSize" label="Compressed" width="105"/>
        <el-table-column prop="fileSize" label="Origin" width="80"/>
        <el-table-column label="Action" width="80">
            <template #default="scope">
                <el-popconfirm width="220" confirm-button-text="OK" cancel-button-text="Cancel" :icon="InfoFilled"
                               title="Are you sure to delete this?" :hide-after="0" v-if="scope.row.name!='..'"
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
import {ref, watch} from "vue";
import {FileInfo} from "@/components/zip/zipTypes";
import {getVscodeEvent} from "@/vscode";
import {Delete, InfoFilled} from '@element-plus/icons-vue'
// https://element-plus.org/zh-CN/component/table.html
const props = defineProps({
    items: Object as PropType<FileInfo[]>
})
const data = ref(props.items)
const loadingFile=ref(true)
const remainHeight = ref(window.innerHeight - 100)
window.onresize = () => {
    remainHeight.value = window.innerHeight - 100;
}
watch(() => props.items, (items) => {
    data.value = items
    loadingFile.value=false
})
const updateData = (items: FileInfo[]) => {
    data.value = items
}

const vscodeEvent = getVscodeEvent()

const reqDelete = (entry: FileInfo) => {
    vscodeEvent.emit('removeFile', entry.entryName)
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
