
global.window = global.window || {}
global.regeneratorRuntime = require('regenerator-runtime')
global.setTimeout = global.setTimeout || (fn=> fn())


export function getResourcePath() {
  return global.context.scriptPath.split(/\/|\\/g).slice(0, -2).concat('Resources').join('/')
}
