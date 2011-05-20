/*

A particles experiment
first written for howmean.com 
first created in dec 2009

then updated 23 April 2011

by Joshua Koo zz85nus@gmail.com

*/

// Settings
var supportCanvas = false;
var container;
var particles;
var where = {x:0,y:0, move:false, type:''};
var mousedown = false;
var sceneWidth, sceneHeight;
var focalLength = 100, maxlength = 200;
var windX = 0, windY = 0;
var particlesAmount = 30;
var fps = 30;
var drag = 0.9;
var units = 1;
var minlife = 20;
var maxlife = 160;
var intervalId;
var rgb = '168, 140, 37';
var minSize = 20;
var maxSize = 60;
var speedBooster = 6;
var canvas;

function createParticle() {
	return new Particle();
};


var Particle =function () {
    this.init();
};

Particle.prototype.init = function() {
	this.x = randomOf(sceneWidth);
	this.y = randomOf(sceneHeight);
	this.size = randomBetween(minSize,maxSize);
	this.dx = (Math.random()-0.5);
	this.dy = (Math.random()-0.5); 
	this.ttl = randomBetween(minlife, maxlife);
	this.life = 0;
}

Particle.prototype.update = function() {
	alpha = Math.sin(this.life/this.ttl* Math.PI);
	
	// tiny boost if big size, also imitates some FOV
	var sizeBoost = this.size/maxSize*speedBooster;
	
	this.dx += ((Math.random()-0.5) * Math.random()*((1-alpha)) * 20+(Math.random()-0.5) *Math.random()* alpha* 8 )*sizeBoost;
	this.dy += ((Math.random()-0.5) * Math.random()*((1-alpha)) * 20 +(Math.random()-0.5) * Math.random()*alpha* 8)*sizeBoost;
	
	
	// From newton laws of motion, we update its position based on velocity
	this.x += this.dx;
	this.y += this.dy;
	// we add drag
	this.dx *= drag;
	this.dy *= drag;

	
	this.life++;
	if (this.life>this.ttl) {
		this.init();
	} else {
		this.paint();
	}
	
};




Particle.prototype.paint = function () {
	
	ctx.save();
	ctx.translate(this.x, this.y);
	ctx.globalCompositeOperation = "lighter";
	
	 var gradblur = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
	
	var alpha = Math.sin(this.life/this.ttl* Math.PI);;
	ctx.scale(alpha*1.5,alpha*1.5);	
	var edgecolor1 = "rgba(" + rgb + ","+round(alpha,2)+")";
	var edgecolor2 = "rgba(" + rgb + ","+round(0.75*alpha,2)+")";
	var edgecolor3 = "rgba(" + rgb + ","+round(0.5*alpha,2)+")";
	var edgecolor4 = "rgba(" + rgb + ","+round(0.25*alpha,2)+")";
	var edgecolor5 = "rgba(" + rgb + ","+0+")";
	
	
	gradblur.addColorStop(0.05,edgecolor1);
	gradblur.addColorStop(0.1,edgecolor2);
	gradblur.addColorStop(0.6,edgecolor4);
	gradblur.addColorStop(1,edgecolor5);
	
    ctx.beginPath();
    ctx.fillStyle = gradblur;
    ctx.arc(0, 0, this.size, 0, Math.PI*2, false);
	ctx.fill();
    ctx.closePath();
    ctx.restore();
}

function initScene() {
    container = $("body")[0];
    $("body").css("overflow-y", "hidden");
    //sceneWidth = $(window).width() - 100;
    //sceneHeight = $(window).height() - 100;
    
	sceneWidth = $("#clipWidth").val(); //For HD 1920; 
    sceneHeight = $("#clipHeight").val(); //For HD 720
	
    var elm = document.createElement("canvas");
    elm.width = elm.style.width = sceneWidth;
    elm.height = elm.style.height = sceneHeight;
    ctx = elm.getContext("2d");
    $("#canvas").append(elm);
}

function reinitScene() {
	clearInterval(intervalId);
	intervalId = setInterval(function() { update(); }, 1000 / fps);
    
	particles = [];

	for (var i = 0; i < particlesAmount; i++) {
		particles.push(createParticle());
	}
	update();
    
}

function reinit() {
	fps = parseFloat($('#fps').val());
	rgb = $('#rgb').val(); 
	particlesAmount = parseFloat($('#particlesAmount').val()); 
	minSize = parseInt($('#minSize').val());
	maxSize = parseInt($('#maxSize').val());
	speedBooster = parseFloat($('#speed').val());
	reinitScene();
}

function randomOf(i) {
	return Math.floor(Math.random()*i);
}

function randomBetween(min,max){ 
	return randomOf(max-min)+min;
}

function round(i,place) {
	var base = Math.pow(10, place);
	return Math.round(i*base)/base;
}

function destoryParticle(span) {
	span.parentNode.removeChild(span);
}

function update() {
	ctx.clearRect(0, 0, sceneWidth, sceneHeight);
	ctx.fillStyle = "#000000";
	ctx.fillRect(0,0, sceneWidth, sceneHeight);

	for (var i=particles.length -1 ; i >=0; i--) {
		if  (particles[i] != null) {
			// Simple wrap around when out of bounds
			particles[i].update();
			particles[i].x = particles[i].x % sceneWidth;
			if (particles[i].x<0) particles[i].x = sceneWidth -particles[i].x;
			particles[i].y = particles[i].y % sceneHeight;
						
		}
		
		//$('#status').html('no. of particles: ' + particles.length);
	}
	
}


