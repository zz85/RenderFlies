/* 
 * Version 3. Integration with GLSL Sandbox
 */
var app = require('express').createServer();
var formidable = require('formidable');
var fs = require('fs');
var util = require('util'),
	spawn = require('child_process').spawn;

var path = require('path');

var io = require('socket.io').listen(app);

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
	res.end();
});

// Start the server listening on port 8000
app.listen(8000);


var project = minecraftcubes = new RenderProject();


var k_UNALLOCATED = 1,
	k_ALLOCATED = 2,
	k_RENDERED = 3;

// Use a hashmap here to keep track of statuses of frames to render
var renders = [];
// First mark project render frames to unallocated
for (var i=0, il=minecraftcubes.frames;i<=il;i++) {
    renders[i] = k_UNALLOCATED;
}

// Display stats of rendered frames
function checkRenderStatus() {
    var unalloc = 0,
	alloc = 0,
	rendered = 0,
	c= 0;
    for (var r in renders) {
        c++;
        switch(renders[r]) {
            case k_UNALLOCATED:
                unalloc ++;
                break;
            case k_ALLOCATED:
                alloc ++;
                break;
            case k_RENDERED:
                rendered ++;
                break;
        }
    }
    
    console.log("Unallocated, Allocated, Rendered, Total", unalloc, alloc, rendered, c);
    return {unalloc:unalloc, alloc:alloc, rendered:rendered, c:c};
}

// Return the next unallocated frame to be rendered
function getNextRenderFrame() {
    for (var r in renders) {
        if (renders[r] && renders[r]==k_UNALLOCATED) {
			renders[r] = k_ALLOCATED;
            return r;
        }
    }
    return null;
}

function saveRenderedFrame(frame, image) {
	var fid = frame;
	var img = image;
	
	var start = Date.now();
    // console.log("form parse " + fid, (now - uploadStartTime), (now - allStartTime));
	img = img.replace( /^data:image\/.*;base64/, '' );
	
    
	var buf = new Buffer(img, 'base64');
	var fname = path.join(__dirname, project.stills, project.name + fid + '.png');
	fs.writeFile(fname, buf, function(err) {
		if(err) {
				console.log(err);
				renders[fid] = k_UNALLOCATED;
				io.sockets.emit('renderstatus', fid, k_UNALLOCATED);
		} else {
				// console.log("The file "+fname+" was saved!");
                
                renders[fid] = k_RENDERED;
                io.sockets.emit('renderstatus', fid, k_RENDERED);

				 console.log("file written " + fid, (Date.now() - start));
				 
                
                 // If all frames have rendered, start encoding
                 var status = checkRenderStatus();
                 if (status.c == status.rendered) {
                     // encode();
					console.log('all are done!');
                 }
                 
                 
		}
	}); // eo write file
}



io.sockets.on('connection', function (socket) {
  // socket.emit('news', { hello: 'world' });
  // socket.on('my other event', function (data) {
  // 	
  //   console.log('other event', data);
  // });

  // io.sockets.emit('this', { will: 'be received by everyone'});

// io.sockets.emit('project', minecraftcubes);

// socket.on('project', function (from, msg) {
//   console.log('I received a private message by ', from, ' saying ', msg);
// });

	socket.emit('project', minecraftcubes);
	socket.on('ready', function () {
		// find available frame
		
		var frame = getNextRenderFrame();
		console.log('client ready', socket, 'sending frame', frame);
		if (frame!=null)
		socket.emit('render', frame);
	});
	
	socket.on('render', function (frame, output) {
		// console.log('receiving render..', frame, output);
		saveRenderedFrame(frame, output);
		var frame = getNextRenderFrame();
		if (frame!=null)
		socket.emit('render', frame);
	});



  // socket.on('disconnect', function () {
  //   io.sockets.emit('user disconnected');
  // });


});

