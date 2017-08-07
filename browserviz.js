//----------------------------------------------------------------------------------------------------
// These javascript functions and variables are arranged into a simple module so that
// implementation details are kept separate from the public API.
// common services and utility functions are provided here:
//
// -- socket creation and initialization
//    a websocket is created here which "points back" to the server which loads the web page
//    in which this script is contained.   this presumes, as is the case with the R httpuv
//    server used in the BrowserViz R base class, that the websocket server
//      a) begins life as an http server, serving up an initial web page (containing this script)
//      b) then promotes itself from the http:// protocol to the ws:// protocol, after which
//      c) it listens for incoming websocket JSON messages
//
// -- a registry and lookup up service ("dispatchOptions") which dispatches incoming
//    JSON messages to functions registered to handle them
//
// -- the means to register functions to be called when the web page (the one which includes the script)
//    is completely loaded and ready.
//
// -- the means to register functions to be called when the socket connection is open and fully
//    functioning.   for instance, you don't want to run any javascript functions which make
//    websocket requests on the server until the socket is ready
//
// -- a send function, hiding a few details of the socket.send function
//
// -- some very simple browser window operations
//    getBrowserInfo, getWindowTitle, setWindowTitle, getWindowSize
//
//
//----------------------------------------------------------------------------------------------------
var BrowserViz = {

    onDocumentReadyFunctions:  [],
    name: "node BrowserViz",
    dispatchOptions: {},
    socketConnectedFunctions: [],
    socketURI: null,
    socket: null,

//----------------------------------------------------------------------------------------------------
getName: function()
{
    return(this.name);
},
//----------------------------------------------------------------------------------------------------
setupSocket: function(socket)
{
  var app = this;

  try {
     socket.onopen = function() {
        console.log("=== BrowserViz.js, websocket connection now open.");
        //for(var f=0; f < this.socketConnectedFunctions.length; f++){
        //   console.log("calling the next sockectConnectedFunction");
        //   this.socketConnectedFunctions[f]();
        //   } // for f
        } // socket.onopen

     socket.onmessage = function got_packet(msg) {
        var msg = JSON.parse(msg.data)
        console.log("=== BrowserViz.js, message received: " + msg.cmd);
        app.dispatchMessage(msg)
        } // socket.onmessage, got_packet

     socket.onclose = function(){
        console.log("socket closing");
        } // socket.onclose
     } // try
  catch(exception) {
    console.log("Error: " + exception);
    }

  return(socket);

}, // setupSocket
//----------------------------------------------------------------------------------------------------
addSocketConnectedFunction: function (func)
{
   this.socketConnectedFunctions.push(func)

}, // addSocketConnectedFunction
//----------------------------------------------------------------------------------------------------
getSocketConnectedFunctions: function ()
{
   return(this.socketConnectedFunctions)

}, // getSocketConnectedFunction
//----------------------------------------------------------------------------------------------------
setupBasicMessageHandlers: function ()
{
   var app = this;
   this.addMessageHandler("ready", function(){app.ready()});
   this.addMessageHandler("getBrowserInfo", this.getBrowserInfo);
   this.addMessageHandler("getWindowTitle", this.getWindowTitle);
   this.addMessageHandler("setWindowTitle", this.setWindowTitle);
   this.addMessageHandler("getWindowSize",  this.getWindowSize);

}, // setupBasicMessageHandlers
//----------------------------------------------------------------------------------------------------
addOnDocumentReadyFunction: function (func)
{
   console.log("== localhost addOnDocumentReadyFunction");
   console.log("   typeof(func): " + typeof(func));
   //console.log(func);

   this.onDocumentReadyFunctions.push(func)

   console.log("== after push, count: " + this.onDocumentReadyFunctions.length);
   //console.log(func);
   //console.log("func, stored");
   //console.log(this.onDocumentReadyFunctions[0]);

}, // addOnDocumentReadyFunction
//----------------------------------------------------------------------------------------------------
getOnDocumentReadyFunctions: function ()
{
   return(this.onDocumentReadyFunctions)

}, // getOnDocumentReadyFunctions
//----------------------------------------------------------------------------------------------------
runOnDocumentReadyFunctions: function ()
{
  var funcs = getOnDocumentReadyFunctions()

  for (var f = 0; f < funcs.length; f++) {
     console.log("local BrowserViz, calling on ready function");
     funcs[f]();
     }

}, // runOnDocumentReadyFunctions
//----------------------------------------------------------------------------------------------------
initializeWebSocket: function ()
{
   console.log("browserViz.js, initializeWebSocket, uri: " + this.socketURI);
   var socket = new WebSocket(this.socketURI);
   this.socket = this.setupSocket(socket);

}, // initializeWebSocket
//----------------------------------------------------------------------------------------------------
getSocket: function ()
{
  return(socket);

}, // getSocket
//----------------------------------------------------------------------------------------------------
addMessageHandler: function (cmd, func)
{
  if(cmd in this.dispatchOptions){
     this.dispatchOptions[cmd].push(func)
     }
  else{
     this.dispatchOptions[cmd] = [func]
     }

}, // addMessageHandler
//----------------------------------------------------------------------------------------------------
getRegisteredHandlers: function ()
{
   return(Object.keys(this.dispatchOptions));

}, // getRegisteredHandlers
//----------------------------------------------------------------------------------------------------
dispatchMessage: function (msg)
{
   var cmd = msg.cmd;
   console.log("=== BrowserViz.js, dispatchMessage: " + cmd);
   var status = msg.status;

   if(Object.keys(this.dispatchOptions).indexOf(cmd) == -1){
      console.log("unrecognized socket request: " + msg.cmd);
      }
   else{
     var funcs = this.dispatchOptions[cmd];
      for(var i=0; i < funcs.length; i++){
         console.log("  dispatching for " + msg.cmd);
         funcs[i](msg); // dispatchOptions[msg.cmd](msg)
         } // for i
      }

},  // dispatchMessage
//----------------------------------------------------------------------------------------------------
send: function (msg)
{
   console.log("=== BrowserViz send: " + msg.cmd);
   this.socket.send(JSON.stringify(msg));

},  // send
//----------------------------------------------------------------------------------------------------
setTitle : function (newTitle)
{
  window.document.title = newTitle;

},  // setTitle
//----------------------------------------------------------------------------------------------------
intersectionOfArrays: function (a, b)
{
   var result = a.filter(function(n) {console.log(n); return (b.indexOf(n) != -1)})
   return(result);

}, // intersectionOfArrays
//----------------------------------------------------------------------------------------------------
ready: function ()
{
    var app = this;
   console.log("=== browserViz, running ready function");
   //console.log("   incoming msg:")
   //console.log(msg)
   return_msg = {cmd: "handleResponse", status: "success", callback: "", payload: "ready"};
   console.log("about to send...");
   console.log(return_msg);
   console.log("ready's notion of this:")
   console.log(app)

   app.send(return_msg);

}, // ready
//----------------------------------------------------------------------------------------------------
getBrowserInfo: function (msg)
{
   this.send({cmd: msg.callback, status: "success", callback: "", payload: navigator.userAgent});

}, // getBrowserInfo
//----------------------------------------------------------------------------------------------------
getWindowTitle: function (msg)
{
   this.send({cmd: msg.callback, status: "success", callback: "",payload: window.document.title});

}, // getWindowTitle
//----------------------------------------------------------------------------------------------------
setWindowTitle: function (msg)
{
   console.log(msg)
   var payload = msg.payload;
   console.log(payload)
   var newTitle = payload.title;
   var proclaim = payload.proclaim;
   window.document.title = newTitle;

   if(proclaim == true){
      console.log("proclaim: " + proclaim +  "   title: " + newTitle);
      var html = " &nbsp; <h2 style='margin:50px;'>" + newTitle + " </h2>";
      document.getElementById("browserVizDiv").innerHTML = html;
      }

   this.send({cmd: msg.callback, status: "success", callback: "", payload: window.document.title});

}, // setWindowTitle
//----------------------------------------------------------------------------------------------------
getWindowSize: function (msg)
{
   var width = $(window).width()
   var height = $(window).height()
   return_msg = {cmd: msg.callback, status: "success",
                 callback: "", payload: JSON.stringify({width:width, height: height})};
   this.send(return_msg);

}, // getWindowSize
//----------------------------------------------------------------------------------------------------
init: function ()
{
   console.log("=== starting bv.init")
   this.socketURI = window.location.href.replace("http://", "ws://");
   this.setupBasicMessageHandlers();
   this.initializeWebSocket()
   console.log("=== concluding bv.init")

}, // init
//----------------------------------------------------------------------------------------------------
start: function ()
{
  console.log("=== starting bv.start");
  var app = this;
  var onReadyFunctions = app.getOnDocumentReadyFunctions()
  console.log(" onReadyFunction count: " + onReadyFunctions.length)

  for(var i=0; i < onReadyFunctions.length; i++){
     var f = onReadyFunctions[i];
     console.log("about to run next onReady function")
     f();
     console.log(" after running next onReady function")
     }

  //$(document).ready(app.runOnDocumentReadyFunctions);

  console.log("=== concluding bv.start");

}  // start
//----------------------------------------------------------------------------------------------------
}; // BrowserViz object

module.exports = BrowserViz;
