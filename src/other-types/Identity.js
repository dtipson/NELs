const {I}  = require('../../src/utility/pointfree.js');

function Identity(v) {
  if (!(this instanceof Identity)) {
    return new Identity(v);
  }
  this.x = v;
}

Identity.prototype.of = x => new Identity(x);
Identity.of = Identity.prototype.of;

Identity.prototype.map = function(f) {
  return new Identity(f(this.x));
};
Identity.prototype.ap = function(app) {
  return app.map(this.x);
};
Identity.prototype.sequence = function(of){
  return this.x.map(Identity.of); 
};
Identity.prototype.traverse = function(f, of){
  return this.x.map(f).sequence(of); 
};
//fold and chain are the same thing for Identitys
Identity.prototype.chain = Identity.prototype.reduce = Identity.prototype.fold = function(f) {
  return f(this.x);
};
Identity.prototype.equals = function(that){
  return that instanceof Identity && that.x === this.x;
};

//comonad
Identity.prototype.extend = function(f) {
  return Identity(f(this));//function is given the entire type, returns a regular value, which is put back in the type
};
Identity.prototype.flatten = Identity.prototype.extract = function(){
  return this.x;
};
Identity.prototype.duplicate = function(){
  return this.extend(I)
};

module.exports = Identity;