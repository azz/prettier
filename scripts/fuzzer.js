"use strict";

const NUM_TESTS = +process.argv[2] || 100;
const opts = process.argv[3]
  ? JSON.parse(process.argv[3])
  : {
      parser: "babylon",
      printWidth: 50
    };

console.log(`running ${NUM_TESTS} tests with options:`, opts);

const { gen, property, check } = require("testcheck");
const generate = require("babel-generator").default;

const prettier = require("../");
const clean = require("../src/clean-ast").cleanAST;

const badEggs = [];

function stable(code) {
  if (!code) {
    return true;
  }

  const formatted = prettier.format(code, opts);
  const stablePrint = formatted === prettier.format(formatted, opts);
  const stableAst =
    clean(prettier.__debug.parse(code, opts)) ===
    clean(prettier.__debug.parse(formatted, opts));

  if (!stableAst) {
    badEggs.push(`ast(prettier(input) !== ast(input):\n\n${code}`);
  }
  if (!stablePrint) {
    badEggs.push(`prettier(prettier(input) !== prettier(input):\n\n${code}`);
  }
  return stableAst && stablePrint;
}

const { numTests } = check(
  property(
    VariableDeclaration().then(ast => {
      try {
        const { code } = generate(File([ast]));
        // ensure this doesn't throw
        prettier.__debug.parse(code, opts);
        return code;
      } catch (ex) {
        // test the printer, not the parser
        return undefined;
      }
    }),
    stable
  ),
  { numTests: NUM_TESTS }
);

if (!badEggs.length) {
  console.log(`success! (ran ${numTests} mutations)`);
} else {
  console.error(`error! we found some bad eggs:`);
  badEggs.forEach(console.error);
}

//////////

function genIndentifier() {
  return gen.alphaNumString.notEmpty().suchThat(x => !/\d/.test(x[0]));
}

function Identifier() {
  return gen.object({
    type: gen.return("Identifier"),
    name: genIndentifier()
  });
}

function StringLiteral() {
  return gen.object({
    type: gen.return("StringLiteral"),
    value: gen.alphaNumString
  });
}

function BooleanLiteral() {
  return gen.object({
    type: gen.return("BooleanLiteral"),
    value: gen.boolean
  });
}

function VariableDeclarator() {
  return gen.object({
    type: gen.return("VariableDeclarator"),
    id: Identifier(),
    init: gen.oneOf([ArrowFunctionExpression()])
  });
}

function VariableDeclaration() {
  return gen.object({
    type: gen.return("VariableDeclaration"),
    declarations: gen.array(VariableDeclarator(), { minSize: 1, maxSize: 10 }),
    kind: gen.oneOf(["var", "let", "const"])
  });
}

function ArrowFunctionExpression() {
  return gen.object({
    type: gen.return("ArrowFunctionExpression"),
    id: gen.null,
    generator: gen.boolean,
    expression: gen.boolean,
    async: gen.boolean,
    params: gen.array(Identifier(), { minSize: 0, maxSize: 5 }),
    body: gen.oneOf([JSXElement(), BlockStatement()])
  });
}

function BlockStatement() {
  return gen.object({
    type: gen.return("BlockStatement"),
    directives: gen.return([]),
    body: gen.array(ReturnStatement(), { minSize: 0, maxSize: 1 })
  });
}

function ReturnStatement() {
  return gen.object({
    type: gen.return("ReturnStatement"),
    argument: gen.oneOf([JSXElement()])
  });
}

function JSXIdentifier() {
  return gen.object({
    type: gen.return("JSXIdentifier"),
    name: genIndentifier()
  });
}

function JSXExpressionContainer() {
  return gen.object({
    type: gen.return("JSXExpressionContainer"),
    expression: gen.oneOf([BooleanLiteral(), StringLiteral()])
  });
}

function JSXAttribute() {
  return gen.object({
    type: gen.return("JSXAttribute"),
    name: JSXIdentifier(),
    value: gen.oneOf([StringLiteral(), JSXExpressionContainer()])
  });
}

function JSXOpeningElement() {
  return gen.object({
    type: gen.return("JSXOpeningElement"),
    attributes: gen.array(JSXAttribute(), { minSize: 0, maxSize: 3 }),
    name: JSXIdentifier(),
    selfClosing: gen.return(true)
  });
}

function JSXElement() {
  return gen.object({
    type: gen.return("JSXElement"),
    openingElement: JSXOpeningElement(),
    closingElement: gen.boolean,
    children: gen.return([])
  });
}

function File(statements) {
  return {
    type: "File",
    program: {
      type: "Program",
      sourceType: "module",
      body: statements,
      directives: []
    },
    comments: []
  };
}
