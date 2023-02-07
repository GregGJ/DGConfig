"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelExport = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const node_xlsx_1 = __importDefault(require("node-xlsx"));
const ExcelUtils_1 = require("./ExcelUtils");
const ByteArray_1 = require("./ByteArray");
class ExcelExport {
    constructor() {
        /**表头所在行 */
        this.titleIndex = 0;
        this.typeIndex = 1;
        this.commentIndex = 2;
        /**数据开始行 */
        this.dataIndex = 3;
        /**是否是单表输出模式 */
        this.single = false;
    }
    /**
     * 导出
     * @param folder
     * @param dataFolder
     * @param scriptFolder
     * @param titleIndex
     * @param typeIndex
     * @param commentIndex
     * @param dataIndex
     * @param single
     * @param cb
     * @returns
     */
    export(folder, dataFolder, scriptFolder, titleIndex, typeIndex, commentIndex, dataIndex, single, cb) {
        //文件夹不存在
        if (!(0, fs_1.existsSync)(folder)) {
            return;
        }
        let files = [];
        this.__readDir(folder, files);
        if (files.length == 0) {
            console.error("excel files equals to zero");
            return;
        }
        console.log("Start Export File Num:" + files.length);
        this.excelFolder = folder;
        this.dataFolder = dataFolder;
        this.scriptFolder = scriptFolder;
        this.titleIndex = titleIndex;
        this.typeIndex = typeIndex;
        this.commentIndex = commentIndex;
        this.dataIndex = dataIndex;
        this.single = single;
        let tsTypeDefind = "declare namespace Config {\n";
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            const filePath = this.excelFolder + "/" + file;
            console.log("Export==>" + filePath);
            const fileName = this.__getFileName(file, true);
            const excel = node_xlsx_1.default.parse(filePath);
            if (excel.length == 0) {
                continue;
            }
            if (this.single) {
                const sheet = excel[0];
                if (sheet.data.length < this.dataIndex) {
                    continue;
                }
                const info = this.__exportSheetByte(fileName, excel[0]);
                tsTypeDefind += this.__generateTs(fileName, info.titles, info.trueTypes, info.comments);
            }
            else {
                for (let index = 0; index < excel.length; index++) {
                    const sheet = excel[index];
                    if (sheet.data.length < this.dataIndex) {
                        continue;
                    }
                    const info = this.__exportSheetByte(sheet.name, sheet);
                    tsTypeDefind += this.__generateTs(sheet.name, info.titles, info.trueTypes, info.comments);
                }
            }
        }
        tsTypeDefind += "}";
        (0, fs_1.writeFileSync)(path_1.default.join(this.scriptFolder, "ConfigTypeDefind.d.ts"), tsTypeDefind);
        console.log("Export Complete");
        if (cb) {
            cb();
        }
    }
    __exportSheetByte(fileName, sheet) {
        const sheetName = fileName.match(/[^<]*\w+(?=>)*/)[0];
        //表头
        let titles = sheet.data[this.titleIndex];
        //数据类型
        let types = sheet.data[this.typeIndex];
        //注释
        let comments;
        //描述
        if (this.commentIndex >= 0) {
            comments = sheet.data[this.commentIndex];
        }
        else {
            comments = [];
        }
        //类型
        let trueTypes = [];
        let byte = new ByteArray_1.ByteArray();
        //表头
        byte.writeUnsignedInt(titles.length);
        for (let index = 0; index < titles.length; index++) {
            const title = titles[index];
            const titleName = title.replace(/^\s*|\s*$/g, "");
            byte.writeUTF(titleName);
        }
        //数据最小化类型列表
        ExcelUtils_1.ExcelUtils.getByteTypes(sheetName, this.titleIndex, this.typeIndex, this.dataIndex, sheet, trueTypes);
        if (types.length != trueTypes.length) {
            console.log(types);
            console.log(trueTypes);
            throw new Error("类型数量不一致！");
        }
        //类型数据
        byte.writeUnsignedInt(trueTypes.length);
        for (let index = 0; index < trueTypes.length; index++) {
            const type = trueTypes[index];
            if (type < 0) {
                throw new Error(sheetName + "未知类型：" + type);
            }
            byte.writeByte(type);
        }
        //数据
        byte.writeUnsignedInt(sheet.data.length - this.dataIndex);
        for (let colnmIndex = this.dataIndex; colnmIndex < sheet.data.length; colnmIndex++) {
            for (let index = 0; index < types.length; index++) {
                const value = sheet.data[colnmIndex][index];
                const type = types[index];
                const trueType = trueTypes[index];
                if (ExcelUtils_1.ExcelUtils.isArray(type)) {
                    this.__writeArray(trueType, value, byte);
                }
                else {
                    this.__writeValue(trueType, value, byte);
                }
            }
        }
        //.bin文件写入
        (0, fs_1.writeFileSync)(path_1.default.join(this.dataFolder, sheetName + ".bin"), byte.bytes);
        return { titles, trueTypes, comments };
    }
    __writeArray(type, value, byte) {
        if (value == null || value == undefined) {
            byte.writeUnsignedInt(0);
            return;
        }
        let arr = value.toString().split("|");
        byte.writeUnsignedInt(arr.length);
        for (let index = 0; index < arr.length; index++) {
            const element = arr[index];
            switch (type) {
                case ExcelUtils_1.ByteType.arr_byte:
                case ExcelUtils_1.ByteType.arr_ubyte:
                case ExcelUtils_1.ByteType.arr_short:
                case ExcelUtils_1.ByteType.arr_ushort:
                case ExcelUtils_1.ByteType.arr_int:
                case ExcelUtils_1.ByteType.arr_uint:
                case ExcelUtils_1.ByteType.arr_float:
                case ExcelUtils_1.ByteType.arr_number:
                    this.__writeNumber(type, element, byte);
                    break;
                case ExcelUtils_1.ByteType.arr_string:
                    byte.writeUTF((element == null || element == undefined) ? "" : element);
                    break;
                default:
                    throw new Error("未处理类型：" + type);
            }
        }
    }
    __writeValue(type, value, byte) {
        switch (type) {
            case ExcelUtils_1.ByteType.byte:
            case ExcelUtils_1.ByteType.ubyte:
            case ExcelUtils_1.ByteType.short:
            case ExcelUtils_1.ByteType.ushort:
            case ExcelUtils_1.ByteType.int:
            case ExcelUtils_1.ByteType.uint:
            case ExcelUtils_1.ByteType.float:
            case ExcelUtils_1.ByteType.number:
                this.__writeNumber(type, value, byte);
                break;
            case ExcelUtils_1.ByteType.string:
                byte.writeUTF((value == null || value == undefined) ? "" : value);
                break;
            default:
                throw new Error("未处理类型：" + type);
        }
    }
    __writeNumber(type, value, byte) {
        value = Number(value) == undefined ? 0 : value;
        switch (type) {
            case ExcelUtils_1.ByteType.byte:
            case ExcelUtils_1.ByteType.ubyte:
            case ExcelUtils_1.ByteType.arr_byte:
            case ExcelUtils_1.ByteType.arr_ubyte:
                byte.writeByte(Number(value));
                break;
            case ExcelUtils_1.ByteType.short:
            case ExcelUtils_1.ByteType.arr_short:
                byte.writeShort(Number(value));
                break;
            case ExcelUtils_1.ByteType.ushort:
            case ExcelUtils_1.ByteType.arr_ushort:
                byte.writeUnsignedShort(Number(value));
                break;
            case ExcelUtils_1.ByteType.int:
            case ExcelUtils_1.ByteType.arr_int:
                byte.writeInt(Number(value));
                break;
            case ExcelUtils_1.ByteType.uint:
            case ExcelUtils_1.ByteType.arr_uint:
                byte.writeUnsignedInt(Number(value));
                break;
            case ExcelUtils_1.ByteType.float:
            case ExcelUtils_1.ByteType.arr_float:
                byte.writeFloat(Number(value));
                break;
            case ExcelUtils_1.ByteType.number:
            case ExcelUtils_1.ByteType.arr_number:
                byte.writeDouble(Number(value));
                break;
            default:
                throw new Error("未处理类型：" + type);
        }
    }
    __generateTs(sheetName, titles, trueTypes, comments) {
        let result = "";
        //首字母大写
        const className = sheetName.slice(0, 1).toUpperCase() + sheetName.slice(1);
        result += `   export interface ${className}{\n`;
        let line = "";
        for (let index = 0; index < trueTypes.length; index++) {
            const trueType = trueTypes[index];
            const title = titles[index];
            const comment = comments.length > 0 ? comments[index] : title;
            if (result.indexOf(title + ":") >= 0) {
                console.error(sheetName + "中存在重复字段：" + title);
                continue;
            }
            result += "      /**" + comment + "*/\n";
            switch (trueType) {
                case ExcelUtils_1.ByteType.string:
                    line = `      ${title}:string;\n`;
                    break;
                case ExcelUtils_1.ByteType.byte:
                case ExcelUtils_1.ByteType.ubyte:
                case ExcelUtils_1.ByteType.short:
                case ExcelUtils_1.ByteType.ushort:
                case ExcelUtils_1.ByteType.int:
                case ExcelUtils_1.ByteType.uint:
                case ExcelUtils_1.ByteType.float:
                case ExcelUtils_1.ByteType.number:
                    line = `      ${title}:number;\n`;
                    break;
                case ExcelUtils_1.ByteType.arr_byte:
                case ExcelUtils_1.ByteType.arr_ubyte:
                case ExcelUtils_1.ByteType.arr_short:
                case ExcelUtils_1.ByteType.arr_ushort:
                case ExcelUtils_1.ByteType.arr_int:
                case ExcelUtils_1.ByteType.arr_uint:
                case ExcelUtils_1.ByteType.arr_float:
                case ExcelUtils_1.ByteType.arr_number:
                    line = `      ${title}:Array<number>;\n`;
                    break;
                case ExcelUtils_1.ByteType.arr_string:
                    line = `      ${title}:Array<string>;\n`;
                    break;
                default:
                    throw new Error("未知类型：" + trueType);
            }
            result += line;
        }
        result += `   }\n`;
        return result;
    }
    __readDir(folder, result) {
        let files = (0, fs_1.readdirSync)(folder);
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            const fullPath = path_1.default.join(folder, file);
            const fileInfo = (0, fs_1.statSync)(fullPath);
            if (fileInfo.isDirectory()) {
                this.__readDir(fullPath, result);
            }
            else if (fileInfo.isFile()) {
                const head = file.substring(0, 2);
                if (head === "~$") {
                    continue;
                }
                const extName = path_1.default.extname(file);
                if (extName === ".xlsx" || extName === ".xls") {
                    result.push(file);
                }
            }
        }
    }
    __getFileName(file, igExt) {
        let result;
        let pos = file.lastIndexOf("\\");
        result = file.substring(pos + 1);
        if (igExt) {
            result = result.replace(".xlsx", "");
            result = result.replace(".xls", "");
        }
        return result;
    }
}
exports.ExcelExport = ExcelExport;
