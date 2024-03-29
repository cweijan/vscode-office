import { LayoutWidthType, S2Options, S2Theme } from "@antv/s2";

export const s2Options: S2Options = {
    interaction: {
        resize: {
            colCellVertical: false,
            rowCellVertical: false,
        },
    },
    style: {
        layoutWidthType: LayoutWidthType.Compact
    },
    seriesNumber: {
        enable: true,
        text: 'Index',
    },
    placeholder: '',
}

const cellBorderColor = '#e6e6e6';
const dataCellBgColor = '#ffffff';

const colCell = {
    bolderText: {
        fill: '#585757',
    },
    cell: {
        backgroundColor: '#f4f5f8',
        verticalBorderColor: cellBorderColor,
        horizontalBorderColor: cellBorderColor,
        interactionState: {
            hover: { backgroundColor: '#f4f5f8' },
            highlight: { backgroundColor: '#f4f5f8' },
        }
    }
}

export const S2ExcelTheme: S2Theme = {
    colCell,
    cornerCell: colCell,
    splitLine: {
        horizontalBorderWidth: 1,
        horizontalBorderColor: '#858585',
    },
    dataCell: {
        text: {
            textAlign: 'left',
            textBaseline: 'top',
        },
        cell: {
            verticalBorderColor: cellBorderColor,
            horizontalBorderColor: cellBorderColor,
            backgroundColor: dataCellBgColor,
            crossBackgroundColor: dataCellBgColor,
            interactionState: {
                hover: { backgroundColor: dataCellBgColor },
                highlight: { backgroundColor: dataCellBgColor },
                hoverFocus: {
                    borderColor: '#418f1f',
                    borderWidth: 1,
                    backgroundColor: dataCellBgColor,
                },
                prepareSelect: {
                    borderColor: '#418f1f',
                    borderWidth: 1,
                    backgroundColor: dataCellBgColor,
                }
            }
        }
    },
    background: {
        color: dataCellBgColor,
    },
}