
// ## Sketch 插件开发
// http://bang590.github.io/JSPatchConvertor/
// https://github.com/skpm/skpm/issues/106#issuecomment-355958851
// https://medium.com/sketch-app-sources/sketch-plugin-snippets-for-plugin-developers-e9e1d2ab6827
import { getResourcePath } from './utils'
import * as Compress from './compress'

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
// let PanelInfo = null
// export async function compressImg(url, props) {
//   console.log('compressImg')
//   return new Promise(
//     (res, rej) => {
//       PanelInfo = createPanel({
//         script: `
//         function(id) {
//           try {
//             let url = "${url}"
//             const { maxSize = 400, crop = 'contain' } = ${JSON.stringify(props)}
//             let img = new Image()
//             img.onload = () => {
//               try {
//                 let rate = maxSize / Math.max(img.width, img.height)
//                 let width = img.width * rate | 0
//                 let height = img.height * rate | 0
//                 if (crop === 'cover') {
//                   rate = maxSize / Math.min(img.width, img.height)
//                   width = Math.min(img.width * rate, maxSize)
//                   height = Math.min(img.height * rate, maxSize)
//                 }
//                 let canvas = document.createElement('canvas')
//                 canvas.width = width
//                 canvas.height = height
//                 let ctx = canvas.getContext('2d')
//                 ctx.drawImage(img, 0, 0, canvas.width, img.height / img.width * canvas.width)
//                 SMAction('submit', {
//                   id: id,
//                   error: null,
//                   data: canvas.toDataURL('image/jpeg', .7),
//                 })
//                 console.log('send')
//               } catch (error) {
//                 SMAction('submit', {
//                   id: id,
//                   error: error,
//                   data: url,
//                 })
//                 console.log('err', error.message)
//               }
//             }
//             img.onerror = err => {
//               SMAction('submit', {
//                   id: id,
//                   error: error.message,
//                 data: url,
//               })
//               console.log('err', err)
//             }
//             img.src = url
//           } catch (e) {
//               console.log('err', e)
//             SMAction('submit', {
//               id: id,
//               error: e.message,
//               data: url,
//             })
//           }
//         }
//         `,
//         callback: data => {
//           console.log('compressImg callback', data.id)
//           setTimeout(() => {
//             if (data.error) {
//               console.error('compressImg error', data.error)
//               res(url)
//             } else {
//               res(data.data)
//             }
//           }, 500)
//         }
//       })
//     }
//   )
// }

function _resizeNSImage(sourceImage, newSize) {
  if (!sourceImage.isValid()) {
    return null
  }

  var rep = NSBitmapImageRep.alloc().initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bytesPerRow_bitsPerPixel(null, newSize.width, newSize.height, 8, 4, true, false, NSCalibratedRGBColorSpace, 0, 0);
  rep.setSize(newSize);

  NSGraphicsContext.saveGraphicsState();
  NSGraphicsContext.setCurrentContext(NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));
  sourceImage.drawInRect_fromRect_operation_fraction(NSMakeRect(0, 0, newSize.width, newSize.height), NSZeroRect, NSCompositeCopy, 1.0);
  NSGraphicsContext.restoreGraphicsState();

  var newImage = NSImage.alloc().initWithSize(newSize);
  newImage.addRepresentation(rep);
  return newImage;
}
function compressImg(url, props) {
  try {
    var imageData = NSData.alloc().initWithBase64EncodedString_options(url.split(',', 2)[1], NSDataBase64DecodingIgnoreUnknownCharacters)

    var image = NSImage.alloc().initWithData(imageData);

    var bitmapRep = image.representations().objectAtIndex(0)
    var data = bitmapRep.representationUsingType_properties(NSJPEGFileType, null);

    var size = {
      width: bitmapRep.pixelsWide(),
      height: bitmapRep.pixelsHigh(),
    }
    props.maxSize = props.maxSize || 400
    var scale = Math.min(props.maxSize / size.width, props.maxSize / size.height)
    if (scale >= 1) return url
    var newSize = NSZeroSize
    newSize.width = (size.width * scale) | 0
    newSize.height = (size.height * scale) | 0


    var smallImage = _resizeNSImage(image, newSize)
    var smallBitmapRep = smallImage.representations().objectAtIndex(0);


    var dict = NSDictionary.dictionaryWithObject_forKey(NSNumber.numberWithFloat(0.5), NSImageCompressionFactor);
    var data5 = smallBitmapRep.representationUsingType_properties(NSJPEGFileType, dict);

    let newUrl = data5.base64EncodedStringWithOptions(NSDataBase64Encoding64CharacterLineLength)
    return `data:image/jpeg;base64,${newUrl}`
  } catch(e) {
    console.error('compressImg', e.message, e)
    return url
  }
}

async function getDbJson(layers) {
  let tempFolder = createTempFolderNamed()
  let DOM = require('sketch/dom')
  DOM.export(layers, {
    formats: 'svg',
    output: tempFolder,
    compact: true,
  })

  let svgList = []

  for (const l of layers) {
    let svg = readTextFromFile(tempFolder + '/' + l.name + '.svg')
    try {
      let start = Date.now()
      let res = await Compress.compressSVG(svg, compressImg, { sync: true, thumbnail: false })
      // let res = await Compress.compressSVG(svg, void 0, { sync: true, thumbnail: false })
      console.log(`compress:${l.name}`, (Date.now() - start) / 1000 + 's')
      svgList.push({
        svg: res.svg,
        name: l.name,
      })
    } catch(e) {
      console.error('compressSVG', e.message, e)
      console.log('compressSVG', e.message, e)
    }
  }

  // await Promise.all(
  //   layers.map(async l => {
  //   })
  // )
  svgList = svgList.filter(s => s.svg && s.svg !== 'null' && s.name)
  console.log('getDbJSon')
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
  return getResourcePath() + '/static-plugin'
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
  try {
    let dbjs = await getDbJson(layers)
    let tplPath = getPluginTemplatePath()
    var fileManager = NSFileManager.defaultManager()
    if (fileManager.fileExistsAtPath(savePath)) {
      removeFileOrFolder(savePath)
      console.log('removed', savePath)
    }
    copy(tplPath, savePath)
    writeTextToFile(dbjs, savePath + '/dist/db.js')
  } catch (e) {
    console.error('copy and write', e)
  }
}

let context = null

function getDocName() {
  var filePath = context.document.fileURL()? context.document.fileURL().path().stringByDeletingLastPathComponent(): "~";
  var fileName = context.document.displayName().stringByDeletingPathExtension();
  return fileName
}
export async function exportSelected(ctx) {
  try {
    context = ctx
    global.context = context

    var sketch = require('sketch')

    var document = sketch.getSelectedDocument()

    await exportLayers(getDocName(), document.selectedLayers.layers)
  } catch (error) {
    console.error(error);

  }
}

export async function exportPage(ctx) {
  context = ctx

  var sketch = require('sketch')

  var document = sketch.getSelectedDocument()
  var page = document.pages.filter(p => p.selected)[0]

  await exportLayers(getDocName(), page.layers)
}
