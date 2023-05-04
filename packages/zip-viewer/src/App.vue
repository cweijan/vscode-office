<template>
    <div id="app">
        <el-container>
            <el-header>
                <Toolbar :currentDir="currentDir"/>
            </el-header>
            <el-container>
                <el-aside width="270px">
                    <Sidebar ref="sidebarRef" :name="name" :items="items" @click-folder="changeFiles"/>
                </el-aside>
                <el-main>
                    <FileItems ref="filesRef" :items="items"/>
                </el-main>
            </el-container>
        </el-container>
    </div>
</template>

<script setup lang="ts">
import Sidebar from "@/components/zip/Sidebar.vue";
import FileItems from "@/components/zip/FileItems.vue";
import Toolbar from "@/components/zip/Toolbar.vue";
import {getVscodeEvent} from "@/vscode";
import {onMounted, ref} from "vue";
import type {Ref} from 'vue'
import {FileInfo} from "@/components/zip/zipTypes";

const vscodeEvent = getVscodeEvent()
window.addEventListener('keydown', e => {
    if (e.code == 'F12') vscodeEvent.emit('developerTool')
})
const filesRef = ref<InstanceType<typeof FileItems>>()
const sidebarRef = ref<InstanceType<typeof Sidebar>>()
const name = ref('')
const currentDir = ref('')
const folderMapping: Ref<any> = ref({})
const items: Ref<FileInfo[]> = ref([
    {
        name: 'out',
        isDirectory: true,
        children: [],
        modifyDateTime: '2016-05-03',
        fileSize: 1000,
        compressedSize: 200,
    },
    {
        name: 'index.js',
        isDirectory: false,
        children: [],
        modifyDateTime: '2016-05-03',
        fileSize: 1000,
        compressedSize: 200,
    }
])
items.value = []
const changeFiles = (dirPath: string) => {
    sidebarRef.value.expandPath(dirPath)
    let files = items.value // 点击左侧顶部时
    currentDir.value = dirPath
    if (folderMapping.value[dirPath]) {
        files = [
            {
                name: '..',
                isDirectory: true,
                entryName: dirPath.includes('/') ? dirPath.replace(/\/.+$/, '') : null,
            },
            ...folderMapping.value[dirPath].children
        ]
    }

    filesRef.value.updateData(files)
}
onMounted(() => {
    vscodeEvent
        .on('data', ({fileName, files, folderMap}) => {
            name.value = fileName
            folderMapping.value = folderMap;
            if (currentDir.value) {
                changeFiles(currentDir.value)
            } else {
                items.value = files
            }
        })
        .on('openDir', changeFiles)
        .on('zipChange', () => vscodeEvent.emit('init'))
        .emit('init')
})
</script>

<style>
body {
    padding: 0;
    /*padding-left: 5px;*/
}
</style>