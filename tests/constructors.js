//const test = require('tape');
const test = require('tap').test;//more verbose

  const {NEL} = require('../src/NonEmptyList.js');
  const {NECL} = require('../src/NonEmptyCircularList.js');
  const {NECDLL} = require('../src/NonEmptyCircularDoubleLinkedList.js');

  const types = [NEL, NECL, NECDLL];


test('.point -> .extract', function (t) {

  const constructorString = 'of';
  const constructors = types.map(x=>x[constructorString]);
  const testValues = [9,[9],{hi:true},Symbol('plop')];

  constructors.forEach(of =>{
    testValues.forEach(value =>{
      t.same(of(value).extract(), value, `of method puts the value in the type ${of.name}, .extract takes it out`);
    })
  });

  t.end();
});

test('.fromArray', function (t) {

  const constructorString = 'fromArray';
  const constructors = types.map(x=>x[constructorString]);

  const testValues = [[9],[9,2],[{},{}],'stringsWorkToo'];
  const failValues = [9,[],''];

  constructors.forEach(fromArray =>{
    testValues.forEach(value =>{
      t.same(fromArray(value).size(), value.length, `fromArray creates a NEList of size() equalling length of source array/string`);
    });
    failValues.forEach(value =>{
      t.throws(_ => fromArray(value), `passing an empty array/string or something that isn't an array/string throws an error`);
    });
  });

  t.end();
});