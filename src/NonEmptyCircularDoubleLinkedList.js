//single-linked circular lists
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


//iterates through the old list to build a new one with all the right links and values
RingNodeD.prototype._link = function(newhead, oldhead){
  newhead.tail = oldhead;
  oldhead.prev = newhead;
  //simpler <-1-> to <-1,2-> case
  if(this.tail===this && this.prev===this){
    newhead.prev = oldhead;
    oldhead.tail = newhead;
  }
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
};

RingNodeD.prototype.cons = function(x){
  return this._link(new RingNodeD(x), new RingNodeD(this.value));
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
  return this.map(x=>x.value);
}


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
  return !num ? this.before : this.at(-num);
}

NECDLL.prototype.next = function(num){
  return !num ? this.tail : this.at(num);
}



NECDLL.prototype.toString = function(el){
  const walker = walkTail(this);
  return `<-${[...walker].map(x=>x.value).join(',')}->`;
}

NECDLL.prototype.toArray = function(el){
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



module.exports = {
  NECDLL
};
