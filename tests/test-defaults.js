var server = require('./server')
  , assert = require('assert')
  , request = require('../index')
  ;

var s = server.createServer();

s.listen(s.port, function () {
  var counter = 0;
  s.on('/get', function (req, resp) {
    assert.equal(req.headers.foo, 'bar');
    assert.equal(req.method, 'GET')
    resp.writeHead(200, {'Content-Type': 'text/plain'});
    resp.end('TESTING!');
  });

  // test get(string, function)
  request.defaults({headers:{foo:"bar"}})(s.url + '/get', function (e, r, b){
    if (e) throw e;
    assert.deepEqual("TESTING!", b);
    counter += 1;
  });

  s.on('/merge-headers', function (req, resp) {
    assert.equal(req.headers.foo, 'bar')
    assert.equal(req.headers.merged, 'yes')
    resp.writeHead(200)
    resp.end()
  });

  request.defaults({
    headers:{foo:"bar", merged:"no"}
  })(s.url + '/merge-headers', {
    headers:{merged:"yes"}
  }, function (e, r, b){
    if (e) throw e
    assert.equal(r.statusCode, 200)
    counter += 1
  });

  s.on('/post', function (req, resp) {
    assert.equal(req.headers.foo, 'bar');
    assert.equal(req.headers['content-type'], null);
    assert.equal(req.method, 'POST')
    resp.writeHead(200, {'Content-Type': 'application/json'});
    resp.end(JSON.stringify({foo:'bar'}));
  });

  // test post(string, object, function)
  request.defaults({headers:{foo:"bar"}}).post(s.url + '/post', {json: true}, function (e, r, b){
    if (e) throw e;
    assert.deepEqual('bar', b.foo);
    counter += 1;
  });

  s.on('/patch', function (req, resp) {
    assert.equal(req.headers.foo, 'bar');
    assert.equal(req.headers['content-type'], null);
    assert.equal(req.method, 'PATCH')
    resp.writeHead(200, {'Content-Type': 'application/json'});
    resp.end(JSON.stringify({foo:'bar'}));
  });

  // test post(string, object, function)
  request.defaults({headers:{foo:"bar"}}).patch(s.url + '/patch', {json: true}, function (e, r, b){
    if (e) throw e;
    assert.deepEqual('bar', b.foo);
    counter += 1;
  });

  s.on('/post-body', function (req, resp) {
    assert.equal(req.headers.foo, 'bar');
    assert.equal(req.headers['content-type'], 'application/json');
    assert.equal(req.method, 'POST')
    resp.writeHead(200, {'Content-Type': 'application/json'});
    resp.end(JSON.stringify({foo:'bar'}));
  });

  // test post(string, object, function) with body
  request.defaults({headers:{foo:"bar"}}).post(s.url + '/post-body', {json: true, body:{bar:"baz"}}, function (e, r, b){
    if (e) throw e;
    assert.deepEqual('bar', b.foo);
    counter += 1;
  });

  s.on('/del', function (req, resp) {
    assert.equal(req.headers.foo, 'bar');
    assert.equal(req.method, 'DELETE')
    resp.writeHead(200, {'Content-Type': 'application/json'});
    resp.end(JSON.stringify({foo:'bar'}));
  });

  // test .del(string, function)
  request.defaults({headers:{foo:"bar"}, json:true}).del(s.url + '/del', function (e, r, b){
    if (e) throw e;
    assert.deepEqual('bar', b.foo);
    counter += 1;
  });

  s.on('/head', function (req, resp) {
    assert.equal(req.headers.foo, 'bar');
    assert.equal(req.method, 'HEAD')
    resp.writeHead(200, {'Content-Type': 'text/plain'});
    resp.end();
  });

  // test head.(object, function)
  request.defaults({headers:{foo:"bar"}}).head({uri: s.url + '/head'}, function (e, r, b){
    if (e) throw e;
    counter += 1;
  });

  s.on('/get_recursive1', function (req, resp) {
    assert.equal(req.headers.foo, 'bar1');
    assert.equal(req.method, 'GET');
    resp.writeHead(200, {'Content-Type': 'text/plain'});
    resp.end('TESTING!');
  });

  s.on('/get_recursive2', function (req, resp) {
    assert.equal(req.headers.foo, 'bar1');
    assert.equal(req.headers.baz, 'bar2');
    assert.equal(req.method, 'GET');
    resp.writeHead(200, {'Content-Type': 'text/plain'});
    resp.end('TESTING!');
  });

  // test recursive defaults (string, function)
  var defaultsOne = request.defaults({headers:{foo:"bar1"}});
  var defaultsTwo = defaultsOne.defaults({headers:{baz:"bar2"}});
  
  defaultsOne(s.url + '/get_recursive1', function (e, r, b){
    if (e) throw e;
    assert.deepEqual("TESTING!", b);
    counter += 1;
  });

  defaultsTwo(s.url + '/get_recursive2', function (e, r, b){
    if (e) throw e;
    assert.deepEqual("TESTING!", b);
    counter += 1;
  });

  s.on('/get_custom', function(req, resp) {
    assert.equal(req.headers.foo, 'bar');
    assert.equal(req.headers.x, 'y');
    resp.writeHead(200, {'Content-Type': 'text/plain'});
    resp.end();
  });

  // test custom request handler function
  var defaultRequest = request.defaults({
    headers:{foo:"bar"}
    , body: 'TESTING!'
  }, function(uri, options, callback) {
    var params = request.initParams(uri, options, callback);
    options = params.options;
    options.headers.x = 'y';

    return request(params.uri, params.options, params.callback);
  });

  s.on('/set-undefined', function (req, resp) {
    assert.equal(req.method, 'POST')
    assert.equal(req.headers['content-type'], 'application/json');
    assert.equal(req.headers['x-foo'], 'baz');
    var data = '';
    req.on('data', function(d) {
      data += d;
    });
    req.on('end', function() {
      resp.writeHead(200, {'Content-Type': 'application/json'});
      resp.end(data);
    });
  });

  // test only setting undefined properties
  request.defaults({method:'post',json:true,headers:{'x-foo':'bar'}})({uri:s.url + '/set-undefined',json:{foo:'bar'},headers:{'x-foo':'baz'}}, function (e, r, b){
    if (e) throw e;
    assert.deepEqual({foo:'bar'}, b);
    counter += 1;
  });

  var msg = 'defaults test failed. head request should throw earlier';
  assert.throws(function() {
    defaultRequest.head(s.url + '/get_custom', function(e, r, b) {
      throw new Error(msg);
    });
    counter+=1;
  }, msg);

  defaultRequest.get(s.url + '/get_custom', function(e, r, b) {
    if(e) throw e;
    counter += 1;
    console.log(counter.toString() + " tests passed.");
    s.close();
  });
})
