import { sortBy } from "https://deno.land/std@0.107.0/collections/mod.ts";
import {
  httpStatusText,
  lookupMimeType,
  Marked,
  Renderer,
  tag as h,
} from "./deps.ts";

// https://github.com/ts-stack/markdown/blob/5b6145bf713b928b510770df8ee57d3d48d36b9c/projects/markdown/src/renderer.ts
class MyRenderer extends Renderer {
  heading(text: string, level: number) {
    const id = String(text)
      .replace(/^<[^>]*>/, "")
      .replace(/<\/[^>]*>$/, "")
      .replace(/\s+|<[^>]*>/g, "-")
      .trim().toLocaleLowerCase();
    return `<h${level} id="${id}">${text}</h${level}>`;
  }
}

Marked.setOptions({ renderer: new MyRenderer() });

export const defaultConfig = {
  sourceDir: "docs",
  lang: "en",
  siteName: "Built by Diplodocus",
  description: "This site is built by Diplodocus",
  favicon: "https://twemoji.maxcdn.com/v/13.1.0/72x72/1f995.png",
  siteImage: "https://twemoji.maxcdn.com/v/13.1.0/72x72/1f995.png",
  twitter: "",
  navLinks: [] as Array<NavLink>,
  listPages: [] as Array<ListPage>,
};
export type Config = typeof defaultConfig;
export type UserConfig = Partial<Config>;

export type NavLink = {
  title: string;
  path?: string;
  items?: Array<NavLink>;
};
export type ListPage = {
  title: string;
  path: string;
  items: Array<PageLink>;
};
export type PageLink = {
  title: string;
  path: string;
};
export type PageMeta = {
  prev?: PageLink;
  next?: PageLink;
  date?: string;
  tag?: Array<string>;
  toc?: boolean;
};

export class Diplodocus {
  storedPages: Record<string, string> = {};
  storedMeta: Record<string, PageMeta> = {};
  config: Config;

  // DO NOT CALL CONSTRUCTOR DIRECTLY!!!
  constructor(userConfig: UserConfig = {}) {
    this.config = { ...defaultConfig, ...userConfig };
  }

  static async create(userConfig: UserConfig = {}) {
    const instance = new Diplodocus(userConfig);
    await instance.processStoredData();
    return instance;
  }

  static async load(path: string) {
    try {
      const userConfig = JSON.parse(await Deno.readTextFile(path));
      return await this.create(userConfig);
    } catch (error) {
      console.error("Diplodocus load failed");
      throw error;
    }
  }

  async collectList(listPath: string) {
    if (!/^\/.*/.test(listPath)) {
      throw new Error("path in list must be started with /");
    }
    const listDir = `${this.config.sourceDir}${listPath}`;
    // console.log({ listDir });
    const pages: Array<PageLink> = [];
    for await (const page of Deno.readDir(listDir)) {
      if (!page.isFile || !/\.md$/.test(page.name)) {
        continue;
      }
      const { name } = page;

      const md = await Deno.readTextFile(`${listDir}/${name}`);
      const { content, meta } = Marked.parse(md);
      const title = meta.title ||
        (content.match(/<h1[^>]*>(.*)<\/h1>/) || [])[1] ||
        name.replace(/\.md$/, "");

      pages.push({ title, path: `${listPath}/${name}` });
    }

    return sortBy(pages, (page) => page.title);
  }

  async processStoredData() {
    this.storedPages = {};
    this.storedMeta = {};

    const { listPages, sourceDir } = this.config;
    for (const { title, path, items } of listPages) {
      const filePath = `${sourceDir}${path}.md`;
      this.storedMeta[filePath] ||= {};

      const pages = await this.collectList(path);
      console.log({ pages });

      // generate list pages
      this.storedPages[filePath] = [
        `# ${title}`,
        ...items.map(({ title, path }) => `- [${title}](${path})`),
      ].join("\n");

      this.storedMeta[filePath].toc = false;

      // generate prev/next links
      items.forEach(({ path }, idx) => {
        const itemFilePath = `${sourceDir}${path}.md`;

        this.storedMeta[itemFilePath] ||= {};

        if (items[idx - 1]) {
          this.storedMeta[itemFilePath].prev = items[idx - 1];
        }
        if (items[idx + 1]) {
          this.storedMeta[itemFilePath].next = items[idx + 1];
        }
      });
    }

    console.log({
      listPages,
      storedPages: this.storedPages,
      storedMeta: this.storedMeta,
    });
  }

