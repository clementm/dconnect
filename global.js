// Charge les différents modules DC
module.exports = function() {
	var client = require('./server.js').server();
	require('./p2p.js')(client);
	require('./share.js')(client);
	require('./search.js')(client)

	return client.public_interface;
}