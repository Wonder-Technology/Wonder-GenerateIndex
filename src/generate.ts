import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs-extra";
import {isExported} from "./JudgeUtils";
import {parseExportNode} from "./ParseUtils";

var glob = require("glob");

interface IFileData {
    exportData: IExportData;
    exportNodeTable: IExportTypeTable;
    exportFilePathTable: IExportFilePathTable;
}

interface IFileDataMap {
    [filePath: string]: IFileData
}

interface IExportData {
    nameArr: Array<string>;
}

interface IExportTypeTable {
    [exportTargetName: string]: ts.Node
}

interface IExportDataMap {
    [exportTargetName: string]: Array<string>
}


interface IExportFilePathTable {
    [exportTargetName: string]: string;
}


var fileDataMap: IFileDataMap = <IFileDataMap>{};

var exportDataMap: IExportDataMap = <IExportDataMap>{};

var sourceFileMap = {};


class ArrayUtils {
    public static hasRepeatItems(arr: Array<any>) {
        var resultArr = [],
            self = this;

        for (let ele of arr) {
            if (self.contain(resultArr, ele)) {
                return true;
            }

            resultArr.push(ele);
        }

        return false;
    }

    public static removeRepeatItems(arr: Array<any>) {
        var resultArr = [],
            self = this;

        arr.forEach(function (ele) {
            if (self.contain(resultArr, ele)) {
                return;
            }

            resultArr.push(ele);
        });

        return resultArr;
    }

    public static contain(arr: Array<any>, ele: any) {
        for (let i = 0, len = arr.length; i < len; i++) {
            let value = arr[i];

            if (ele === value || (value.contain && value.contain(ele))) {
                return true;
            }
        }

        return false;
    };

}


function _getAllSourceFiles(fileAbsolutePaths, options: ts.CompilerOptions) {
    fileAbsolutePaths.forEach((filePath: string) => {
        let sourceFile = ts.createSourceFile(filePath, fs.readFileSync(filePath).toString(), options.target);

        sourceFileMap[filePath] = sourceFile;
    });
}

function _visitExportData(node: ts.Node, exportData: Array<string>, exportNodeTable: IExportTypeTable, filePath) {
    if (!_isExported(node)) {
        return;
    }

    parseExportNode(node, (name: string) => {
        exportData.push(name);
        exportNodeTable[name] = node;

        _append(exportDataMap, name, filePath);
    });
}

function _append(obj, key, value) {
    if (_isArray(obj[key])) {
        obj[key].push(value);
    }
    else {
        obj[key] = [value];
    }
}

function _isArray(arr: any) {
    return Object.prototype.toString.call(arr) === "[object Array]";
}


function _getRelativePath(from, to, isDir: boolean = false) {
    var relativePath = path.relative(isDir ? from : path.dirname(from), to);

    if (relativePath[0] !== ".") {
        relativePath = `./${relativePath}`;
    }

    return relativePath;
}

function _generateIndexFile(fileDataMap: IFileDataMap, rootDir, destDir) {
    var indexFilePath = path.join(destDir, "index.ts");

    // if (fs.existsSync(indexFilePath)) {
    //     throw new Error(`already exist index file:${indexFilePath}, can't generate it!`);
    // }

    let content = "";

    for (let filePath in fileDataMap) {
        if (fileDataMap.hasOwnProperty(filePath)) {
            let fileData: IFileData = fileDataMap[filePath],
                exportNodeTable = fileData.exportNodeTable,
                nameArr = fileData.exportData.nameArr.filter((name: string) => {
                    return exportNodeTable[name].kind !== ts.SyntaxKind.TypeAliasDeclaration;
                });

            if (nameArr.length === 0) {
                continue;
            }

            content += `export {${nameArr.join(',')}} from "${_getRelativePath(rootDir, filePath, true).replace(".ts", "")}";\n`;
        }
    }

    fs.mkdirsSync(path.dirname(indexFilePath));
    fs.writeFileSync(indexFilePath, content);
}

function _isExported(node: ts.Node): boolean {
    return isExported(node);
}

export function generate(globCwd:string, rootDir: string, sourceFileGlobArr: Array<string>, destDir: string, options: ts.CompilerOptions, configOptions?:ConfigOption): void {
    for (let filePath of sourceFileGlobArr) {
        let fileAbsolutePaths = glob.sync(path.join(rootDir, filePath), {
                cwd: globCwd
            });

        if(!!configOptions){
            if(!!configOptions.exclude){
                fileAbsolutePaths = fileAbsolutePaths.filter((path:string) => {
                    for(let excludePath of configOptions.exclude){
                        if(path.indexOf(excludePath) > -1){
                            return false;
                        }
                    }

                    return true;
                })
            }
        }

        _getAllSourceFiles(fileAbsolutePaths, options);

        for (let filePath in sourceFileMap) {
            if (sourceFileMap.hasOwnProperty(filePath)) {
                let sourceFile = sourceFileMap[filePath];

                let fileData: IFileData = <IFileData>{};

                let exportData: Array<string> = [];
                let exportNodeTable: IExportTypeTable = {};

                ts.forEachChild(sourceFile, (node: ts.Node) => {
                    _visitExportData(node, exportData, exportNodeTable, filePath)
                });

                fileData.exportData = {
                    nameArr: ArrayUtils.removeRepeatItems(exportData)
                };

                fileData.exportNodeTable = exportNodeTable;

                fileDataMap[filePath] = fileData;
            }
        }
    }

    _generateIndexFile(fileDataMap, rootDir, destDir);

    return;
}

type ConfigOption = {
    exclude?: Array<string>;
}
