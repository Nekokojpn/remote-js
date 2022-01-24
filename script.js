const Peer = window.Peer;
var localStream;
var cameraOffOn = 0;
var roomSe = new Audio('assets/music/sist2.mp3');
let isVideoOn = true;
let isMicOn = true;
const videoElm = document.getElementById("video-icon");
const micElm = document.getElementById("mic-icon");
var copyVideo;

// こちら側のビデオをオンオフする
function toggleVideo() {
  if (localStream) {
    let track = localStream.getVideoTracks()[0];
    if (isVideoOn) {
      isVideoOn = false;
      track.enabled = false;
      videoElm.classList.remove("text-green");
      videoElm.classList.add("text-red");
    }
    else {
      isVideoOn = true;
      track.enabled = true;
      videoElm.classList.add("text-green");
      videoElm.classList.remove("text-red");
    }
  }
}



//こちら側のマイクをオンオフする
function toggleMic() {
  if (localStream) {
    let track = localStream.getAudioTracks()[0];
    if (isMicOn) {
      isMicOn = false;
      track.enabled = false;
      //micElm.classList.remove("fa-microphone");
      micElm.classList.remove("text-green");
      // micElm.classList.add("fa-microphone-slash");
      micElm.classList.add("text-red");
    }
    else {
      isMicOn = true;
      track.enabled = true;
      // micElm.classList.add("fa-microphone");
      micElm.classList.add("text-green");
      // micElm.classList.remove("fa-microphone-slash");
      micElm.classList.remove("text-red");
    }
  }
}


