var net = require('net');
var dgram = require('dgram');


module.exports = function(server) {

	var constructor = (function() {

		var local = {};

		local.searchServer = dgram.createSocket('udp4');
		local.searchServer.on('listening', function () {
		    var address = local.searchServer.address();
		    console.log('UDP Server listening on ' + address.address + ":" + address.port);
		});

		local.searchServer.on('message', function (message, remote) {
		    var prev = 0;
		    var parts = [];
		    for(var i=0; i<message.length; i++) {
		    	if(message[i]==5) {
		    		if(prev == 0) {
		    		}
		    		parts.push(message.slice(prev, i));
		    		prev = i+1;
		    	}
		    }
		    parts.push(message.slice(prev));
		    console.log(parts);
		    var result = {};
		    if(parts.length<3) {
		    	console.log('directory')
		    	result.type = 'directory';
		    	var part1 = parts[0].slice(4);
		    	var part1bis = new Buffer(0);
		    	for(var i=0; i<part1.length; i++) {
		    		if(part1[i]==32) {
		    			result.user = part1.toString('ascii', 0, i);
		    			part1bis = part1.slice(i+1)
		    			break;
		    		}
		    	}
		    	if(/^(.*) (\d+\/\d+)$/.test(part1bis)) {
		    		result.path = RegExp.$1;
		    		result.slots = RegExp.$2
		    		local.query.callback(result);
		    	}
		    }
		    else {
				console.log('file')
				result.type = 'file';
				var part1 = parts[0].slice(4);
		    	var part1bis = new Buffer(0);
		    	for(var i=0; i<part1.length; i++) {
		    		if(part1[i]==32) {
		    			result.user = part1.toString('ascii', 0, i);
		    			result.path = part1.slice(i+1).toString('ascii')
		    			break;
		    		}
		    	}
		    	if(/^(\d+) (\d+\/\d+)$/.test(parts[1])) {
		    		result.size = parseInt(RegExp.$1);
		    		result.slots = RegExp.$2;
		    		local.query.callback(result);
		    	}

		    }

		});


		server.core.on('search', function(ip, port, search_terms) {
			var client = dgram.createSocket('udp4');
			server.public_interface.emit('search', search_terms, function(result) {
				client.send(result.toString('binary'), 0, result.toString('binary').length, port, ip, function(err, bytes) {
				    if (err) throw err;
				    client.close();
				});	
			})
		})


		server.public_interface.listenForSearchResults = function(ip, search_port) {
			local.ip = ip;
			local.search_port = search_port;
			local.searchServer.bind(search_port);
		}

		server.public_interface.search = function(terms, type, callback) {
			local.query = {
				terms: terms,
				callback: callback
			}
			server.core.sendCommand("Search", local.ip+':'+local.search_port+' F?T?500000?1?'+terms.replace('/ /g', '$')+'$')
		}

	})()

	return server;

}