'use strict';

var fs = require('fs');
var path = require('path');
var util = require('util');
var cp = require('child_process');
var EventEmitter = require('events').EventEmitter;

var clone = require('lodash/lang/clone');
var assign = require('lodash/object/assign');

var childPath = path.join(__dirname, 'child.js');

function noop(){}

function start(child, paths, opts){
  child.send({
    type: 'START',
    paths: paths,
    opts: opts
  });
}

function add(child, paths){
  child.send({
    type: 'ADD',
    paths: paths
  });
}

function remove(child, paths){
  child.send({
    type: 'REMOVE',
    paths: paths
  });
}

function CharmeleonWatcher(opts){
  delete require.cache[__filename];
  this._childCwd = path.dirname(module.parent.filename);

  this.closed = false; // from chokidar
  this._child = null;
  this._paths = [];
  this._opts = clone(opts);
}

util.inherits(CharmeleonWatcher, EventEmitter);

CharmeleonWatcher.prototype._startChild = function(){
  var self = this;

  if(this.closed){
    return this;
  }

  if(this._child){
    return this;
  }

  this._child = cp.fork(childPath, { cwd: this._childCwd });

  this._child.on('message', function(msg){
    if(msg.event === 'raw'){
      self.emit.apply(self, ['raw'].concat(msg.args));
      return;
    }

    if(msg.event === 'ready'){
      self.emit('ready');
      return;
    }

    var evt = msg.event;
    var evtPath = msg.path;
    var evtStats;
    if(msg.stat){
      evtStats = new fs.Stats();
      assign(evtStats, msg.stat);
    }

    self.emit(evt, evtPath, evtStats);
    self.emit('all', evt, evtPath, evtStats);
  });

  this._child.on('error', noop);
  this._child.on('exit', function(){
    if(self.closed){
      return;
    }

    self._child = null;
    self._startChild();
  });

  start(this._child, this._paths, this._opts);
};

CharmeleonWatcher.prototype.add = function(paths){
  if(this.closed){
    return this;
  }

  this._paths = this._paths.concat(paths);

  if(!this._child){
    this._startChild();
    return this;
  }

  add(this._child, paths);

  return this;
};

CharmeleonWatcher.prototype.unwatch = function(paths){
  if(this.closed){
    return this;
  }

  if(!this._child){
    return this;
  }

  remove(this._child, paths);

  return this;
};

CharmeleonWatcher.prototype.close = function(){
  if(this.closed){
    return this;
  }

  if(!this._child){
    return this;
  }

  this.closed = true;
  this._child.kill();

  return this;
};

function watch(paths, opts){
  return new CharmeleonWatcher(opts).add(paths);
}

module.exports = {
  FSWatcher: CharmeleonWatcher,
  watch: watch
};
