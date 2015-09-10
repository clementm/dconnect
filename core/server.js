var net = require('net');
var events = require('events');
var addDCSupport = require('./dcsupport.js');

module.exports.addDCSupport = addDCSupport;

module.exports.server = function() {

	// Contient les méthodes publiques du client
	// - connect : initialise la connexion avec le serveur dc
	// - getNickList : récupère la liste des utilisateurs connectés
	// - getUserInfo : récupère les informations d'un utilisateur spécifique
	// - disconnect : termine la connexion avec le serveur
	var clientdc = {};

	// Contient les méthodes destinées au fonctionement interne du client, utilisables par les
	// modules (dpour le partage, etc...)
	// - sendCommand : envoie une commande au serveur avec la structure DC
	// - openConnection : demande à un utilisateur de se connecter aux paramètres spécifiés
	var core = {};

	// Contient les variables internes au fonctionnement de la communication avec le serveur,
	// invisible pour les modules additionnels
	var local = {};

	local.hub = {};
	local.queries = {};
	local.ready = false;

	local.epublic = new events.EventEmitter();
	clientdc.on = local.epublic.on;
	clientdc.emit = local.epublic.emit;

	local.eprivate = new events.EventEmitter();
	core.on = local.eprivate.on;
	core.emit = local.eprivate.emit;


	core.sendCommand = function(command, args) {
		if(!local.hubSocket) return false;
		local.hubSocket.write("$"+command+(args?(" "+args+"|"):"|"), "binary");
	}

	core.openConnection = function(user, localIp, localPort) {
		core.sendCommand("ConnectToMe", user+" "+localIp+":"+localPort);
	}


	clientdc.connect = function(hubAddr, hubPort, identity) {
		local.hub.addr = hubAddr;
		local.hub.port = hubPort;
		local.identity = identity;
		local.hubSocket = net.connect({port: local.hub.port, host: local.hub.addr}, function() { //'connect' listener
			console.log('[server.js] Connecté au serveur, initialisation de la communication...');
			addDCSupport(local.hubSocket);
		})
		local.hubSocket.on("HubName", function(name) {
			local.hub.identity = name;
			core.sendCommand("ValidateNick", local.identity);
		})
		local.hubSocket.on("Hello", function(name) {
			core.sendCommand("MyINFO", "$ALL "+name+" $ $LAN(T1)$ $0$")
		})
		local.hubSocket.on("MyINFO", function(args) {
			if(!/\$ALL ([^ |]+) ([^|$]*)\$ \$([^|$]*)\$([^|$]*)\$(\d*)\$/.test(args)) return;
			var user = RegExp.$1;
			if(user == local.identity && !local.ready) {
				clientdc.emit("ready");
				local.ready = true;
			} else {
				clientdc.emit("user-info", RegExp.$1, RegExp.$2, RegExp.$3, RegExp.$4, RegExp.$5);
			}
		})
		local.hubSocket.on("ConnectToMe", function(args) {
			if(/([^ |]+) (\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}):(\d+)/.test(args)) {
				var user = RegExp.$1;
				var ip = RegExp.$2;
				var port = parseInt(RegExp.$3);
				core.emit('connection-request', user, ip, port);
			}
		})
		local.hubSocket.on("NickList", function(args) {
			var reg = /([^\$]*)\$\$/g;
			var users = [];
			while(reg.exec(args)) users.push(RegExp.$1);
			while(local.queries.nicklist && local.queries.nicklist.length > 0) local.queries.nicklist.pop()(users);
			delete local.queries.nicklist;
		})
		local.hubSocket.on("Search", function(args) {
			if(!/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+) (F|T)\?(F|T)\?(\d+)\?(\d+)\?(.*)/i.test(args)) return;
			var ip = RegExp.$1;
			var port = parseInt(RegExp.$2);
			var terms = parseInt(RegExp.$7);
			core.emit("search", ip, port, terms);
		})
		local.hubSocket.on("end", function() {
			console.log('[server.js] Déconnecté !')
			local.ready = false;
			clientdc.emit('disconnected');
		})
	}

	clientdc.userName = function() {
		return local.identity;
	}

	clientdc.getNickList = function(callback) {
		if(local.queries.nicklist) local.queries.nicklist.push(callback);
		else {
			local.queries.nicklist = [callback];
			core.sendCommand("GetNickList");
		}
	}

	clientdc.getUserInfo = function(user) {
		core.sendCommand("GetINFO", user+" "+local.identity);
	}

	clientdc.disconnect = function() {

	}

	return {
		core: core,
		public_interface: clientdc
	}

};
