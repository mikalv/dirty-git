var Stream = require( 'stream' )
var inherit = require( 'derive' ).inherit
var path = require( 'path' )
var exec = require( 'child_process' ).execFile

/**
 * Status constructor
 * @returns {Status}
 */
function Status( options ) {
  
  if( !(this instanceof Status) )
    return new Status( options )
  
  options = this.options = options || {}
  options.objectMode = true
  options.highWatermark = 1
  options.ignored = options.ignored != null ?
    options.ignored : false
  options.untracked = options.untracked != null ?
    options.untracked : false
  
  Stream.Transform.call( this, options )
  
}

Status.parseBranch = function( line ) {
  var pattern = /##\s+([^\s\.]+)(?:\.+([^\s]+))?/
  var info = pattern.exec( line )
  return !info ? {} : {
    index: info[1],
    remote: info[2]
  }
}

Status.parseStatus = function( line ) {
  return {
    index: line[0],
    tree: line[1],
    path: line.substring( 3 ),
  }
}

Status.parseOutput = function( str ) {
  return str
    .replace( /^\s+|\s+$/, '' )
    .split( /\r?\n/g )
    .map( function( line, i ) {
      return ( i === 0 ) ?
        Status.parseBranch( line ) :
        Status.parseStatus( line )
    })
}

/**
 * Status prototype
 * @type {Object}
 */
Status.prototype = {
  
  constructor: Status,
  
  _getStatus: function( dir, done ) {
    
    var argv = [ 'status', '--porcelain', '-b' ]
    
    // List ignored files as well
    if( this.options.ignored )
      argv.push( '--ignored' )
    
    // List all untracked files
    if( this.options.untracked )
      argv.push( '--untracked-files=all' )
    
    return exec( 'git', argv, { cwd: dir }, done )
  },
  
  _transform: function( data, encoding, next ) {
    
    var root = path.join( data.path, '..' )
    
    this._getStatus( root, function( error, output ) {
      var status = Status.parseOutput( output )
      next( null, {
        branch: status.shift(),
        status: status,
        path: root,
        relativePath: path.relative( data.base, root ),
        error: error,
      })
    })
    
  }
  
}

// Inherit from transform stream
inherit( Status, Stream.Transform )

// Exports
module.exports = Status