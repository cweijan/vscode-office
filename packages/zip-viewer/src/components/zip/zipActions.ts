import type {FileInfo} from "@/components/zip/zipTypes";

export function filterDir(fileInfos?: FileInfo[]) {
    if (!fileInfos) return [];
    function doFilter(files: FileInfo[]) {
        const newFiles = []
        for (const file of files) {
            if (file.isDirectory) {
                if (file.children) file.children = doFilter(file.children)
                newFiles.push(file)
            }
        }
        return newFiles;
    }

    return doFilter(fileInfos)
}