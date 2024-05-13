// ==UserScript==
// @id             Inline-Translator
// @name           Inline-Translator
// @version        0.5
// @namespace      12425
// @author         12425
// @description    在每个段落之后加上中文翻译
// @license        MIT
// @downloadURL    https://github.com/12425/Inline-Translate.user.js/raw/main/inline-translator.user.js
// @include        http://*
// @include        https://*
// @run-at         document-idle
// @grant          GM_registerMenuCommand
// @grant          GM_xmlhttpRequest
// ==/UserScript==


'use strict';

(function() {

GM_registerMenuCommand("翻译成双语网页", () => {
  const root = document.body;
  if (root.classList.contains('_myscript_translated')) {
    return;
  }
  root.classList.add('_myscript_translated');
  translate(root);
});


const TranslationTags = new Set([
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "ol",
  "p",
]);


function fetch(text, callback, arg1, arg2) {
  GM_xmlhttpRequest({
    method: 'GET',
    url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh&dt=t&q=${encodeURIComponent(text)}`,
    onload: function(resp) {
      let json = null;
      try {
        json = JSON.parse(resp.responseText)[0];
      } catch {
        return;
      }

      if (!json) {
        return;
      }

      const data = json.map(function(item) {
        return item[0].trim();
      }).join('');
      if (text !== data) {
        callback(data, arg1, arg2);
      }
    },
  });
}


function simplify(node, attrs) {
  // return false if node is removed
  if (!removeEmptyNode(node)) {
    return false;
  }
  attrs.push(extractAttrs(node));
  Array.from(node.querySelectorAll('*')).forEach(function(el) {
    attrs.push(extractAttrs(el));
  });
  return true;
}


function removeEmptyNode(node) {
  // return false if node is removed
  const children = node.querySelectorAll('*');
  if (children.length) {
    let toDelete = true;
    for (const child of children) {
      if (removeEmptyNode(child)) {
        toDelete = false;
      }
    }
    if (!toDelete) {
      return true;
    }
  }

  if (!node.innerHTML.trim().length) {
    node.remove();
    return false;
  }

  return true;
}


function extractAttrs(node) {
  let attr = {};
  Array.from(node.attributes).forEach(attr => {
    attr[attr.name] = attr.value;
    node.removeAttribute(attr.name);
  });
  return attr;
}


function resumeAttrs(node, attrs) {
  Object.keys(attrs).forEach(key => {
    node.setAttribute(key, attrs[key]);
  });
}


function updateNode(data, node, attrs) {
  let newNode = document.createElement(node.tagName);
  newNode.innerHTML = data;
  node.insertAdjacentElement('afterend', newNode);
  resumeAttrs(newNode, attrs[0]);
  let i = 1;
  Array.from(node.querySelectorAll('*')).forEach(function(el) {
    resumeAttrs(el, attrs[i]);
    i++;
  });
  if (node.parentNode.tagName !== 'SMALL') {
    const smallNode = document.createElement('small');
    node.insertAdjacentElement('afterend', smallNode);
    smallNode.appendChild(node);
  }
}


function translate(node) {
  const tag = node.tagName.toLowerCase();
  if (!tag) {
    return;
  }
  if (!TranslationTags.has(tag)) {
    Array.from(node.children).forEach(translate);
    return;
  }
  let newNode = node.cloneNode(true);
  let attrs = [];
  if (simplify(newNode, attrs)) {
    fetch(newNode.innerHTML, updateNode, node, attrs);
  }
}


})();
