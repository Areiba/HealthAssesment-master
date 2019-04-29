# Xml Node
Converts XML to and from JS node tree.

### Source XML
```xml
<root><image src="image.jpg"/><content>Text <image src="image2.jpg"/> <![CDATA[&#xad;]]></content></root>
```

### As a JS Node
```javascript
var Parser = require("xml-node").XmlParser;
Parser.toNode(srcxml, function(err, node){
  var content = node.getChild("root").getChild("content");
  // Get text from node, returns: "Text &#xad;"
  console.log(content.toString());
  // Get an attribute of a node, returns: "image2.jpg"
  console.log(content.getChild("image").getAttribute("src"));
});
```

### Raw Object
```json
{ "value": [
  { "name": "root", "value": [
    { "name": "image", "attributes": { "src": "image.jpg" } },
    { "name": "content", "value": [
      { "text": "Text " }
      { "name": "image", "attributes": { "src": "image2.jpg" }},
      { "cdata": "&#xad;" }
    ]},
  ]}
]}
```

## Parser
Converts among XmlNode / XmlNode object / XML.
```js
var Parser = require("xml-node").XmlParser;
```

### Parser.toNode(input, [options], callback])
Converts an XML or a raw object into a node.

### Parser.toXml(input, [options], callback)
Converts a raw object or node into an XML string

### Parser.toObject(input, [options], callback)
Converts an XML or a node into a raw object

## Node

### Creating a node
```js
var name = "foo", attr: { bar: "baz" }, parent = new XmlNode(); // Empty node;

// argument "attributes" and "parent" are optional
var node = new XmlNode(name, attr, parent);

var nodeFromObject = new XmlNode({ name: name, attributes: attr });
parent.getChild("foo").addChild(nodeFromObject);

console.log(parent.toXml())
//<foo bar="baz"><foo bar="baz"/></foo>
```

### addInstruction(name, body)

### addComment(comment, [index])

### addCData(cdata, [index])

### addText(text, [index])
* `text`: string

### addChild(child, [index])
Adds a child to the current node. The child must not be the node itself.
* `child`: a raw object, an instance of `XmlNode`, or the name of the new node.

### getChild(query)
* `query`: either `string`, `number`, or `object`
  * `string`: Name of the child node. Remove the first child with same node name
  * `number`: Index of the child node. Remove the child at the indicated index
  * `object`: Remove the child with the same property: `node.removeChild({name: "foo", attributes: { bar: "baz" }})` removes the child of `node` which has the name `foo` and attribute `bar` equaling to `baz`

### removeChild(query)
Removes the first child node found using query
* `query`: same as `getChild()`

### insert(node, [before])
Inserts the node as the next sibling of the current node.

* `node`: either raw object or an instance of `XmlNode`
* `before`: `boolean`
  * insert as the previous sibling the current node instead of the next.

### delete()
Removes the current node from the node tree.

### isEmpty()
Tell if the current node is an empty node.

### isRoot()
Tell if the current node is the root node.

### isLeaf()
Tell if the current node is a leaf node, i.e. no descendants.

### getIndex()
Gets the index of the current node among the children of the parent node.

### getAttributes()
Get all attributes of the current node.

### getAttribute(name)
Gets an attribute of the current node.
* `name`: `string`

### setAttribute(name, attribute)
Sets an attribute to the current node.
* `name`: `string`
* `attribute`: `string`

### removeAttribute(name)
Removes an attribute from the current node.
* `name`: `string`

### getChildren(query)
Gets the children of the current node.
* `query`: `function`, `number` or `object`

### getAncestors(query)
 * Gets all ancestors matching the query, all ancestors if there's no query.
 * `query`: `string`, `function`, or `object`

### getDescendants(query)
Gets all the descendants of the current node according to the query
* `query`: `string`, `function`, or `object`

### getPrevious()
Gets the previous sibling of the current node.

### getNext()
Gets the next sibling of the current node.

### getParent()
Gets the parent of the current node.

### getRoot()
Gets the root node of the node tree

### getPath()
Gets the path of the current node from the root node
 - `.`: Indicates the root node
 - `-`: Indicates an empty node
 - child nodes are in the form of `{index}:{name}[i]` or `{index}:#{type}`,
   - `index` is the index of the node among its siblings.
   - `name` is the name of the node
   - `i` is the index of the node with the same name among its siblings.
   - `#{type}` is type of the node, either `#text`, `#cdata`, or `#comment`.
   - E.g. `5:node[2]` means the 5th node is a `node` node, and the 3rd `node` node.

## getName()
Gets the name of the current node.

### toString()
Returns a string of all text content of the current node and its descendants.

### toObject()
Converts the node to a raw object.

### toXml(options)
Converts the whole node tree to an XML string.
* `options`: `object`, Xml Build / End Options. More info at https://github.com/oozcitak/xmlbuilder-js
  * `escapeText`: Escape the text values when transforming.

### toXmlFragment(options)
Converts the node tree with the current node as the root to an XML fragment string.
* `options`: `object`, Xml Build / End Options. More info at https://github.com/oozcitak/xmlbuilder-js
  * `escapeText`: Escape the text values when transforming.
