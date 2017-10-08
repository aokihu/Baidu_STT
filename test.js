/**
 * Test file
 */

const BaiduSTT = require('./index.js');

const bdstt = new BaiduSTT({ apiKey: 'DAZTeCYAkuAQwtPvWDcBb9Ih', secretKey: 'adb28deb5103bde96bd9633dd437ff2d' });

bdstt.init();
bdstt.on('ready', () => {
  console.log('Start listen...');
  bdstt.listen();
});

bdstt.on('start', () => console.log('Please speak something, I\'m listening...'));
bdstt.on('listening', () => console.log('I\'m listen'));
bdstt.on('stop', () => console.log('Copy that'));
bdstt.on('upload', () => console.log('Uploading voice data...'));

bdstt.on('success', data => {
  console.log(data);
})

bdstt.on('fail',err=> {
  console.log(err)
})