// Project Settings
function RenderProject(options) {
	
	if (options!==undefined) 
	for (var i in options) {
		this[i] = options[i];
	}
	
	
	if (!this.fps) this.fps = 25;
	if (!this.width) this.width = 720;
	if (!this.height) this.height = 480;

	
	// Project Directory
	if (!this.stills) this.stills = '_stills';
	if (!this.renders) this.renders = '_renders';
	if (!this.assets) this.assets = '_assets';
	
	
	this.duration = 67;
	// Random Id / Key?
	this.frames = this.fps * this.duration;
	this.name = 'minefield';
	
	this.code = "#ifdef GL_ES\nprecision mediump float;\n#endif\n\nuniform float audio;\nuniform float time;\nuniform vec2 mouse;\nuniform vec2 resolution;\n\n/*\n\nOkay, so to start testing this GLSL Sandbox + Audio integration \n(using audiokeys.js) I randomly found and use this minecraft sample\nfrom the GLSL sandbox (http://glsl.heroku.com)\nwhich seems to show off the intended effect pretty well!\n\nNotice that the only addition is audio multiplier effect\n\nHave fun making glsl code a tad more fun with music!\n\t\nClick \"play another\" in the upper right to pick a random soundtrack\nNote that this beautiful music was \ncomposed by Jessica Curry (http://www.jessicacurry.co.uk/) for the game\nhttp://www.moddb.com/mods/dear-esther/downloads/dear-esther-soundtrack \n\t\nFor discussion on this proof of concept visit\nhttps://github.com/mrdoob/glsl-sandbox/issues/12\n\nCheers,\n@blurspline http://twitter.com/blurspline\n\n*/\n\n\nstruct Ray\n{\n\tvec3 Origin;\n\tvec3 Direction;\n};\n\n// fuck minecraft!\n// warped by weylandyutani amsterdam 2012\n\t\n// (Kabuto) made this a bit more minecraft-like ;-)\n\t\n#define pi 6.1415\n//Landscape\n\t\nfloat random(vec4 seed)\n{\n \treturn fract(sin(dot(seed.xy ,vec2(12.9898,78.233)) + dot(seed.zw ,vec2(15.2472,93.2541))) * 43758.5453);\n}\n\nfloat floorTo(float value, float factor)\n{\n \treturn floor(value / factor) * factor;\n}\n\nvec2 floorTo(vec2 value, vec2 factor)\n{\n \treturn vec2(floorTo(value.x, factor.x), floorTo(value.y, factor.y));\n}\n\nfloat lerp(float x, float X, float amount, bool usecos)\n{\n\t if(usecos)\n\t {\n\t  \treturn x + (X - x) * ((cos(amount * pi) - 1.0 ) / -2.0);\n\t }\n\t else\n\t {\n\t  \treturn x + (X - x) * amount;\n\t }\n}\n\nfloat bilerp(float xy, float Xy, float xY, float XY, vec2 amount, bool usecos)\n{\n \tfloat x = lerp(xy, xY, amount.y, usecos);\n \tfloat X = lerp(Xy, XY, amount.y, usecos);\n\treturn lerp(x, X, amount.x, usecos);\n}\n\nfloat getBilerp(vec2 position, vec2 size, float seed, bool usecos)\n{\n \tvec2 min = floorTo(position, size);\n \tvec2 max = min + size;\n \n \treturn bilerp(random(vec4(min.x, min.y, seed, seed)),\n   \t\trandom(vec4(max.x, min.y, seed, seed)),\n   \t\trandom(vec4(min.x, max.y, seed, seed)),\n   \t\trandom(vec4(max.x, max.y, seed, seed)),\n   \t\t(position - min) / size, usecos);\n}\n\nvec2 getTunnelCoords(float z) {\n\treturn vec2(cos(z*0.3)*6.0 + cos(z*0.53)*2.0, cos(z*0.2)*3.0);\n}\n\nbool ShouldDraw(vec3 voxel)\n{\t\n\tvec2 tunnel = getTunnelCoords(voxel.z);\n\tfloat tx = voxel.x - tunnel.x;\n\tfloat ty = voxel.y - tunnel.y;\n\treturn 1. > random( vec4( voxel.x, voxel.z, voxel.y, 0.3481 ) ) + 10./(1.+tx*tx+ty*ty);\n}\n\n//currently returns one of 4 stone types\nfloat getStoneType(vec3 voxel) {\n\tfloat s1 = dot(sin(voxel*0.41),cos(voxel*0.2714));\n\tfloat s2 = dot(sin(voxel*0.3),cos(voxel*0.1642));\n\treturn mix(sign(s1)*.5+2.5, sign(s2)*.5+.5, step(abs(s1*.2),abs(s2)));\n}\n\n\nvoid IterateVoxel(inout vec3 voxel, Ray ray, out vec3 hitPoint, out vec3 actual)\n{\t\n\tvec3 stp = voxel + step(vec3(0), ray.Direction) - ray.Origin;\n\tvec3 max = stp / ray.Direction;\n\t\n\tif(max.x < min(max.y, max.z)) {\n\t\tvoxel.x += sign(ray.Direction.x);\n\t\thitPoint = vec3(1,0,0);\n\t\tactual = stp.x/ray.Direction.x*ray.Direction + ray.Origin;\n\t} else if(max.y < max.z) {\n\t\tvoxel.y += sign(ray.Direction.y);\n\t\thitPoint = vec3(0,1,0);\n\t\tactual = stp.y/ray.Direction.y*ray.Direction + ray.Origin;\n\t} else {\n\t\tvoxel.z += sign(ray.Direction.z);\n\t\thitPoint = vec3(0,0,1);\n\t\tactual = stp.z/ray.Direction.z*ray.Direction + ray.Origin;\n\t}\n}\n\t\nvec4 GetRayColor(Ray ray)\n{\n\tvec3 voxel = ray.Origin - fract(ray.Origin);\n\tvec3 hitPoint;\n\tvec3 actual;\n\t\n\tfor(int i=0;i<50/*CAREFUL WITH THIS!!!*/;i++)\n\t{\n\t\tif(ShouldDraw(voxel))\n\t\t{\n\t\t\tconst float lightDist = 15.0;\n\t\t\tfloat lightNum = voxel.z/lightDist+1e-5;\n\t\t\tfloat lightFrac = fract(lightNum);\n\t\t\tlightNum -= lightFrac;\n\t\t\tfloat lightZ = lightNum*lightDist;\n\t\t\tvec3 light = vec3(getTunnelCoords(lightZ), lightZ);\n\t\t\tvec3 lv = light-voxel;\n\t\t\tfloat lvl = length(lv);\n\t\t\tfloat light2 =( dot( hitPoint, lv )/lvl+1.2) / (lvl*lvl);\n\t\t\tfloat totallight = light2*(1.-lightFrac);\n\t\t\t\n\t\t\tlightNum += 1.;\n\t\t\tlightZ += lightDist;\n\t\t\tlight = vec3(getTunnelCoords(lightZ), lightZ);\n\t\t\tlv = light-voxel;\n\t\t\tlvl = length(lv);\n\t\t\tlight2 =( dot( hitPoint, lv )/lvl+1.2) / (lvl*lvl);\n\t\t\ttotallight += light2*lightFrac;\n\t\t\t\n\t\t\tvec2 tex = floor(fract(vec2(dot(hitPoint,actual.zxx),dot(hitPoint,actual.yzy)))*16.);\n\t\t\t\n\t\t\tfloat stone = getStoneType(voxel)+1.;\n\t\t\tvec3 c0 = vec3(0.7+stone*.1,0.7,0.7-stone*.1);\n\t\t\tvec3 c1 = vec3(0.7,0.7,0.7)+vec3(stone-3.5,3.5-stone,-0.3)*step(2.5,stone);\n\t\t\t\n\t\t\t\n\t\t\tfloat rnd = dot(sin(tex*vec2(3.3-stone*.7,.01+.3*stone)), sin(tex*vec2(3.1+stone,.01+.3*stone)));\n\t\t\tvec3 rndV = max(0.,rnd)*c0+max(0.,-rnd)*c1;\n\t\t\t\n\t\t\treturn vec4(1.,.8,time*1e-10+.6+1e-10*time/20.0,1.)*vec4(rndV,1.)*totallight*16.;\n\t\t\t\n\t\t}\n\t\t\n\t\tIterateVoxel(voxel, ray, hitPoint, actual);\n\t}\n\t\n\treturn vec4(0.0, 0.0, 0.0, 0.0);\n}\n\nvoid GetCameraRay(const in vec3 position, const in vec3 lookAt, out Ray currentRay)\n{\n\tvec3 forwards = normalize(lookAt - position);\n\tvec3 worldUp = vec3(0.0, 1.0, 0.0);\n\t\n\t\n\tvec2 uV = ( gl_FragCoord.xy / resolution.xy );\n\tvec2 viewCoord = uV * 2.0 - 1.0;\n\t\n\tfloat ratio = resolution.x / resolution.y;\n\t\n\tviewCoord.y /= ratio;                              \n\t\n\tcurrentRay.Origin = position;\n\t\n\tvec3 right = normalize(cross(forwards, worldUp));\n\tvec3 up = cross(right, forwards);\n\t       \n\tcurrentRay.Direction = normalize( right * viewCoord.x + up * viewCoord.y + forwards);\n}\n\nvoid main( void ) \n{\n\tRay currentRay;\n \n\tGetCameraRay(vec3(getTunnelCoords(time),time), vec3(0.1, 0.0, time*1.+3.), currentRay);\n\n\t//making black \"black\" instead of alpha black... _gtoledo3\n\t\n\tfloat levels = (audio - 0.6) * 1.8 + 0.64;\n\t\n\tgl_FragColor = vec4(vec3(GetRayColor(currentRay) * levels),1.0);\n}";
	
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
