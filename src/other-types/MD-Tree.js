const {Any, Max}  = require('../../src/other-types/monoids.js');
const {foldMap}  = require('../../src/utility/pointfree.js');

function MDTree(){}

const Node = function(value, key){
  if (!(this instanceof Node)) {
    return new Node(value, key);
  }
  Object.assign(this, {value, key});
}
Node.prototype = Object.create(MDTree.prototype);

Node.prototype.map = function(f){
  return new Node(f(this.value), this.key);
};
Node.prototype.chain = function(f){
  return new Node(f(this.value).value, this.key);
};
Node.prototype.extract = function(){
  return this.value;
};

Node.prototype.toObject = function(){
  return ({[this.key]:this.value});
};



const Edge = function(nodes, key){
  if (!(this instanceof Edge)) {
    return new Edge(nodes, key);
  }
  Object.assign(this, {nodes, key});
}
Edge.prototype = Object.create(MDTree.prototype);

Edge.prototype.map = function(f){
  return new Edge(this.nodes.map(x=>x.map(f)), this.key);
};
Edge.prototype.chain = function(f){
  return new Edge(this.nodes.map(x=>x.chain(f)), this.key);
};




Edge.prototype.chain = function(f){
  return new Edge(this.nodes.map(x=>x.chain(f)), this.key);
};

Edge.prototype.toObject = function(){
  return this.key ?
    { 
      [this.key]: Object.assign({}, ...this.nodes.map(x=>x.toObject()) )
    } :
    Object.assign({}, ...this.nodes.map(x=>x.toObject()) );
};

MDTree.prototype.toJSON = function(){
  return JSON.stringify(this.toObject());
}

MDTree.fromObject = (object, name) => {
  const nodes = [];
  for (var key in object) {
    //need to figure out empty objects, single objects, etc.
    if (object.hasOwnProperty(key)) {
      if(typeof object[key] === "object"){
        nodes.push( new Edge(MDTree.fromObject(object[key]).nodes, key) )
      }else{
        nodes.push(new Node(object[key], key))
      }
    }
  }
  return new Edge(nodes, name);
};

module.exports = {
  Node, Edge, MDTree
};