"use strict";

function getSubtreeParser(path, currentParser) {
  const node = path.getValue();
  const parent = path.getParentNode();

  switch (node.type) {
    case "TaggedTemplateExpression":
      // styled-components
      if (
        node.tag.type === "MemberExpression" &&
        node.tag.object.name === "styled"
      ) {
        return "postcss";
      }
      // graphql-tag
      if (node.tag.type === "Identifier" && node.tag.name === "gql") {
        return "graphql";
      }
      return currentParser;
    case "TemplateLiteral": {
      const parentParent = path.getParentNode(1);
      // styled-jsx
      if (
        node.quasis.length === 0 &&
        parent.type === "JSXExpressionContainer" &&
        parentParent.type === "JSXElement" &&
        parentParent.openingElement.attributes.some(
          attribute => attribute.name.name === "jsx"
        )
      ) {
        return "postcss";
      }
      return currentParser;
    }
    default:
      return currentParser;
  }
}

module.exports = { getSubtreeParser };
