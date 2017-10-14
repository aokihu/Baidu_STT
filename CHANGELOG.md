CHANGE LOG
===========

* Version 2.0.1

Just update README

* Version 2.0.0

**BREAK CHANGE**

Now, you just only use node.js 6.0, because IMPORT `snowboy` module, it support hot word to wake up, so you can continual speak, without restart.

You can say `Alexa` to wake it up, OR you also train your custom voice command on [Snowboy Site](https://snowboy.kitt.ai/)

* Version 1.0.4

Add new construct param `continual`, if it is `true` it will continual recording, if is `false` it will stop after upload voice data

* Version 1.0.3

Add new construct param `voiceRate`, you can change the rate by yourself, default is `'8000'`, ***ATTATION*** the param's type is `***STRING***`

* Version 1.0.1

Add new event `fail`, when baidu service can not recongniting , it will return error message , type is `string`

* Version 1.0.0

***Publish***
