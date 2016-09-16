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
  let cur = ref.before;
  yield ref;
  while(cur!==start){
    yield cur;
    cur = cur.before;
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
  let cur = ref.before;
  let i = 0;
  yield ref.value;
  while(true && (!horizon ||++i !==horizon)){
    yield cur.value;
    cur = cur.before;
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
  walkTailValuesForever
};