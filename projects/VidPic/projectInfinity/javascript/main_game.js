var NO_OF_PLAYERS = 8;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// Create the canvas
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
var screen_width = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);
var screen_height = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) * 0.9;
var canvas_padding = 10;

var directionDriving = "CENTER";

var players = [];
var objects = [];
var turnVal, turnDirection;
var turnVal_atZeroFlag, turnVal_atZeroCounter;
var treeCounter = 0;

var keyPlayerHeight;

console.log(screen_width);
setup();
// var then = Date.now();
// var now = Date.now();
main();


function setup()
{
    console.log("start setup");
    canvas.width =  screen_width - canvas_padding;
    canvas.height = screen_height - canvas_padding;
    document.body.style.backgroundColor = "black";
    document.body.appendChild(canvas);

    keyPlayerHeight = canvas.height * 0.75;

    for(var i = 0; i < NO_OF_PLAYERS; i+=1)
    {
        players.push( {x:(canvas.width * 0.25 + (canvas.width * i / 2) / NO_OF_PLAYERS), y:(keyPlayerHeight), speed:0 } );
    }
    for(var i = 1; i < NO_OF_PLAYERS; i+=1)
    {
        players[i].y -= i * canvas.height * 0.05;
    }

    turnVal = 0;
    turnDirection = 1;
    turnVal_atZeroFlag = 0;
    turnVal_atZeroCounter = 250;
    //console.log(turnVal, turnDirection);
}

function drawBG()
{
    // Aagayam
    ctx.fillStyle = "rgba(0,25,250,1)"; // neelam
    var imgObj = new Image();
    imgObj.src = "VidPic/projectInfinity/res/sky_ok.png"
    ctx.drawImage(imgObj, 0, 0, canvas.width, canvas.height);
    // ctx.fillRect(0,0, canvas.width, canvas.height);

    // Tharai
    ctx.fillStyle = "rgba(0,255,10,1)"; // pacchai
    var imgObj = new Image();
    imgObj.src = "VidPic/projectInfinity/res/grass_green.jpg"
    ctx.drawImage(imgObj, 0, canvas.height * 0.25, canvas.width, canvas.height);
    // ctx.fillRect(0,canvas.height*0.25, canvas.width, canvas.height);
}

function drawRoad()
{
    var turnVal_effective = (parseInt(turnVal/10)/100)
    //console.log(turnVal, turnDirection, turnVal_effective);

    ctx.beginPath();
    ctx.fillStyle = "rgba(100,20,20,1)";
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(0, keyPlayerHeight * 1.15);
        var avgx = ( canvas.width * (0.3 + turnVal_effective) + 0 ) / 2;
        var avgy = ( canvas.height * 0.25 + keyPlayerHeight * 1.15) / 2;
    ctx.quadraticCurveTo( avgx - canvas.width * (turnVal_effective), avgy, canvas.width * (0.3 + turnVal_effective), canvas.height * 0.25);
    ctx.lineTo(canvas.width * (0.7 + turnVal_effective), canvas.height * 0.25);
        avgx = ( canvas.width * (0.7 + turnVal_effective) + canvas.width ) / 2;
        avgy = ( canvas.height * 0.25 + keyPlayerHeight * 1.15) / 2;
    ctx.quadraticCurveTo(avgx - canvas.width * (turnVal_effective), avgy, canvas.width, keyPlayerHeight * 1.15);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();

    var imgObj = new Image();
    imgObj.src = "VidPic/projectInfinity/res/dark_road.jpg"
    var pat=ctx.createPattern(imgObj,"repeat");
    ctx.fillStyle=pat;
    ctx.fill();

    console.log(turnVal)
    if(treeCounter == 0)
    {
        objects.push({  x: ( canvas.width * (0.18) ) ,
                        y: canvas.height * 0,
                        dx: canvas.height * 0.01 * -1,
                        dy: canvas.height * 0.01});
        objects.push({  x: ( canvas.width * (0.75) ) ,
                        y: canvas.height * 0,
                        dx: canvas.height * 0.01,
                        dy: canvas.height * 0.01});
        treeCounter = 30;
    }
    else
    {
        treeCounter -= 1;
    }

    if (Math.abs(turnVal) == 110 && turnVal_atZeroFlag == 0)
    {
        turnVal_atZeroFlag = 1;
        if (turnDirection == 1)
        {
            turnDirection = -1;
        }
        else
        {
            turnDirection = 1;
        }
    }
    if (turnVal == 0 && turnVal_atZeroFlag == 0)
    {
        turnVal_atZeroFlag = 1;

        // objects.push({  x: ( canvas.width * (0.2) ) ,
        //                 y: canvas.height * 0,
        //                 dx: canvas.height * 0.01 * -1,
        //                 dy: canvas.height * 0.01});
        // objects.push({  x: ( canvas.width * (0.75) ) ,
        //                 y: canvas.height * 0,
        //                 dx: canvas.height * 0.01,
        //                 dy: canvas.height * 0.01});

        turnDirection = parseInt(Math.random() * 10) % 2;
        if(turnDirection == 0)
        {
            turnDirection = -1;
        }
    }

    if(turnVal_atZeroFlag == 1)
    {
        turnVal_atZeroCounter -= 1;
    }
    else
    {
        turnVal += turnDirection;
    }
    if(turnVal_atZeroCounter == 0)
    {
        turnVal_atZeroFlag = 0;
        turnVal_atZeroCounter = 150;
        turnVal += turnDirection;
    }

}

