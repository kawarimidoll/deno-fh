import { assertEquals } from "./deps.ts";
import { defaultConfig } from "./mod.ts";
import {
  genNavbar,
  genNeighbors,
  genPageLink,
  genToc,
  getPageType,
  prismJs,
  processTitle,
  renderPage,
} from "./render.ts";

Deno.test("[genNavbar] generate navbar", () => {
  assertEquals(
    genNavbar([{ title: "", path: "/about" }]),
    `<ul><li><a href="/about">About</a></li></ul>`,
  );
  assertEquals(
    genNavbar([{ title: "None" }]),
    `<ul><li><a href="#">None</a></li></ul>`,
  );
  assertEquals(
    genNavbar([{
      title: "links",
      items: [{ title: "A", path: "/a" }, { title: "B", path: "/b" }],
    }]),
    `<ul><li><span>links</span><ul><li><a href="/a">A</a></li><li><a href="/b">B</a></li></ul></li></ul>`,
  );
});

Deno.test("[prismJs] generate link to prism", () => {
  assertEquals(
    prismJs(
      "themes/prism-tomorrow.css",
      "sha256-0dkohC9ZEupqWbq0hS5cVR4QQXJ+mp6N2oJyuks6gt0=",
    ),
    `<link crossorigin="anonymous" integrity="sha256-0dkohC9ZEupqWbq0hS5cVR4QQXJ+mp6N2oJyuks6gt0=" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.24.1/themes/prism-tomorrow.css">`,
  );
  assertEquals(
    prismJs(
      "components/prism-core.min.js",
      "sha256-dz05jjFU9qYuMvQQlE6iWDtNAnEsmu6uMb1vWhKdkEM=",
    ),
    `<script crossorigin="anonymous" integrity="sha256-dz05jjFU9qYuMvQQlE6iWDtNAnEsmu6uMb1vWhKdkEM=" src="https://cdn.jsdelivr.net/npm/prismjs@1.24.1/components/prism-core.min.js" defer></script>`,
  );
});

Deno.test("[renderPage] render default page", () => {
  assertEquals(
    renderPage({
      content: "<h1>Diplodocus</h1><p>hello world</p>",
      pageMeta: {},
      siteMeta: defaultConfig,
      pageUrl: "https://diplodocus.deno.dev",
    }),
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Diplodocus | Built by Diplodocus</title><meta name="viewport" content="width=device-width,initial-scale=1.0,minimum-scale=1.0"><meta name="description" content="This site is built by Diplodocus"><link rel="icon" href="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f995.png"><meta property="og:url" content="https://diplodocus.deno.dev"><meta property="og:type" content="website"><meta property="og:title" content="Diplodocus | Built by Diplodocus"><meta property="og:description" content="This site is built by Diplodocus"><meta property="og:site_name" content="Built by Diplodocus"><meta property="og:image" content="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f995.png"><meta name="twitter:card" content="summary"><meta name="twitter:site" content=""><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/holiday.css@0.9.8"><link crossorigin="anonymous" integrity="sha256-0dkohC9ZEupqWbq0hS5cVR4QQXJ+mp6N2oJyuks6gt0=" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.24.1/themes/prism-tomorrow.css"><style>#table-of-contents{margin:2rem;margin-bottom:0;}#neighbors{display:flex;margin-bottom:1rem}#neighbors>#prev,#neighbors>#next{display:block;width:50%}#neighbors>#next{margin-left:auto}#neighbors>#prev::before{content:'« '}#neighbors>#next::after{content:' »'}.feather{width:.8rem;height:.8rem;stroke:var(--text-color);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none;display:inline-block;margin:0 .05rem 0 .15rem;vertical-align:-.1em;}</style></head><body><header><h1><a href="/">Built by Diplodocus</a></h1></header><nav id="header-nav"><ul></ul></nav><main><h1>Diplodocus</h1><p>hello world</p></main><footer><div>Powered by <a href="https://github.com/kawarimidoll/deno-diplodocus" target="_blank" rel="noopener noreferrer">Diplodocus<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="feather"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a></div></footer><script crossorigin="anonymous" integrity="sha256-dz05jjFU9qYuMvQQlE6iWDtNAnEsmu6uMb1vWhKdkEM=" src="https://cdn.jsdelivr.net/npm/prismjs@1.24.1/components/prism-core.min.js" defer></script><script crossorigin="anonymous" integrity="sha256-sttoa+EIAvFFfeeIkmPn8ypyOOb6no2sZ2NbxtBXgqU=" src="https://cdn.jsdelivr.net/npm/prismjs@1.24.1/plugins/autoloader/prism-autoloader.min.js" defer></script></body></html>`,
  );
});

