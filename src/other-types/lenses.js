const { compose, traverse, curry, map, K, I, W}  = require('../../src/utility/pointfree.js');
const Identity  = require('../../src/other-types/Identity.js');
const Const  = require('../../src/other-types/Const.js');

/* Cloning and splicing */
    //not really good enough for true Immutability, but good enough to play around with without imports/requires/tons of code
    const cloneShallow = obj => Object.assign({}, obj);
    const _splice = (index, replacement, xs) => xs.splice(index, 1, replacement) && xs;
    const _arraySplice = (index, replacement, xs) => _splice(index, replacement, xs.slice(0));
    const _objectSplice = (key, replacement, obj) => Object.defineProperty(cloneShallow(obj), key, {value:replacement, enumerable:true});

/* Lens Functions */
    const makeLens = curry(
      (getter, setter, key, f, xs) => 
        map(replacement => setter(key, replacement, xs), f(getter(key, xs))) 
    );

    const arrayLens = curry( (key, f, xs) => map(replacement => _arraySplice(key, replacement, xs), f(xs[key])) );
    const objectLens = curry( (key, f, xs) => map(replacement => _objectSplice(key, replacement, xs), f(xs[key])) );

/*Lens generators*/

    const lensPath = (...paths) => compose(...paths.map( path => 
      typeof path ==="string" && Number(path)!=path ? //make sure it's not just a #
        objectLens(path) : 
        arrayLens(path) 
      )
    );
    const lensGet = str => lensPath(...str.split('.'));


/* Lens methods */
    const view = curry( (lens, target) => lens(Const)(target).extract() );
    const over = curry( (lens, fn, target) => lens(y => Identity(fn(y)) )(target).extract() );
    const set = curry( (lens, val, target) => over(lens, K(val), target) );

/* Lens helpers */
    const mapped = curry( 
        (f, x) => Identity( 
            map( compose( x=>x.extract(), f), x) 
        ) 
    );

    //wrong, at least as I've implemented it, works exactly like map, yet doesn't work for Array
    const traversed = function(f) {
      return traverse(this.of, f)
    }

    const makeLenses = (...paths) => paths.reduce( 
      (acc, key) => W(objectLens(key))(set)(acc),// set(objectLens(key), objectLens(key), acc)//at lens location, set the lens!
      { num : arrayLens, mapped }
    );




module.exports ={
    makeLens,
    makeLenses,
    lensPath,
    lensGet,
    arrayLens,
    objectLens,
    view,
    over,
    set
};


    //const jsonIso = dimap(JSON.parse, JSON.stringify);//not an actual iso, as JSON.parse can fail

    //jsonIso( set(lensPath('hi'), 5) )('{"hi":6}');//-> "{hi:5}"





