"use strict";
var _ = require("lodash");

/**
 * Creates an instance of Simpletransformer
 * @constructor
 */
function SimpleTransformer(){};

/**
 * Converts a simple object to an object representation of XmlNode.
 * - "$" as a key represents the attributes; "_" as a key represents text content.
 * @param  {Object} input   - The object to be converted
 * @param  {String} [name]  - Name of the created node.
 * @return {Object} Object representation of XmlNode
 */
SimpleTransformer.prototype.nodify = function nodify(input, name){
  if (typeof input === "string") return { text: input };
  if (typeof input === "boolean") return { text: Boolean(input).toString() };
  if (typeof input === "number") return { text: Number(input).toString() };
  if (typeof input !== "object" || input === null) return;
  if (Array.isArray(input)) return {
    name: name,
    value: _(input).map(function(x){
      return x ? nodify(x).value : null;
    }).flatten().compact().value()
  };
  var out = { name: name, value: [] };
  for (var i in input) {
    if ( i === "$") { continue; }
    if ( i === "_" && typeof input[i] === "string") {
      out.value.push({ text: input[i] });
      continue;
    }
    var child = nodify(input[i], i);
    out.value.push(child);
  }
  if (input["$"]) out.attributes = input["$"];
  return out;
}

/**
 * Converts an object representation of an XmlNode to a simple object.
 * Note that SimpleTransformer XML objects do not preserve node order!
 * @param  {Object} input - Object representation of the node.
 * @return {Object} Simplified object.
 */
SimpleTransformer.prototype.simplify = function simplify(input){
  if (typeof input !== "object") return null;
  if (input.text || input.cdata) return (input.text ? input.text.trim() : "") +
    (input.cdata ? input.cdata.trim() : "");
  var out = {};
  if (input.attributes) {out["$"] = input.attributes;}
  if (input.value) { input.value.forEach(function(val){
    var child = simplify(val), name = val.name;
    if (!child) return;
    if (typeof child === "string" && !name) name = "_";
    if (out[name]) {
      if (!Array.isArray(out[name])) { out[name] = [out[name]]; }
      out[name].push(child);
    }
    else { out[name] = child; }
  })}
  if (out["$"] && _.keys(out["$"]).length === 0) { delete out["$"]; }
  if ( _.keys(out).length === 1 && out["_"]) { out = out["_"]; }
  if (_.keys(out).length === 0) return null;
  return out;
}

module.exports = new SimpleTransformer();
