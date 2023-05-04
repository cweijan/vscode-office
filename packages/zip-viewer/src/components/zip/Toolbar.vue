<template>
    <div class="toolbar">
        <!--        <el-button @click="extractTo">解压到</el-button>-->
        <el-button @click="autoExtract">智能解压</el-button>
        <el-button @click="addFile">添加文件</el-button>
        <!-- <el-button>语言</el-button> -->
    </div>
</template>

<script lang="ts" setup>
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