var Promise = require('bluebird');
var SPI = require('spi');
var wpi = require('wiring-pi');

var gpioBaseAddr = 8;
var ppFrame = 25;
var ppInt = 22;
var spi = null;

return init()
    .then(function() {
        scheduleRead();

        function scheduleRead() {
            setTimeout(doRead, 25);
        }
        function doRead() {
            var bit = 0;
            return ppCmd(addr, 0x20, bit, 0, 1)
                .then(function(result) {
                    var value = result > 0 ? 1 : 0;
                    console.log('read| addr: %s, bit: %s, result: %s, value: %s', addr, bit, result, value);
                })
                .finally(scheduleRead)
                .done();
        }
    })
    .done();

function init() {
    wpi.setup('gpio');
    wpi.pinMode(ppInt, wpi.OUTPUT);
    wpi.pinMode(ppInt, wpi.PUD_UP);

    return new Promise(
        function(resolve, reject) {
            spi = new SPI.Spi('/dev/spidev0.0', {}, function(s) {
                s.open();
                resolve();
            });
        });
}

function ppCmd(addr, cmd, param1, param2, bytes2return) {
    var txbuf = new Buffer(4);
    var txoff = 0;
    txbuf.writeUInt8(addr + gpioBaseAddr, txoff++);
    txbuf.writeUInt8(cmd, txoff++);
    txbuf.writeUInt8(param1, txoff++);
    txbuf.writeUInt8(param2, txoff++);

    var rxbuf = new Buffer(bytes2return);
    wpi.digitalWrite(ppFrame, wpi.HIGH);
    return new Promise(
        function(resolve, reject) {
            spi.transfer(txbuf, rxbuf, function(device, buf) {
                resolve(buf);
            });
        })
        .finally(function() {
            wpi.digitalWrite(ppFrame, wpi.LOW);
        });
}
