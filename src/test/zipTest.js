// 入门: https://github.com/cthackers/adm-zip#basic-usage
// API: https://github.com/cthackers/adm-zip/wiki/ADM-ZIP

var AdmZip = require("adm-zip");

// reading archives
var zip = new AdmZip("./vscode-ssh-6.4.1.vsix");
var zipEntries = zip.getEntries(); // an array of ZipEntry records

const files = []
const folderMap = {};

function parseFlatItems(entrys) {
    for (const entry of entrys) {
        const paths = entry.entryName.split('/')
        paths.pop()
        if (paths.length == 0) {
            files.push(entry)
        } else {
            const parentPath = paths.join('/')
            if (folderMap[parentPath]) {
                folderMap[parentPath].children.push(entry)
            } else {
                folderMap[parentPath] = {
                    entryName: parentPath,
                    children: [entry]
                }
            }
        }
    }
}

parseFlatItems(zipEntries)
parseFlatItems(Object.keys(folderMap).map(k => folderMap[k]))

// outputs the content of some_folder/my_file.txt
// console.log(zip.readAsText("some_folder/my_file.txt"));
// // extracts the specified file to the specified location
// zip.extractEntryTo(/*entry name*/ "some_folder/my_file.txt", /*target path*/ "/home/me/tempfolder", /*maintainEntryPath*/ false, /*overwrite*/ true);
// // extracts everything
// zip.extractAllTo(/*target path*/ "/home/me/zipcontent/", /*overwrite*/ true);

// // creating archives
// var zip = new AdmZip();

// // add file directly
// var content = "inner content of the file";
// zip.addFile("test.txt", Buffer.from(content, "utf8"), "entry comment goes here");
// // add local file
// zip.addLocalFile("/home/me/some_picture.png");
// // get everything as a buffer
// var willSendthis = zip.toBuffer();
// // or write everything to disk
// zip.writeZip(/*target file name*/ "/home/me/files.zip");

// // ... more examples in the wiki