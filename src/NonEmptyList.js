const { walkTailValuesForever } = require('../src/utility/walkers.js');

//create an (empty) prototype
function NEL(){
  throw new Error('Use NEL.of or NEL.fromArray to construct a NEL');
}

//create a type to hold single values
function One(value) {
  if (!(this instanceof One)) {
    return new One(value);
  }
  Object.assign(this, {value, length:1});
}
One.prototype = Object.create(NEL.prototype);

//create a type that can hold a value AND point to another value
function Many(value, tail) {
  if (!(this instanceof Many)) {
    return new Many(value, tail);
  }
  Object.assign(this, {value, tail, length:tail.length+1});
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
NEL.prototype.toString = function(f){
  return this.toArray().toString();
}

NEL.prototype.toGenerator = function(horizon){
  return walkTailValuesForever(this, horizon);
}

//returns a maybe type because it can fail!
NEL.fromArray = function([head, ...arr]=[]){
  if(head===undefined){
    throw new Error('Cannot create an empty non-empty list');
  }
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