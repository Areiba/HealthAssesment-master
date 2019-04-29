"use strict";
var _ = require("lodash"),
  async = require("async"),
  fs = require("fs"),
  should = require("should"),
  XmlNode = require("..").XmlNode,
  Parser = require("..").XmlParser,
  Simple = require("..").SimpleTransformer,
  TEST_XML_FILE = __dirname + "/data/test.xml",
  SIMPLE_JSON_FILE = __dirname + "/data/simple.json",
  SIMPLE_XML_FILE = __dirname + "/data/simple.xml",
  ENCODED_VAL_JSON_FILE = __dirname + "/data/encoded_values.json",
  ENCODED_VAL_XML_FILE = __dirname + "/data/encoded_values.xml",
  ENCODED_VAL_COMPLEX_JSON_FILE = __dirname + "/data/encoded_values_complex.json",
  ENCODED_VAL_COMPLEX_XML_FILE = __dirname + "/data/encoded_values_complex.xml";

describe("Xml Node", function(){
  var root = getRootNode(), node = root.getChild("root");
  it("can create a node from an object", function(){
    compareNode("<root/>")
  });
  it("can get its name", function(){
    node.getName().should.equal("root");
  })
  it("can add a child by an object", function(){
    node.addChild({name: "first"});
    compareNode("<root><first/></root>")
  })
  it("can add a child by string", function(){
    node.addChild("second");
    compareNode("<root><first/><second/></root>")
  })
  it("cannot add the node itself as a child", function(){
    try { node.addChild(node); }
    catch (e) {
      return e.message.should.equal("The child cannot be the parent itself.");
    }
    throw new Error("Didn't throw error for adding the node itself as the child.");
  })
  it("can get the index", function(){
    var second = node.getChild("second");
    second.getIndex().should.equal(1);
  })
  it("can add a child at desired location", function(){
    node.addChild({name: "mid"}, 1)
    compareNode("<root><first/><mid/><second/></root>")
  })
  it("can get its children", function(){
    node.getChildren().should.equal(node.value);
  })
  it("can get its children by name", function(){
    var firstChildren = node.getChildren("first");
    firstChildren.length.should.equal(1);
    firstChildren[0].parent.should.equal(node);
  })
  it("can get a child by name", function(){
    var mid = node.getChild("mid");
    mid.parent.should.equal(node);
  })
  it("can get a child by index", function(){
    var first = node.getChild(0);
    first.parent.should.equal(node);
    first.name.should.equal("first");
  })
  it("returns an empty child node if the query name is non-existent", function(){
    var bad = node.getChild("bad");
    bad.isEmpty().should.equal(true);
    bad.getParent().isEmpty().should.equal(true);
  })
  it("returns an empty child node if the query index is non-existent", function(){
    var bad = node.getChild(3);
    bad.isEmpty().should.equal(true);
    bad.getParent().isEmpty().should.equal(true);
  })
  it("can remove a child by index", function(){
    node.removeChild(1);
    var mid = node.getChild("mid");
    mid.isEmpty().should.equal(true);
    mid.getParent().isEmpty().should.equal(true);
    node.addChild({name: "mid"}, 1);
  })
  it("can remove a child by name", function(){
    node.removeChild("mid");
    var mid = node.getChild("mid");
    mid.isEmpty().should.equal(true);
    mid.getParent().isEmpty().should.equal(true);
    node.addChild({name: "mid"}, 1);
  })
  it("can delete itself", function(){
    var mid = node.getChild("mid");
    mid.delete();
    mid = node.getChild("mid");
    mid.isEmpty().should.equal(true);
    mid.getParent().isEmpty().should.equal(true);
    node.addChild({name: "mid"}, 1);
  })
  it("can insert a child", function(){
    var mid = node.getChild("mid");
    mid.insert({name: "mid-next"});
    var midNext = node.getChild("mid-next");
    midNext.getParent().should.equal(node);
    midNext.getIndex().should.equal(mid.getIndex() + 1);
  })
  it("can insert a child before the node", function(){
    var mid = node.getChild("mid");
    mid.insert({name: "mid-prev"}, true);
    var midPrev = node.getChild("mid-prev");
    midPrev.getParent().should.equal(node);
    midPrev.getIndex().should.equal(mid.getIndex() - 1);
  })
  it("can get its previous sibling", function(){
    var mid = node.getChild("mid"), midPrev = node.getChild("mid-prev");
    mid.getPrevious().should.equal(midPrev);
    midPrev.delete();
  })
  it("can get its next sibling", function(){
    var mid = node.getChild("mid"), midNext = node.getChild("mid-next");
    mid.getNext().should.equal(midNext);
    midNext.delete();
  })
  it("can add text to a node", function(){
    var mid = node.getChild("mid");
    mid.addText("text");
    compareNode("<root><first/><mid>text</mid><second/></root>")
  })
  it("can add more text to a node", function(){
    var mid = node.getChild("mid");
    mid.addText(" is");
    compareNode("<root><first/><mid>text is</mid><second/></root>")
  })
  it("can preserve spaces between node and texts", function(){
    var mid = node.getChild("mid");
    mid.addText(" ");
    mid.addChild({name: "strong"});
    mid.getChild("strong").addText("important");
    mid.addText(", isn't it?")
    compareNode("<root><first/><mid>text is <strong>important</strong>, isn't it?</mid><second/></root>");
  })
  it("can convert to a string from text", function(){
    var mid = node.getChild("mid");
    mid.toString().should.equal("text is important, isn't it?");
    while (mid.getChildren().length > 0) mid.getChild(0).delete();
  })
  it("can add cdata to a node", function(){
    var mid = node.getChild("mid");
    mid.addCData("cdata");
    compareNode("<root><first/><mid><![CDATA[cdata]]></mid><second/></root>")
  })
  it("can add another block of cdata to a node", function(){
    var mid = node.getChild("mid");
    mid.addCData("&2");
    compareNode("<root><first/><mid><![CDATA[cdata]]><![CDATA[&2]]></mid><second/></root>")
  })
  it("can get ancestors", function(){
    var second = node.getChild("second"),
      secondSecond = new XmlNode("second"),
      child = new XmlNode("child");
    secondSecond.addChild(child);
    second.addChild(secondSecond);
    var ancestors = child.getAncestors();
    should(_.find(ancestors, {name: "child"})).not.exist;
    _.filter(ancestors, {name: "second"}).length.should.equal(2);
    _.find(ancestors, {name: "root"}).should.exist;
  })
  it ("can get ancestors by name", function(){
    var child = node.getChild("second").getChild("second").getChild("child");
    should(child.getAncestors("child")).not.exist;
    child.getAncestors("second").length.should.equal(2);
    child.getAncestors("root").length.should.equal(1);
  });
  it ("can get ancestors by query", function(){
    var child = node.getChild("second").getChild("second").getChild("child");
    should(child.getAncestors({name: "child"})).not.exist;
    child.getAncestors({name: "second"}).length.should.equal(2);
    child.getAncestors({name: "root"}).length.should.equal(1);
    child.getParent().delete();
  })
  it("can get descendants", function(){
    var descendants = root.getDescendants();
    _.find(descendants, {name: "root"}).should.exist;
    _.find(descendants, {name: "first"}).should.exist;
    _.find(descendants, {name: "mid"}).should.exist;
    _.find(descendants, {name: "second"}).should.exist;
    _.filter(descendants, "cdata").length.should.equal(2);
  })
  it("can get descendants by name", function(){
    root.getDescendants("first").length.should.equal(1);
  });
  it("can get descendants by query object", function(){
    root.getDescendants({name: "mid"}).length.should.equal(1);
  })
  it("can get descendants by field name (cdata)", function(){
    root.getDescendants("$cdata").length.should.equal(2);
  })
  it("can convert to string from cdata", function(){
    var mid = node.getChild("mid");
    mid.toString().should.equal("cdata&2");
    mid.delete();
  })
  it("can add a comment", function(){
    node.addComment("comment", 1);
    compareNode("<root><first/><!-- comment --><second/></root>");
    node.removeChild(1);
  })
  it("can get attributes", function(){
    node.getAttributes().should.be.an.Object;
    Object.keys(node.getAttributes()).length.should.equal(0);
  })
  it("can set attrtibute", function(){
    node.setAttribute("temp", "true");
    var attrs = node.getAttributes();
    attrs.should.be.an.Object;
    attrs.should.have.property("temp", "true");
  })
  it("can get an attribute", function(){
    node.getAttribute("temp").should.equal("true");
  })
  it("can remove an attribute", function(){
    node.removeAttribute("temp");
    node.getAttributes().should.be.an.Object;
    Object.keys(node.getAttributes()).length.should.equal(0);
    node.getAttribute("temp").should.equal("");
  })
  it("can tell whether a node is a leaf or not", function(){
    node.isLeaf().should.equal(false);
    node.getChild("first").isLeaf().should.equal(true);
  })
  it("can tell whether a node is the root or not", function(){
    node.getParent().isRoot().should.equal(true);
    node.isRoot().should.equal(false);
    node.getChild("first").isRoot().should.equal(false);
  })
  it("can get the root of a tree", function(){
    node.getChild("first").getRoot().should.equal(root);
  })
  it("can add a custom instruction to the root", function(){
    root.addInstruction("instruction", "test=true");
    compareNode("<?instruction test=true?><root><first/><second/></root>")
  })
  it("builds a complex XML correctly with options", function(done){
    var self = this;
    async.waterfall([ buildNode.bind(self), verifyNode.bind(self) ], done);
  })
  it("builds an XML fragment correctly", function(done){
    var fragment = node.getChild("first").toXmlFragment().should.equal("<first/>");
    done();
  })
  function compareNode(xml){
    var nodeXml = root.toXml().replace(/^<\?xml version="1\.0"\?>/,"").trim();
    nodeXml.trim().should.equal(xml);
  }
})

