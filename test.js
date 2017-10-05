/**
 * Test file
 */

const BaiduSTT = require('./index.js');
const bdstt = new BaiduSTT({'apiKey':"DAZTeCYAkuAQwtPvWDcBb9Ih",'secretKey':"adb28deb5103bde96bd9633dd437ff2d"});

bdstt.init();
bdstt.on('ready', () => {
  bdstt.listen();
})
