import { readFileSync } from 'fs-extra';
import { join } from 'path';
import packageJSON from '../../../package.json';
import { ExcelExport } from '../../utils/ExcelExport';

let excelExport:ExcelExport=new ExcelExport();

let localData: {
    excelFolder: string,
    scriptFolder: string,
    dataFolder: string,
    single: boolean
} | null;

let view: any;
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }
module.exports = Editor.Panel.define({
    listeners: {
        show() {

        },
        hide() {

        },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        excelFolderPath: "#excelFolderPath",
        scriptFolderPath: "#scriptFolderPath",
        dataFolderPath: "#dataFolderPath",
        excelFolderButton: "#excelFolderButton",
        scriptFolderButton: "#scriptFolderButton",
        dataFolderButton: "#dataFolderButton",
        singleMode: "#single",
        exportButton: "#exportButton"
    },
    methods: {
        hello() {
            console.log("Hello");
        },
    },
    ready() {
        view = this.$;
        //从配置中读取数据
        readLocalData((value) => {
            localData = value;
            // console.log(value);
            // console.log(localData);
            if (localData === null) {
                localData = {
                    excelFolder: "",
                    scriptFolder: "",
                    dataFolder: "",
                    single: true
                }
            }
            //数据填充
            this.$.excelFolderPath.setAttribute("value", localData.excelFolder);
            this.$.scriptFolderPath.setAttribute("value", localData.scriptFolder);
            this.$.dataFolderPath.setAttribute("value", localData.dataFolder);
            this.$.singleMode.setAttribute("value",localData.single);

            //事件监听
            this.$.excelFolderButton.addEventListener("confirm", excelFolderButtonClick);
            this.$.scriptFolderButton.addEventListener("confirm", scriptFolderButtonClick);
            this.$.dataFolderButton.addEventListener("confirm", dataFolderButtonClick);
            this.$.singleMode.addEventListener("change",singleModeChanged);
            this.$.exportButton.addEventListener("confirm", exportButtonClick);
        });
    },
    beforeClose() { },
    close() { },
});

//#region 本地设置
async function readLocalData(cb: (data: any) => void) {
    let json = await Editor.Profile.getConfig(packageJSON.name, "data", "local");
    let result=JSON.parse(json);
    // console.log("read local data:"+result);
    cb(result);
}

async function writeLocalData(data: any, cb?: () => void) {
    let json = JSON.stringify(data);
    // console.log("Save local data:"+json);
    await Editor.Profile.setConfig(packageJSON.name, "data", json, "local");
    if (cb) {
        cb();
    }
}
//#endregion


//配置表路径
function excelFolderButtonClick() {
    selectFolder("Select Excel Folder", localData!.excelFolder, (value: string) => {
        // console.log(value, view,"lalala");
        if(value){
            localData!.excelFolder = value;
            view.excelFolderPath.setAttribute("value", value);
            //保存到本地
            writeLocalData(localData);
        }
    })
}

function scriptFolderButtonClick() {
    selectFolder("Select Script Folder", localData!.scriptFolder, (value: string) => {
        if(value){
            localData!.scriptFolder = value;
            view.scriptFolderPath.setAttribute("value", value);
            //保存到本地
            writeLocalData(localData);
        }
    })
}

function dataFolderButtonClick() {
    selectFolder("Select data Folder", localData!.dataFolder, (value: string) => {
        if(value){
            localData!.dataFolder = value;
            view.dataFolderPath.setAttribute("value", value);
            //保存到本地
            writeLocalData(localData);
        }
    })
}

function singleModeChanged(){
    localData.single=view.singleMode.getAttribute("value");
    writeLocalData(localData);
}

//导出
function exportButtonClick() {
    if (view.exportButton.getAttribute("loading")) {
        return;
    }
    view.exportButton.setAttribute("loading", true);
    if (stringIsEmpty(localData!.excelFolder)) {
        console.error("Excel Folder is null");
        return;
    }
    if (stringIsEmpty(localData!.scriptFolder)) {
        console.error("Excel Folder is null");
        return;
    }
    if (stringIsEmpty(localData!.dataFolder)) {
        console.error("Excel Folder is null");
        return;
    }
    excelExport.export(localData.excelFolder,localData.dataFolder,localData.scriptFolder,0,1,2,3,localData.single,()=>{
        view.exportButton.removeAttribute("loading");
    });
}

//选择文件夹
function selectFolder(title: string, dir: string, cb: (string) => void): void {
    if (stringIsEmpty(dir)) {
        dir = __dirname;
    }
    Editor.Dialog.select({
        title: title,
        path: dir,
        type: "directory"
    }).then((result) => {
        // console.log(result);
        if (result.canceled) {
            cb(null);
            return;
        }
        if (result.filePaths == null || result.filePaths.length==0) {
            cb(null);
            return;
        }
        let folder = result.filePaths[0];
        cb(folder);
    }, (reason) => {
        cb(null);
    })
}

function stringIsEmpty(value: string): boolean {
    if (value == null || value == undefined || value.length == 0) {
        return true;
    }
    return false;
}