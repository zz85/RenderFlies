/*
 * by Joshua Koo
 * Released to public domain.
 * Please share if you find this useful!
 *
 * This uses express and formidable.
 * Run npm install express formidable if you have not installed them
 */
var app = require('express').createServer();
var formidable = require('formidable');
var fs = require('fs');
var util = require('util'),
	spawn = require('child_process').spawn;

app.configure(function(){
	// Sets the root directory
    var dir =  __dirname + '/..';
    console.log(dir);
    app.set('views', dir);
    app.set('view options', {layout: false});
    app.set("view engine", "html");
 });
 
app.get('/', function(req, res){
  res.sendfile("canvasrender01.html");
});

// we send the file, if it match the url
app.get(/\/(.*)/, function(req, res){
    res.sendfile(req.params[0]);
});

// Here we spawn a new encoding process
app.post('/encode', function(req, res, next){
	// time ffmpeg -qscale 5 -r 30 -b 4Mb -i test%d.png movie-500ffjpg.mp4
	console.log("we got an encode request!");
	var timestamp = new Date().getTime();
	var filename = "movie-"+timestamp + ".mp4";
	var args = "-qscale 2 -r 30 -b 4Mb -i fireflies-bg.mp3 -i tmp/test%d.png tmp/renders/"+filename;

	var startTime = new Date();
	var ffmpeg  = spawn('ffmpeg', args.split(' '));

	var stdout = "";
	var stderr = "";

	ffmpeg.stdout.on('data', function (data) {
		stdout+= data;
		//console.log('stdout: ' + data);
	});

	ffmpeg.stderr.on('data', function (data) {
		stderr += data;;
		//console.log('stderr: ' + data);
	});

	ffmpeg.on('exit', function (code) {
		//console.log('child process exited with code ' + code);
		// Create a return json object
		var ret = {
		   status: "ok", 
		   filename: filename, 
		   code:code, stdout:stdout, 
		   stderr:stderr, 
		   time: (new Date().getTime()-startTime.getTime())
		};

		res.contentType('application/json');
		res.end(JSON.stringify(ret));
		console.log("encoding end");
	});	 
});

var allStartTime, now;

app.post('/upload', function(req, res, next){
	
    var uploadStartTime = new Date().getTime();
	if (!allStartTime) allStartTime = uploadStartTime;
		 
	var form = new formidable.IncomingForm();
		 
    form.parse(req, function(err, fields, files) {
		var fid = fields.fid;
		var img = fields.img;
		
		now = new Date().getTime();
        console.log("form parse " + fid, (now - uploadStartTime), (now - allStartTime));
		img = img.replace( /^data:image\/.*;base64/, '' );
		
		var buf = new Buffer(img, 'base64');
		var fname = "tmp/test"+fid+".png";
		fs.writeFile(fname, buf, function(err) {
			if(err) {
					console.log(err);
					//res.end("{status:'fail'}");
			} else {
					// console.log("The file "+fname+" was saved!");
					var ret = {
						status: "ok",
						file: fname, 
						id: fid
					};
					 now = new Date().getTime();
					 console.log("file written " + fid, (now - uploadStartTime), (now - allStartTime));
					 
					
                    
					res.contentType('application/json');
					res.end(JSON.stringify(ret));
					 
					 now = new Date().getTime();
					 console.log("response end " + fid, (now - uploadStartTime), (now - allStartTime));
                    
			}
		}); // eo write file
		
			   
    }); // end form parse
}); // end post

// Start the server listening on port 8000
app.listen(8000);