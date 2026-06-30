export function getVertexColour(
    vertexColors: ReadonlyArray<number>,
    colours: ReadonlyArray<string>,
    index: number,
): string {
    const colourIndex = vertexColors[index] ?? 0;
    return colours[colourIndex % colours.length];
}
