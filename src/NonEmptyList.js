//prototype
function NEL(){
  throw new Error('Use NEL.of or NEL.fromArray to construct a NEL');
}

function One(value) {
  if (!(this instanceof One)) {
    return new One(value);
  }
  Object.assign(this, {value, length:1});
}
One.prototype = Object.create(NEL.prototype);

function Many(value, tail) {
  if (!(this instanceof Many)) {
    return new Many(value, tail);
  }
  Object.assign(this, {value, tail, length:tail.length+1});
}
Many.prototype = Object.create(NEL.prototype);

//pure, does not mutate because lower nodes are not affected: they're just linked to by reference.
NEL.prototype.cons = function(newHead){
  return new Many(newHead, this);
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

//this is mostly to stay in sync with circular methods: a static length prop works great with NELs
One.prototype.size = function(){
  return 1;
}
Many.prototype.size = function(){
  return this.length;
}

//keeps recusively cycling through tails until it hits a One, then returns the head
// last :: NEL[a...z] -> z
NEL.prototype.last = function(){
  return this.tail ? this.tail.last() : this.value;
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

// map :: NEL[...a] ~> (a->b) ~> NEL[...b]
One.prototype.map = function(f){
  return new One(f(this.value));
}
Many.prototype.map = function(f){
  return new Many(f(this.value), this.tail.map(f));
}

// this is also effectively what map does... if extend is already defined
// NEL.prototype.map = function(f){
//   return this.extend(list=>f(list.value));
// }

//should returns a Maybe type around the result because it can fail!
// NEL.prototype.filter = function(f){
//   const maybeHead = f(this.value) ? Just(One(this.value)) : Nothing;
//   return this.tail ? maybeHead.concat(this.tail.filter(f)) : maybeHead;
// }

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

// sequence :: NEL[Type[a]] ~> (a->Type[a]) ~> Type[NEL[a]]
NEL.prototype.sequence = function(point){
    if(!this.tail){
      return this.value.chain(x=>point(One(x)));//slllllloppy?
    }
    return this.tail.reduce(
      function(acc, x) {
        return acc
          .map(innernel => othertype => innernel.concat(othertype) )//puts this function in the type
          .ap(x.map(NEL.of));//then applies the inner othertype value to it
      },
      this.value.chain(x=>point(One(x)))//slllllloppy?
    );
};

//cheating!
// NEL.prototype.sequence = function(point){
//     if(!this.tail){
//       return this.head.chain(x=>point(One(x)));//slllllloppy?
//     }
//     return this.toArray().sequence(point).map(NEL.fromArray).map(x=>x.reduce((acc,x)=>x,Nothing));
// };

NEL.prototype.traverse = function(f, point){
    return this.map(f).sequence(point||f);
};


One.prototype.flatten = function(){
  return this.value;
}
Many.prototype.flatten = function(){
  return new Many(this.value.value, this.tail.flatten());
}

NEL.prototype.chain = function(f){
  return this.map(f).flatten();
}
NEL.prototype.ap = function(Ap){
  return this.chain(x=>Ap.map(x));
}

One.prototype.reverse = function(){
  return this;
}
Many.prototype.reverse = function(){
  const tailReversed = this.tail.reverse();
  return Many(
    tailReversed.value,
    !tailReversed.tail ? 
      One(this.value) : 
      tailReversed.tail.concat(One(this.value))
  );
}

One.prototype.extend = function(f){
  return new One(f(this));
}
Many.prototype.extend = function(f){
  return new Many(f(this), this.tail.extend(f));
}
NEL.prototype.duplicate = function(i){
  return this.extend(x=>x);
}


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


NEL.prototype.at = function(i){
  return i === 0 ? this.value : this.tail && this.tail.at(i-1);
}

NEL.prototype.equals = function(otherNEL){
  return otherNEL instanceof NEL &&
    this.value===otherNEL.value && 
    ((this.tail && otherNEL.tail && this.tail.equals(otherNEL.tail)) || (!this.tail && !otherNEL.tail));
}


NEL.prototype.extract = function(f){
  return this.value;
}

NEL.prototype.toArray = function(f){
  return this.reduce((acc,x)=>acc.concat(x), [])
}
NEL.prototype.toString = function(f){
  return this.toArray().toString();
}


//returns the nodes, one trip around from ref
NEL.walkTailValuesForever = function*(ref, horizon){
  const start = ref;
  let i = 0;
  let cur = ref.tail||ref;
  yield ref.value;
  while(!horizon || ++i !== horizon){
    yield cur.value;
    cur = (cur.tail||start);
  }
}

NEL.prototype.toGenerator = function(horizon){
  return NEL.walkTailValuesForever(this, horizon);
}



NEL.of = x => new One(x);

//returns a maybe type because it can fail!
NEL.fromArray = function([head, ...arr]=[]){
  if(head===undefined){
    throw new Error('Cannot create an empty non-empty list');
  }
  return arr.reduce((acc, x)=> acc.concat(One(x)), One(head));
}




module.exports = {
  NEL
}