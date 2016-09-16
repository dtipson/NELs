Array.empty = _ => [];
Array.prototype.empty = Array.empty;
Array.prototype.flatten = function(){return [].concat(...this); };
//we need to guard the f against the extra args that native Array.map passes to avoid silly results
Array.prototype.chain = function(f){
  return this.map(x=>f(x)).flatten();
};
Array.prototype.ap = function(a) {
  return this.reduce( (acc,f) => acc.concat( a.map(f) ), []);//also works, & doesn't use chain
};
Array.prototype.sequence = function(point){
    return this.reduceRight(
      function(acc, x) {
        return acc
          .map(innerarray => othertype => [othertype].concat(innerarray) )//puts this function in the type
          .ap(x);//then applies the inner othertype value to it
      },
      point([])
    );
};

Array.prototype.extend = function(exfn){
  return this.map((x,i,arr) => exfn(arr.slice(i)));//passes current item + the rest of the array
}

Array.prototype.extendNear = function(exfn){
  const len = this.length;
  return this.map((x, i ,arr) => {
    const slice = arr.slice(Math.max(i-1,0),i+2);
    if(i===0){
      slice.unshift(arr[len-1]);
    }else if(i===len){
      slice.push(arr[0]);
    }
    return exfn(slice)
  });//passes nearby prev/next values
}

Array.prototype.extract = function(){
  return this[0];
}


Array.prototype.traverse = function(f, point){
    return this.map(f).sequence(point||f);//common enough that it'll be the same to allow that
};