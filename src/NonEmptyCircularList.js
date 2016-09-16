//single-linked circular lists

function NECL(){}

//returns the nodes, one trip around from ref
NECL.walkTail = function*(ref){
  const start = ref;
  let cur = ref.tail;
  yield ref;
  while(cur!==start){
    yield cur;
    cur = cur.tail;
  }
}

//returns the nodes, one trip around from ref
NECL.walkTailValue = function*(ref){
  const start = ref;
  let cur = ref.tail;
  yield ref.value;
  while(cur!==start){
    yield cur.value;
    cur = cur.tail;
  }
}

//returns the actual values, not the nodes, endlessly
NECL.walkForever = function*(ref, horizon){
  let cur = ref.tail;
  let i = 0;
  yield ref.value;
  while(true && (!horizon ||++i !==horizon)){
    yield cur.value;
    cur = cur.tail;
  }
}

function Solo(value) {
  if (!(this instanceof Solo)) {
    return new Solo(value, tail);
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
  if(tail && tail.tail===undefined){//special case where new item needs to link to AND be linked to by a Solo
    tail.tail = this;
  }
  return this;
}
RingNode.prototype = Object.create(NECL.prototype);

//pure
Solo.prototype.cons = function(el){
  return new RingNode(el, RingNode(this.value));
}

//could we leverage this for fromArray?
const impure_cons = (node, el) => {
  const last = node.last();
  const molo = new RingNode(el, RingNode(node.value, node.tail));
  last.tail = molo;
  return molo;
}

//not pure!
RingNode.prototype.cons = function(el){
  const last = this.last();
  const molo = new RingNode(el, RingNode(this.value, this.tail));
  last.tail = molo;
  return molo;
}

//pure only in the bare val case? :/
//doesn't handle solo + RingNode, and it can't use fromArray since THAT uses concat!
//need to refactor!
Solo.prototype.concat = function(val){
  return this.cons(val instanceof NECL ? val.value : val).tail;
}

RingNode.prototype.concat = function(val){
  const last = this.last();
  const molo = new RingNode(val instanceof NECL ? val.value : val, this);
  last.tail = molo;
  return this;
}


NECL.prototype.last = function(){
  const walker = NECL.walkTail(this);
  return [...walker].pop();
}

NECL.prototype.size = function(el){
  const walker = NECL.walkTail(this);
  return [...walker].length;
}

NECL.prototype.next = function(num){
  return !num ? this.tail : this.at(num);
}

NECL.prototype.extract = function(){
  return this.value;
}

//this needs to go through each item and pass it the entire list starting from _its_ perspective
NECL.prototype.extend = function(f){
  const walker = NECL.walkTail(this);
  return NECL.fromArray([...walker].map(x=>f(x)));
}

//this needs to give the entire list, finitely, as an array, starting from each node
NECL.prototype.extendAsArray = function(f){
  throw Error ('not working yet')
  const walker = NECL.walkTail(this);
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
  const walker = NECL.walkTail(this);
  return NECL.fromArray([...walker].map(x=>f(x.value)));
}

Solo.prototype.chain = function(f){
  return f(this.value);
}

RingNode.prototype.chain = function(f){
  const walker = NECL.walkTail(this);
  return NECL.fromArray([...walker].chain(x=>f(x.value).toArray()));
}

NECL.prototype.ap = function(Ap){
  return this.chain(f=>Ap.map(f));
}

Solo.prototype.sequence = function(point){
  return this.value.chain(x=>point(Solo(x)))//slllllloppy?
}

Solo.prototype.reduce = function(f, acc){
  return f(acc, this.value);
}
RingNode.prototype.reduce = function(f, acc){
  const walker = NECL.walkTail(this);
  return this.toArray().reduce(f, acc);
}

RingNode.prototype.sequence = function(point){
  return this.tail.reduce(
    function(acc, x) {
      return acc
        .map(innernel => othertype => innernel.concat(othertype) )//puts this function in the type
        .ap(x.map(NECL.of));//then applies the inner othertype value to it
    },
    this.value.chain(x=>point(Solo(x)))//slllllloppy?
  );
};

NECL.prototype.traverse = function(f, point){
  return this.map(f).sequence(point||f);
};

NECL.prototype.at = function(index){
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

Solo.prototype.toString = function(el){
  return `->${this.value}->`;
}
RingNode.prototype.toString = function(el){
  const walker = NECL.walkTail(this);
  return `->${[...walker].map(x=>x.value).join(',')}->`;
}


Solo.prototype.toArray = function(el){
  return [this.value];
}
RingNode.prototype.toArray = function(el){
  const walker = NECL.walkTailValue(this);
  return [...walker];
}

//return a generator.  Remember, without the horizon, it's INFINITE, so use it wisely, do not [...x] it or else you will die
NECL.prototype.toGenerator = function(horizon){
  return NECL.walkForever(this, horizon);
}

NECL.of = x => new Solo(x);
NECL.fromArray = ([head,...arr]=[]) => {
  if(head===undefined){
    throw new Error('Cannot create an empty non-empty list');
  }
  return arr.reduce((acc, x)=> acc.concat(Solo(x)), Solo(head));
};

module.exports = {
  NECL
}
