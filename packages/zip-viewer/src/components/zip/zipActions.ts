import type {FileInfo} from "@/components/zip/zipTypes";

export function filterDir(fileInfos?: FileInfo[]) {
    if (!fileInfos) return [];

    function doFilter(files: FileInfo[]) {
        return files.filter(f => f.isDirectory)
            .map((f => {
                f.children = doFilter(f.children || [])
                return f;
            }))
    }

    return doFilter(fileInfos)
}