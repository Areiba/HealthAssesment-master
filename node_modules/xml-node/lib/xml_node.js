"use strict";
var util = require("util"),
  _ = require("lodash"),
  builder= require("xmlbuilder"),
  // Please reference to https://github.com/oozcitak/xmlbuilder-js/wiki for
  // more information on Xml Builder Options.
  XML_BUILDER_CREATE_OPTIONS = [
    "allowSurrogateChars", "skipNullAttributes", "headless",
    "ignoreDecorators", "separateArrayItems", "noDoubleEncoding", "stringify"
  ], XML_BUILDER_END_OPTIONS = [
    "pretty", "indent", "newline", "allowEmpty"
  ], MODIFY_OPTIONS = [
    "escapeText"
  ]

/**
 * Creates an instance of XmlNode, an empty node if no arguments are provided.
 * @constructor
 * @this {XmlNode}
 * @param {String|Object|XmlNode} [name]
 *   - Name of the node, an object representing a node, or a node.
 * @param {Object} [attributes]   - attributes of the node.
 * @param {XmlNode} [parent]      - parent of the node.
 */
function XmlNode(name, attributes, parent){
  if (typeof name !== "object" && name !== null) {
    this.name = name;
    this.attributes = attributes;
    this.parent = parent;
    return;
  }
  for (var i in name) { if (i !== "value") { this[i] = name[i]; } }
  if (!name.value) return;
  var self = this;
  this.value = [];
  name.value.forEach(function(value){
    // Property object / already an xml node.
    if (value instanceof XmlNode) return self.value.push(value);
    var child = new XmlNode(value);
    child.parent = self;
    self.value.push(child);
  });
}

/**
 * Adds an instruction to the root node.
 * @param  {String} name  - name of the instruction.
 * @param  {String} value - value of the instruction.
 */
XmlNode.prototype.addInstruction = function(name, value){
  var root = this.getRoot();
  if (!root.instructions) root.instructions = {};
  root.instructions[name] = value;
}

/**
 * Adds a child comment node to the current node.
 * @param  {String} comment - The content string of the comment.
 * @param  {Number} [index] - Index of where to insert the comment.
 */
XmlNode.prototype.addComment = function(comment, index){
  var commentNode = new XmlNode();
  commentNode.comment = comment;
  this.addChild(commentNode, index);
}

/**
 * Adds a CDATA child node to the current node.
 * @param  {String} cdata   - The content string of the CDATA.
 * @param  {String} [index] - Index of where to insert the comment.
 */
XmlNode.prototype.addCData = function(cdata, index){
  var cdataNode = new XmlNode();
  cdataNode.cdata = cdata;
  this.addChild(cdataNode, index);
}

/**
 * Adds a child node to the current node. The child must not be the node itself.
 * @param  {XmlNode|Object|String} child
 *   - The child node, or an object representing the child node, or the name of the new node.
 * @param  {Number} [index] - Index of where to insert the child.
 */
XmlNode.prototype.addChild = function(child, index){
  if (!child) return;
  if (!this.value) this.value = [];
  if (child === this) {
    throw new Error("The child cannot be the parent itself.");
  }
  if (typeof child === "string" || (typeof child === "object" && !(child instanceof XmlNode))) {
    child = new XmlNode(child);
  }
  child.parent = this;
  if (!index && index !== 0) this.value.push(child);
  else if (index >= 0) this.value.splice(index, 0, child);
}

/**
 * Removes a child from the current node.
 * @param  {Number|String|Object|Function} query
 *   - query to selects which child to remove.
 *   	- Number: Index of the child node.
 *   	- String: Name of the child node. Prepend with "@" to remove an attribute.
 *   	- Object: Removes a child node matching the object.
 *   	- Function: Removes the child node if it returns true.
 * @return {XmlNode} - The removed child.
 */
XmlNode.prototype.removeChild = function(query){
  if (!this.value) this.value = [];
  if (typeof query === "number" && query < this.value.length) {
    return this.value.splice(query, 1);
  }
  else if (typeof query === "string") {
    var attrMatch = query.match(/^@(.+)/);
    if (attrMatch) return this.removeAttribute(attrMatch[1]);
    var fieldMatch = query.match(/^\$(.+)/);
    if (fieldMatch) query = fieldMatch[1];
    else query = { name: query };
  }
  var child = _.find(this.value, query);
  if (child) {
    var index = this.value.indexOf(child);
    if (index < 0) return;
    this.value.splice(index, 1);
    return child;
  }
}

/**
 * Inserts a sibling node before / after this node.
 * @param  {XmlNode|Object} node
 *   - The sibling node, or an object representing the sibling node.
 * @param  {Boolean} [before] Insert the node before the current node.
 */