describe("Xml Node #getPath", function(){
  it("should work properly", function(){
    var root = new XmlNode() // Empty node --> "."
    root.getPath().should.equal("-");
    root.addChild({ name: "base" });
    root.getPath().should.equal(".");
    var base = root.getChild("base");
    base.getPath().should.equal("./0:base[0]");
    base.addChild({ name: "child" });
    var child = base.getChild("child");
    child.getPath().should.equal("./0:base[0]/0:child[0]");
    var text = new XmlNode({ text: "text" });
    child.addChild(text);
    text.getPath().should.equal("./0:base[0]/0:child[0]/0:#text");
    var cdata = new XmlNode({ cdata: "cdata" });
    child.addChild(cdata);
    cdata.getPath().should.equal("./0:base[0]/0:child[0]/1:#cdata");
    var comment = new XmlNode({ comment: "comment" });
    child.addChild(comment);
    comment.getPath().should.equal("./0:base[0]/0:child[0]/2:#comment");
    var second = new XmlNode("second");
    base.addChild(second);
    second.getPath().should.equal("./0:base[0]/1:second[0]");
  });
})

describe("Xml Parser", function(){
  it("should convert between formats correctly", function(done){
    var self = this;
    async.waterfall([
      async.apply(fs.readFile, TEST_XML_FILE),
      function(buffer, cb) { cb(null, buffer.toString()) },
      Parser.toNode.bind(Parser), verifyXmlNode.bind(self),
      Parser.toObject.bind(Parser), verifyNodeObject.bind(self),
      Parser.toNode.bind(Parser), verifyObjectNode.bind(self),
      Parser.toXml.bind(Parser), verifyNodeXml.bind(self),
      Parser.toObject.bind(Parser), verifyXmlObject.bind(self),
      Parser.toXml.bind(Parser), verifyObjectXml.bind(self)
    ], done)
  })
})