(async function main() {
  const localVideo = document.getElementById('js-local-stream');
 
  const peerimg= document.getElementById('peerimg');//img
  const canvas = document.createElement("canvas");
  const arcCanvas = document.createElement("canvas");
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');
  const loader = document.getElementById("loader");
  const peervideoon = document.getElementById("peervideoon");
  const peervideooff = document.getElementById("peervideooff");
  const cameraOffline = document.getElementById("cameraOffline");

  var isInit = false;
  var coordinateTime = Date.now();

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  const getRoomModeByHash = () => 'sfu';

  roomMode.textContent = getRoomModeByHash();
  window.addEventListener(
    'hashchange',
    () => (roomMode.textContent = getRoomModeByHash())
  );

  localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
      width: 1920,
      height: 1080,
      aspectRatio: 1.777777778
    })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;


  await localVideo.play().catch(console.error);

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  


  // Register join handler
  window.setTimeout(function() {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }
    let joinFlg = true;
    peer.listAllPeers((peers) => {
      console.log(peers);
      console.log(peers.length)

      if(peers.length >= 3) {
        joinFlg = false;
        peer.destroy();
      }
    });

    if(!joinFlg)
      return;

    const room = peer.joinRoom("a", {
      mode: getRoomModeByHash(),
      stream: localStream,
    });
    
    peer.on("close", () => {
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    // for closing room members
    room.on('peerLeave', peerId => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => {
        if( track.kind && track.kind == 'video') track.contentHint = 'detail';
      });
      remoteVideo.srcObject = null;
      remoteVideo.remove();
      roomSe.play();

      messages.textContent += `=== ${peerId} left ===\n`;
    });

    room.once('open', () => {
      roomSe.play();
      messages.textContent += '=== You joined ===\n';
      loader.classList.add("loaded");
    });
    room.on('peerJoin', peerId => {
      roomSe.play();
      messages.textContent += `=== ${peerId} joined ===\n`;
    });

    // Render remote stream for new peer join in the room画面写す処理これ
    room.on('stream', async stream => {

      
      //GoogleGlass以外が入室した際の処理
      if(stream.peerId != 'GoogleGlass')
        return;
      
      //GoogleGlasが入室した際の処理
      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      newVideo.setAttribute('id', 'made-video');
      // mark peerId to find it later at peerLeave event
      newVideo.setAttribute('data-peer-id', stream.peerId);

      while(remoteVideos.firstChild) {
        remoteVideos.removeChild(remoteVideos.firstChild);
      }
      remoteVideos.append(newVideo);
      await newVideo.play().catch(console.error);

      coordinateTime = Date.now();
      //newVideo.addEventListener('mousemove',logPosition);

      document.getElementById("made-video").setAttribute("onclick", "copyVideo();");
    });
      
      room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      messages.textContent += `${src}: ${data}\n`;
      
    });

    

    // for closing myself
    room.once('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    peervideooff.addEventListener('click',cameraoff);
    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });


    // function logPosition(event) {
    //   let cur = Date.now();

    //   if(cur - coordinateTime > 200) {
    //     let msg = `cmd#%OffsetX=${event.offsetX}#%#OffsetY=${event.offsetY}`;
    //     room.send(msg);
    //     coordinateTime = Date.now();
    //     if(!isInit) {
    //       isInit = true;
    //       let v = document.getElementsByTagName("video")[1];
    //       room.send(`cmd#%InitX=${v.offsetWidth}InitY=${v.offsetHeight}#%#`);
    //     }
    //   }
      
    // }

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }
    
    // function imagequ(){
    //   room.send("cmd#%image_qu#%#");
    //   console.log("画質優先")
    //   console.log(navigator.connection.downlink);
    // }
    // function fpsqu(){
    //   room.send("cmd#%fps_qu#%#");
    //   console.log("フレームレート優先");
    // }

    function cameraoff() {
      if(cameraOffOn == 0) {
        room.send("cmd#%CameraOff#%#");
        cameraOffOn = 1;
        peervideooff.classList.remove('text-green');
        peervideooff.classList.add('text-red');
        
      }
      else { 
        room.send("cmd#%CameraOn#%#");
        cameraOffOn = 0;
        peervideooff.classList.remove('text-red');
        peervideooff.classList.add('text-green');
      }
      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }

    window.addEventListener('offline', (event) => {
      document.getElementById('cameraOffline').style = "";
    });
    window.addEventListener('online', (event) => {
      document.getElementById('cameraOffline').style = "display: none;";
    });
    
  //画面クリックで描画処理

  // copyVideo = () => {
    
  //   let ctx = canvas.getContext('2d');
  //   let arcCtx = arcCanvas.getContext('2d');

  //   const videoImage = document.getElementById("made-video");
  //   const w = videoImage.offsetWidth;
  //   const h = videoImage.offsetHeight;
  //   canvas.setAttribute("width", w);
  //   canvas.setAttribute("height", h);

  //   arcCanvas.setAttribute("width", w);
  //   arcCanvas.setAttribute("height", h);

  //   document.getElementById("js-remote-streams").append(canvas);
  //   document.getElementById("js-remote-streams").append(arcCanvas);
    
  //   ctx.drawImage(videoImage, 0, 0, w, h);

  //   //描画する処理-----------------------------
  //   var clickFlg = 0;  // クリック中の判定 1:クリック開始 2:クリック中
  //   function onMouseDown(e) {
  //     arcCtx.clearRect(0,0,w,h);
  //     arcCtx.lineWidth = 5;
  //     arcCtx.strokeStyle = 'red';
  //     arcCtx.arc(e.offsetX, e.offsetY, 10, 0, Math.PI*2,true);
  //     arcCtx.stroke();
  //     clickFlg = 1; // マウス押下開始
  //   }
  //   function onMouseUp() {
  //     clickFlg = 0;
  //   }
  //   function onMouseMove(e) {
  //     if(!clickFlg) return false;
  //     draw(e.offsetX, e.offsetY);
  //   }

  //   function draw(x, y) {
  //     // arcCtx.clearRect(0,0,w,h);
  //     // arcCtx.lineWidth = 5;
  //     // arcCtx.strokeStyle = 'red';
  //     // // 初回処理の判定
  //     // if (clickFlg == "1") {
  //     //   clickFlg = "2";
  //     //   //ctx.beginPath();
  //     //   //ctx.lineCap = "round";  //　線を角丸にする
        
        
  //     // } else {
  //     //   //ctx.lineTo(x, y);
  //     //   arcCtx.arc(x,y,50, 0, Math.PI*2,true);
  //     // }
  //     // arcCtx.clearRect(0,0,w,h);
  //     // arcCtx.stroke();
  //   };
  //   arcCanvas.addEventListener('mousedown', onMouseDown, false);
  //   arcCanvas.addEventListener('mouseup', onMouseUp, false);
  //   arcCanvas.addEventListener('mousemove', onMouseMove, false);
    
  //   //-------------------------------------------------
    
  //   peerimg.style = "display: none;"
  //   peerimg.src = canvas.toDataURL('image/png');
    
  // };
  }, 3000);
  peer.on('error', console.error);
  
})();
