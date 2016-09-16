//single-linked circular lists
const { walkTail, walkTailValues, walkTailForever } = require('../src/utility/walkers.js');
const { chain } = require('../src/utility/pointfree.js');


function NECL(){}

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
RingNode.prototype.toString = function(el){
  const walker = walkTail(this);
  return `->${[...walker].map(x=>x.value).join(',')}->`;
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
NECL.fromArray = ([head,...arr]=[]) => {
  if(head===undefined){
    throw new Error('Cannot create an empty non-empty list');
  }
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
