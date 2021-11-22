'use strict';

const EventEmitter = require('events');
class Reader extends EventEmitter {

	reader = null;
	logger = null;

	constructor(reader, logger) {
		super();

		this.reader = reader;

		if (logger) this.logger = logger;
		else {
			this.logger = {
				log: () => { },
				info: () => { },
				warn: () => { },
				error: () => { }
			};
		}

		this.reader.on('error', (err) => {
			this.logger.warn(` > Error [${this.reader.name}] : ${err.message}`);
			this.emit('error', err);
		});

		this.reader.on('status', (status) => {
			this.logger.log(`* Status [${this.reader.name}] : ${status}`);
			// We should check what has been changed
			const changes = this.reader.state ^ status.state;
			this.logger.info(`# Changes [${this.reader.name}] : ${changes}`);

			if (changes) {  // If somethings changed?

				if ((changes & this.reader.SCARD_STATE_EMPTY) && (status.state & this.reader.SCARD_STATE_EMPTY)) {
					this.logger.info('- SCARD_STATE_EMPTY - There is no Card in the Reader');

                    // Let's disconnect from the Reader
					reader.disconnect(reader.SCARD_RESET_CARD, (err) => {
						if (err) this.logger.warn(err);
						else this.logger.info('# SCardDisconnect - Terminated connection to the Reader made through SCardConnect');
					});
				}
                else if ((changes & this.reader.SCARD_STATE_PRESENT) && (status.state & this.reader.SCARD_STATE_PRESENT)) {					
					this.logger.info('+ SCARD_STATE_PRESENT - There is a Card in the Reader');
                    
                    // Let's connect to the Reader
					this.reader.connect({ share_mode: this.reader.SCARD_SHARE_SHARED }, (err, protocol) => {

                        // Maybe Reader is used by another process or/and blocked
                        if(err) this.emitOnError(err, false);
						else {
							this.logger.info(`# SCardConnect - Established connection to the Reader through Protocol = ${protocol}`);
							this.getTagUid(protocol);
						}
					});
				}
			}
		});

		this.reader.on('end', () => {
			this.logger.info(`* Reader [${this.reader.name} removed`);
			this.emit('end');
		});
	}

	static reverseBuffer(src) {
		let buffer = Buffer.alloc(src.length);
		for (var i = 0, j = src.length - 1; i <= j; ++i, --j) {
			buffer[i] = src[j];
			buffer[j] = src[i];
		}
		return buffer;
	}

    emitOnError(error, emitError = false) {
        let err = error.toString();
        
        if(err.indexOf('0x80100017') != -1) {
            this.logger.warn(' > 0x80100017 - The specified reader is not currently available for use.');
            this.emit('busy', err);
        }
        else if(err.indexOf('0x80100069') != -1) {
            this.logger.warn(' > 0x80100069 - The smart card has been removed, so that further communication is not possible.');            
            this.emit('removed', err);
        }
        else this.logger.warn(err);
        if(emitError) this.emit('error', err);
    }

	getTagUid(protocol) {

		let packet = Buffer.from([
			0xFF, // Class
			0xCA, // Ins
			0x00, // P1: Get current card UID
			0x00, // P2
			0x04  // Le
		]);

		this.reader.transmit(packet, 40, protocol, (err, data) => {

            // TODO: If SmartCard ejected too fast, we should inform about that via EventEmitter instead of `busy` event
			if (err) return this.emitOnError(err, false);
			else {

				this.logger.info('* Data received', data);
				
                // TODO: Bad bad bad ... should refactor this sh*t
                if(typeof(data) == undefined) {
                    this.emit('error', 'Invalid data.');
                    return;
                } else if(data.length !== 6) {
                    this.emit('error', 'Invalid data.');
                    return;
                }				

				// Example: <Buffer 3f 82 55 b8 90 00>
				// 3f 82 55 b8 - UID | 90 00 - returned code
				let error = data.readUInt16BE(4);
				if (error !== 0x9000) {	// Decimal = 36864
					this.emit('error', 'Error reading UID.');
					return;
				}

				let uid = data.slice(0, 4).toString('hex').toUpperCase();   // HEX capitalized String
                /* TODO: Add option for getting Decimal UID
				    let uidReverse = Reader.reverseBuffer(data.slice(0, 4)).toString('hex');
				    let uid = data.readInt16BE(0, 4);
                */
                this.logger.info('UID: ', uid);
				this.emit('card', {
					uid: uid
				});
			}
		});
	}
	close() { this.reader.close(); }
}
module.exports = Reader;