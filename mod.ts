import { log, lookupMimeType, parseYaml, sortBy } from "./deps.ts";
import { Marked } from "./marked.ts";
import { genResponseArgs, getH1, toTitle } from "./utils.ts";
import { renderPage } from "./render.ts";

export const defaultConfig = {
  sourceDir: "docs",
  rootFile: "index",
  lang: "en",
  siteName: "Built by Diplodocus",
  description: "This site is built by Diplodocus",
  favicon:
    "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f995.png",
  image:
    "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f995.png",
  twitter: "",
  navLinks: [] as Array<NavLink>,
  listPages: [] as Array<PageLink>,
  tocLevels: [2, 3],
  removeDefaultStyles: false,
  bottomHead: "",
  bottomBody: "",
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
  title?: string;
  tocLevels?: Array<number>;
  lang?: string;
  description?: string;
  favicon?: string;
  image?: string;
  removeDefaultStyles?: boolean;
  bottomHead?: string;
  bottomBody?: string;
};

export class Diplodocus {
  private storedPages: Record<string, string> = {};
  private storedMeta: Record<string, PageMeta> = {};
  private siteMeta: Config;

  private constructor(userConfig: UserConfig = {}) {
    this.siteMeta = { ...defaultConfig, ...userConfig };
  }

  static async load() {
    try {
      let userConfig: UserConfig = {};

      const files: string[] = [];
      for await (const file of Deno.readDir(Deno.cwd())) {
        if (!file.isFile || !/^diplodocus\.\w{2,4}$/.test(file.name)) {
          continue;
        }
        files.push(file.name);
      }
      log.debug({ files });

      for (const ext of ["yaml", "yml", "json"]) {
        const configFile = `diplodocus.${ext}`;
        if (files.includes(configFile)) {
          userConfig = parseYaml(
            await Deno.readTextFile(configFile),
          ) as UserConfig;
          break;
        }
      }

      const instance = new Diplodocus(userConfig);
      await instance.processStoredData();
      return instance;
    } catch (error) {
      log.error("Diplodocus load failed");
      throw error;
    }
  }

  private async collectList(
    listPath: string,
    sortKey: "path" | "title" = "path",
  ) {
    const listDir = `${this.siteMeta.sourceDir}${listPath}`;
    log.debug({ listDir });

    const pages: Array<PageLink> = [];
    for await (const page of Deno.readDir(listDir)) {
      if (!page.isFile || !/\.md$/.test(page.name)) {
        continue;
      }
      const { name } = page;
      const basename = name.replace(/\.md$/, "");

      const md = await Deno.readTextFile(`${listDir}/${name}`);
      const { content, meta } = Marked.parse(md);
      const title = meta.title || getH1(content) || toTitle(basename);

      pages.push({ title, path: `${listPath}/${basename}` });
    }

    // TODO: configure sortKey
    return sortBy(pages, (page) => page[sortKey]);
  }

  private async processStoredData() {
    this.storedPages = {};
    this.storedMeta = {};

    const { listPages, sourceDir } = this.siteMeta;
    for (let { title, path } of listPages) {
      if (!path) {
        log.error("path of listPages is required");
        continue;
      }
      if (!/^\/.*/.test(path)) {
        path = "/" + path;
      }
      if (!title) {
        title = toTitle(path);
      }

      const filePath = `${sourceDir}${path}.md`;
      this.storedMeta[filePath] ||= {};

      const pages = await this.collectList(path);
      log.debug({ pages });

      // generate list pages
      this.storedPages[filePath] = [
        `# ${title}`,
        ...pages.map(({ title, path }) => `- [${title}](${path})`),
      ].join("\n");

      this.storedMeta[filePath].tocLevels = [];

      // generate prev/next links
      pages.forEach(({ path }, idx) => {
        const itemFilePath = `${sourceDir}${path}.md`;

        this.storedMeta[itemFilePath] ||= {};

        if (pages[idx - 1]) {
          this.storedMeta[itemFilePath].prev = pages[idx - 1];
        }
        if (pages[idx + 1]) {
          this.storedMeta[itemFilePath].next = pages[idx + 1];
        }
      });
    }

    log.debug({
      listPages,
      storedPages: this.storedPages,
      storedMeta: this.storedMeta,
    });
  }

  private async readData(
    filePath: string,
    pageUrl: string,
    tryParse = false,
  ): Promise<BodyInit> {
    log.debug({ filePath, tryParse });

    const siteMeta = this.siteMeta;
    const storedPage = this.storedPages[filePath];

    if (storedPage) {
      const { content, meta } = Marked.parse(storedPage);
      const storedMeta = this.storedMeta[filePath] || {};
      const pageMeta = { ...storedMeta, ...meta };
      log.debug({ meta, pageMeta });
      return renderPage({ content, pageMeta, siteMeta, pageUrl });
    }

    try {
      const data = await Deno.readFile(filePath);

      if (filePath.endsWith(".md") && tryParse) {
        const md = new TextDecoder().decode(data);
        const storedMeta = this.storedMeta[filePath] || {};
        const { content, meta } = Marked.parse(md);

        const pageMeta = { ...storedMeta, ...meta };
        log.debug({ meta, pageMeta });

        return renderPage({ content, pageMeta, siteMeta, pageUrl });
      }

      return data;
    } catch (error) {
      const subject = `${error}`.split(":")[0];

      if (subject === "NotFound" && filePath.endsWith(".html")) {
        return this.readData(filePath.replace(/html$/, "md"), pageUrl, true);
      }

      // in other cases, throw error transparency
      throw error;
    }
  }

  async handler(request: Request) {
    const url = new URL(request.url);
    const { href, origin, host, hash, search } = url;
    let { pathname } = url;

    log.debug({ href, origin, host, pathname, hash, search });

    if (pathname === "/") {
      pathname += this.siteMeta.rootFile;
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
    const filePath = `${this.siteMeta.sourceDir}${pathname}`;

    log.debug({ pathname, ext, mimeType, filePath });

    if (!mimeType) {
      return new Response(...genResponseArgs(400));
    }

    try {
      log.info(`accessed: ${href}`);
      const data = await this.readData(filePath, href);

      return new Response(data, {
        headers: { "content-type": mimeType },
      });
    } catch (error) {
      log.error(error);

      const subject = `${error}`.split(":")[0];
      if (subject === "NotFound") {
        return new Response(...genResponseArgs(404));
      }

      return new Response(...genResponseArgs(500));
    }
  }
}
