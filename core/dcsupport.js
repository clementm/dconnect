module.exports = function(socket) {
	var available_data = new Buffer(0);
	socket.dataTransfer = false;
	socket.on('data', function(data) {
		socket.pause();
	 	var data = Buffer.concat([available_data, data]);
		var end_ch = String('|').charCodeAt(0);
		while(data.length > 0) {
			if(socket.dataTransfer) {
				socket.emit('incoming-data', data);
				return;
			}
			var i = 0;
			while(i<data.length && data[i]!=end_ch) {
				i++;
			}
			if(i==data.length) {
				available_data = data;
				socket.resume();
				return;
			}
			cmd_str = data.toString('binary', 0, i);
			data = data.slice(i+1);
			var cmd_reg = /\$([a-z]*) (.*)$/i;
			if(cmd_reg.exec(cmd_str)) {
				var cmd = RegExp.$1;
				var args = RegExp.$2
				console.log(cmd+" : "+args)
				socket.emit(cmd, args);
			}
		}
		socket.resume();
		available_data = new Buffer(0);
	});
}
