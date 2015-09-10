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

	var client = function(name, renew) {
		this.name = name;
		this.renew = renew;
		this.queries = {
			waiting: []
		};
	}

	client.prototype = {
		setSocket : function(socket) {
			var client = this;
			socket.on("ADCSND", function(args) {
				socket.dataTransfer = true;
				if(/file files.xml (\d+) (\d+)/.test(args)) {
					client.queries.current.expecting = RegExp.$2;
					client.queries.current.incomingData = new Buffer(0);
					client.queries.current.received = 0;
				} else if (/file TTH\/([^ ]*) (\d+) (\d+)/.test(args)) {
					client.queries.current.expecting = RegExp.$3;
					client.queries.current.incomingData = new Buffer(0);
					client.queries.current.received = 0;
				}
			})
			socket.on('incoming-data', function(data) {
				var query = client.queries.current;
				query.dataHandler(data, client.queries.current.received, client.queries.current.expecting);
				client.queries.current.received += data.length;
				if(client.queries.current.received == client.queries.current.expecting) {
					console.log('[p2p.js] Reçu!')
					client.queries.current.callback();
					delete client.queries.current;
					client.processNext();
					socket.dataTransfer = false;
				}
				socket.resume();
				return;
			})
			socket.on('Error', function(args) {
				console.log('[p2p.js] '+args);
				client.processNext();
			})
			socket.on('end', function() {
				delete socket;
			})
			this.socket = socket;

			this.processNext();
		},
		getFile : function(tth, size, dataHandler, callback) {
			var query = {
				dataHandler: dataHandler,
				callback: callback,
				tth: tth,
				size: size,
				type: 'tth'
			}
			this.queries.waiting.push(query);
			this.processNext();
		},
		getFileList : function(dataHandler, callback) {
			var query = {
				dataHandler: dataHandler,
				callback: callback,
				type: 'filelist'
			}
			this.queries.waiting.push(query);
			this.processNext();
		},
		processNext : function() {
			if(this.queries.current) return;
			else {
				if(!this.socket) this.renew()
				else {
					this.queries.current = this.queries.waiting.pop();
					if(!this.queries.current) return;
					if(this.queries.current.type == 'filelist') this.socket.write('$ADCGET file files.xml 0 -1|');
					if(this.queries.current.type == 'tth') this.socket.write('$ADCGET file TTH/'+this.queries.current.tth+' 0 '+this.queries.current.size+'|');
				}
			}
		}
	}



	var constructor = (function() {

		var local = {};
		local.clients = {};

		local.openClient = function(user) {
			if(local.clients[user]) return local.clients[user];
			else {
				local.clients[user] = new client(user, function(){
					server.core.openConnection(user, local.addr, local.port);
				})
				return local.clients[user];
			}
		}

		server.public_interface.getFile = function(user, tth, size, dataHandler, callback) {
			var client = local.openClient(user);
			client.getFile(tth, size, dataHandler, callback);
		}

		server.public_interface.getFileList = function(user, dataHandler, callback) {
			var client = local.openClient(user);
			client.getFileList(dataHandler, callback);
		}

		server.public_interface.listen = function(ip, port, identity) {
			local.port = port;
			local.addr = ip;
			local.identity = identity;

			local.server = net.createServer(function(c) {
				console.log('[p2p.js] Nouveau client !')
				addDCSupport(c);
				c.on("Lock", function(args) {
					var lock = unpack("EXTENDEDPROTOCOLABCABCABCABCABCABC");
					var key = lock;
					for (var i = 1; i < lock.length; i++)
						key[i] = lock[i]^lock[i-1];
					key[0] = lock[0] ^ lock[lock.length-1] ^ lock[lock.length-2] ^ 5;
					for (i = 0; i < lock.length; i++)
						key[i] = ((key[i]<<4) & 240) | ((key[i]>>4) & 15);
					c.write('$MyNick '+identity+'|$Lock EXTENDEDPROTOCOLABCABCABCABCABCABC|$Direction Download 35000|$Key '+pack(key)+'|');
				})
				c.on("Key", function(args) {
					var client = local.clients[c.user];
					client.setSocket(c);
					client.processNext();
				})
				c.on('MyNick', function(args) {
					c.user = args;
				});
			});

			local.server.listen(port, function() {
				console.log('[p2p.js] Prêt à télécharger');
				server.public_interface.emit('listening');
			})
		}

	})()

	return server;

}
