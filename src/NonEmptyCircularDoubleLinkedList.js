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
NECDLL.fromArray = ([head,...arr]=[]) => {
  if(head===undefined){
    throw new Error('Cannot create an empty non-empty list')
  }
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
