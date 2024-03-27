<template>
    <el-tree ref="treeRef" :data="data" @node-click="handleNodeClick" node-key="entryName"
             :default-expanded-keys="[name]" :expand-on-click-node="false">
        <template #default="{ node, data }">
            <FileItem :info="data" :active="activeDir==data.entryName"/>
        </template>
    </el-tree>
</template>

<script lang="ts" setup>
import type {PropType} from "vue";
import {ref, watch} from "vue";
import {FileInfo} from "@/components/zip/zipTypes";
import FileItem from "@/components/zip/FileItem.vue";
import {ElTree} from "element-plus";
import {filterDir} from "@/components/zip/zipActions";

const emit = defineEmits(['clickFolder'])
// https://element-plus.org/zh-CN/component/tree.html
const props = defineProps({
    name: String,
    items: Object as PropType<FileInfo[]>
})
const treeRef = ref<InstanceType<typeof ElTree>>()
const data = ref(props.items)
const activeDir=ref('')

const handleNodeClick = (node: FileInfo) => {
    treeRef.value?.getNode(node.entryName).expand()
    emit('clickFolder', node.entryName)
}
const expandPath=(path:string)=>{
    activeDir.value=path;
    treeRef.value?.getNode(path)?.expand()
}

watch(() => props.items, (items) => {
    data.value = [{
        name: props.name,
        entryName: props.name,
        children: filterDir(items)
    }]
})

defineExpose({
    expandPath
})
</script>