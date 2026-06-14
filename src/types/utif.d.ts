declare module 'utif' {
    interface IFD {
        width: number;
        height: number;
        data: Uint8Array;
    }

    function decode(buffer: ArrayBuffer): IFD[];
    function decodeImage(buffer: ArrayBuffer, ifd: IFD): void;
    function toRGBA8(ifd: IFD): Uint8Array;
}