XmlNode.prototype.insert = function(node, before) {
  if (this.getIndex() < 0) return;
  if (typeof node === "object" && !(node instanceof XmlNode)) node = new XmlNode(node);
  if (before && this.getIndex() < 1) before = false;
  this.parent.addChild(node, this.getIndex() + (before ? 0 : 1));
}

/**
 * Removes this node from the its parent node.
 */
XmlNode.prototype.delete = function(){
  if (this.isRoot()) return;
  this.parent.removeChild(this.getIndex());
}

/**
 * Adds a text child node to the current node.
 * Appends the to the last node if there is already a text node at the position.
 * @param  {String} text - The text to add.
 * @param  {[type]} [index] - Index of where to insert the child.
 */
XmlNode.prototype.addText = function(text, index){
  if (typeof text !== "string") return;
  if (!this.value) this.value = [];
  var valLength = this.value.length, lastValue = null;
  if (valLength > 0) lastValue = this.value[valLength - 1];
  if (lastValue && lastValue.text) {
    lastValue.text += text;
    return;
  }
  var newTextNode = new XmlNode();
  newTextNode.text = text;
  this.addChild(newTextNode, index);
}

/**
 * Checks whether this node is an empty node.
 * @return {Boolean} Whether this node is an empty node.
 */
XmlNode.prototype.isEmpty = function(){
  return Boolean(!this.name && !Array.isArray(this.value) &&
  !this.comment && this.comment !== "" &&
  !this.text && this.text !== "" &&
  !this.cdata && this.cdata !== "");
}

/**
 * Checks whether this node is the root node.
 * @return {Boolean} Whether this node is the root node.
 */
XmlNode.prototype.isRoot = function(){
  return Boolean(!this.parent && Array.isArray(this.value));
}

/**
 * Checks whether this node is a leaf node.
 * @return {Boolean} Whether this node is a leaf node.
 */
XmlNode.prototype.isLeaf = function(){
  return Boolean(!this.value || this.value.length === 0);
}

/**
 * Gets the index of this node from its parent.
 * @return {Number} Index of this node. Returns -1 if it is the root.
 */
XmlNode.prototype.getIndex = function(){
  if (this.isRoot()) return -1;
  return this.parent.getChildren().indexOf(this);
}

/**
 * Gets all attributes of this node.
 * @return {Object} All attributes.
 */
XmlNode.prototype.getAttributes = function(){
  if (!this.attributes) this.attributes = {};
  return this.attributes;
}

/**
 * Gets an attribute according to the name.
 * @param  {[type]} name - name of the attribute.
 * @return {String} The value of the attribute.
 *   Returns an empty string if the attribute isn't defined.
 */
XmlNode.prototype.getAttribute = function(name){
  if (!this.attributes) return "";
  return this.attributes[name] || "";
}

/**
 * Sets an attribute.
 * @param  {String} name      - name of the attribute
 * @param  {String} attribute - content of the attribute
 */
XmlNode.prototype.setAttribute = function(name, attribute){
  if (!this.attributes) this.attributes = {};
  this.attributes[name] = attribute;
}

/**
 * Removes an attribute from this node.
 * @param  {String} name - Name of the attribute to remove.
 */
XmlNode.prototype.removeAttribute = function(name){
  if (!this.attributes) this.attributes = {};
  delete this.attributes[name];
}

/**
 * Gets a child according to the query.
 * @param  {Number|String|Object|Function} query
 *   - query to selects which child to get.
 *   	- Number: Index of the child node.
 *   	- String: Name of the child node.
 *   	  Prepend with "@" to get an attribute.
 *   	  Prepend with "$" to get the field of the node. (e.g. text / cdata)
 *   	- Object: Gets a child node matching the object.
 *   	- Function: Gets the child node if it returns true.
 * @return {XmlNode} The child node found. An empty node if not matched.
 */
XmlNode.prototype.getChild = function(query){
  var child;
  if (!this.value) return new XmlNode();
  if (typeof query === "number") {
    child = this.getChildren()[query];
    if (!child) return new XmlNode();
  }
  else if (typeof query === "string") {
    var attrMatch = query.match(/^@(.+)/);
    if (attrMatch) return this.getAttribute(attrMatch[1]);
    var fieldMatch = query.match(/^\$(.+)/);
    if (fieldMatch) query = fieldMatch[1];
    else query = { name: query };
  }
  if (!child) child = _.find(this.value, query);
  if (!child) return new XmlNode();
  return child;
}