  async readData(
    filePath: string,
    pageUrl: string,
    parseMd = false,
  ): Promise<BodyInit> {
    console.log({ filePath, parseMd });
    const storedPage = this.storedPages[filePath];
    if (storedPage) {
      const { content, meta } = Marked.parse(storedPage);
      const storedMeta = this.storedMeta[filePath] || {};
      const pageMeta = { ...storedMeta, ...meta };
      console.log({ meta, pageMeta });
      return renderPage({ content, pageMeta, siteMeta: this.config, pageUrl });
    }

    try {
      const data = await Deno.readFile(filePath);

      if (filePath.endsWith(".md") && parseMd) {
        const md = new TextDecoder().decode(data);
        const storedMeta = this.storedMeta[filePath] || {};
        const { content, meta } = Marked.parse(md);

        const pageMeta = { ...storedMeta, ...meta };
        console.log({ meta, pageMeta });

        return renderPage({
          content,
          pageMeta,
          siteMeta: this.config,
          pageUrl,
        });
      }

      return data;
    } catch (error) {
      const subject = `${error}`.split(":")[0];

      if (subject === "NotFound" && filePath.endsWith(".html")) {
        return this.readData(filePath.replace("html", "md"), pageUrl, true);
      }

      // in other cases, throw error transparency
      throw error;
    }
  }

  async handler(request: Request) {
    const url = new URL(request.url);
    const { href, origin, host, hash, search } = url;
    let { pathname } = url;

    console.log({ href, origin, host, pathname, hash, search });

    if (pathname === "/") {
      pathname += "index";
    } else if (pathname.endsWith("/")) {
      return new Response(
        ...genResponseArgs(302, {
          headers: { location: pathname.slice(0, -1) },
        }),
      );
    }

    const tailPath = pathname.split("/").at(-1) || "";
    let ext = tailPath.includes(".") ? tailPath.split(".").at(-1) : "";

    if (!ext) {
      pathname += ".html";
      ext = "html";
    }

    const mimeType = lookupMimeType(ext);
    const filePath = `${this.config.sourceDir}${pathname}`;

    console.log({ pathname, ext, mimeType, filePath });

    if (!mimeType) {
      return new Response(...genResponseArgs(400));
    }

    try {
      const data = await this.readData(filePath, href);

      return new Response(data, {
        headers: { "content-type": mimeType },
      });
    } catch (error) {
      console.error(error);

      const subject = `${error}`.split(":")[0];
      if (subject === "NotFound") {
        return new Response(...genResponseArgs(404));
      }

      return new Response(...genResponseArgs(500));
    }
  }
}

function genResponseArgs(
  status: number,
  init?: ResponseInit,
): [BodyInit, ResponseInit] {
  const statusText = `${httpStatusText(status)}`;
  return [`${status}: ${statusText}`, { ...(init || {}), status, statusText }];
}

