const child = require('child_process')
const fs = require('fs')
let exec = (cmd, ...args) => {
  console.log('Exec', cmd)
  child.execSync(cmd, ...args)
}


{
  function updateManifest(file) {
    let version = process.env.npm_package_version
    let manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
    manifest.version = version
    fs.writeFileSync(file, JSON.stringify(manifest, null, 2))
  }

  updateManifest('./src/manifest.json')
  updateManifest('./plugin.sketchplugin/Contents/Sketch/manifest.json')
}

{ // zip plugin
  exec(`mv ./plugin.sketchplugin ./inker8.sketchplugin`)
  try {
    exec(`rm inker8.sketchplugin.zip`)
  } catch (error) {

  }
  exec(`zip -r -X inker8.sketchplugin.zip ./inker8.sketchplugin`)
  exec(`mv ./inker8.sketchplugin ./plugin.sketchplugin`)
}

{ // update version and change log
  let appcast = fs.readFileSync('appcast.xml', 'utf8')

  let newItem = getItem(process.env.npm_package_version, process.env.npm_config_message)

  appcast = appcast.replace('</language>', `</language>\n${newItem}`)

  fs.writeFileSync('appcast.xml', appcast)

  function getItem(version, msg = '') {
    return `
    <item>
      <title>Version ${version}</title>
      <description>
        <![CDATA[
          <ul>
            ${msg.split('\n').map(line => `<li>${line}</li>`).join('\n')}
          </ul>
        ]]>
      </description>
      <enclosure url="https://github.com/inker8/sketch-plugin/raw/v${version}/inker8.sketchplugin.zip" sparkle:version="${version}" type="application/octet-stream" />
    </item>
    `
  }

}


exec('git add -A')
