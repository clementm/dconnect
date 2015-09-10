// Charge les différents modules DC
module.exports = function() {
	var client = require('./core/server.js').server();
	require('./core/p2p.js')(client);
	require('./core/share.js')(client);
	require('./core/search.js')(client)

	return client.public_interface;
}
