'use strict';

var watch = require('chokidar').watch;

var watcher;

function noop(){}

function onEvent(event, path, stat){
  process.send({
    event: event,
    path: path,
    stat: stat
  });
}

function onReady(){
  process.send({
    event: 'ready'
  });
}

function onRaw(){
  process.send({
    event: 'raw',
    args: arguments
  });
}

function start(paths, opts){
  if(!watcher){
    watcher = watch(paths, opts);

    watcher.on('all', onEvent);
    watcher.on('ready', onReady);
    watcher.on('raw', onRaw);
  }
}

function add(paths){
  if(watcher){
    watcher.add(paths);
  }
}

function remove(paths){
  if(watcher){
    watcher.unwatch(paths);
  }
}

function onMessage(msg){
  switch(msg.type){
    case 'START':
      start(msg.paths, msg.opts);
      break;
    case 'ADD':
      add(msg.paths);
      break;
    case 'REMOVE':
      remove(msg.paths);
      break;
  }
}

function onDisconnect(){
  process.exit();
}

process.on('message', onMessage);
process.on('error', noop);
process.on('disconnect', onDisconnect);
