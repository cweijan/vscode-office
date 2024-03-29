import AdmZip from "@/bundle/adm-zip";
import format from 'date-format';
import { basename } from "path";
import prettyBytes from "./pretty-bytes";
type ZipEntry = AdmZip.IZipEntry;

interface ZipParseResult {
    zip: AdmZip
    files: ZipEntry[]
    fileMap: { [fullPath: string]: ZipEntry }
    folderMap: { [fullPath: string]: ZipEntry }
}

export function parseZipAsTree(zipData: Buffer, option?: Partial<AdmZip.InitOptions>): ZipParseResult {
    const zip = new AdmZip(zipData, option);
    const zipEntries = zip.getEntries().filter(e => e.name);

    let files: ZipEntry[] = []
    const fileMap = {};
    const pathMap = {};
    const folderMap = {};

    function parseFlatItems(entrys: ZipEntry[]) {
        for (const origin of entrys) {
            const entryName = origin.entryName;
            if (!origin.isDirectory) fileMap[entryName] = origin
            const entry = origin.isDirectory ? origin : {
                isDirectory: origin.isDirectory,
                name: origin.name,
                entryName,
                header: origin.header,
                // 原始数据
                originFileSize: origin.header?.size,
                originCompressedSize: origin.header?.compressedSize,
                // 美化后的数据
                fileSize: prettyBytes(origin.header?.size),
                compressedSize: prettyBytes(origin.header?.compressedSize),
                modifyDateTime: origin.header ? format('yyyy-MM-dd hh:mm:ss', origin.header.time) : null
            } as any as ZipEntry
            function pushEntry(entry: ZipEntry) {
                if (pathMap[entry.entryName]) return;
                pathMap[entry.entryName] = 1;
                const paths = entry.entryName.split('/')
                paths.pop()
                if (paths.length == 0) {
                    files.push(entry)
                } else {
                    const parentPath = paths.join('/')
                    if (folderMap[parentPath]) {
                        folderMap[parentPath].children.push(entry)
                    } else {
                        const parentEntry = {
                            isDirectory: true,
                            children: [entry],
                            entryName: parentPath,
                            name: basename(parentPath)
                        }
                        folderMap[parentPath] = parentEntry
                        pushEntry(parentEntry as any as ZipEntry)
                    }
                }
            }
            pushEntry(entry)
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
        element.fileSize = prettyBytes(sum(element.children, 'originFileSize'))
        element.compressedSize = prettyBytes(sum(element.children, 'originCompressedSize'))
    }
    files = files.sort(sortFiles)

    return {
        zip,
        files,
        fileMap,
        folderMap
    };
}

function sum(array: any[], prop: string) {
    return array.reduce((res, item) => {
        const value = item[prop] ?? 0
        let childSize = 0;
        if (item.children) {
            childSize = sum(item.children, prop)
        }
        return res + value + childSize;
    }, 0)
}