export function genNavbar(links: Array<NavLink>): string {
  return h(
    "ul",
    ...links.map(({ path, title, items }) =>
      items
        ? h("li", h("span", title), genNavbar(items))
        : h("li", h("a", { href: path || "#" }, title))
    ),
  );
}
function prismJs(path: string) {
  return `https://cdn.jsdelivr.net/npm/prismjs@1.24.1/${path}`;
}
export function renderPage(
  {
    content,
    pageMeta,
    siteMeta,
    pageUrl,
  }: {
    content: string;
    pageMeta: PageMeta;
    siteMeta: Config;
    pageUrl: string;
  },
): string {
  const { toc, prev, next } = pageMeta;
  const {
    lang,
    siteName,
    description,
    navLinks,
    favicon,
    siteImage,
    twitter,
  } = siteMeta;
  const regex = /<h([123456]) [^>]*id="([^"]+)"[^>]*>(.*)<\/h[123456]>/g;
  let minLevel = 6;

  const tocMd = toc !== false
    ? (content.match(regex) || []).map((matched) => {
      const [levelStr, id] = (matched.replace(regex, "$1 $2") || "").split(" ");
      const level = Number(levelStr);
      if (level < minLevel) {
        minLevel = level;
      }
      const text = matched.replace(/<[^>]*>/g, "");
      return `${"  ".repeat(level)}- [${text}](#${id})`;
    }).map((str) => str.slice(minLevel * 2)).join("\n")
    : "";

  const tocHtml = Marked.parse(tocMd).content;
  console.log({ tocMd, pageMeta, tocHtml });

  const viewport = "width=device-width,initial-scale=1.0,minimum-scale=1.0";
  const title = "" + siteName;
  const style = "#table-of-contents{margin:2rem;margin-bottom:0;}" +
    "#neighbors{display:flex;margin-bottom:1rem}#prev,#next{display:block;width:50%}" +
    "#next{margin-left:auto}#prev::before{content:'« '}#next::after{content:' »'}";
  const isRoot = /^https?:\/\/[^\/]+\/?$/.test(pageUrl);
  const pageType = isRoot ? "website" : "article";

  return "<!DOCTYPE html>" +
    h(
      "html",
      { lang },
      h(
        "head",
        h("meta", { charset: "UTF-8" }),
        h("title", title),
        h("meta", { name: "viewport", content: viewport }),
        h("meta", { name: "description", content: description }),
        h("link", { rel: "icon", href: favicon }),
        h("meta", { property: "og:url", content: pageUrl }),
        h("meta", { property: "og:type", content: pageType }),
        h("meta", { property: "og:title", content: title }),
        h("meta", { property: "og:description", content: description }),
        h("meta", { property: "og:site_name", content: siteName }),
        h("meta", { property: "og:image", content: siteImage }),
        h("meta", { name: "twitter:card", content: "summary" }),
        h("meta", { name: "twitter:site", content: twitter }),
        h("link", {
          rel: "stylesheet",
          href: "https://cdn.jsdelivr.net/npm/holiday.css@0.9.8",
        }),
        h("link", {
          rel: "stylesheet",
          href: prismJs("themes/prism-tomorrow.css"),
          integrity: "sha256-0dkohC9ZEupqWbq0hS5cVR4QQXJ+mp6N2oJyuks6gt0=",
          crossorigin: "anonymous",
        }),
        h("style", style),
      ),
      h(
        "body",
        h("header", h("h1", h("a", { href: "/" }, siteName))),
        h("nav", { id: "header-nav" }, genNavbar(navLinks)),
        tocHtml
          ? h(
            "details",
            { id: "table-of-contents" },
            h("summary", "Table of contents"),
            tocHtml,
          )
          : "",
        h("main", content),
        h(
          "footer",
          h(
            "div",
            { id: "neighbors" },
            prev ? h("a", { id: "prev", href: prev.path }, prev.title) : "",
            next ? h("a", { id: "next", href: next.path }, next.title) : "",
          ),
          h(
            "div",
            "Powered by ",
            h(
              "a",
              { href: "https://github.com/kawarimidoll/deno-diplodocus" },
              "diplodocus",
            ),
          ),
        ),
        h("script", {
          src: prismJs("components/prism-core.min.js"),
          integrity: "sha256-dz05jjFU9qYuMvQQlE6iWDtNAnEsmu6uMb1vWhKdkEM=",
          crossorigin: "anonymous",
          defer: true,
        }),
        h("script", {
          src: prismJs("plugins/autoloader/prism-autoloader.min.js"),
          integrity: "sha256-sttoa+EIAvFFfeeIkmPn8ypyOOb6no2sZ2NbxtBXgqU=",
          crossorigin: "anonymous",
          defer: true,
        }),
      ),
    );
}
