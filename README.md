# DGConfig
cocos creator3.x excel导出插件

#优点
1.数据导出到二进制文件中比其他类型的数据要小的多
2.导出时动态分析数据的类型以及数值范围，使用最合适的存储类型保证二进制文件最小化
3.导出d.ts接口，保证编码时有代码提示，运行时不增加代码体积(对小游戏体积很重要！！！)
4.excel表支持两种方式：
    a.单表导出--表示以文件名为表名且只导出文件中的第一张表
    b.多表导出--根据文件中的表明进行导出

#使用方式
1.将dgconfig复制到项目中的extensions文件夹下
2.面板=>DGConfig=>配置导出
3.选择配置表文件夹和导出代码及二进制文件路径后，点击导出搞定。

#运行时解析
~~~ ts

//这里用的ByteArray 在runtime文件夹中(copy来自我的老东家egret)
function parseSheet(buffer:ArrayBuffer):void{
    let byte: ByteArray = new ByteArray(buffer);
    //解析表头
    let len: number = byte.readUnsignedInt();
    let titleList: Array<string> = [];
    for (let index = 0; index < len; index++) {
        titleList.push(byte.readUTF());
    }
    //类型
    let typeList: Array<number> = [];
    len = byte.readUnsignedInt();
    for (let index = 0; index < len; index++) {
        typeList.push(byte.readByte());
    }
    len = byte.readUnsignedInt();
    let type: number;
    let title: string;
    let dataList = [];
    let data: any;
    for (let dataIndex = 0; dataIndex < len; dataIndex++) {
        data = {};
        for (let index = 0; index < typeList.length; index++) {
            title = titleList[index];
            type = typeList[index];
            switch (type) {
                case 0: //byte
                case 1://ubyte
                case 2: //short
                case 3: //ushort
                case 4: //int
                case 5: //uint
                case 6: //float
                case 7: //number
                    this.__readNumber(title, type, data, byte);
                    break;
                case 8: //string
                    data[title] = byte.readUTF();
                    break;
                case 9: //[byte]
                case 10://[ubyte]
                case 11: //[short]
                case 12: //[ushort]
                case 13: //[int]
                case 14: //[uint]
                case 15: //[float]
                case 16: //[number]
                case 17: //[string]
                    this.__readArray(title, type, data, byte);
                    break;
                default:
                    break;
            }
        }
        //你要怎么存储那就看需求了
        console.log(data);
    }
}

~~~