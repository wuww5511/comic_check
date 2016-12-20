/**
 *  从目标目录读取所有ftl。对每一个ftl，读取它的css列表，构建css路径树。
 *  读取ftl中的css文件时，需要记录当前ftl文件的路径，css文件的路径
 */

var path = require('path'),
    fs = require('fs'),
    logger = require('log4js').getLogger();

function CssList () {
    this._init.apply(this, arguments);
}

CssList.prototype = {
    constructor: CssList,
    /**
     *  @param opts {Object}
     *      - vars {Object} css路径中的使用的变量
     *      - except {Array|String}
     */
    _init: function (opts) {
        this._maps = {};
        this._vars = opts.vars || {};
        this._except = {};
        if(opts.except) {
            for(var i = 0; i < opts.except.length; i++)
                this._except[opts.except[i]] = true;
        } 
    },
    
    _parsePath: function (pt) {
        return pt.replace(/\$\{(\S+)\}/g, function (str, $1) {
            if(this._vars[$1]) return this._vars[$1];
            return str;
        }.bind(this));
    },
    
    add: function (cssPath) {
        logger.info('Parsing "' + cssPath + '"');
        cssPath = this._parsePath(cssPath);
        var divide = "/";
        var arr = cssPath.split(divide);
        for(var i = 0; i < arr.length; i++) {
            if(this._except[arr[i]]) break;
            if(i == arr.length - 1) {
                if(!this._maps[arr[i]])
                    this._maps[arr[i]] = {};
                else {
                    logger.error('"' + cssPath + '" has been involved for many times. ');
                }
            }
            
            if(!this._maps[arr[i]])
                this._maps[arr[i]] = {};
            
            
        }
    }
};

function getConf (pt) {
    
    var realPath = path.resolve(process.cwd(), pt || "conf.json");
    var isExist = fs.existsSync(realPath);
    
    if(!isExist) {
        logger.error("Can not find the config file \"" + realPath + "\"");
        return null;
    }
    
    logger.info("Read config file \"" + realPath + "\"" );
    
    try {
        return JSON.parse(fs.readFileSync(realPath));
    }
    catch(e) {
        logger.error(e.message);
        return null;
    }
    
    
}

/**
 *  @param root {String} 目录的绝对路径
 *  @return {Array|String} 所有html文件的绝对路径
 */
function getHtmlList (root) {
    var res = [];
    var dirs = [root];
    logger.info("Get html files from \"" + root + "\"");
    var dir = dirs.pop();
    while(dir) {
        var files = fs.readdirSync(dir);
        
        for(var i = 0; i < files.length; i++) {
            var tmpPath = path.resolve(dir, files[i]);
            var stat = fs.existsSync(tmpPath)? fs.lstatSync(tmpPath) : null;
            
            if(!stat) continue;
            
            if(stat.isDirectory()) {
                dirs.push(tmpPath);
                continue;
            }
            
            if(stat.isFile() && /\S+\.ftl$/.test(files[i])) {
                res.push(tmpPath);
            }
        }
        
        dir = dirs.pop();
    }
    
    return res; 
}

/**
 *  @param htmlPaths {Array|String} 
 */
function getCssPathList (htmlPaths) {
    
    var res = [];
    for(var i = 0; i < htmlPaths.length; i++) {
        logger.info('Get CssPath from "' + htmlPaths[i] + '"');
        var html = fs.readFileSync(htmlPaths[i]);
        res = res.concat(getCssPathListFromHtml(html));
    }
    
    return res;
}

function getCssPathListFromHtml (html) {
    
    var res = [];
    var reg = /<link .*href=(?:(?:"(\S+)")|(?:'(\S+)'))/g;
    var arr = reg.exec(html);
    while(arr) {
        res.push(arr[1] || arr[2]);
        arr = reg.exec(html);
    }
    return res;
}

/**
 *  @param opts {Object}
 *      - conf {String} 配置文件目录
 */
function check (opts) {
    
    var levelMap = {
        0: "ERROR",
        1: "INFO"
    }
    
    logger.setLevel(levelMap[opts.log] || "ERROR");
    
    var conf = getConf(opts.conf);
    
    if(!conf) return;
    
    var cssList = new CssList({
        vars: conf.vars,
        except: conf.except
    });
    
    var list = getHtmlList(path.resolve(process.cwd(), conf.webRoot || ""));
    
    var cssPathList = getCssPathList(list);
    
    
    for(var i = 0; i < cssPathList.length; i++) {
        cssList.add(cssPathList[i]);
    }
    
}

exports.check = check;

