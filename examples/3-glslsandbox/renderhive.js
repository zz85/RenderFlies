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
    //renders[i] = k_UNALLOCATED;
    
    var fname = path.join(__dirname, project.stills, project.name + i + '.png');
   
    if (path.existsSync(fname)) {
    	    renders[i] = k_RENDERED;
    } else {
    	    console.log(i, 'not rendered');
    	    renders[i] = k_UNALLOCATED;
    }
}

//for (i in [0, 34, 45, 101, 118, 120, 135, 141]) {
//	renders[i] = k_UNALLOCATED;
//}

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
    
    // console.log("Unallocated, Allocated, Rendered, Total", unalloc, alloc, rendered, c);
    return {unalloc:unalloc, alloc:alloc, rendered:rendered, c:c};
}

// Return the next unallocated frame to be rendered
function getNextRenderFrame() {
    for (var r in renders) {
        if (renders[r] && renders[r]==k_UNALLOCATED) {
			renders[r] = k_ALLOCATED;
			io.sockets.emit('renderstatus', r, k_ALLOCATED);
			
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

				 // console.log("file written " + fid, (Date.now() - start));
				 
                
                 // If all frames have rendered, start encoding
                 var status = checkRenderStatus();
                 if (status.rendered == project.frames) {
                     encode();
                     console.log('all are done!');
                 }
                 
                 
		}
	}); // eo write file
}



/* Here we spawn a new process, 
 * to encode the image files to a video with ffmpeg 
 * One might want to delete or keep the image files
 */
function encode() {
    console.log("we got an encode request!");
	var timestamp = new Date().getTime();
	var filename = path.join(__dirname, project.renders, "movie-"+timestamp + ".mp4");
	
	var stills_dir = path.join(__dirname, project.stills, project.name);
	var target = path.join(__dirname, project.renders, project.name + "-"+timestamp + ".mp4");
	var audio = path.join(__dirname, project.audio);
	

	var args = "-qscale:v 2  -b:v 8Mb -i " + audio +  " -i "+stills_dir+"%d.png -r "+project.fps+" "+target;
	console.log(args);	
	
	var startTime = new Date();
	var ffmpeg  = spawn('ffmpeg.exe', args.split(' '));
	
	var stdout = "";
	var stderr = "";
	
	ffmpeg.stdout.on('data', function (data) {
		stdout+= data;
		//console.log('stdout: ' + data);
	});
	
	ffmpeg.stderr.on('data', function (data) {
		stderr += data;
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

	console.log("Video Encoding eneded", ret);
	});
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
socket.__isRendering = null;

	socket.emit('project', minecraftcubes);
	socket.on('ready', function () {
		// find available frame
		
		var frame = getNextRenderFrame();
		// console.log('client ready', socket, 'sending frame', frame);
		socket.__isRendering = frame;
		if (frame!=null)
		socket.emit('render', frame);
	});
	
	socket.on('render', function (frame, output) {
		// console.log('receiving render..', frame, output);
		saveRenderedFrame(frame, output);
		socket.__isRendering = null;
		var frame = getNextRenderFrame();
		socket.__isRendering = frame;
		
		if (frame!=null)
		socket.emit('render', frame);
	});
	
	
	socket.on('encode', function () {
		encode();
	});


	socket.on('disconnect', function () {
		//io.sockets.emit('user disconnected');
		if (socket.__isRendering!==null) {
			console.log('resetting frame status'); 
			renders[socket.__isRendering]==k_UNALLOCATED;
			io.sockets.emit('renderstatus', socket.__isRendering, k_UNALLOCATED);
		}
	});


});

// Project Settings
/*
function RenderProject(options) {
	
	if (options!==undefined) 
	for (var i in options) {
		this[i] = options[i];
	}
	
	
	if (!this.fps) this.fps = 25;
	if (!this.width) this.width = 1920; // 720 | 1920| 1280
	if (!this.height) this.height = 1080; // 480 | 1080 | 720

	
	// Project Directory
	if (!this.stills) this.stills = '_stills';
	if (!this.renders) this.renders = '_renders';
	if (!this.assets) this.assets = '_assets';
	this.audio = 'music/01TheBeginning.m4a';
	
	
	this.duration = 71;
	// Random Id / Key?
	this.frames = this.fps * this.duration;
	this.name = 'minefield';
	
	
};*/


