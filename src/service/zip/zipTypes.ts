// tslint:disable-next-line:interface-name
interface ZipEntry {
    /**
     * Represents the full name and path of the file
     */
    entryName: string;
    readonly rawEntryName: Buffer;
    /**
     * Extra data associated with this entry.
     */
    extra: Buffer;
    /**
     * Entry comment.
     */
    comment: string;
    readonly name: string;
    /**
     * Read-Only property that indicates the type of the entry.
     */
    readonly isDirectory: boolean;
    /**
     * Get the header associated with this ZipEntry.
     */
    readonly header: EntryHeader;
    attr: number;
    /**
     * Retrieve the compressed data for this entry. Note that this may trigger
     * compression if any properties were modified.
     */
    getCompressedData(): Buffer;
    /**
     * Asynchronously retrieve the compressed data for this entry. Note that
     * this may trigger compression if any properties were modified.
     */
    getCompressedDataAsync(callback: (data: Buffer) => void): void;
    /**
     * Set the (uncompressed) data to be associated with this entry.
     */
    setData(value: string | Buffer): void;
    /**
     * Get the decompressed data associated with this entry.
     */
    getData(): Buffer;
    /**
     * Asynchronously get the decompressed data associated with this entry.
     */
    getDataAsync(callback: (data: Buffer, err: string) => void): void;
    /**
     * Returns the CEN Entry Header to be written to the output zip file, plus
     * the extra data and the entry comment.
     */
    packHeader(): Buffer;
    /**
     * Returns a nicely formatted string with the most important properties of
     * the ZipEntry.
     */
    toString(): string;
}

interface EntryHeader {
    made: number;
    version: number;
    flags: number;
    method: number;
    time: Date;
    crc: number;
    compressedSize: number;
    size: number;
    prettySize?: string;
    prettySizeCompressedSize?: string;
    fileNameLength: number;
    extraLength: number;
    commentLength: number;
    diskNumStart: number;
    inAttr: number;
    attr: number;
    offset: number;
    readonly encripted: boolean;
    readonly entryHeaderSize: number;
    readonly realDataOffset: number;
    readonly dataHeader: DataHeader;
    loadDataHeaderFromBinary(data: Buffer): void;
    loadFromBinary(data: Buffer): void;
    dataHeaderToBinary(): Buffer;
    entryHeaderToBinary(): Buffer;
    toString(): string;
}

interface DataHeader {
    version: number;
    flags: number;
    method: number;
    time: number;
    crc: number;
    compressedSize: number;
    size: number;
    fnameLen: number;
    extraLen: number;
}