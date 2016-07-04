# simple-pcsc

A simple wrapper around [santigimeno/node-pcsclite](https://github.com/santigimeno/node-pcsclite)

## Usage

```javascript
'use strict';

const PCSC = require('simple-pcsc'); 
const nfc = new PCSC();
 
nfc.on('reader', reader => {
 
	console.log(`NFC (${reader.reader.name}): device attached`);
 
	reader.on('card', card => {
		console.log(`NFC (${reader.reader.name}): card detected`, card.uid); 
	});
 
	reader.on('error', err => { 
		console.log(`NFC (${reader.reader.name}): an error occurred`, err); 
	});
 
	reader.on('end', () => { 
		console.log(`NFC (${reader.reader.name}): device removed`); 
	}); 
});
 
nfc.on('error', err => { 
	console.log('NFC: an error occurred', err); 
});
```
