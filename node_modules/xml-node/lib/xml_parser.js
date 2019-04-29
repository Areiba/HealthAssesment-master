"use strict";
var sax = require("sax");
var XmlNode = require("./xml_node");

/**
 * Creates an instance of XmlParser
 * @constructor
 */
function XmlParser() {}

/**
 * Converts the object or an XML string to node.
 * @param  {Object|String} input - the object representation or an XML string.
 * @param  {Object}   [options]  - the options for the conversion.
 * @param  {XmlParser~toNodeCallback} callback - The callback for the conversion.
 */
/**
 * Returns the content of the conversion to the XML node.
 * @callback XmlParser~toNodeCallback
 * @param {Object} err - Error occured during conversion
 * @param {XmlNode} node - the converted node.
 */
XmlParser.prototype.toNode = function(input, options, callback){
  if (typeof options === "function" && !callback) {
    callback = options;
    options = { lowercase: true, trim: true };
  }
  if (typeof input === "object") return callback(null, new XmlNode(input));
  var errs = [], node = new XmlNode(), cDataBlock = null, parser = sax.parser(options);
  parser.onerror = function(err) {
    errs.push(err);
    delete parser.error;
  }
  parser.ontext = function(text){
    if (text.trim()) node.addText(text);
  };
  parser.onprocessinginstruction = function(opts){
    node.addInstruction(opts.name, opts.body);
  }
  parser.onopentag = function(opts){
    node = new XmlNode(opts.name, opts.attributes, node);
  }
  parser.onclosetag = function(name){
    var parent = node.getParent();
    parent.addChild(node);
    node = parent;
  }
  parser.onattribute = function(opts){

  }
  parser.oncomment = function(comment){
    node.addComment(comment);
  }
  parser.onopencdata = function(){
    cDataBlock = "";
  }
  parser.oncdata = function(cdata){
    if (typeof cDataBlock === "string") cDataBlock += cdata;
  }
  parser.onclosecdata = function(){
    node.addCData(cDataBlock)
    cDataBlock = null;
  }
  parser.onend = function(){
    if (errs.length >= 1) return callback(errs[0]);
    callback(null, node);
  }
  parser.write(input).close();
}

/**
 * Converts an XML node or XML string to an object representation of an XML node.
 * @param  {XmlNode|String} input - An XML Node or an XML string.
 * @param  {Object}   [options]  - the options for the conversion.
 * @param  {XmlParser~toObjectCallback} callback - The callback for the conversion.
 */
/**
 * Returns the content of the conversion to the object representation.
 * @callback XmlParser~toObjectCallback
 * @param {Object} err - Error occured during conversion
 * @param {Object} object - the converted object.
 */
XmlParser.prototype.toObject = function(input, options, callback){
  if (typeof options === "function" && !callback)  {
    callback = options;
    options = {};
  }
  if (input instanceof XmlNode) return callback(null, input.toObject());
  if (typeof input !== "string") return callback(new TypeError("Invalid input type!"));
  XmlParser.prototype.toNode(input, function(err, node) {
    if (err) return callback(err);
    return callback(null, node.toObject());
  })
}

/**
 * Converts an XML Node or an object representation of an XML node to an XML string.
 * @param  {XmlNode|Object} node - An XML Node or an object representation of an XML node.
 * @param  {Object}   [options]  - the options for the conversion.
 * @param  {XmlParser~toXmlCallback} callback - The callback for the conversion.
 */
 /**
  * Returns the content of the conversion to XML.
  * @callback XmlParser~toXmlCallback
  * @param {Object} err - Error occured during conversion
  * @param {String} xml - the converted XML string.
  */
XmlParser.prototype.toXml = function(node, options, callback){
  if (typeof options === "function" && !callback) {
    callback = options;
    options = {};
  }
  if (typeof node !== "object") return callback(new TypeError("Invalid input type!"));
  if (!(node instanceof XmlNode)) node = new XmlNode(node);
  return callback(null, node.toXml(options));
}

module.exports = new XmlParser();
