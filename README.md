# dconnect
Node.js module to interact with hubs implementing Direct Connect protocol

## Get started
The example code below gives the main commands to interact with a hub :
```
var dc = require('./global.js')();

// connect to a hub
dc.connect(hub_ip, hub_port, username);

dc.on('ready', function() { //  successfully logged into the hub
  // get the list of online users
	dc.getNickList(function(list) { 
		console.log(list);
		list.forEach(function(user) { 
		  // download user file list
			dc.getFileList(user, function(data){
				console.log(data.toString());
			}, function(){
				console.log('Terminé !');
			});
		})
		
		dc.listenForSearchResults('127.0.0.1', 58642) // setup UDP server listening for search results
		
		// search for a specific keyword
		dc.search('atom', 0, function(r) {
			console.log(r);
		})
	})
});

dc.on('filelist-request', function(user, socket) { // new file list request
	console.log(user+' wants to download your file list');
});

// listen for p2p connections
dc.listen('127.0.0.1', 65458, 'mdcr');
```

