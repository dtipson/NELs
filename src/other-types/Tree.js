const {Any, Max}  = require('../../src/other-types/monoids.js');
const {foldMap}  = require('../../src/utility/pointfree.js');

//straight from
//http://joneshf.github.io/programming/2015/12/31/Comonads-Monoids-and-Trees.html
//https://gitter.im/ramda/ramda?at=567c02983acb611716ffac24

function Tree(){}

const Leaf = function(val, ann){
  if (!(this instanceof Leaf)) {
    return new Leaf(val, ann);
  }
  Object.assign(this, {val, ann});
}
Leaf.prototype = Object.create(Tree.prototype);
Leaf.prototype.toString = function(){
  return ` Leaf(${this.val}, ${this.ann})`;
};
Leaf.prototype.toJSON = function(){
  return this.ann;
};
Leaf.prototype.map = function(f){
  return new Leaf(this.val, f(this.ann));
};
Leaf.prototype.extend = function(f){
  return new Leaf(this.val, f(Leaf(this.val, this.ann)));
};
Leaf.prototype.extract = function(){
  return this.ann;
};
Leaf.prototype.reduce = function(f, acc){
  return f(acc, this.ann);
};
Leaf.prototype.concat = function(l){
  return this.ann.concat(l.ann);
};
// Leaf : val -> ann -> Tree val ann
// function Leaf(val, ann) {
//   return {
//     ann: ann,
//     val: val,
//     toString: () => ` Leaf(${val}, ${ann})`,
//     map: f => Leaf(val, f(ann)),
//     extend: f => Leaf(val, f(Leaf(val, ann))),
//     extract: _ => val,
//     reduce: (f, acc) => f(acc, ann),
//   };
// }

const Branch = function(left, right, ann){
  if (!(this instanceof Branch)) {
    return new Branch(left, right, ann);
  }
  Object.assign(this, {left, right, ann});
}
Branch.prototype = Object.create(Tree.prototype);

Branch.prototype.toString = function(){
  return ` Branch(${this.ann}\n  ${this.left},\n  ${this.right}\n )`;
};

Branch.prototype.toJSON = function(){
  return {left:this.left.toJSON(),right:this.right.toJSON(),ann: this.ann};
};


Branch.prototype.map = function(f){
  return new Branch(this.left.map(f), this.right.map(f), f(this.ann));
};
Branch.prototype.extend = function(f){
  return new Branch(this.left.extend(f), this.right.extend(f), f(Branch(this.left, this.right, this.ann)));
};
Branch.prototype.extract = function(){
  return this.ann;
};
Branch.prototype.reduce = function(f, acc){
  return this.right.reduce(f, this.left.reduce(f, f(acc, this.ann)));
};
Branch.prototype.concat = function(b){
  return this.ann.concat(b.ann);
};

Branch.prototype.allAnnotations = function(b){
  return this.reduce((acc, x) => acc.concat(x), []);
};
Branch.prototype.hasChild = function(searchStr){
  return this.reduce((acc, x) => acc || (x===searchStr && x) || false, false);
};
Branch.prototype.findChild = function(searchStr){
  return this.extend(x=>x.ann);
};

// Branch : Tree val ann -> Tree val ann -> ann -> Tree val ann
// function Branch(left, right, ann) {
//   return {
//     ann: ann,
//     left: left,
//     right: right,
//     toString: () => ` Branch(${ann}\n  ${left},\n  ${right}\n)`,
//     map: f => Branch(left.map(f), right.map(f), f(ann)),
//     extend: f =>
//       Branch(left.extend(f), right.extend(f), f(Branch(left, right, ann))),
//     reduce: (f, acc) => right.reduce(f, left.reduce(f, f(acc, ann))),
//   };
// }

// changed : Tree val Bool -> Bool
const changed = tree => foldMap(Any, Any, tree).x;

const largest = tree => foldMap(Max, Max, tree).x;

const longestAnnotation = tree => tree.reduce((acc, x)=> acc.length>x.length? acc :x ,'');

//extend can modify "ann" without altering the underlying data, so that you can run an op on an extended structure as if it were a new tree without altering the old one at all!
//it's an immutable tree, in short

//this picks the right branch, then extends what the ann should be there by using the context of the entire branch to pick the rightside value.  Then extract returns this "updated" ann at that location.
//tree.right.extend(tr=>tr.right && tr.right.val).extract()


module.exports = {
  Leaf, Branch, changed, largest, longestAnnotation
};