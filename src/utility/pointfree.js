const compose  = (fn, ...rest) =>
  rest.length === 0 ?
    (fn||(x=>x)) :
    (...args) => fn(compose(...rest)(...args));

const curry = (f, ...args) => (f.length <= args.length) ? f(...args) : (...more) => curry(f, ...args, ...more);

const I = x => x;
const K = x => y => x;
const W = x => f => f(x)(x);
const S = b => f => x => b(x,f(x));

//String -> Object -> Arguments -> ?
const invoke = methodname => obj => (...args) => obj[methodname](...args);


const map = curry((f, F) => typeof F.map==="function" ? F.map(x=>f(x)) : F.map(f) );//guard against Array.map, fallback to promises

//Array/Promise polyfilling
const chain = curry(
  (f, M) => typeof M.chain==="function" ? M.chain(f) : (typeof M.then==="function" ? M.then(f) : [].concat(...M.map(f)))//array chain fallback
);


//Array polyfilling
const ap = curry(
  (Ap, Ap2) => typeof Ap.ap==="function" ? Ap.ap(Ap2) : Ap.reduce( (acc, f) => acc.concat( Ap2.map(f) ), [])
);

const reduce = curry((f, acc, F) => F.reduce(f,acc));

const liftA2 = curry((f, A1, A2) => ap(A1.map(f), A2));//
const liftA3 = curry((f, A1, A2, A3) => ap(ap(A1.map(f), A2), A3)    );
//look ma, no map!
//const liftA22 = curry((f, A1, A2) => A1.constructor.of(f).ap(A1).ap(A2));

    const dimap = curry( (lmap, rmap, fn) => compose(rmap, fn, lmap) );
    //mutates just the ouput of a function to be named later
    const lmap = contramap = f => dimap(f, I);
    //mutates the input of a function to be named later    
    const rmap = dimap(x=>x);
    

const head = xs => xs.head || xs[0];
const init = xs => xs.slice(0,-1);
const tail = xs => xs.tail || xs.slice(1, Infinity);
const last = xs => xs.last ? xs.last() : xs.slice(-1)[0];
const prop = namespace => obj => obj[namespace];


//these two include polyfills for arrays
const extend = fn => W => {
  return typeof W.extend ==="function" ?
    W.extend(fn) :
    W.map((_,i,arr)=>fn(arr.slice(i)))
};
const extract = W => {
  return typeof W.extract ==="function" ? 
    W.extract() :
    head(W);
};

const concat = curry( (x, y) => x.concat(y));
//inferring empty is not a great idea here...
const mconcat = (xs, empty) => xs.length||xs.size() ? xs.reduce(concat, empty) : empty ? empty() : xs.empty();
const bimap = curry((f,g,B)=> B.bimap(f,g)); 

// const foldMap = curry(function(f, fldable) {
//   return fldable.reduce(function(acc, x) {
//     const r = f(x);
//     acc = acc || r.empty();
//     return acc.concat(r);
//   }, null);
// });

//const fold = foldMap(I);



// foldMap : (Monoid m, Foldable f) => m -> (a -> m) -> f a -> m
const foldMap = (Monoid, f, Foldable) =>
  Foldable.reduce((acc, x) => acc.concat(f(x)), Monoid.empty())

// fold : (Monoid m, Foldable f) => m -> f m -> m
const fold = (Monoid, Foldable) => foldMap(Monoid, I, Foldable);


//from http://robotlolita.me/2013/12/08/a-monad-in-practicality-first-class-failures.html
function curryN(n, f){
  return function _curryN(as) { return function() {
    var args = as.concat([].slice.call(arguments))
    return args.length < n?  _curryN(args)
    :      /* otherwise */   f.apply(null, args)
  }}([])
}

//Kleisli composition
const composeK = (...fns) => compose( ...([I].concat(map(chain, fns))) );

  //specialized reducer, but why is it internalized?
  const perform = point => (mr, mx) => mr.chain(xs => mx.chain( x => { 
      xs.push(x); 
      return point(xs);
    })
  );

//array.sequence, alternate
const sequence = curry((point, ms) => {
  return typeof ms.sequence === 'function' ?
    ms.sequence(point) :
    ms.reduce(perform(point), point([]));
});

const traverse = curry((point, f, ms)=>{
  return ms.map(f).sequence(point);
});

//reducing patterns

const any = (acc, x) => x || acc;//empty is false
const all = (acc, x) => x && acc;//empty is true


module.exports = {
  I,
  K,
  S,
  W,
  compose,
  composeK,
  curry,
  curryN,
  reduce,
  ap,
  map,
  chain,
  mconcat,
  concat,
  liftA2,
  liftA3,
  sequence,
  traverse,
  invoke,
  head,
  tail,
  init,
  last,
  prop,
  extend,
  extract,
  bimap,
  fold,
  foldMap,
  lmap,
  rmap,
  dimap,
  any,
  all
};