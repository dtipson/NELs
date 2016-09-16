#Non-Empty (Linked) Lists

These datatypes are similar to Arrays, but built as linked-lists, where most nodes contain both a value and a reference to another node. They also implement most of the relevant [Fantasy-Land](https://github.com/fantasyland/fantasy-land) interfaces for common algebraic structures. (In particular: Setoid, Semigroup, Functor, Apply, Applicative, Foldable, Traversable, Chain, Monad, Extend, & Comonad). Their usage as Comonads is probably the most interesting, as they provide different .extend models than would be available on native Arrays. The can also be used to generate infinite, repeating streams of values, or in the case of circular lists, traversed infinitely.

While mostly academic and experimental atm (tests forthcoming), they are often more intelligible than regular Arrays for certain problems (celluar automata, slideshows, playlists, etc.).  There are currently 3 type flavors:

##Non Empty List : NEL

The `NEL` type represents a list that _cannot_ be empty (which guarantees freedom from certain kinds of traversal errors). You can create such a list from literally any value (including an Array, another Non-Empty List) or Arrays of values (though to do interesting, predictable things with lists, it's usually important that all items be of the same type of thing). A `NEL` of just a single item will have a sub-type of `One` and any list of _more_ than one thing will have intermediary nodes sub-typed as `Many` ultimately terminating in a `One`.  Each node holds a value and then, if it's a `Many` node, also a reference to the next value at `.tail`

##Non Empty Circular List : NECL

The `NECL` type represents a list that _cannot_ be empty, just like a `NEL`. But is also _circular_: when traversing forwards through list, regardless of its length, you will always eventually wrap back around to the original element and then on again (though, of course, the concept of an "original" or "head" element now becomes a bit emphemeral at this point: the "head" of such a list is just wherever you happen to be referencing it from in the moment). A single `NECL` node will be sub-typed `Solo` and it's `.tail` will just be a reference to itself. A list with two or more items will be sub-typed `RingNode`. All elements are guaranteed to have a `.tail`

Circular lists have the additional ability to generate a potentially infinite stream of endlessly repeated sequences. However, they can only be traversed in one direction. Which leads us to...

##Non Empty Circular Double-Linked List : NECDLL

The `NECDLL` type represents a list that cannot be empty and is also circular, like a `NECL`. But, unlike a `NECL`, each node _always_ links to a _previous_ node as well.  This means that it can be traversed in _either_ direction, either infinitely or finitely: whichever you please.

All nodes will be sub-typed `RingNodeD.` For single node-lists, its `.tail` and `.before` references will both point to itself. A list with two or more items will be sub-typed `RingNodeD`. In the case of two nodes, each one's `.tail` and `.before` references will point to each other.  In the case of 3 or more, the references will form a continuous chain.

###Methods/Interfaces

Type-signature Key:
- `a` : any value at all (b is also "any value," but assumed to be a different value from a)
- `[...a]` : one or more values in a list
- `NEList` : either a NEL, NECL, or NECDLL
- `NEList[...a]` : a NEL, NECL, or NECDLL list containing some value or values of a (see "a" above)
- `fn` : "function"

### Construction

#### `.of( a )` [*of*](https://github.com/fantasyland/fantasy-land#of-method)
```hs
:: a -> NEList[a]
```
Puts a value inside a list type (this single node list will be subtyped as a `One`, `Solo`, or `RingNodeD`)

#### `.fromArray( [...a] )`
```hs
:: [...a] -> NEList[...a]
```
Transforms a native Array into a `NEList` type. Will throw an error if the array is empty (could be enhanced to return a Maybe Functor instead)!

### Interaction/Extension

#### `.cons( a )`
```hs
:: NEList[a] -> b -> NEList[b, a]
```
Adds a value to the "head" of the list (all nodes will now be subtyped as a `Many`, `RingNode`, or `RingNodeD`) and returns it (now pointing at the new head). `NEL.of(9).cons(5).extract();//-> 5`

#### `.concat( a || NEList )`
```hs
:: NEList[a] -> b -> NEList[b, a]
```
Adds a single value or a single list onto the "tail" of the list (all nodes will now be subtyped as a `Many`, `RingNode`, or `RingNodeD`)

*Note* This is intended to eventually work on NEList elements with multiple elements for all types, but that currently only works properly for `NEL` types.  For the circular types, it only works properly when the new list is a `Solo` or `SoloD`


###Transformation (Immutable)

#### `.map( fn )` [*Functor*](https://github.com/fantasyland/fantasy-land#functor)
```hs
:: NEList[...a] ~> (a -> b) ~> NEList[...b]
```
Transforms each value in a list by applying each value to a function `fn` which returns the transformed value

#### `.ap( NEList )` [*Apply*](https://github.com/fantasyland/fantasy-land#apply)
```hs
:: NEList[...(a->b)] -> NEList[...a] -> NEList[...b]
```
Recursively applies all the values in `NEList` to all the functions inside the `NEList` it's called on

#### `.chain( fn )` [*Monad*](https://github.com/fantasyland/fantasy-land#monad)
```hs
:: NEList[...a] ~> (a -> NEList[b]) ~> NEList[...b]
```
Transforms each value in a list by applying each value to a function `fn` which returns a new NEList structure, which is then flattened into a single NElist

#### `.duplicate( )` [*Comonad*](https://github.com/fantasyland/fantasy-land#comonad)
```hs
:: NEList[...a] ~> NEList[...NEList[...a]]
```
Transforms each value into the entire list (or head and remaining tail of a list, in the case of a `NEL`), as seen from each value's perspective.

#### `.extend( fn )` [*Comonad*](https://github.com/fantasyland/fantasy-land#comonad)
```hs
:: NEList[...a] ~> (NEList[a] -> b) ~> NEList[...b]
```
Transforms each value in a list by applying the entire NEList structure to a function `fn` that returns a single transformed value

#### `.extendAsArray( fn )`
```hs
:: NEList[a, b, c...] ~> ( [a, b, c...] -> x) ~> NEList[x, y, z...]
```
Transforms each value in a list by applying the entire list, but passed as a finite native Array (starting from each value then moving forwards), to a function `fn` that then returns a single transformed value.

```
NEL.fromArray([1,2,3]).extendAsArray(x=> !console.log(x) && x.value);
[1,2,3]
[2,3]
[1]

NECL.fromArray([1,2,3]).extendAsArray(x=> !console.log(x) && x.value);
[1,2,3]
[2,3,1]
[3,1,2]

NECDLL.fromArray([1,2,3]).extendAsArray(x=> !console.log(x) && x.value);
[1,2,3]
[2,3,1]
[3,1,2]
```

<p align="center">(NECDLL only)</p>

#### `.extendNear( fn, Int )`
```hs
:: NEList[...a] ~> ( [a.before, a, a.tail] -> b) ~> NEList[...b]
```
Transforms each value in a list by applying an Array of the surrounding values (by default: `[the value before, the value, the value after]`) to a function `fn` that returns a single transformed value.

*TBD* `Int` determines how many surrounding values are needed/passed. Each node's value will always be the middle value of the array passed to the transformation function for each node.

###Folds

#### `.reduce( fn, acc )`
```hs
:: NEList[...a] ~> (b -> a -> b) -> b ~> b
```
Applies the binary `fn` to each element in the list, using `acc` as the initial acculator/`b` value. This allows you fold the entire (finitely modeled) list into another type. For circular methods, this starts with the currently referenced element and iterates forwards through the list tailwise.

#### `.extract()` [*extract*](https://github.com/fantasyland/fantasy-land#extract-method)
```hs
:: NEList[a] ~> a
```
Removes the current value from the list, where "the" value can be seen as the current "focus" of the list (i.e. the particular node reference that you're running the operation on). `NEL.of(9).extract(9);// = 9`


#### `.at( Int )`
```hs
:: NEList[...a] -> Int -> a
```
Gets a value from a particular 0-based position in the list. Supports negative indexes as well. In the case of circular lists, any integer value, no matter how high or low, maps to some value's position in the array relative to the current reference.  

#### `.toString()`
```hs
:: NEList[...a] -> String
```
Returns a string representation of the list.

NEL[1,2,3].toString(): `'1,2,3'` (just like Array.toArray)

NECL[1,2,3].toString(): `'->1,2,3->'`

NECDLL[1,2,3].toString(): `'<-1,2,3->'`

#### `.toArray()`
```hs
:: NEList[...a] -> [...a]
```
Returns the list as a normal array.  With circular lists, this obviously means losing the "circularity" context: the resulting Array will simply start with the "current" node reference and end with the node previous to it.

#### `.toGenerator( Int )`
```hs
:: NEList[a] -> *generator*
```
Returns a generator iterating through the list "forwards" (i.e. .tail.tail.tail ...etc), infinitely repeating (even for regular, finite `NEL`)

*Warning*: these are infinite lists we're talking about, so running something like [...generator] will crash your browser.  Either iterate over them in a safe, controlled fashion, or pass the optional `Int` "horizon" paramter into the function, which will cap the total number of iterations it can return.

```
var g = NECDLL.fromArray([1,2,3,4,5,6]).toGenerator();
setInterval(_=>console.log(g.next().value), 1000);//logs an item every second: ...1 ...2 ...etc
```

 <p align="center">(NECDLL only)</p>

#### `.toReverseGenerator( Int )`
```hs
:: NEList [a] -> *generator*
```
Returns a generator iterating through the list "backwards" (i.e. .before.before.before ...etc). Also infinite.  Also a *Warning* on usage. Also supports the optional `Int` horizon.

### Reflection

#### `.size()`
```hs
:: NEList[a] ~> Int
```
Reports the non-recursive size of the NEList (counting all nodes in one traversal through).

 <p align="center">(NEL only)</p>

#### `.length`
```hs
:: Int
```
Length of a `NEL` as a single propety (this isn't possible to calculate for `NECL`s or `NECDLL`s without extra cost on creation/modification, so it's not available: use `.size()` for a more universal interface)