Deno.test("[renderPage] set config", () => {
  assertEquals(
    renderPage({
      content: "<h1>Diplodocus</h1><p>hello world</p>",
      pageMeta: {},
      siteMeta: {
        ...defaultConfig,
        siteName: "Diplodocus",
        lang: "ja",
        description: "test site",
        favicon: "icon.png",
        image: "main.png",
        twitter: "deno_land",
        removeDefaultStyles: true,
        bottomHead: "bottomHead",
        bottomBody: "bottomBody",
      },
      pageUrl: "https://diplodocus.deno.dev/home",
    }),
    `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>Diplodocus</title><meta name="viewport" content="width=device-width,initial-scale=1.0,minimum-scale=1.0"><meta name="description" content="test site"><link rel="icon" href="icon.png"><meta property="og:url" content="https://diplodocus.deno.dev/home"><meta property="og:type" content="article"><meta property="og:title" content="Diplodocus"><meta property="og:description" content="test site"><meta property="og:site_name" content="Diplodocus"><meta property="og:image" content="main.png"><meta name="twitter:card" content="summary"><meta name="twitter:site" content="deno_land">bottomHead</head><body><header><h1><a href="/">Diplodocus</a></h1></header><nav id="header-nav"><ul></ul></nav><main><h1>Diplodocus</h1><p>hello world</p></main><footer><div>Powered by <a href="https://github.com/kawarimidoll/deno-diplodocus" target="_blank" rel="noopener noreferrer">Diplodocus<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="feather"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a></div></footer>bottomBody</body></html>`,
  );
});

Deno.test("[getPageType] get page type", () => {
  assertEquals(
    getPageType("https://diplodocus.deno.dev/"),
    "website",
  );
  assertEquals(
    getPageType("https://diplodocus.deno.dev/about"),
    "article",
  );
});

Deno.test("[genToc] generate TOC", () => {
  const content =
    `<h1 id="header-1">header 1</h1><h2 id="header-2">header 2</h2><h3 id="header-3">header 3</h3><h4 id="header-4">header 4</h4>`;
  assertEquals(
    genToc([], content),
    "",
  );
  assertEquals(
    genToc([2, 3], content),
    `<details id="table-of-contents"><summary>Table of contents</summary><ul><li><a href="#header-2">header 2</a><ul><li><a href="#header-3">header 3</a></li></ul></li></ul></details>`,
  );
});

Deno.test("[genPageLink]", () => {
  assertEquals(
    genPageLink(),
    "",
  );
  assertEquals(
    genPageLink({ title: "About", path: "about" }),
    `<a href="/about">About</a>`,
  );
});

Deno.test("[genNeighbors]", () => {
  assertEquals(
    genNeighbors({}),
    "",
  );
  assertEquals(
    genNeighbors({
      prev: { title: "Prev", path: "prev" },
    }),
    `<div id="neighbors"><a id="prev" href="/prev">Prev</a></div>`,
  );
  assertEquals(
    genNeighbors({
      prev: { title: "Prev", path: "prev" },
      next: { title: "Next", path: "next" },
    }),
    `<div id="neighbors"><a id="prev" href="/prev">Prev</a><a id="next" href="/next">Next</a></div>`,
  );
});

Deno.test("[processTitle]", () => {
  assertEquals(
    processTitle(
      "page-title",
      "site-name",
    ),
    "page-title | site-name",
  );
  assertEquals(
    processTitle(
      "site-name",
      "site-name",
    ),
    "site-name",
  );
  assertEquals(
    processTitle(
      "",
      "site-name",
    ),
    "site-name",
  );
});
