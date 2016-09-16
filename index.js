
//native prototype enhancements
require('./src/other-types/Promise-helpers.js');

Object.assign(
  window, 
  require('./src/NonEmptyList.js'),
  require('./src/NonEmptyCircularList.js'),
  require('./src/NonEmptyCircularDoubleLinkedList.js'),
  require('./src/other-types/lenses.js'),
  require('./src/utility/pointfree.js'),
  require('./src/other-types/monoids.js'),
  require('./src/other-types/Tree.js'),
  require('./src/other-types/utility.js')
);