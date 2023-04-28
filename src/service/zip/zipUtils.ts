import AdmZip from "adm-zip";
import { basename } from "path";

interface ZipParseResult {
    files: ZipEntry[]
    fileMap: { [fullPath: string]: ZipEntry }
    folderMap: { [fullPath: string]: ZipEntry }
}

export function parseZipAsTree(zipData: Buffer): ZipParseResult {
    // reading archives
    var zip = new AdmZip(zipData);
    var zipEntries = zip.getEntries(); // an array of ZipEntry records

    let files: ZipEntry[] = []
    const fileMap = {};
    const folderMap = {};

    function parseFlatItems(entrys: ZipEntry[]) {
        for (const entry of entrys) {
            const paths = entry.entryName.split('/')
            paths.pop()
            if (paths.length == 0) {
                files.push(entry)
                if (!entry.isDirectory) fileMap[entry.entryName] = entry
            } else {
                const parentPath = paths.join('/')
                if (folderMap[parentPath]) {
                    folderMap[parentPath].children.push(entry)
                    if (!entry.isDirectory) fileMap[entry.entryName] = entry
                } else {
                    folderMap[parentPath] = {
                        isDirectory: true,
                        children: [entry],
                        entryName: parentPath,
                        name: basename(parentPath)
                    }
                }
            }
        }
    }

    parseFlatItems(zipEntries)
    parseFlatItems(Object.keys(folderMap).map(k => folderMap[k]))

    function sortFiles(a: ZipEntry, b: ZipEntry) {
        if (a.isDirectory && b.isDirectory) return a.name.localeCompare(b.name);
        if (a.isDirectory) return -1;
        if (b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    }

    for (const key in folderMap) {
        const element = folderMap[key];
        element.children = element.children.sort(sortFiles)
    }
    files = files.sort(sortFiles)

    return {
        files,
        fileMap,
        folderMap
    };
}