describe("Simple Transformer", function(){
  it("should nodify a simple object", function(done){
    var self = this;
    async.waterfall([
      async.apply(fs.readFile, SIMPLE_JSON_FILE),
      function(buffer, cb) {
        var object, node;
        try {
          object = JSON.parse(buffer.toString()),
          node = new XmlNode(Simple.nodify(object));
        }
        catch (e) { return cb(e) }
        cb(null, node);
      },
      verifySimpleNode.bind(self)
    ], done)
  })
  it("should simplify a node object", function(done){
    var self = this;
    async.waterfall([
      async.apply(fs.readFile, SIMPLE_XML_FILE),
      function(buffer, cb) { cb(null, buffer.toString()) },
      Parser.toObject.bind(Parser),
      function(object, cb) {
        var simple;
        try { simple = Simple.simplify(object);}
        catch (e) { return cb(e)}
        return cb(null, simple);
      },
      verifyNodeSimple.bind(self)
    ], done)
  })
  it("should write to XML with simple values", function(done) {
    var self = this;
    async.waterfall([
      function(cb) {
        try {
          var simple = Simple.nodify({ $: { "foo": "bar" }, _: "test" }, "tag"),
            root = new XmlNode();
          root.addChild(simple);
          root.toXml().should.equal('<?xml version="1.0"?><tag foo="bar">test</tag>')
        }
        catch (e) { return cb(e)}
        return cb();
      }
    ], done)
  })
  it("should write to XML with encoded values with escapeText option on", function(done) {
    var self = this;
    async.waterfall([
      async.apply(fs.readFile, ENCODED_VAL_XML_FILE),
      function(buffer, cb) { cb(null, buffer.toString()) },
      function(xml, cb) {
        try {
          var data = require(ENCODED_VAL_JSON_FILE),
            simple = Simple.nodify(data, "tag"),
            root = new XmlNode();
          root.addChild(simple);
          root.toXml({ escapeText: true }).trim().should.equal(xml.trim());
        }
        catch (e) { return cb(e) }
        return cb();
      }
    ], done)
  })
  it("should write to XML with really complex values with escapeText option on", function(done) {
    var self = this;
    async.waterfall([
      async.apply(fs.readFile, ENCODED_VAL_COMPLEX_XML_FILE),
      function(buffer, cb) { cb(null, buffer.toString()) },
      function(xml, cb) {
        try {
          var data = require(ENCODED_VAL_COMPLEX_JSON_FILE),
            simple = Simple.nodify(data, "tag"),
            root = new XmlNode();
          root.addChild(simple);
          root.toXml({ escapeText: true }).trim().should.equal(xml.trim());
        }
        catch (e) { return cb(e) }
        return cb();
      }
    ], done)
  })
})

