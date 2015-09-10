var net = require('net');
var addDCSupport = require('./dcsupport.js');

function pack(bytes) {
    var chars = [];
    for(var i = 0, n = bytes.length; i < n;) {
        chars.push(((bytes[i++] & 0xff) << 8) | (bytes[i++] & 0xff));
    }
    return String.fromCharCode.apply(null, bytes);
}

function unpack(str) {
    var bytes = [];
    for(var i = 0, n = str.length; i < n; i++) {
        var char = str.charCodeAt(i);
        bytes.push(char);
    }
    return bytes;
}

module.exports = function(server) {

	var constructor = (function() {

		var local = {};
		local.clients = {};

		server.core.on('connection-request', function(user, ip, port) {
			console.log("Connexion vers "+user)
			var client = net.connect({port: port, host: ip}, function() { //'connect' listener
				client.write('$MyNick '+server.public_interface.userName()+'|$Lock EXTENDEDPROTOCOLABCABCABCABCABCABC Pk=POPCORN|');
				client.write('Réponse !');
			});
			addDCSupport(client);
			client.on("Lock", function(args) {
				var lock = unpack("EXTENDEDPROTOCOLABCABCABCABCABCABC");
				var key = lock;
				for (var i = 1; i < lock.length; i++)
					key[i] = lock[i]^lock[i-1];
				key[0] = lock[0] ^ lock[lock.length-1] ^ lock[lock.length-2] ^ 5;
				for (i = 0; i < lock.length; i++)
					key[i] = ((key[i]<<4) & 240) | ((key[i]>>4) & 15);
				client.write('$Supports MiniSlots ADCGet TTHF |$Direction Download 0|$Key '+pack(key)+'|');
			});
			client.on("MyNick", function(args) {
				client.user = args;
			})
			client.on('ADCGET', function(args) {
				console.log(args);
				if(/file files.xml (\d+) (-?\d+)/.test(args)) {
					server.public_interface.emit('filelist-request', client.user, function(stream, size) {

					});
				} else if (/file TTH\/([^ ]*) (\d+) (-?\d+)/.test(args)) {
					var tth = RegExp.$1;
					var start = RegExp.$2;
					var end = RegExp.$3;
					server.public_interface.emit('file-request', tth, start, end);
				}
			})
		})

	})()

	return server;

}
