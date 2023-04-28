<template>
  <!--    https://element-plus.org/zh-CN/component/table.html-->
    <el-table :data="tableData" style="width: 100%">
        <el-table-column label="名称" width="180">
            <template #default="scope">
                <FileItem :info="scope.row.info"/>
            </template>
        </el-table-column>
        <el-table-column prop="modifyDate" label="修改日期" width="180"/>
        <el-table-column prop="compressedSize" label="压缩后大小" width="180"/>
        <el-table-column prop="originSize" label="原始大小" width="180"/>
    </el-table>
</template>
1
<script lang="ts" setup>
// name: "FileItems"
import FileItem from "@/components/zip/FileItem.vue";

const tableData = [
    {
        info: {
            name: 'out',
            isDir: true,
            children: []
        },
        modifyDate: '2016-05-03',
        originSize: 1000,
        compressedSize: 200,
    },
    {
        info: {
            name: 'index.js',
            isDir: false,
            children: []
        },
        modifyDate: '2016-05-03',
        originSize: 1000,
        compressedSize: 200,
    }
]
</script>
