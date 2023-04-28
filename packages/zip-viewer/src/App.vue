<template>
    <div class="common-layout">
        <el-container>
            <el-header>
                <Toolbar/>
            </el-header>
            <el-container>
                <el-aside width="200px">
                    <Sidebar/>
                </el-aside>
                <el-main>
                    <FileItems/>
                </el-main>
            </el-container>
        </el-container>
    </div>
</template>

<script setup lang="ts">
import Sidebar from "@/components/zip/Sidebar.vue";
import FileItems from "@/components/zip/FileItems.vue";
import Toolbar from "@/components/zip/Toolbar.vue";
</script>