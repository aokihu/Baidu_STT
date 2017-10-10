Baidu Speech to Text
=====================

Latest Version: 1.0.35 [CHANGELOG](CHANGELOG.md)

Hi, this project is aim to speech to text by baidu ai service, now, it's good for chinese
you can also use it for English.

Before you install the module, you must install `sox` on Mac OS X or Windows, or `arecord` on Linux
and `alsa` on Linux

* Install 

you can use `npm`

```bash
npm install baidu_stt
```

or you can also use yarn

```bash
yarn add baidu_stt
```

* How to use

```javascript
const Baidu_STT = require('baidu-stt');

const bdstt = new Baidu_STT({
  apiKey: '......',
  secertKey: '......',
  language: 'zh',
  voiceRate: '8000',
  voiceType: 'wav',
  voicePath: './',
  continual: false,
  voiceReacod: false
})

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
});

bdstt.on('fail', err => console.log(err));
```

* API

**Baidu_STT(options)**

Return an Baidu_STT object instance

- **options** JSON containing command line options. Following are valid options:
  - apiKey *{string}* App api key
  - secretKey *{string}* App secret key
  - language *{stirng}* Choose your language, default is `'zh'`, you can choose `'en'` for `English`
  - continual *{string}* Continue to recoding after uploading voice data, if `true` it will be contunal
  - recordVoice *{boolean}* Whether save the voice on your disk, default is `false`
  - voiceRate *{string}* The rate of voice record, default is `'16000'`, you can set `'8000'` or any vaild vaule in `sox` OR `arecord`
  - voicePath *{string}* The path of saved voice, default is `./`
  - voiceType *{string}* The type of recod voice file, default is `wav`

**instance.init()**

Request token then emit `ready` event.

**instance.listen()**

Set instance listen for your voice.

* Event

**start**

Start record voice after you call `listen()`

**listening**

Recoding voice

**stop**

Stop recoding voice

**upload**

Upload voice date to service

**success**

Success for recogniting your voice content, and return the result
it is `array` type, because there may be many result. Normally the first result is better than other. I see ��

**fail**

When baidu can not recognting, it will return error message, it's `string` type.
