/* 
 * Version 3. Integration with GLSL Sandbox
 */
var app = require('express').createServer();
var formidable = require('formidable');
var fs = require('fs');
var util = require('util'),
	spawn = require('child_process').spawn;

var path = require('path');

// app.configure(function(){
// 	// Sets the root directory
//     var dir =  __dirname + '/..';
//     console.log(dir);
//     app.set('views', dir);
//     app.set('view options', {layout: false});
//     app.set("view engine", "html");
//  });
//  
// app.get('/', function(req, res){
//   res.sendfile("canvasrender01.html");
// });
// 
// // we send the file, if it match the url
// app.get(/\/(.*)/, function(req, res){
//     res.sendfile(req.params[0]);
// });


app.get(/\/(.*)/, function(req, res){
    res.sendfile(req.params[0]);
});

app.post('*', function(req, res) {
	console.log('receive');
	
	console.log(req.body);
});

// Start the server listening on port 8000
app.listen(8000);

// Project Settings
function RenderProject(options) {
	
	if (options!==undefined) 
	for (var i in options) {
		this[i] = options[i];
	}
	
	
	if (!this.fps) this.fps = 25;
	if (!this.height) this.height = 720;
	if (!this.width) this.width = 480;
	
	// Project Directory
	if (!this.stills) this.stills = '_stills';
	if (!this.renders) this.renders = '_renders';
	if (!this.assets) this.assets = '_assets';
	
	// Random Id / Key?
	this.frames = this.fps * this.duration;

	
};


/*
var project01 = {
    fps: 25,
    length: 5*25,
    id: 'f1',
    key: 'a4b43',
    settings: {"scale":2, "power":2, "bailout":4, "minIterations":1, "juliaMode":true, "offset":[-0.521,-1.438], "colorMode":0, "bailoutStyle":0, "colorScale":1.79, "colorCycle":1, "colorCycleOffset":0.24, "colorCycleMirror":true, "hsv":false, "iterationColorBlend":0, "colorIterations":4, "color1":[1,1,1], "color2":[0,0.53,0.8], "color3":[0,0,0], "transparent":false, "gamma":1, "orbitTrap":false, "orbitTrapOffset":[0,0], "orbitTrapScale":1, "orbitTrapEdgeDetail":0.5, "orbitTrapRotation":0, "orbitTrapSpin":0, "texture":"/images/flower.png", "rotation":0, "cameraPosition":[-0.570263,-0.320191,10.264668], "size":[873,598], "dE":"Ducks", "maxIterations":50, "antialiasing":false, "stepSpeed":0.5},
    shaders: shaders2d,
    timeline: timeline01,
    height: 480,
    width: 720
};
*/

var minecraftcubes = new RenderProject();