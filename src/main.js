
// ## Sketch 插件开发
// http://bang590.github.io/JSPatchConvertor/
// https://github.com/skpm/skpm/issues/106#issuecomment-355958851
// https://medium.com/sketch-app-sources/sketch-plugin-snippets-for-plugin-developers-e9e1d2ab6827
global.regeneratorRuntime = require('regenerator-runtime')
global.window = global.window || {}
global.setTimeout = global.setTimeout || (fn=> fn())
var Compress = require('./compress')

var writeTextToFile = function(text, filePath) {
  // var t = [NSString stringWithFormat:@"%@", text],
  var t = NSString.stringWithFormat("%@", text)
  var f = NSString.stringWithFormat('%@', filePath)
  // f = [NSString stringWithFormat:@"%@", filePath];
  return t.writeToFile_atomically_encoding_error(f, true, NSUTF8StringEncoding, null)
  // return [t writeToFile:f atomically:true encoding:NSUTF8StringEncoding error:nil];
}

var readTextFromFile = function(filePath) {
  console.log('filePath', filePath)
  return String(NSString.stringWithContentsOfFile_encoding_error(filePath, NSUTF8StringEncoding, null))
}

// var jsonFromFile = function(filePath, mutable) {
//   var data = [NSData dataWithContentsOfFile:filePath];
// var options = mutable == true ? NSJSONReadingMutableContainers : 0
// return [NSJSONSerialization JSONObjectWithData:data options:options error:nil];
// }

// var saveJsonToFile = function(jsonObj, filePath) {
//   writeTextToFile(stringify(jsonObj), filePath);
// }

// var stringify = function(obj, prettyPrinted) {
//   var prettySetting = prettyPrinted ? NSJSONWritingPrettyPrinted : 0,
//   jsonData = [NSJSONSerialization dataWithJSONObject:obj options:prettySetting error:nil];
//   return [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
// }

var createTempFolderNamed = function(name) {
  var tempPath = getTempFolderPath(name);
  createFolderAtPath(tempPath);
  return tempPath;
}

var getTempFolderPath = function(withName) {
  let cachesURL = NSTemporaryDirectory()
  withName = (typeof withName !== 'undefined') ? withName : (Date.now() / 1000)
  let name = cachesURL + '/' + withName
  console.log('temp', name);
  return name
}

var createFolderAtPath = function(pathString) {
  var fileManager = NSFileManager.defaultManager()
  if(fileManager.fileExistsAtPath(pathString)) return true;
  return fileManager.createDirectoryAtPath_withIntermediateDirectories_attributes_error(pathString, true, null, null);
}

var removeFileOrFolder = function(filePath) {
  NSFileManager.defaultManager().removeItemAtPath_error(filePath, null)
}

// function readFile(path) {
//   // var path = "/Users/z/Projects/Node/Hydux/inker8/packages/client/src/test/fixtures/xd/shadow.svg"
//   var str = NSString.stringWithContentsOfFile_encoding_error(path, NSUTF8StringEncoding, null);
//   return str
// }

async function getDbJson(layers) {
  let tempFolder = createTempFolderNamed()
  let DOM = require('sketch/dom')
  DOM.export(layers, {
    formats: 'svg',
    output: tempFolder,
    compact: true,
  })

  let svgList = await Promise.all(
    layers.map(async l => {
      let svg = readTextFromFile(tempFolder + '/' + l.name + '.svg')
      try {
        let start = Date.now()
        let res = await Compress.compressSVG(svg)
        console.log(`compress:${l.name}`, (Date.now() - start) / 1000 + 's')
        return {
          svg: res.svg,
          name: l.name,
        }
      } catch(e) {
        console.error('compressSVG', e.message, e)
        console.log('compressSVG', e.message, e)
      }
    })
  )
  svgList = svgList.filter(s => s.svg && s.svg !== 'null' && s.name)
  return `
    window['__ARTBOARDS__'] = ${JSON.stringify(svgList)}
  `
}

function getSavePath(name) {
  var _ = f => f
  var savePanel = NSSavePanel.savePanel();

  savePanel.setTitle(_("Export spec"));
  savePanel.setNameFieldLabel(_("Export to:"));
  savePanel.setPrompt(_("Export"));
  savePanel.setCanCreateDirectories(true);
  savePanel.setShowsTagField(false);
  // savePanel.setAllowedFileTypes(NSArray.arrayWithObject("json"));
  savePanel.setAllowsOtherFileTypes(false);
  savePanel.setNameFieldStringValue(name);

  if (savePanel.runModal() != NSOKButton) {
    return false;
  }
  var savePath = savePanel.URL().path().stringByDeletingLastPathComponent(),
    fileName = savePanel.URL().path().lastPathComponent();
  savePath = savePath + '/' + fileName.replace(/\s/g, '_')
  // savePath = savePath[0] === '/' ? savePath : '/' + savePath
  return savePath
}

function getPluginTemplatePath() {
  return context.scriptPath.split(/\/|\\/g).slice(0, -2).concat('Resources/static-plugin').join('/')
}

function copy(src, dist) {
  console.log('cp', src, dist)
  var fileManager = NSFileManager.defaultManager()
  fileManager.copyItemAtPath_toPath_error(src, dist, null)
}

async function exportLayers(name, layers) {
  let savePath = getSavePath(name)
  if (!savePath) {
    return
  }
  let dbjs = await getDbJson(layers)
  let tplPath = getPluginTemplatePath()
  var fileManager = NSFileManager.defaultManager()
  if (fileManager.fileExistsAtPath(savePath)) {
    removeFileOrFolder(savePath)
    console.log('removed', savePath)
  }
  copy(tplPath, savePath)
  writeTextToFile(dbjs, savePath + '/dist/db.js')
}

let context = null

function getDocName() {
  var filePath = context.document.fileURL()? context.document.fileURL().path().stringByDeletingLastPathComponent(): "~";
  var fileName = context.document.displayName().stringByDeletingPathExtension();
  return fileName
}
export async function exportSelected(ctx) {
    context = ctx

    var sketch = require('sketch')

    var document = sketch.getSelectedDocument()

    await exportLayers(getDocName(), document.selectedLayers.layers)
}

export async function exportPage(ctx) {
  context = ctx

  var sketch = require('sketch')

  var document = sketch.getSelectedDocument()
  var page = document.pages.filter(p => p.selected)[0]

  await exportLayers(getDocName(), page.layers)
}