/**
 * Gets the child nodes matching the query, all child nodes if there's no query.
 * @param  {String|Object|Function} query
 *   - query to selects which child nodes to get.
 *   	- String: Name of the child nodes.
 *   	  Prepend with "$" to get the field of the node. (e.g. text / cdata)
 *   	- Object: Gets child nodes matching the object.
 *   	- Function: Gets child nodes if it returns true.
 * @return {XmlNode[]} An array of child nodes matching the query.
 */
XmlNode.prototype.getChildren = function(query){
  if (!this.value) return [];
  if (!query) return this.value;
  if (typeof query === "string") {
    var fieldMatch = query.match(/^\$(.+)/);
    if (fieldMatch) query = fieldMatch[1];
    else query = { name: query };
  }
  return _.filter(this.value, query);
}

/**
 * Gets all descendants matching the query, all descendants if there's no query.
 * @param {String|Object|Function} query
 *   - query to select which ancestor to get.
 *   - String: Name of the ancestors.
 *   - Object: Get ancestors matching the object.
 *   - Function: Get ancestors mathing the query
 */

XmlNode.prototype.getAncestors = function(query) {
  if (query) {
    if (typeof query === "string") {
       query = { name: query };
    }
    return _.filter(this.getAncestors(), query);
  }
  if (this.isRoot() || this.isEmpty()) return [];
  return this.getParent().getAncestors().concat(this.getParent());
}

/**
 * Gets all descendants matching the query, all descendants if there's no query.
 * @param  {String|Object|Function} query
 *   - query to select which descendants to get.
 *   	- String: Name of the descendants.
 *   	  Prepend with "$" to get the field of the node. (e.g. text / cdata)
 *   	- Object: Get descendants matching the object.
 *   	- Function: Get descendants if it returns true.
 * @return {XmlNode[]} An array of descendants matching the query.
 */
XmlNode.prototype.getDescendants = function(query){
  if (query) {
    if (typeof query === "string") {
      var fieldMatch = query.match(/^\$(.+)/);
      if (fieldMatch) query = fieldMatch[1];
      query = fieldMatch ? fieldMatch[1] : { name: query };
    }
    return _.filter(this.getDescendants(), query);
  }
  if (this.isLeaf()) return [];
  return _.flatten(this.getChildren().map(function(child){
    return child.getDescendants().concat([child]);
  }));
}

/**
 * Gets the previous sibling node.
 * @param  {Object} [options] - Options while selecting the previous node.
 *   - (skipEmptyText | skipComments)
 * @return {XmlNode} The previous sibling node. An empty node if not found.
 */
XmlNode.prototype.getPrevious = function(options){
  var opts = options || {skipEmptyText: true, skipComments: true};
  if (this.isRoot()) return new XmlNode();
  var index = this.getIndex(), siblings = this.parent.getChildren();
  while (index > 0 && index < siblings.length) {
    var prev = siblings[--index];
    if (opts.skipEmptyText && prev.text && !prev.toString().trim()) continue;
    if (opts.skipComments && prev.comment) continue;
    return prev;
  }
  return new XmlNode();
}

// Return the next non-empty-text node. (e.g. not "\n     ")
/**
 * Get the next sibling node.
 * @param  {Object} [options] - Options while selecting the next node.
 *   - (skipEmptyText | skipComments)
 * @return {XmlNode} The next sibling node. An empty node if not found.
 */
XmlNode.prototype.getNext = function(options){
  var opts = options || {skipEmptyText: true, skipComments: true};
  if (this.isRoot()) return new XmlNode();
  var index = this.getIndex(), siblings = this.parent.getChildren();
  while (index >= 0 && index < siblings.length - 1) {
    var next = siblings[++index];
    if (opts.skipEmptyText && next.text && !next.toString().trim()) continue;
    if (opts.skipComments && next.comment) continue;
    return next;
  }
  return new XmlNode();
}

/**
 * Gets the parent of the current node.
 * @return {XmlNode} The parent node. An empty node if there's no parent.
 */
XmlNode.prototype.getParent = function(){
  return this.parent || new XmlNode();
}

/**
 * Gets the root node.
 * @return {XmlNode} The root node.
 */
XmlNode.prototype.getRoot = function(){
  var node = this;
  while (!node.isEmpty() && !node.isRoot()) node = node.getParent();
  return node;
}

/**
 * Gets the path of the current node. Good for debugging.
 * @return {String} String representing the path of the current node.
 *  - "-" represents an empty node. "." represents the root node.
 *    - `index` is the index of the node among its siblings.
 *    - `name` is the name of the node
 *    - `i` is the index of the node with the same name among its siblings.
 *    - `#{type}` is type of the node, either `#text`, `#cdata`, or `#comment`.
 *    - E.g. `5:node[2]` means the 5th node is a `node` node, and the 3rd `node` node.
 */