function RenderProject(options) {
	
	if (options!==undefined) 
	for (var i in options) {
		this[i] = options[i];
	}
	
	
	if (!this.fps) this.fps = 25;
	if (!this.width) this.width = 1920; //1920; // 720 | 1920| 1280
	if (!this.height) this.height = 1080; //1080; // 480 | 1080 | 720

	
	// Project Directory
	if (!this.stills) this.stills = '_stills';
	if (!this.renders) this.renders = '_renders';
	if (!this.assets) this.assets = '_assets';
	this.audio = 'music/02TheBeach.m4a';
	
	
	this.duration = 124;
	// Random Id / Key?
	this.frames = this.fps * this.duration;
	this.name = 'chaininggears';
	
	this.code = "// chains and gears - @P_Malin\n\n// ...fingers crossed, should now be compiling on more platforms\n\n#ifdef GL_ES\nprecision highp float;\n#endif\n\nuniform float time;\nuniform vec2 mouse;\nuniform vec2 resolution;\nuniform float audio;\n\n#define PI 3.141592654\n\nstruct C_Ray\n{\n\tvec3 vOrigin;\n\tvec3 vDir;\n};\n\nstruct C_HitInfo\n{\n\tfloat fDistance;\n\tfloat fObjectId;\n\tvec3 vPos;\n};\n\nstruct C_Material\n{\n\tvec3 cAlbedo;\n\tfloat fR0;\n\tfloat fSmoothness;\n};\n\nvec3 RotateY( const in vec3 vPos, const in float fAngle )\n{\n\tfloat s = sin(fAngle);\n\tfloat c = cos(fAngle);\n\t\n\tvec3 vResult = vec3( c * vPos.x + s * vPos.z, vPos.y, -s * vPos.x + c * vPos.z);\n\t\n\treturn vResult;\t\n}\n\t\nvec2 DistCombineUnion( const in vec2 v1, const in vec2 v2 )\n{\n\t//if(v1.x < v2.x) return v1; else return v2;\n\treturn mix(v1, v2, step(v2.x, v1.x));\n}\n\nvec2 DistCombineIntersect( const in vec2 v1, const in vec2 v2 )\n{\n\treturn mix(v2, v1, step(v2.x,v1.x));\n}\n\nvec2 DistCombineSubtract( const in vec2 v1, const in vec2 v2 )\n{\n\treturn DistCombineIntersect(v1, vec2(-v2.x, v2.y));\n}\n\nvec3 DomainRepeatXZGetTile( const in vec3 vPos, const in vec2 vRepeat, out vec2 vTile )\n{\n\tvec3 vResult = vPos;\n\tvec2 vTilePos = (vPos.xz / vRepeat) + 0.5;\n\tvTile = floor(vTilePos + 1000.0);\n\tvResult.xz = (fract(vTilePos) - 0.5) * vRepeat;\n\treturn vResult;\n}\n\nvec3 DomainRepeatXZ( const in vec3 vPos, const in vec2 vRepeat )\n{\n\tvec3 vResult = vPos;\n\tvec2 vTilePos = (vPos.xz / vRepeat) + 0.5;\n\tvResult.xz = (fract(vTilePos) - 0.5) * vRepeat;\n\treturn vResult;\n}\n\nvec3 DomainRepeatY( const in vec3 vPos, const in float fSize )\n{\n\tvec3 vResult = vPos;\n\tvResult.y = (fract(vPos.y / fSize + 0.5) - 0.5) * fSize;\n\treturn vResult;\n}\n\nvec3 DomainRotateSymmetry( const in vec3 vPos, const in float fSteps )\n{\n\tfloat angle = atan( vPos.x, vPos.z );\n\t\n\tfloat fScale = fSteps / (PI * 2.0);\n\tfloat steppedAngle = (floor(angle * fScale + 0.5)) / fScale;\n\t\n\tfloat s = sin(-steppedAngle);\n\tfloat c = cos(-steppedAngle);\n\t\n\tvec3 vResult = vec3( c * vPos.x + s * vPos.z, \n\t\t\t     vPos.y,\n\t\t\t     -s * vPos.x + c * vPos.z);\n\t\n\treturn vResult;\n}\n\nfloat GetDistanceXYTorus( const in vec3 p, const in float r1, const in float r2 )\n{\n   vec2 q = vec2(length(p.xy)-r1,p.z);\n   return length(q)-r2;\n}\n\nfloat GetDistanceYZTorus( const in vec3 p, const in float r1, const in float r2 )\n{\n   vec2 q = vec2(length(p.yz)-r1,p.x);\n   return length(q)-r2;\n}\n\nfloat GetDistanceCylinderY(const in vec3 vPos, const in float r)\n{\n\treturn length(vPos.xz) - r;\n}\n\nfloat GetDistanceChain( const in vec3 vPos )\n{\n\tfloat fOuterCylinder = length(vPos.xz) - 1.05;\n\tif(fOuterCylinder > 0.5)\n\t{\n\t\treturn fOuterCylinder;\n\t}\n\t\n\tvec3 vChainDomain = vPos;\n\t\n\tvChainDomain.y = fract(vChainDomain.y + 0.5) - 0.5;\t\t\n\tfloat fDistTorus1 = GetDistanceXYTorus(vChainDomain, 0.35, 0.1);\n\t\n\tvChainDomain.y = fract(vChainDomain.y + 1.0) - 0.5;\t\t\n\tfloat fDistTorus2 = GetDistanceYZTorus(vChainDomain, 0.35, 0.1);\n\t\n\tfloat fDist = min(fDistTorus1, fDistTorus2);\n\n\treturn fDist;\n}\n\nfloat GetDistanceGear( const in vec3 vPos )\n{\n\tfloat fOuterCylinder = length(vPos.xz) - 1.05;\n\tif(fOuterCylinder > 0.5)\n\t{\n\t\treturn fOuterCylinder;\n\t}\n\t\n\tvec3 vToothDomain = DomainRotateSymmetry(vPos, 16.0);\n\tvToothDomain.xz = abs(vToothDomain.xz);\n\tfloat fGearDist = dot(vToothDomain.xz,normalize(vec2(1.0, 0.55))) - 0.55;\n\tfloat fSlabDist = abs(vPos.y + 0.1) - 0.15;\n\t\n\tvec3 vHoleDomain = abs(vPos);\n\tvHoleDomain -= 0.35;\n\tfloat fHoleDist = length(vHoleDomain.xz) - 0.2;\n\t\n\tfloat fBarDist =vToothDomain.z - 0.1;\n\t\n\tfloat fResult = fGearDist;\n\tfResult = max(fResult, fSlabDist);\n\tfResult = max(fResult, fOuterCylinder);\n\tfResult = max(fResult, -fHoleDist);\n\tfResult = min(fResult, fBarDist);\n\treturn fResult;\n}\n\nvec2 GetDistanceScene( const in vec3 vPos )\n{             \t\n\tvec2 vChainTile;\n\tvec2 vRepeat = vec2(4.0, 8.0);\n\tvec3 vRepeatDomain = DomainRepeatXZGetTile(vPos, vRepeat, vChainTile);\n\t\t\n\tvec2 vDistFloor = vec2(vPos.y + 0.5, 1.0);\n\tvec2 vResult = vDistFloor;\n\t{\n\t\tvec3 vGearDomain1 = DomainRepeatXZ(vPos+vec3(0.0, 0.0, 4.0), vRepeat);\n\t\tvGearDomain1 = RotateY( vGearDomain1, time);\n\t\tvec2 vDistGear = vec2(GetDistanceGear(vGearDomain1), 3.0);\n\t\tvResult = DistCombineUnion( vResult, vDistGear );\n\t\t\n\t\tvec3 vGearDomain2 = DomainRepeatXZ(vPos+vec3(2.0, 0.0, 4.0), vRepeat);\n\t\tvGearDomain2 = RotateY( vGearDomain2, -time + (2.0 * PI / 32.0));\n\t\tvec2 vDistGear2 = vec2(GetDistanceGear(vGearDomain2), 3.0);\t\t\n\t\tvResult = DistCombineUnion( vResult, vDistGear2 );\n\t\t\n\t}\n\n\t{\n\t\tvec2 vDistChainHole = vec2( GetDistanceCylinderY(vRepeatDomain, 0.7), 2.0);\n\t\tvResult = DistCombineSubtract( vResult, vDistChainHole );\n\n\t\tvec3 vChainDomain = vRepeatDomain;\n\t\tfloat fSpeed = (sin(vChainTile.y + vChainTile.x) + 1.1) * 0.5;\n\t\tvChainDomain.y += sin(time * fSpeed);\n\t\tvec2 vDistChain = vec2( GetDistanceChain(vChainDomain), 4.0);\n\t\tvResult = DistCombineUnion( vResult, vDistChain );\n\t}\n\treturn vResult;\n}\n\nC_Material GetObjectMaterial( const in float fObjId, const in vec3 vPos )\n{\n\tC_Material mat;\n\n\tif(fObjId < 1.5)\n\t{\n\t\t// floor\n\t\tmat.fR0 = 0.02;\n\t\tmat.fSmoothness = 0.8;\n\t\tmat.cAlbedo = vec3(0.7, 0.8, 0.3);\n\t}\n\telse\n\tif(fObjId < 2.5)\n\t{\n\t\t// hole interior\n\t\tmat.fR0 = 0.0;\n\t\tmat.fSmoothness = 0.0;\n\t\tmat.cAlbedo = vec3(0.7, 0.8, 0.3);\n\t}\n\telse\n\tif(fObjId < 3.5)\n\t{\n\t\t// gear\n\t\tmat.fR0 = 0.4;\n\t\tmat.fSmoothness = 0.7;\n\t\tmat.cAlbedo = vec3(0.5, 0.6, 0.6);\n\t}\n\telse\n\t{\n\t\t// chain\n\t\tmat.fR0 = 0.2;\n\t\tmat.fSmoothness = 0.1;\n\t\tmat.cAlbedo = vec3(0.15, 0.125, 0.1);\n\t}\n\t\n\treturn mat;\n}\n\nvec3 GetSkyGradient( const in vec3 vDir )\n{\n\tfloat fBlend = vDir.y * 0.5 + 0.5;\n\treturn mix(vec3(0.0, 0.0, 0.0), vec3(0.7, 0.9, 1.0), fBlend);\n}\n\nvec3 GetLightPos()\n{\n\treturn vec3(sin(time), 1.5 + cos(time * 1.231), cos(time));\n}\n\nvec3 GetLightCol()\n{\n\treturn vec3(32.0, 6.0, 1.0);\n}\n\nvec3 GetAmbientLight(const in vec3 vNormal)\n{\n\treturn GetSkyGradient(vNormal);\n}\n\nvoid ApplyAtmosphere(inout vec3 col, const in C_Ray ray, const in C_HitInfo intersection)\n{\n\t// fog\n\tfloat fFogDensity = 0.035;\n\tfloat fFogAmount = exp(intersection.fDistance * -fFogDensity);\n\tvec3 cFog = GetSkyGradient(ray.vDir);\n\tcol = mix(cFog, col, fFogAmount);\n\t\n\t// glare from light (a bit hacky - use length of closest approach from ray to light)\n\t/*\n\tvec3 vToLight = GetLightPos() - ray.vOrigin;\n\tfloat fDot = dot(vToLight, ray.vDir);\n\tfDot = clamp(fDot, 0.0, intersection.fDistance);\n       \n\tvec3 vClosestPoint = ray.vOrigin + ray.vDir * fDot;\n\tfloat fDist = length(vClosestPoint - GetLightPos());\n\tcol += GetLightCol() * 0.01/ (fDist * fDist);\n\t*/\n}\n\nvec3 GetSceneNormal( const in vec3 vPos )\n{\n\t// tetrahedron normal  \n\tfloat fDelta = 0.01;\n\t\n\tvec3 vOffset1 = vec3( fDelta, -fDelta, -fDelta);\n\tvec3 vOffset2 = vec3(-fDelta, -fDelta,  fDelta);\n\tvec3 vOffset3 = vec3(-fDelta,  fDelta, -fDelta);\n\tvec3 vOffset4 = vec3( fDelta,  fDelta,  fDelta);\n\t\n\tfloat f1 = GetDistanceScene( vPos + vOffset1 ).x;\n\tfloat f2 = GetDistanceScene( vPos + vOffset2 ).x;\n\tfloat f3 = GetDistanceScene( vPos + vOffset3 ).x;\n\tfloat f4 = GetDistanceScene( vPos + vOffset4 ).x;\n\t\n\tvec3 vNormal = vOffset1 * f1 + vOffset2 * f2 + vOffset3 * f3 + vOffset4 * f4;\n\t\n\treturn normalize( vNormal );\n}\n\n// This is an excellent resource on ray marching -> http://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm\nvoid Raymarch( const in C_Ray ray, out C_HitInfo result, const float fMaxDist, const int maxIter )\n{            \n\tconst float fEpsilon = 0.01;\n\tconst float fStartDistance = 0.1;\n\t\n\tresult.fDistance = fStartDistance; \n\tresult.fObjectId = 0.0;\n\t\t      \n\tfor(int i=0;i<=256;i++)                  \n\t{\n\t\tresult.vPos = ray.vOrigin + ray.vDir * result.fDistance;\n\t\tvec2 vSceneDist = GetDistanceScene( result.vPos );\n\t\tresult.fObjectId = vSceneDist.y;\n\t\t\n\t\t// abs allows backward stepping - should only be necessary for non uniform distance functions\n\t\tif((abs(vSceneDist.x) <= fEpsilon) || (result.fDistance >= fMaxDist) || (i > maxIter))\n\t\t{\n\t\t\tbreak;\n\t\t}                            \n\t\t\n\t\tresult.fDistance = result.fDistance + vSceneDist.x;                          \n\t}\n\t\n\t\n\tif(result.fDistance >= fMaxDist)\n\t{\n\t\tresult.fObjectId = 0.0;\n\t\tresult.fDistance = 1000.0;\n\t}\n}\n\nfloat GetShadow( const in vec3 vPos, const in vec3 vLightDir, const in float fLightDistance )\n{\n\tC_Ray shadowRay;\n\tshadowRay.vDir = vLightDir;\n\tshadowRay.vOrigin = vPos;\n\t\n\tC_HitInfo shadowIntersect;\n\tRaymarch(shadowRay, shadowIntersect, fLightDistance, 32);\n\t\t\t\t       \n\treturn step(0.0, shadowIntersect.fDistance) * step(fLightDistance, shadowIntersect.fDistance );             \n}\n\n// http://en.wikipedia.org/wiki/Schlick's_approximation\nfloat Schlick( const in vec3 vNormal, const in vec3 vView, const in float fR0, const in float fSmoothFactor)\n{\n\tfloat fDot = dot(vNormal, -vView);\n\tfDot = min(max((1.0 - fDot), 0.0), 1.0);\n\tfloat fDot2 = fDot * fDot;\n\tfloat fDot5 = fDot2 * fDot2 * fDot;\n\treturn fR0 + (1.0 - fR0) * fDot5 * fSmoothFactor;\n}\n\nfloat GetDiffuseIntensity(const in vec3 vLightDir, const in vec3 vNormal)\n{\n\treturn max(0.0, dot(vLightDir, vNormal));\n}\n\nfloat GetBlinnPhongIntensity(const in C_Ray ray, const in C_Material mat, const in vec3 vLightDir, const in vec3 vNormal)\n{             \n\tvec3 vHalf = normalize(vLightDir - ray.vDir);\n\tfloat fNdotH = max(0.0, dot(vHalf, vNormal));\n\n\tfloat fSpecPower = exp2(4.0 + 6.0 * mat.fSmoothness);\n\tfloat fSpecIntensity = (fSpecPower + 2.0) * 0.125;\n\t\n\treturn pow(fNdotH, fSpecPower) * fSpecIntensity;\n}\n\n// use distance field to evaluate ambient occlusion\nfloat GetAmbientOcclusion(const in C_Ray ray, const in C_HitInfo intersection, const in vec3 vNormal)\n{\n\tvec3 vPos = intersection.vPos;\n\n\tfloat fAmbientOcclusion = 1.0;\n\n\tfloat fDist = 0.0;\n\tfor(int i=0; i<=5; i++)\n\t{\n\t\tfDist += 0.1;\n\n\t\tvec2 vSceneDist = GetDistanceScene(vPos + vNormal * fDist);\n\t\t\n\t\tfAmbientOcclusion *= 1.0 - max(0.0, (fDist - vSceneDist.x) * 0.2 / fDist );\t\t       \n\t}\n\n\treturn fAmbientOcclusion;\n}\n\nvec3 GetObjectLighting(const in C_Ray ray, const in C_HitInfo intersection, const in C_Material material, const in vec3 vNormal, const in vec3 cReflection)\n{\n\tvec3 cScene ;\n\t\n\tvec3 vLightPos = GetLightPos();\n\tvec3 vToLight = vLightPos - intersection.vPos;\n\tvec3 vLightDir = normalize(vToLight);\n\tfloat fLightDistance = length(vToLight);\n\t\n\tfloat fAttenuation = 1.0 / (fLightDistance * fLightDistance) + audio * 0.4;\n\n\tfloat fShadowBias = 0.1;\t\n\tfloat fShadowFactor = GetShadow( intersection.vPos + vLightDir * fShadowBias, vLightDir, fLightDistance - fShadowBias );\n\tvec3 vIncidentLight = GetLightCol() * fShadowFactor * fAttenuation;\n\t\n\tvec3 vDiffuseLight = GetDiffuseIntensity( vLightDir, vNormal ) * vIncidentLight;\n\t\n\tfloat fAmbientOcclusion = GetAmbientOcclusion(ray, intersection, vNormal);\n\tvec3 vAmbientLight = GetAmbientLight(vNormal) * fAmbientOcclusion;\n\t\n\tvec3 vDiffuseReflection = material.cAlbedo * (vDiffuseLight + vAmbientLight);\n\t\n\tvec3 vSpecularReflection = cReflection * fAmbientOcclusion;\n\t\t       \n\tvSpecularReflection += GetBlinnPhongIntensity( ray, material, vLightDir, vNormal ) * vIncidentLight;\n\t\t       \n\tfloat fFresnel = Schlick(vNormal, ray.vDir, material.fR0, material.fSmoothness * 0.9 + 0.1);\n\tcScene = mix(vDiffuseReflection , vSpecularReflection, fFresnel);\n\t\n\treturn cScene;\n}\n\nvec3 GetSceneColourSimple( const in C_Ray ray )\n{\n\tC_HitInfo intersection;\n\tRaymarch(ray, intersection, 16.0, 32);\n\t\t       \n\tvec3 cScene;\n\t\n\tif(intersection.fObjectId < 0.5)\n\t{\n\t\tcScene = GetSkyGradient(ray.vDir);\n\t}\n\telse\n\t{\n\t\tC_Material material = GetObjectMaterial(intersection.fObjectId, intersection.vPos);\n\t\tvec3 vNormal = GetSceneNormal(intersection.vPos);\n\t\t\n\t\t// use sky gradient instead of reflection\n\t\tvec3 cReflection = GetSkyGradient(reflect(ray.vDir, vNormal));\n\t\t\n\t\t// apply lighting\n\t\tcScene = GetObjectLighting(ray, intersection, material, vNormal, cReflection );\n\t}\n\t\n\tApplyAtmosphere(cScene, ray, intersection);\n\t\n\treturn cScene;\n}\n\n\nvec3 GetSceneColour( const in C_Ray ray )\n{                                                             \n\tC_HitInfo intersection;\n\tRaymarch(ray, intersection, 30.0, 256);\n\t\t       \n\tvec3 cScene;\n\t\n\tif(intersection.fObjectId < 0.5)\n\t{\n\t\tcScene = GetSkyGradient(ray.vDir);\n\t}\n\telse\n\t{\n\t\tC_Material material = GetObjectMaterial(intersection.fObjectId, intersection.vPos);\n\t\tvec3 vNormal = GetSceneNormal(intersection.vPos);\n\t\t\n\t\tvec3 cReflection;\n\t\t//if((material.fSmoothness + material.fR0) < 0.01)\n\t\t//{\n\t\t//\t// use sky gradient instead of reflection\n\t\t//\tvec3 cReflection = GetSkyGradient(reflect(ray.vDir, vNormal));\t\t\t\n\t\t//}\n\t\t//else\n\t\t{\n\t\t\t// get colour from reflected ray\n\t\t\tfloat fSepration = 0.05;\n\t\t\tC_Ray reflectRay;\n\t\t\treflectRay.vDir = reflect(ray.vDir, vNormal);\n\t\t\treflectRay.vOrigin = intersection.vPos + reflectRay.vDir * fSepration;\n\t\t\t\t\t\n\t\t\tcReflection = GetSceneColourSimple(reflectRay);                                                 \t\t\n\t\t}\n\t\t\n\t\t// apply lighting\n\t\tcScene = GetObjectLighting(ray, intersection, material, vNormal, cReflection );\n\t}\n\t\n\tApplyAtmosphere(cScene, ray, intersection);\n\t\n\treturn cScene;\n}\n\nvoid GetCameraRay( const in vec3 vPos, const in vec3 vForwards, const in vec3 vWorldUp, out C_Ray ray)\n{\n\tvec2 vUV = ( gl_FragCoord.xy / resolution.xy );\n\tvec2 vViewCoord = vUV * 2.0 - 1.0;\n\t\n\tfloat fRatio = resolution.x / resolution.y;\n\t\n\tvViewCoord.y /= fRatio;                              \n\t\n\tray.vOrigin = vPos;\n\t\n\tvec3 vRight = normalize(cross(vForwards, vWorldUp));\n\tvec3 vUp = cross(vRight, vForwards);\n\t       \n\tray.vDir = normalize( vRight * vViewCoord.x + vUp * vViewCoord.y + vForwards);           \n}\n\nvoid GetCameraRayLookat( const in vec3 vPos, const in vec3 vInterest, out C_Ray ray)\n{\n\tvec3 vForwards = normalize(vInterest - vPos);\n\tvec3 vUp = vec3(0.0, 1.0, 0.0);\n\t\n\tGetCameraRay(vPos, vForwards, vUp, ray);\n}\n\nvec3 OrbitPoint( const in float fHeading, const in float fElevation )\n{\n\treturn vec3(sin(fHeading) * cos(fElevation), sin(fElevation), cos(fHeading) * cos(fElevation));\n}\n\nvec3 Tonemap( const in vec3 cCol )\n{\n\t// simple Reinhard tonemapping operator\n\t\n\treturn cCol / (1.0 + cCol);\n}\n\nvoid main( void )\n{\n\tC_Ray ray;\n\t\n\tGetCameraRayLookat( OrbitPoint(-mouse.x * 5.0, mouse.y) * 8.0, vec3(0.0, 0.0, 0.0), ray);\n\t//if (time>60.0) {\n\t//\tGetCameraRayLookat( OrbitPoint(-mouse.x * 5.0, (sin(time)+0.54) * 0.45) * 8.0, vec3(0.0, 0.0, 0.0), ray);\n\t//}\n\t//GetCameraRayLookat(vec3(0.0, 0.0, -5.0), vec3(0.0, 0.0, 0.0), ray);\n\t\n\tvec3 cScene = GetSceneColour( ray );\n\t\n\tfloat fExposure = 1.5;\n\tgl_FragColor = vec4( Tonemap(cScene * fExposure), 1.0 );\n}";
	//this.baked = ;
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

/*encode();
*/

// 720 480 -> 1.52am 2.08am
// 2.37 2.47 