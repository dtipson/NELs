(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

//native prototype enhancements
require('./src/other-types/Promise-helpers.js');

Object.assign(
  window, 
  require('./src/NonEmptyList.js'),
  require('./src/NonEmptyCircularList.js'),
  require('./src/NonEmptyCircularDoubleLinkedList.js'),
  require('./src/other-types/lenses.js'),
  require('./src/utility/pointfree.js'),
  require('./src/other-types/monoids.js'),
  require('./src/other-types/Tree.js'),
  require('./src/other-types/utility.js')
);
},{"./src/NonEmptyCircularDoubleLinkedList.js":2,"./src/NonEmptyCircularList.js":3,"./src/NonEmptyList.js":4,"./src/other-types/Promise-helpers.js":7,"./src/other-types/Tree.js":8,"./src/other-types/lenses.js":9,"./src/other-types/monoids.js":10,"./src/other-types/utility.js":11,"./src/utility/pointfree.js":12}],2:[function(require,module,exports){
//doubly-linked circular lists
const { walkTail, walkPrev, walkTailForever, walkPrevForever} = require('../src/utility/walkers.js');
const { chain } = require('../src/utility/pointfree.js');

//prototype
function NECDLL(){
  throw new Error('Use NECDLL.of or NECDLL.fromArray to construct a NECDLL');
}

function RingNodeD(value, prev, tail) {
  if (!(this instanceof RingNodeD)) {
    return new RingNodeD(value, tail, prev);
  }
  if(prev){
    prev.tail = this;
  }
  Object.assign(this, {value, tail:tail||this, prev: prev||this});

}
RingNodeD.prototype = Object.create(NECDLL.prototype);

NECDLL.of = x => RingNodeD(x);
NECDLL.fromArray = (array) => {
  if(!Array.isArray(array) && typeof array !=="string"){
    throw new Error(`Required first argument must be a non-empty Array or String. You passed: ${array}`);
  }
  if(!array.length){
    throw new Error('Cannot create an empty non-empty list');
  }
  const [head,...arr] = array;
  return arr.reduceRight((acc, x)=> acc.cons(x), RingNodeD(head)).prev;
};

RingNodeD.prototype.cons = function(x){
  const newhead = new RingNodeD(x), 
        oldhead = new RingNodeD(this.value);

  newhead.tail = oldhead;
  oldhead.prev = newhead;
  //simpler <-1-> to <-1,2-> case
  if(this.tail===this && this.prev===this){
    newhead.prev = oldhead;
    oldhead.tail = newhead;
  }
  //<-1,2-> to <-3,1,2-> case and beyond
  else{
    let ref = this.tail;
    let prev = oldhead;
    while(ref !== this){
      prev = new RingNodeD(ref.value, prev);//creates new node, sets prev to previous, names it prev
      ref = ref.tail;
    }
    prev.tail = newhead;
    newhead.prev = prev;
  }
  return newhead;
}

RingNodeD.prototype.concat = function(x){
  return this.cons(x).tail;
}


//comonad
NECDLL.prototype.extract = function(){
  return this.value;
}

NECDLL.prototype.extend = function(f){
  const walker = walkTail(this);
  return NECDLL.fromArray([...walker].map(x=>f(x)));
}

NECDLL.prototype.duplicate = function(i){
  return this.extend(x=>x);
}

NECDLL.prototype.map = function(f){
  const walker = walkTail(this);
  return NECDLL.fromArray([...walker].map(x=>f(x.value)));
}

NECDLL.prototype.chain = function(f){
  const walker = walkTail(this);
  return NECDLL.fromArray(
    chain(x=>f(x.value).toArray())([...walker])//switches to arrays twice, erk...
  );
}

NECDLL.prototype.ap = function(Ap){
  return this.chain(f=>Ap.map(f));
}

NECDLL.prototype.flatten = function(){
  return this.chain(x=>x instanceof NECDLL ? x : NECDLL.of(x));
}

NECDLL.prototype.reduce = function(f, acc){
  const walker = walkTail(this);
  return this.toArray().reduce(f, acc);
}

//without Array.prototype modifications
NECDLL.prototype.sequence = function(point){
  return this.tail.reduce(
    function(acc, x) {
      return ap(
        acc.map(innernel => othertype => innernel.concat(othertype) ),//puts this function in the type
        x.map(NECDLL.of)//then applies the inner othertype value to it
      );
    },
    chain(x=>point(NECDLL.of(x)))(this.value)
  );
};

NECDLL.prototype.traverse = function(f, point){
  return this.map(f).sequence(point||f);
};



NECDLL.prototype.size = function(el){
  const walker = walkTail(this);
  return [...walker].length;
}

NECDLL.prototype.at = function(index){
  if(index===0){
    return this;
  }
  const len = this.size();

  //cap
  if(index>len){
    index = index%len;
  }
  else if(index<0){
    index = -index+len;
  }

  return Array.from({length:index}).reduce((acc, x)=>acc.tail, this);

};

NECDLL.prototype.last = function(num){
  return num===undefined ? this.prev : this.at(-num);
}

NECDLL.prototype.next = function(num){
  return num===undefined ? this.tail : this.at(num);
}

NECDLL.prototype.join = function(separator=','){
  const walker = walkTail(this);
  return [...walker].map(x=>x.value).join(separator);
}

NECDLL.prototype.toString = function(separator=','){
  const walker = walkTail(this);
  return `<-${[...walker].map(x=>x.value).join(separator)}->`;
}

NECDLL.prototype.toArray = function(){
  const walker = walkTail(this);
  return [...walker].map(x=>x.value);
}

//return a generator.  Remember, without the horizon, it's INFINITE, so use it wisely, do not [...x] it or else you will die
NECDLL.prototype.toGenerator = function(horizon){
  return walkTailForever(this, horizon);
}

NECDLL.prototype.toReverseGenerator = function(horizon){
  return walkPrevForever(this, horizon);
}

//Non-standard extends!

//nearest values in an array, defaults to 2 nearest, when implemented, num can be a slice up to the entire array
NECDLL.prototype.extendNear = function(f, num){
  if(num){
    throw new Error("num not implemented yet");
  }
  const walker = walkTail(this);
  return NECDLL.fromArray([...walker].map(x=>f([x.prev.value,x.value,x.tail.value])));
}

//NECDLL.fromArray(window.crypto.getRandomValues(new Int8Array(68)).map(x=>x>=0?1:0)).extend(dll=>[...NECDLL.walkTail(dll)].slice(0,10).map(x=>x.value).reduce((acc,x)=>acc+x,0)).toString()

//this needs to give the entire list, finitely, as an array, starting from each node, from it to the prev
NECDLL.prototype.extendAsArray = function(f){
  //throw Error ('not working yet');
  const walker = walkTail(this);
  return NECDLL.fromArray([...walker].map(x=>f(x.toArray())));//not right yet
}





module.exports = {
  NECDLL
};

},{"../src/utility/pointfree.js":12,"../src/utility/walkers.js":13}],3:[function(require,module,exports){
//single-linked circular lists
const { walkTail, walkTailValues, walkTailForever } = require('../src/utility/walkers.js');
const { chain } = require('../src/utility/pointfree.js');


function NECL(){}

function Solo(value) {
  if (!(this instanceof Solo)) {
    return new Solo(value);
  }
  Object.assign(this, {value, tail: this});
  return this;
}
Solo.prototype = Object.create(NECL.prototype);

function RingNode(value, tail) {
  if (!(this instanceof RingNode)) {
    return new RingNode(value, tail);
  }
  Object.assign(this, {value, tail});
  if(tail){
    tail.tail = this;
  }
  return this;
}
RingNode.prototype = Object.create(NECL.prototype);

//pure ->1->
Solo.prototype.cons = function(x){
  return new RingNode(x, RingNode(this.value));
}

//pure
RingNode.prototype.cons = function(x){
  const newhead = new RingNode(x),
        oldhead = new RingNode(this.value);

  newhead.tail = oldhead;
  let ref = this.tail;
  let prev = oldhead;
  while(ref !== this){
    prev = prev.tail = new RingNode(ref.value);
    ref = ref.tail;
  }
  return prev.tail = newhead;
}

//concat can fall back to cons()+.tail
//needs to handle ring splices
NECL.prototype.concat = function(val){
  return this.cons(val instanceof NECL ? val.value : val).tail;
}

NECL.prototype.last = function(num){
  if(num===undefined){
    const walker = walkTail(this);
    return [...walker].pop().value;
  }else{
    let len = this.size();
    return this.at(len-num);
  }
}

NECL.prototype.size = function(el){
  const walker = walkTail(this);
  return [...walker].length;
}

NECL.prototype.next = function(num){
  return num===undefined ? this.tail.value : this.at(num);
}

NECL.prototype.extract = function(){
  return this.value;
}

//this needs to go through each item and pass it the entire list starting from _its_ perspective
NECL.prototype.extend = function(f){
  const walker = walkTail(this);
  return NECL.fromArray([...walker].map(x=>f(x)));
}

NECL.prototype.duplicate = function(i){
  return this.extend(x=>x);
}


Solo.prototype.map = function(f){
  return new Solo(f(this.value), this.tail);
}

//super duper cheating.... or the only way to make it work?
RingNode.prototype.map = function(f){
  const walker = walkTail(this);
  return NECL.fromArray([...walker].map(x=>f(x.value)));
}

Solo.prototype.chain = function(f){
  return f(this.value);
}

RingNode.prototype.chain = function(f){
  const walker = walkTail(this);
  return NECDLL.fromArray(
    chain(x=>f(x.value).toArray())([...walker])//switches to arrays twice, erk...
  );
}

NECL.prototype.ap = function(Ap){
  return this.chain(f=>Ap.map(f));
}



Solo.prototype.reduce = function(f, acc){
  return f(acc, this.value);
}
RingNode.prototype.reduce = function(f, acc){
  const walker = walkTail(this);
  return this.toArray().reduce(f, acc);
}

Solo.prototype.sequence = function(point){
  return chain(x=>point(NECL.of(x)))(this.value);
}
RingNode.prototype.sequence = function(point){
  return this.tail.reduce(
    function(acc, x) {
      return ap(
        acc.map(innernel => othertype => innernel.concat(othertype) ),//puts this function in the type
        x.map(NECL.of)
      );//then applies the inner othertype value to it
    },
    chain(x=>point(NECL.of(x)))(this.value)
  );
};

NECL.prototype.traverse = function(f, point){
  return this.map(f).sequence(point||f);
};

NECL.prototype.at = function(index){
  if(index===0){
    return this.value;
  }
  const len = this.size();

  //cap
  if(index>len){
    index = index%len;
  }
  else if(index<0){
    index = -index+len;
  }

  return Array.from({length:index}).reduce((acc, x)=>acc.tail, this).value;

};

Solo.prototype.toString = function(el){
  return `->${this.value}->`;
}
RingNode.prototype.toString = function(separator=','){
  const walker = walkTail(this);
  return `<-${[...walker].map(x=>x.value).join(separator)}->`;
}

NECL.prototype.join = function(separator=','){
  const walker = walkTail(this);
  return [...walker].map(x=>x.value).join(separator);
}



Solo.prototype.toArray = function(el){
  return [this.value];
}
RingNode.prototype.toArray = function(el){
  const walker = walkTailValues(this);
  return [...walker];
}

//return a generator.  Remember, without the horizon, it's INFINITE, so use it wisely, do not [...x] it or else you will die
NECL.prototype.toGenerator = function(horizon){
  return walkTailForever(this, horizon);
}

NECL.of = x => new Solo(x);
NECL.fromArray = (array) => {
  if(!Array.isArray(array) && typeof array !=="string"){
    throw new Error(`Required first argument must be a non-empty Array or String. You passed: ${array}`);
  }
  if(!array.length){
    throw new Error('Cannot create an empty non-empty list');
  }
  const [head,...arr] = array;
  return arr.reduce((acc, x)=> acc.concat(Solo(x)), Solo(head));
};


//this needs to give the entire list, finitely, as an array, starting from each node, from it to the prev
NECL.prototype.extendAsArray = function(f){
  //throw Error ('not working yet');
  const walker = walkTail(this);
  return NECL.fromArray([...walker].map(x=>f(x.toArray())));//not right yet
}


module.exports = {
  NECL
}

},{"../src/utility/pointfree.js":12,"../src/utility/walkers.js":13}],4:[function(require,module,exports){
const { iterateTail, walkTailValuesForever } = require('../src/utility/walkers.js');

//create an (empty) prototype
function NEL(){
  throw new Error('Use NEL.of or NEL.fromArray to construct a NEL');
}

//create a type to hold single values
function One(value) {
  if (!(this instanceof One)) {
    return new One(value);
  }
  Object.assign(this, {
    value,
    length: 1, 
    [Symbol.iterator]: iterateTail
  });
};
One.prototype = Object.create(NEL.prototype);

//create a type that can hold a value AND point to another value
function Many(value, tail) {
  if (!(this instanceof Many)) {
    return new Many(value, tail);
  }
  Object.assign(this, {
    value,
    tail,
    length:tail.length+1,
    [Symbol.iterator]: iterateTail
  });
}
Many.prototype = Object.create(NEL.prototype);

// lift a single value up into the type
// of :: x -> NEL[x]
NEL.of = x => new One(x);

//prepend a value, creating a new NEL
// cons :: NEL[a] -> b => NEL[b,a]
//pure, does not mutate because lower nodes are not "affected": they're just linked to by reference.
NEL.prototype.cons = function(newHeadValue){
  return new Many(newHeadValue, this);
}

//here, note that only a One ever actually performs the actual concat operation. A Many delegates the operation to
//its tail, which then creates a new Many with the same value, then delegates concat to its tail... which keeps going until it hits a "One"
//the result is a completely new chain
//concat  :: One[a] -> (b | NEL[...b]) -> Many[a, ...b]
One.prototype.concat = function(otherNEL){
    return new Many(this.value, otherNEL instanceof NEL ? otherNEL : One(otherNEL));
}
Many.prototype.concat = function(otherNEL){
  return new Many(this.value, this.tail.concat(otherNEL));
}

//this is mostly to stay in sync with circular methods: a static length prop works fine with NELs
One.prototype.size = function(){
  return 1;
}
Many.prototype.size = function(){
  return this.length;
}

//keeps recusively cycling through tails until it hits a One, then returns its value
// last :: NEL[a...z] -> z
NEL.prototype.last = function(){
  return this.tail ? this.tail.last() : this.value;
}

//Functor
// map :: NEL[...a] ~> (a->b) ~> NEL[...b]
One.prototype.map = function(f){
  return new One(f(this.value));
}
Many.prototype.map = function(f){
  return new Many(f(this.value), this.tail.map(f));
}

// not implemented as it should return a Maybe type around the result... because it can fail!
// NEL.prototype.filter = function(f){
//   const maybeHead = f(this.value) ? Just(One(this.value)) : Nothing;
//   return this.tail ? maybeHead.concat(this.tail.filter(f)) : maybeHead;
// }

// this could also potentially fail, as empty lists aren't allowed
// slice :: NEL[a,b,c,d...] -> Int(|Int) -> NEL[b,c]
NEL.prototype.slice = function(begin, end) {
  // IE < 9 gets unhappy with an undefined end argument
  end = (typeof end !== 'undefined') ? end : this.length;

  // For array like object we handle it ourselves.
  let i, cloned, size, len = this.size();

  // Handle negative value for "begin"
  let start = begin || 0;
  start = (start >= 0) ? start : Math.max(0, len + start);

  // Handle negative value for "end"
  let upTo = (typeof end == 'number') ? Math.min(end, len) : len;
  if (end < 0) {
    upTo = len + end;
  }

  // Actual expected size of the slice
  size = upTo - start;

  if (size > 0) {
    cloned = One(this.charAt(start));
    for (i = 1; i < size; i++) {
      cloned = cloned.concat(One(this.at(start + i)));
    }
    return cloned;
  }else{
    throw new Error(`Cannot return an empty non-empty list from [${this.toString()}].slice(${begin}-${end})`)
  }

};

//Folds

One.prototype.reduce = function(f, acc){
  return f(acc, this.value);
}
Many.prototype.reduce = function(f, acc){
  return this.tail.reduce(f, f(acc, this.value));
}

One.prototype.reduceRight = function(f, acc){
  return f(acc, this.value);
}
Many.prototype.reduceRight = function(f, acc){
  return f(this.tail.reduceRight(f, acc), this.value);
}

//Traversables
// sequence :: NEL[Type[a]] ~> (a->Type[a]) ~> Type[NEL[a]]
NEL.prototype.sequence = function(point){
    if(!this.tail){
      return chain(x=>point(NEL.of(x)))(this.value)
    }
    return this.tail.reduce(
      function(acc, x) {
        return ap(
          acc.map(innernel => othertype => innernel.concat(othertype) ),//puts this function in the type
          x.map(NEL.of)//then applies the inner othertype value to it
        );
      },
      chain(x=>point(NEL.of(x)))(this.value)
    );
};

NEL.prototype.traverse = function(f, point){
    return this.map(f).sequence(point||f);
};


One.prototype.flatten = NEL.prototype.extract = function(){
  return this.value;
};
Many.prototype.flatten = function(){
  return new Many(this.value.value, this.tail.flatten());
};

NEL.prototype.chain = function(f){
  return this.map(f).flatten();
};
NEL.prototype.ap = function(Ap){
  return this.chain(x=>Ap.map(x));
};

One.prototype.reverse = function(){
  return this;
};
Many.prototype.reverse = function(){
  const tailReversed = this.tail.reverse();
  return Many(
    tailReversed.value,
    !tailReversed.tail ? 
      One(this.value) : 
      tailReversed.tail.concat(One(this.value))
  );
};

One.prototype.extend = function(f){
  return new One(f(this));
}
Many.prototype.extend = function(f){
  return new Many(f(this), this.tail.extend(f));
}
NEL.prototype.duplicate = function(i){
  return this.extend(x=>x);
}


NEL.prototype.at = function(i){
  return i === 0 ? this.value : this.tail && this.tail.at(i-1);
}

NEL.prototype.equals = function(otherNEL){
  return otherNEL instanceof NEL &&
    this.value===otherNEL.value && 
    ((this.tail && otherNEL.tail && this.tail.equals(otherNEL.tail)) || (!this.tail && !otherNEL.tail));
}

NEL.prototype.toArray = function(f){
  return this.reduce((acc,x)=>acc.concat(x), [])
}

NEL.prototype.join = function(separator=','){
  return this.toArray().join(separator);
}

NEL.prototype.toString = function(f){
  return this.toArray().toString();
}

NEL.prototype.toGenerator = function(horizon){
  return walkTailValuesForever(this, horizon);
}

//returns a maybe type because it can fail!
NEL.fromArray = (array) => {
  if(!Array.isArray(array) && typeof array !=="string"){
    throw new Error(`Required first argument must be a non-empty Array or String. You passed: ${array}`);
  }
  if(!array.length){
    throw new Error('Cannot create an empty non-empty list');
  }
  const [head,...arr] = array;
  return arr.reduce((acc, x)=> acc.concat(One(x)), One(head));
}


//this needs to give the entire list, finitely, as an array, starting from each node, from it to the prev
NEL.prototype.extendAsArray = function(exfn){
  return this.extend(remainingList=>exfn(remainingList.toArray()));
}

// forEach :: NEL[...a] -> NEL[...a] (but has side-effects)
One.prototype.forEach = function(f){
  return f(this.value) && this;
}
Many.prototype.forEach = function(f){
  f(this.value);
  this.tail.forEach(f);
  return this;
}


module.exports = {
  NEL
}
},{"../src/utility/walkers.js":13}],5:[function(require,module,exports){
function Const(value) {
  if (!(this instanceof Const)) {
    return new Const(value);
  }
  this.x = value;
}
Const.of = x => new Const(x);

//fantasy-const defines this but not entirely sure the logic behind it
Const.prototype.concat = function(y) {
    return new Const(this.x.concat(y.x));
};

Const.prototype.ap = function(fa) {
    return this.concat(fa);
};

Const.prototype.map = function() {
  return this;
};

Const.prototype.extract = function() {
  return this.x
};

module.exports = Const;

/*

  reduce is then 
  .prototype = function(f, acc) {
    const thisAcc = x => Const(acc);
    Const.prototype.ap = function(b) {
      return new Const(f(this.x, b.x));
    };
    return this.map(x => new Const(x)).sequence(thisAcc).x; 
  }

*/
},{}],6:[function(require,module,exports){
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
},{"../../src/utility/pointfree.js":12}],7:[function(require,module,exports){
Promise.of = Promise.prototype.of = x => Promise.resolve(x);
Promise.prototype.map = Promise.prototype.chain = Promise.prototype.bimap = Promise.prototype.then;
//Promise.prototype.fold = Promise.prototype.then;//is it really? 
//Yes: Promise.reject(9).fold(x=>acc+1, x=>x+1)->P10 Promises hold only one value
//not sure if tasks turn reject into a resolve like this tho

//I think this might still be correct, maybe?
Promise.prototype.ap = function(p2){
  return Promise.all([this, p2]).then(([fn, x]) => fn(x));
}

Promise.prototype.bimap = function(e,s){
  return this.then(s).catch(e);
};

// Promise.prototype.ap = function(p2){
//   return [this,p2].sequence(Promise.of).then(([fn, x]) => fn(x));
// }

//create a Promise that will never resolve
Promise.empty = function _empty() {
  return new Promise(function() {});
};

//delegates to how race works: the first resolving OR rejecting wins
Promise.prototype.concat = function(that){
 return Promise.race([this,that]);
};

//the first _resolving_ promise wins, otherwise the first rejecting
Promise.prototype.hopefulConcat = function(that){
  return Promise.race([this,that]).catch(
  e => {
    let resolved = {};
    return this.then(a=>{
      resolved = this;
      return a;
    },b=>{
      return that.then(c=>{
        resolved = that;
        return c;
      });
    }).then(x=> resolved.then ? resolved : Promise.reject(e), x=>Promise.reject(e));
  });
};

//just a reduce using concat2, takes the first to resolve, or first to reject once all have rejected
Promise.prototype.enterChallengers = function(arr){
  return arr.reduce((acc,x) => acc.concat2(x), this);
}


//???? just copied over from Task
Promise.prototype.orElse = function _orElse(f) {
  return new Promise(function(resolve, reject) {
    return this.then(null,function(a) {
      return f(a).then(resolve, reject);
    });
  });
};




},{}],8:[function(require,module,exports){
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
},{"../../src/other-types/monoids.js":10,"../../src/utility/pointfree.js":12}],9:[function(require,module,exports){
const { compose, traverse, curry, map, K, I, W}  = require('../../src/utility/pointfree.js');
const Identity  = require('../../src/other-types/Identity.js');
const Const  = require('../../src/other-types/Const.js');

/* Cloning and splicing */
    //not really good enough for true Immutability, but good enough to play around with without imports/requires/tons of code
    const cloneShallow = obj => Object.assign({}, obj);
    const _splice = (index, replacement, xs) => xs.splice(index, 1, replacement) && xs;
    const _arraySplice = (index, replacement, xs) => _splice(index, replacement, xs.slice(0));
    const _objectSplice = (key, replacement, obj) => Object.defineProperty(cloneShallow(obj), key, {value:replacement, enumerable:true});

/* Lens Functions */
    const makeLens = curry(
      (getter, setter, key, f, xs) => 
        map(replacement => setter(key, replacement, xs), f(getter(key, xs))) 
    );

    const arrayLens = curry( (key, f, xs) => map(replacement => _arraySplice(key, replacement, xs), f(xs[key])) );
    const objectLens = curry( (key, f, xs) => map(replacement => _objectSplice(key, replacement, xs), f(xs[key])) );

/*Lens generators*/

    const lensPath = (...paths) => compose(...paths.map( path => 
      typeof path ==="string" && Number(path)!=path ? //make sure it's not just a #
        objectLens(path) : 
        arrayLens(path) 
      )
    );
    const lensGet = str => lensPath(...str.split('.'));


/* Lens methods */
    const view = curry( (lens, target) => lens(Const)(target).extract() );
    const over = curry( (lens, fn, target) => lens(y => Identity(fn(y)) )(target).extract() );
    const set = curry( (lens, val, target) => over(lens, K(val), target) );

/* Lens helpers */
    const mapped = curry( 
        (f, x) => Identity( 
            map( compose( x=>x.extract(), f), x) 
        ) 
    );

    //wrong, at least as I've implemented it, works exactly like map, yet doesn't work for Array
    const traversed = function(f) {
      return traverse(this.of, f)
    }

    const makeLenses = (...paths) => paths.reduce( 
      (acc, key) => W(objectLens(key))(set)(acc),// set(objectLens(key), objectLens(key), acc)//at lens location, set the lens!
      { num : arrayLens, mapped }
    );




module.exports ={
    makeLens,
    makeLenses,
    lensPath,
    lensGet,
    arrayLens,
    objectLens,
    view,
    over,
    set
};


    //const jsonIso = dimap(JSON.parse, JSON.stringify);//not an actual iso, as JSON.parse can fail

    //jsonIso( set(lensPath('hi'), 5) )('{"hi":6}');//-> "{hi:5}"






},{"../../src/other-types/Const.js":5,"../../src/other-types/Identity.js":6,"../../src/utility/pointfree.js":12}],10:[function(require,module,exports){
//concatenation is composition with one type (closed composition)

String.prototype.empty = x => '';//makes string a well behaved monoid for left to right cases
String.empty = String.prototype.empty;

const Endo = function(runEndo){
  if (!(this instanceof Endo)) {
    return new Endo(runEndo);
  }
  this.appEndo = runEndo;
}

Endo.of = x => Endo(x);
Endo.empty = Endo.prototype.empty = _ => Endo(x=>x);

//concat is just composition
Endo.prototype.concat = function(y) {
  return Endo(compose(this.appEndo,y.appEndo));
};
Endo.prototype.getResult = function() { return this.appEndo; }

//concat is just composition
Endo.prototype.concat = function(y) {
  return Endo(compose(this.appEndo,y.appEndo));
};


/*
thinking through it...

addOne = x=> x+1
addTwo = x=> x+2
addThree = x => x+3

compose(addOne, addTwo) -> 
  (...args) => addOne(compose(addTwo)(...args)) -> 
  (...args) => addOne(addTwo(...args))

compose(addOne, addTwo, addThree) -> 
  (...args) => addOne(compose(addTwo, addThree)(...args)) -> 
  (...args) => addOne( ((...args2) => addTwo(compose(addThree)(...args2)))  (...args)) -> 
  (...args) => addOne( ((...args2) => addTwo(addThree(...args2)))  (...args))
*/


//Disjunction, the sticky-true Monoid (i.e. "any true" = true)
const Disjunction = function(x){
  if (!(this instanceof Disjunction)) {
    return new Disjunction(x);
  }
  this.x = x;
}

Disjunction.of = x => Disjunction(x);
Disjunction.empty = Disjunction.prototype.empty = () => Disjunction(false);

Disjunction.prototype.equals = function(y) {
    return this.x === y.x;
};
Disjunction.prototype.concat = function(y) {
    return Disjunction(this.x || y.x);
};

//a Disjunction of true, once concatted to any other Disjunction, can never be turned false
//Disjunction.of(false).concat(Disjunction.of(true)).concat(Disjunction.of(false));

const Any = Disjunction;


//Conjunction, the sticky-false Monoid (i.e. all must be true or "any false")
const Conjunction = function(x){
  if (!(this instanceof Conjunction)) {
    return new Conjunction(x);
  }
  this.x = x;
}

Conjunction.of = x => Conjunction(x);
Conjunction.empty = Conjunction.prototype.empty = () => Conjunction(true);

Conjunction.prototype.equals = function(y) {
    return this.x === y.x;
};
Conjunction.prototype.concat = function(y) {
    return Conjunction(this.x && y.x);
};

//a Conjunction of false, once concatted to any other Conjunction, can never be turned true
//Conjunction.of(false).concat(Conjunction.of(true)).concat(Conjunction.of(false));

const All = Conjunction;


//Sum, 
const Sum = function(x){
  if (!(this instanceof Sum)) {
    return new Sum(x);
  }
  this.x = x;
}

Sum.of = x => Sum(x);
Sum.empty = Sum.prototype.empty = () => Sum(0);

Sum.prototype.concat = function(y) {
    return Sum(this.x + y.x);
};

const Max = function(x){
  if (!(this instanceof Max)) {
    return new Max(x);
  }
  this.x = x;
}

Max.of = x => Max(x);
Max.empty = Max.prototype.empty = () => Max(0);

Max.prototype.equals = function(y) {
    return Max(this.x === y.x);
};

Max.prototype.concat = function(y) {
    return Max(this.x > y.x ? this.x : y.x);
};


//Max 
//Min, etc. all require some further constraints, like Ord

const getResult = M => M.getResult ? M.getResult() : M.x;

module.exports = {
  Sum,
  Any,
  All,
  Endo,
  getResult,
  Max
}
},{}],11:[function(require,module,exports){
(function (global){
const {curry}  = require('../../src/utility/pointfree.js');

//delay :: Integer -> Promise null
const delay = ms => new Promise(resolve => global.setTimeout(resolve, ms));
const delayR = ms => new Promise((resolve, reject) => global.setTimeout(reject, ms));
//tapDelay :: Integer -> a -> Promise a
const tapDelay = curry((ms,x) => new Promise(resolve => global.setTimeout(resolve, ms, x)));
const tapDelayR = curry((ms,x) => new Promise((resolve, reject) => global.setTimeout(reject, ms, x)));

const log = x => !console.log(x) && x;
const andLog = (...comments) => x => !console.log(x, ...comments) && x;

const deriveMap = Applicative => function (fn) {
  return this.chain(value => Applicative.of(fn(value)) );
};

const deriveAp = Applicative => function(app2) {
  return this.chain(fn => app2.chain(app2value => Applicative.of(fn(app2value)) ) );
};

//write in-type monadic operations in do notation using generators
const doM = gen => {
    function step(value) {
        var result = gen.next(value);
        if (result.done) {
            return result.value;
        }
        return result.value.chain(step);
    }
    return step();
};




/*
var result = doM(function*() {
    var value = yield Nothing;
    var value2 = yield Maybe.of(11);
    return value + value2;
}());
*/
//matches patterns of true/false
const booleanEquals = arr => arr2 => {
 return arr.reduce((acc, x, i)=> acc && x===arr2[i], true);
}
//http://goo.gl/wwqCtX

  // makes it possible to treat functions as functors
  // Function.prototype.map = function(f) {
  //     return x => f(this(x));
  // }

  // Function.prototype.contramap = function(f) {
  //     return x => this(f(x));
  // }

  // Function.prototype.dimap = function(c2d, a2b) {
  //     return x => c2d( this( a2b(x) ) );//or, compose(c2d,this,a2b)
  // }

  // Function.prototype.dimap = function(c2d, a2b) {
  //     return this.contramap(a2b).map(c2d);
  // }



//we'll want some helper functions probably, because common DOM methods don't exactly work like Arrays. Nice example:
const getNodeChildren = node => Array.from(node.children);
const setHTML = stringHTML => node => IO(_=> Object.assign(node,{innerHTML:stringHTML}));


module.exports = {
  delay,
  delayR,
  tapDelay,
  tapDelayR,
  log,
  andLog,
  deriveMap,
  deriveAp,
  doM,
  getNodeChildren,
  setHTML,
  booleanEquals
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../src/utility/pointfree.js":12}],12:[function(require,module,exports){
const compose  = (fn, ...rest) =>
  rest.length === 0 ?
    (fn||(x=>x)) :
    (...args) => fn(compose(...rest)(...args));

const curry = (f, ...args) => (f.length <= args.length) ? f(...args) : (...more) => curry(f, ...args, ...more);

const I = x => x;
const K = x => y => x;
const W = x => f => f(x)(x);
const S = b => f => x => b(x,f(x));

//String -> Object -> Arguments -> ?
const invoke = methodname => obj => (...args) => obj[methodname](...args);


const map = curry((f, F) => typeof F.map==="function" ? F.map(x=>f(x)) : F.map(f) );//guard against Array.map, fallback to promises

//Array/Promise polyfilling
const chain = curry(
  (f, M) => typeof M.chain==="function" ? M.chain(f) : (typeof M.then==="function" ? M.then(f) : [].concat(...M.map(f)))//array chain fallback
);


//Array polyfilling
const ap = curry(
  (Ap, Ap2) => typeof Ap.ap==="function" ? Ap.ap(Ap2) : Ap.reduce( (acc, f) => acc.concat( Ap2.map(f) ), [])
);

const reduce = curry((f, acc, F) => F.reduce(f,acc));

const liftA2 = curry((f, A1, A2) => ap(A1.map(f), A2));//
const liftA3 = curry((f, A1, A2, A3) => ap(ap(A1.map(f), A2), A3)    );
//look ma, no map!
//const liftA22 = curry((f, A1, A2) => A1.constructor.of(f).ap(A1).ap(A2));

    const dimap = curry( (lmap, rmap, fn) => compose(rmap, fn, lmap) );
    //mutates just the ouput of a function to be named later
    const lmap = contramap = f => dimap(f, I);
    //mutates the input of a function to be named later    
    const rmap = dimap(x=>x);
    

const head = xs => xs.head || xs[0];
const init = xs => xs.slice(0,-1);
const tail = xs => xs.tail || xs.slice(1, Infinity);
const last = xs => xs.last ? xs.last() : xs.slice(-1)[0];
const prop = namespace => obj => obj[namespace];


//these two include polyfills for arrays
const extend = fn => W => {
  return typeof W.extend ==="function" ?
    W.extend(fn) :
    W.map((_,i,arr)=>fn(arr.slice(i)))
};
const extract = W => {
  return typeof W.extract ==="function" ? 
    W.extract() :
    head(W);
};

const concat = curry( (x, y) => x.concat(y));
//inferring empty is not a great idea here...
const mconcat = (xs, empty) => xs.length||xs.size() ? xs.reduce(concat, empty) : empty ? empty() : xs.empty();
const bimap = curry((f,g,B)=> B.bimap(f,g)); 

// const foldMap = curry(function(f, fldable) {
//   return fldable.reduce(function(acc, x) {
//     const r = f(x);
//     acc = acc || r.empty();
//     return acc.concat(r);
//   }, null);
// });

//const fold = foldMap(I);



// foldMap : (Monoid m, Foldable f) => m -> (a -> m) -> f a -> m
const foldMap = (Monoid, f, Foldable) =>
  Foldable.reduce((acc, x) => acc.concat(f(x)), Monoid.empty())

// fold : (Monoid m, Foldable f) => m -> f m -> m
const fold = (Monoid, Foldable) => foldMap(Monoid, I, Foldable);


//from http://robotlolita.me/2013/12/08/a-monad-in-practicality-first-class-failures.html
function curryN(n, f){
  return function _curryN(as) { return function() {
    var args = as.concat([].slice.call(arguments))
    return args.length < n?  _curryN(args)
    :      /* otherwise */   f.apply(null, args)
  }}([])
}

//Kleisli composition
const composeK = (...fns) => compose( ...([I].concat(map(chain, fns))) );

  //specialized reducer, but why is it internalized?
  const perform = point => (mr, mx) => mr.chain(xs => mx.chain( x => { 
      xs.push(x); 
      return point(xs);
    })
  );

//array.sequence, alternate
const sequence = curry((point, ms) => {
  return typeof ms.sequence === 'function' ?
    ms.sequence(point) :
    ms.reduce(perform(point), point([]));
});

const traverse = curry((point, f, ms)=>{
  return ms.map(f).sequence(point);
});

//reducing patterns

const any = (acc, x) => x || acc;//empty is false
const all = (acc, x) => x && acc;//empty is true
const sum = (acc, x) => x + acc;//simply sum helper
const reduceBySum = reduce(sum,0);//simple sum helper

module.exports = {
  I,
  K,
  S,
  W,
  compose,
  composeK,
  curry,
  curryN,
  reduce,
  ap,
  map,
  chain,
  mconcat,
  concat,
  liftA2,
  liftA3,
  sequence,
  traverse,
  invoke,
  head,
  tail,
  init,
  last,
  prop,
  extend,
  extract,
  bimap,
  fold,
  foldMap,
  lmap,
  rmap,
  dimap,
  any,
  all,
  sum,
  reduceBySum
};
},{}],13:[function(require,module,exports){
//returns the nodes, one trip around from ref
const walkTail = function*(ref){
  const start = ref;
  let cur = ref.tail;
  yield ref;
  while(cur!==start){
    yield cur;
    cur = cur.tail;
  }
}

const iterateTail = function*(){
  let ref = this;
  while(ref.tail){
    yield ref.value;
    ref = ref.tail;
  }
  yield ref.value;
}

const walkTailValues = function*(ref){
  const start = ref;
  let cur = ref.tail;
  yield ref.value;
  while(cur!==start){
    yield cur.value;
    cur = cur.tail;
  }
}

//returns the nodes, one trip around backwards from ref
const walkPrev = function*(ref){
  const start = ref;
  let cur = ref.prev;
  yield ref;
  while(cur!==start){
    yield cur;
    cur = cur.prev;
  }
}


//returns the actual values, not the nodes, endlessly
const walkTailForever = function*(ref, horizon){
  let cur = ref.tail;
  let i = 0;
  yield ref.value;
  while(true && (!horizon ||++i !==horizon)){
    yield cur.value;
    cur = cur.tail;
  }
}

//returns the actual values, not the nodes, endlessly
const walkPrevForever = function*(ref, horizon){
  let cur = ref.prev;
  let i = 0;
  yield ref.value;
  while(true && (!horizon ||++i !==horizon)){
    yield cur.value;
    cur = cur.prev;
  }
}

//returns the nodes, but repeats at start for non-circular nodes
const walkTailValuesForever = function*(ref, horizon){
  const start = ref;
  let i = 0;
  let cur = ref.tail||ref;
  yield ref.value;
  while(!horizon || ++i !== horizon){
    yield cur.value;
    cur = (cur.tail||start);
  }
}


module.exports ={
  walkTail,
  walkTailValues,
  walkPrev,
  walkTailForever,
  walkPrevForever,
  walkTailValuesForever,
  iterateTail
};
},{}]},{},[1]);