function drawTrees()
{
    ctx.fillStyle = "rgba(0,0,0,1)";

    var imgObj = new Image();
    imgObj.src = "VidPic/projectInfinity/res/tree.png"
    for(var i = 0; i < objects.length; i+=1)
    {
        ctx.drawImage(imgObj, objects[i].x, objects[i].y, 100, 250);
        objects[i].x += objects[i].dx;
        objects[i].y += objects[i].dy;
        if(objects[i].y > canvas.width)
        {
            objects.splice(i);
        }
    }
}

function drawPlayer()
{
    ctx.fillStyle = "rgba(0,0,0,1)";

    var imgObj = new Image();
    imgObj.src = "VidPic/projectInfinity/res/biker_blue.png"
    ctx.drawImage(imgObj, players[0].x, keyPlayerHeight, 50, 150);
    // ctx.fillRect(players[0].x,keyPlayerHeight, 50, 150);
    for(var i = 1; i < NO_OF_PLAYERS; i+=1)
    {
        if(players[i].y < players[0].y && players[i].y >= canvas.height * 0.10)
        {
            var imgObj = new Image();
            imgObj.src = "VidPic/projectInfinity/res/biker_red.png"
            ctx.drawImage(imgObj, players[i].x, players[i].y, 50, 150);
            ctx.fillText(i, players[i].x,players[i].y);
        }
    }
}

function updateHorizontalDirections()
{
    if(directionDriving == "LEFT")
        players[0].x -= 2;
    else if(directionDriving == "RIGHT")
        players[0].x += 2;

    if(turnVal != 0)
    {
        players[0].x -= (parseInt(turnVal/10)/10);
    }

    if(players[0].x < 0 || players[0].x > canvas.width)
    {
        players[0].x = 0.5 * canvas.width;
    }
}

function updateVerticalDirections()
{
    for(var i = 0; i < NO_OF_PLAYERS; i+=1)
    {
        players[i].y -= players[i].speed;
    }

    // but we want players[0] to update to keyPlayerHeight
    var changeInHeight = keyPlayerHeight - players[0].y;
    for(var i = 0; i < NO_OF_PLAYERS; i+=1)
    {
        players[i].y += changeInHeight;
    }
}

function reRandomizeSpeeds()
{
    for(var i = 0; i < NO_OF_PLAYERS; i+=1)
    {
        players[i].speed = Math.random() * 10;
    }
}

function main()
{
    // now = Date.now();
    drawBG();
    drawRoad();
    drawTrees();
    drawPlayer();
    updateHorizontalDirections();
    updateVerticalDirections();
    // if(now - then > 1000)
    // {
    //     then = now;
    // }
    reRandomizeSpeeds();
    requestAnimationFrame(main);
}
