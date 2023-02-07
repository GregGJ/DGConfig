

export enum ByteType {
    byte,
    ubyte,
    short,
    ushort,
    int,
    uint,
    float,
    number,
    string,
    arr_byte,
    arr_ubyte,
    arr_short,
    arr_ushort,
    arr_int,
    arr_uint,
    arr_float,
    arr_number,
    arr_string
}


export class ExcelUtils {

    static readonly arrTypeCodes = ["[byte]", "[ubyte]", "[short]", "[ushort]", "[int]", "[uint]", "[float]", "[number]", "[string]"];


    static getByteTypes(sheetName: string, titleIndex: number, typeIndex: number, dataIndex: number, sheet, result: Array<ByteType>): Array<ByteType> {
        result = result || [];
        let titleList = sheet.data[titleIndex];
        let typeList = sheet.data[typeIndex];

        let valueList;
        for (let colIndex = 0; colIndex < typeList.length; colIndex++) {
            let type = typeList[colIndex];
            let lowType:string = type.toLowerCase();
            let title = titleList[colIndex];
            //字符串
            if (lowType == "string") {
                result.push(ByteType.string);
                continue;
            }
            if (lowType == "[string]") {
                result.push(ByteType.arr_string);
                continue;
            }
            //数字
            valueList = [];
            for (let rowIndex = dataIndex; rowIndex < sheet.data.length; rowIndex++) {
                let value = sheet.data[rowIndex][colIndex];
                if (value == null || value == undefined) {
                    continue;
                }
                //如果是数组
                if (this.isArray(lowType)) {
                    let arr = value.toString().split("|");
                    if (arr.length == 1) {
                        //数字
                        if (Number(value) != undefined) {
                            valueList.push(Number(value));
                        } else {
                            valueList.push(value);
                        }
                    } else {
                        for (let index = 0; index < arr.length; index++) {
                            const element = arr[index];
                            //数字
                            if (Number(value) != undefined) {
                                valueList.push(Number(element));
                            } else {
                                valueList.push(element);
                            }
                        }
                    }
                } else {
                    //数字
                    if (Number(value) != undefined) {
                        valueList.push(Number(value));
                    } else {
                        valueList.push(value);
                    }
                }
            }
            let trueType:ByteType;
            //占位
            if (valueList.length == 0) {
                throw new Error("配置表："+sheetName+" "+title+"该列数据为空！");
            } else {
                trueType = this.__getMinSizeNumberType(sheetName, title, valueList);
                // Editor.log(title+":"+trueType);
            }
            //数组
            if (this.isArray(lowType)) {
                result.push(ByteType["arr_" + ByteType[trueType]]);
            } else {
                result.push(trueType);
            }
        }
        return result;
    }

    static __getMinSizeNumberType(fileName, title, nums):ByteType {
        let max = Number.MIN_SAFE_INTEGER;
        let min = Number.MAX_SAFE_INTEGER;
        let isFloat = false;
        for (let index = 0; index < nums.length; index++) {
            const num = nums[index];
            if (num.toString().indexOf(".") >= 0) {
                isFloat = true;
            }
            if (num > max) {
                max = num;
            }
            if (num < min) {
                min = num;
            }
        }
        //浮点数
        if (isFloat) {
            //float
            const floatMin = -3.4E+38;
            const floatMax = 3.4E+38;
            if (this.__inSection(min, floatMin, floatMax) && this.__inSection(max, floatMin, floatMax)) {
                return ByteType.float;
            } else {
                return ByteType.number;
            }
        } else {//整数
            let a = min < 0;
            let b = max < 0;
            //符号相同且都为正数
            if (a == b && min >= 0) {
                const charMin = 0;
                const charMax = 255;
                const shortMin = 0;
                const shortMax = 65535;
                const uintMin = 0;
                const uintMax = 4294967295;
                if (this.__inSection(min, charMin, charMax) && this.__inSection(max, charMin, charMax)) {
                    return ByteType.ubyte;
                }
                if (this.__inSection(min, shortMin, shortMax) && this.__inSection(max, shortMin, shortMax)) {
                    return ByteType.ushort;
                }
                if (this.__inSection(min, uintMin, uintMax) && this.__inSection(max, uintMin, uintMax)) {
                    return ByteType.uint;
                }
                throw new Error("数值无法存储：" + min+","+max);
            } else {//有正有负或都为负数
                const charMin = -128;
                const charMax = 127;
                const shortMin = -32768;
                const shortMax = 32767;
                const intMin = -2147483648;
                const intMax = 2147483647;
                if (this.__inSection(min, charMin, charMax) && this.__inSection(max, charMin, charMax)) {
                    return ByteType.byte;
                }
                if (this.__inSection(min, shortMin, shortMax) && this.__inSection(max, shortMin, shortMax)) {
                    return ByteType.short;
                }
                if (this.__inSection(min, intMin, intMax) && this.__inSection(max, intMin, intMax)) {
                    return ByteType.int;
                }
                throw new Error("数值无法存储：" + min+","+max);
            }
        }
    }

    static __inSection(value: number, min: number, max: number) {
        return value >= min && value <= max;
    }

    static isArray(value:string):boolean{
        return ExcelUtils.arrTypeCodes.includes(value);
    }
}