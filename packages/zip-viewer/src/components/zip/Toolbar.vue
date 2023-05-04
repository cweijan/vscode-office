<template>
    <div class="toolbar">
        <el-button type="primary" @click="autoExtract" :icon="Scissor">Smart Extract</el-button>
        <el-button type="info" @click="addFile" :icon="Plus">Add File</el-button>
        <!-- <el-button>语言</el-button> -->
    </div>
</template>

<script lang="ts" setup>
import {Plus,Scissor} from '@element-plus/icons-vue'
import {getVscodeEvent} from "@/vscode";

const props = defineProps({
    currentDir: String
})

const vscodeEvent = getVscodeEvent()

const autoExtract = () => {
    vscodeEvent.emit('autoExtract')
}
const addFile = () => {
    vscodeEvent.emit('addFile', props.currentDir)
}

</script>

<style scoped>
.toolbar {
    padding-top: 10px;
}
</style>