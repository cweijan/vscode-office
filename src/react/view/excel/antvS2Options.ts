import { DataCell, LayoutWidthType, S2Options, S2Theme, TextTheme } from "@antv/s2";

class IndexDataCell extends DataCell {
    protected getTextStyle(): TextTheme {
        return {
            ...super.getTextStyle(),
            fill: '#646464',
            textAlign: 'center',
        }
    }
}

class HeaderDataCell extends DataCell {
    protected getTextStyle(): TextTheme {
        return {
            ...super.getTextStyle(),
            fontWeight: 600,
            textAlign: 'center',
        }
    }
}

export const s2Options: S2Options = {
    interaction: {
        resize: {
            colCellVertical: false,
            rowCellVertical: false,
        },
    },
    style: {
        layoutWidthType: LayoutWidthType.Compact,
        colCell: {
            widthByField: {
                'root[&]$$series_number$$': 60
            }
        }
    },
    dataCell: (viewMeta) => {
        if (viewMeta.colId == 'root[&]$$series_number$$') {
            return new IndexDataCell(viewMeta, viewMeta?.spreadsheet);
        } else if (viewMeta.rowIndex == 0) {
            return new HeaderDataCell(viewMeta, viewMeta?.spreadsheet);
        }
        return new DataCell(viewMeta, viewMeta?.spreadsheet);
    },
    seriesNumber: {
        enable: true,
        text: '',
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
                },
                selected:{
                    backgroundColor:'#edfdf3'
                }
            }
        }
    },
    background: {
        color: dataCellBgColor,
    },
}