function verifyXmlNode(node, callback){
  callback(null, node);
}

function verifyNodeObject(object, callback){
  callback(null, object);
}

function verifyObjectNode(node, callback) {
  callback(null, node);
}

function verifyNodeXml(xml, callback){
  // console.log(xml)
  callback(null, xml);
}

function verifyXmlObject(object, callback){
  callback(null, object);
}

function verifyObjectXml(xml, callback){
  callback(null, xml);
}

function verifySimpleNode(node, callback){
  callback(null, node);
}

function verifyNodeSimple(simple, callback){
  callback(null, simple);
}

function buildNode(callback){
  var node = new XmlNode();
  node.addInstruction("xml", "version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"");
  node.addChild(new XmlNode("test"));
  var testNode = node.getChild("test");
  testNode.addChild(new XmlNode("text"));
  testNode.getChild("text").addText("Text");
  testNode.getChild("text").insert(new XmlNode("text-plus-node"));
  var textPlusNode = testNode.getChild("text").getNext();
  textPlusNode.addText("Text");
  textPlusNode.addChild(new XmlNode("plus"));
  textPlusNode.addText("node");
  textPlusNode.getChild(1).addText("plus");
  textPlusNode.insert(new XmlNode("cdata"), true);
  var cdataNode = textPlusNode.getPrevious();
  cdataNode.addCData("Text & some more text!");
  cdataNode.addCData("CData & some more CData!");
  testNode.addComment("comment", 2)
  testNode.addComment("some more comment", 4)
  testNode.addChild(new XmlNode("node", { "with-attribute": "true" }));
  return callback(null, node);
}

function verifyNode(node, callback){
  var xml = node.toXml({pretty: true}).replace(/\s+/g, "\n").trim();
  fs.readFile(TEST_XML_FILE, function(err, data){
    if (err) return callback(err);
    var originalXml = data.toString().replace(/\s+/g, "\n").trim();
    xml.should.equal(originalXml);
    callback();
  })
}

function getRootNode(){ return new XmlNode({value: [{name: "root"}]}) }
