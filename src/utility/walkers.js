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

module.exports ={
  walkTail,
  walkPrev,
  walkTailForever,
  walkPrevForever
};