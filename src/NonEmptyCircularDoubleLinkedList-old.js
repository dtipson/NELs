//single-linked circular lists

function NECDLL(){}

//returns the nodes, one trip around from ref
NECDLL.walkTail = function*(ref){
  const start = ref;
  let cur = ref.tail;
  yield ref;
  while(cur!==start){
    yield cur;
    cur = cur.tail;
  }
}

//returns the nodes, one trip around backwards from ref
NECDLL.walkBefore = function*(ref){
  const start = ref;
  let cur = ref.before;
  yield ref;
  while(cur!==start){
    yield cur;
    cur = cur.before;
  }
}


//returns the actual values, not the nodes, endlessly
NECDLL.walkForever = function*(ref, horizon){
  let cur = ref.tail;
  let i = 0;
  yield ref.value;
  while(true && (!horizon ||++i !==horizon)){
    yield cur.value;
    cur = cur.tail;
  }
}

//returns the actual values, not the nodes, endlessly
NECDLL.walkForeverReverse = function*(ref, horizon){
  let cur = ref.before;
  let i = 0;
  yield ref.value;
  while(true && (!horizon ||++i !==horizon)){
    yield cur.value;
    cur = cur.before;
  }
}

function SoloD(value) {
  if (!(this instanceof SoloD)) {
    return new SoloD(value);
  }
  Object.assign(this, {value, tail: this, before: this});
  return this;
}
SoloD.prototype = Object.create(NECDLL.prototype);

function RingNodeD(value, tail, before) {
  if (!(this instanceof RingNodeD)) {
    return new RingNodeD(value, tail, before);
  }
  Object.assign(this, {value, tail, before});
  if(tail){
    if(tail.tail===null){
      tail.tail = this;
    }
    if(tail.before===null){
      tail.before = this;
    }
  }
  if(before && before.before===null){
    before.before=this;
  }
  return this;
}
RingNodeD.prototype = Object.create(NECDLL.prototype);

//correct!
SoloD.prototype.concat = function(val){
  return this.cons(val instanceof NECDLL ? val.value : val).tail;
}

//wrong, still not a DLL structure. Would need to add the node before the current one (since that's the "end")
//then return the current one
//this remains the same?
RingNodeD.prototype.concat = function(val){
  const last = this.before;//but now isn't "last" just a reference that gets _updated_?
  const molo = new RingNodeD(val instanceof NECDLL ? val.value : val, this, last);
  this.before = molo;
  last.tail = molo;
  return this;
}

//a->a   a<->b 
SoloD.prototype.cons = function(val){
  const oldmolo = RingNodeD(this.value, null, null);
  return new RingNodeD(val, oldmolo, oldmolo);
}

RingNodeD.prototype.cons = function(val){
  return this.concat(val).before;
}

NECDLL.prototype.last = function(){
  return this.before;
}

NECDLL.prototype.prev = function(num){
  return !num ? this.before : this.at(-num);
}

NECDLL.prototype.size = function(el){
  const walker = NECDLL.walkTail(this);
  return [...walker].length;
}

NECDLL.prototype.next = function(num){
  return !num ? this.tail : this.at(num);
}

NECDLL.prototype.extract = function(){
  return this.value;
}

//correct!
NECDLL.prototype.extend = function(f){
  const walker = NECDLL.walkTail(this);
  return NECDLL.fromArray([...walker].map(x=>f(x)));
}

//nearest values in an array, defaults to 2 nearest, when implemented, num can be a slice up to the entire array
NECDLL.prototype.extendNear = function(f, num){
  const walker = NECDLL.walkTail(this);
  return NECDLL.fromArray([...walker].map(x=>f([x.before.value,x.value,x.tail.value])));
}

//NECDLL.fromArray(window.crypto.getRandomValues(new Int8Array(68)).map(x=>x>=0?1:0)).extend(dll=>[...NECDLL.walkTail(dll)].slice(0,10).map(x=>x.value).reduce((acc,x)=>acc+x,0)).toString()

//this needs to give the entire list, finitely, as an array, starting from each node, from it to the prev
NECDLL.prototype.extendAsArray = function(f){
  throw Error ('not working yet');
  const walker = NECL.walkTail(this);
  return NECL.fromArray([...walker].map(x=>f(x)));//not right yet
}

NECDLL.prototype.duplicate = function(i){
  return this.extend(x=>x);
}

SoloD.prototype.map = function(f){
  return new SoloD(f(this.value), this.tail);
}

//super duper cheating.... or the only way to make it work?
RingNodeD.prototype.map = function(f){
  const walker = NECDLL.walkTail(this);
  return NECDLL.fromArray([...walker].map(x=>f(x.value)));
}

SoloD.prototype.chain = function(f){
  return f(this.value);
}

RingNodeD.prototype.chain = function(f){
  const walker = NECDLL.walkTail(this);
  return NECDLL.fromArray([...walker].chain(x=>f(x.value).toArray()));
}

NECDLL.prototype.ap = function(Ap){
  return this.chain(f=>Ap.map(f));
}

SoloD.prototype.sequence = function(point){
  return this.value.chain(x=>point(SoloD(x)))//slllllloppy?
}

SoloD.prototype.reduce = function(f, acc){
  return f(acc, this.value);
}
RingNodeD.prototype.reduce = function(f, acc){
  const walker = NECDLL.walkTail(this);
  return this.toArray().reduce(f, acc);
}

RingNodeD.prototype.sequence = function(point){
  return this.tail.reduce(
    function(acc, x) {
      return acc
        .map(innernel => othertype => innernel.concat(othertype) )//puts this function in the type
        .ap(x.map(NECDLL.of));//then applies the inner othertype value to it
    },
    this.value.chain(x=>point(SoloD(x)))//slllllloppy?
  );
};

NECDLL.prototype.traverse = function(f, point){
  return this.map(f).sequence(point||f);
};

//returns the NODE
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


NECDLL.prototype.toString = function(el){
  const walker = NECDLL.walkTail(this);
  return `<-${[...walker].map(x=>x.value).join(',')}->`;
}

NECDLL.prototype.toArray = function(el){
  const walker = NECDLL.walkTail(this);
  return [...walker].map(x=>x.value);
}

//return a generator.  Remember, without the horizon, it's INFINITE, so use it wisely, do not [...x] it or else you will die
NECDLL.prototype.toGenerator = function(horizon){
  return NECDLL.walkForever(this, horizon);
}

NECDLL.prototype.toReverseGenerator = function(horizon){
  return NECDLL.walkForeverReverse(this, horizon);
}

NECDLL.of = x => new SoloD(x);
NECDLL.fromArray = ([head,...arr]=[]) => {
  if(head===undefined){
    throw new Error('Cannot create an empty non-empty list')
  }
  return arr.reduce((acc, x)=> acc.concat(SoloD(x)), SoloD(head));
};

module.exports = {
  NECDLL
}
