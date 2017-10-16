Baidu Speech to Text
=====================

Latest Version: 2.0.1 [CHANGELOG](CHANGELOG.md)

Hi, this project is aim to speech to text by baidu ai service, now, it's good for chinese
you can also use it for English.

you can send me email [aokihu@gmail.com](mailto:aokihu@gmail.com)

# BIG CHANGE 💣

Because I use `snowboy` to support hot word, so it is only running on Nodejs **6.0** now.

Before you install the module, you must install `sox` on Mac OS X or Windows, or `arecord` on Linux
and `alsa` on Linux

# Prepare

The project depends [mic](https://www.npmjs.com/package/mic), so you should install **sox**(Mac/Windows) OR **arecord**(Linux) before install this module.

you can install **arecord** under linux with command, **arecord** is apart of **alsa-utils**

```bash
$ sudo apt-get update
$ sudo apt-get upgrade
$ sudo apt-get install alsa-base alsa-utils
```

you can install **sox** on Mac with [**brew**](https://brew.sh/)

```bash
brew install sox
```

If you want have continual ablitilty, you should **USE Node.js 6.0 OR LTS Version product**, and you can find more detial information with [Snowboy](https://www.npmjs.com/package/snowboy)


# Install 

you can use `npm`

```bash
npm install baidu-stt
```

or you can also use yarn

```bash
yarn add baidu-stt
```

After install the module, you should make a `resources` folder and copy resources file to the folder
```bash
mkdir ./resources
cp ./node_modules/baidu-stt/resources/Alexa.pmdl ./resources
```


# How to use

```javascript
const Baidu_STT = require('baidu-stt');

const bdstt = new Baidu_STT({
  apiKey: '......',
  secertKey: '......',
  language:'zh',
  recordVoice:false,
  debug:false,
  continual:false,
  modelFile:'./resources/Alexa.pmdl',
  sensitivity:'0.5',
  gain:2.0,
  silenceDelay:2000,
  hotwords:"Alexa",
  voicePath:'./',
  voiceRate:'16000',
  voiceType:'wav'
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

**HOT WORD**

The default hot word is `Alexa`, for it is the most popular keywords on snowboy, you can train your personal hot word with [snowboy website](https://snowboy.kitt.ai/)

Becareful, personal model file extesion is `.pdml`, it is avalibe file type, you can directly use it.

# API

**Baidu_STT(options)**

Return an Baidu_STT object instance

- **options** JSON containing command line options. Following are valid options:
  - apiKey ***{string}*** App api key
  - secretKey ***{string}*** App secret key
  - language ***{stirng}*** Choose your language, default is `'zh'`, you can choose `'en'` for `English`
  - continual ***{string}*** Continue to recoding after uploading voice data, if `true` it will be contunal
  - modelFile ***{string}*** The hot word detected model file, default is ***./resources/Alexa.pmdl***, you should copy the model file to ***./resources*** folder
  - hotwords ***{string}*** The keyword for wakeing up, default is ***Alexa***
  - sensitivity ***{string}*** 
  - debug ***{string}*** Display capture data
  - recordVoice ***{boolean}*** Whether save the voice on your disk, default is `false`
  - voiceRate ***{string}*** The rate of voice record, default is `'16000'`, you can set `'8000'` or any vaild vaule in `sox` OR `arecord`
  - voicePath ***{string}*** The path of saved voice, default is `./`
  - voiceType ***{string}*** The type of recod voice file, default is `wav`

**instance.init()**

Request token then emit `ready` event;

**instance.listen()**

Set instance listen for your voice;

**instance.pause()**

When you set contiunal is `true`, you can use this fucntion pause record sound;

**instance.resume()**

When you set continual is `true` and paused, you can use it to resume;

**instance.stop()**

Stop recording.


# Event

**start**

Start record voice after you call `listen()`

**wakeup**

Be waked up by hot word

**sleep**

After upload voice data, it is going to sleep status

**listening**

Recoding voice

**stop**

Stop recoding voice

**upload**

Upload voice date to service

**success**

Success for recogniting your voice content, and return the result
it is `array` type, because there may be many result. Normally the first result is better than other. I see

**fail**

When baidu can not recognting, it will return error message, it's `string` type.