XmlNode.prototype.getPath = function(){
  if (this.isEmpty()) return "-";
  if (this.isRoot()) return ".";
  var content = "";
  if (this.text) { content = "#text"; }
  else if (this.cdata) { content = "#cdata"; }
  else if (this.comment) { content = "#comment"; }
  else if (this.name){
    var nameIndex = this.getParent().getChildren(this.name).indexOf(this);
    content = util.format("%s[%d]", this.name, nameIndex);
  }
  return util.format("%s/%d:%s", this.getParent().getPath(), this.getIndex(), content);
}

/**
 * Gets the name of the current node
 * @return {String} Name of the node
 */
XmlNode.prototype.getName = function(){
  return this.name;
}

/**
 * Gets the string representation of the current node.
 * @return {String} The string representation of the current node.
 */
XmlNode.prototype.toString = function(){
  if (this.cdata) return this.cdata;
  if (this.text) return this.text;
  if (!Array.isArray(this.value)) return "";
  return this.value.map(function(x){ return x.toString() }).join("");
}

/**
 * Gets the pure object representation of the current node which can be stringified.
 * @return {Object} The object representation.
 */
XmlNode.prototype.toObject = function(){
  var out = {};
  for (var i in this) {
    if (i === "parent" || i === "value") continue;
    else if (typeof this[i] !== "function") out[i] = this[i];
  }
  if (!this.value) return out;
  out.value = [];
  this.value.forEach(function(val){
    out.value.push((val instanceof XmlNode) ? val.toObject() : val);
  });
  return out;
}

// Escape In-line text in XML output, since xmlbuilder has no such option.
function escapeText(str) {
  return str.replace(/(?!&\S+;)&/g, '&amp;').replace(/"/g, '&quot;');
}

// Modify the XML Builder element according to the node structure
function modifyElement(node, element, options) {
  if (!(node instanceof XmlNode)) return element;
  if (node.attributes) for (var name in node.attributes){
    element.att(name, node.attributes[name]);
  }
  if (node.value) node.value.forEach(function(val){
    if (typeof val !== "object") return;
    else if (val.text || val.text === "") {
      var text = options.escapeText ? escapeText(val.text) : val.text;
      element.txt(text);
    }
    else if (val.comment || val.comment === "") element.com(val.comment);
    else if (val.cdata || val.cdata === "") element.dat(val.cdata);
    else if (val instanceof XmlNode) modifyElement(val, element.ele(val.name), options);
  });
  return element;
}

/**
 * Converts the whole node tree to an XML text
 * @param  {Object} opts - Options of the conversion. Refer to XMLBuilder
 *   - https://github.com/oozcitak/xmlbuilder-js
 * @return {String} The converted XML String.
 */
XmlNode.prototype.toXml = function(options){
  var opts = options || {},
    rootNode = this.getRoot(),
    node = rootNode.getChild(function(x){return x.name}),
    hasXmlInstruction = rootNode.instructions && rootNode.instructions.xml,
    buildOpts = { noDoubleEncoding: true };
  if (hasXmlInstruction && typeof opts.headless === "undefined") {
    buildOpts.headless = true;
  }
  buildOpts = _.assign(buildOpts, opts);
  var createOpts = _.pick(buildOpts, XML_BUILDER_CREATE_OPTIONS),
    endOpts = _.pick(buildOpts, XML_BUILDER_END_OPTIONS),
    modifyOpts = _.pick(buildOpts, MODIFY_OPTIONS),
    root = builder.create(node.name, createOpts);
  if (rootNode.instructions) {
    if (hasXmlInstruction) root.ins("xml", rootNode.instructions.xml);
    for (var name in rootNode.instructions){
      if (name === "xml") continue;
      root.ins(name, rootNode.instructions[name]);
    }
  }
  return modifyElement(node, root, modifyOpts).doc().end(endOpts);
}

/**
 * Converts the node tree with the current node as a root to an XML fragment
 * @param  {Object} opts - Options of the conversion. Refer to XMLBuilder
 *   - https://github.com/oozcitak/xmlbuilder-js
 * @return {String} The converted XML fragment String.
 */
XmlNode.prototype.toXmlFragment = function(opts){
  var rootNode = new XmlNode();
  rootNode.addChild(new XmlNode(this.toObject()));
  var opts = _.assign({ headless: true }, opts);
  return rootNode.toXml(opts);
}

module.exports = XmlNode;
