'use strict';

const pcsclite = require('pcsclite');
const EventEmitter = require('events');
const Reader = require('./Reader');

// const pcsc = pcsclite();

class NFC extends EventEmitter {

	pcsc = null;
	logger = null;

	constructor(logger) {
		super();

		this.pcsc = pcsclite();

		if (logger) {
			this.logger = logger;
		}
		else {
			this.logger = {
				log: () => { },
				info: () => { },
				warn: () => { },
				error: () => { }
			};
		}

		this.pcsc.on('reader', (reader) => {
			this.logger.info('New reader detected', reader.name);
			const device = new Reader(reader, this.logger);
			this.emit('reader', device);

		});

		this.pcsc.on('error', (err) => {
			this.logger.info('PCSC error', err.message);
			this.emit('error', err);
		});
	}

	close() {
		this.pcsc.close();
	}
}
module.exports = NFC;