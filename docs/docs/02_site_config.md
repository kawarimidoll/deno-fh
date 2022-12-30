# Site Configuration

Diplodocus works without any settings, but there are some configurable options.

Diplodocus accepts YAML, JSON or TypeScript configuration files. The file should
be `diplodocus.(yaml|yml|json)` in the same directory with the entry point file
of Deno Deploy such as `server.ts`.

```bash
├── docs/
├── diplodocus.yml
└── server.ts
```

If there are multiple configuration files, Diplodocus will choose one of them by
this priority: (high) `yaml` `yml` `json` (low).

## Format

### diplodocus.yaml / diplodocus.yml

```yml
sourceDir: docs
```

### diplodocus.json

```js
{
  "sourceDir": "docs"
}
```

## Available Keys

These values below can be used to configure Diplodocus. All of them are
optional.

### sourceDir

- Type: `string`
- Default: `docs`

Directory that served by Diplodocus. This should be relative path from the file
calling `Diplodocus.load()`.

### rootFile

- Type: `string`
- Default: `index`

File name without extensions that served when accessed to the root path like
`https://example.deno.dev`.

### lang

- Type: `string`
- Default: `en`

Language of HTML files.

### siteName

- Type: `string`
- Default: `Built by Diplodocus`

Site name. This is put on the top of the pages and `<title>` tag of the HTML
files.

### description

- Type: `string`
- Default: `This site is built by Diplodocus`

Site description. This is used in meta information of the HTML files.

### favicon

- Type: `string`
- Default:
  `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4e6.png`

Site favicon.

### image

- Type: `string`
- Default: same with `favicon`

Site image. This will be shown in social links.

### twitter

- Type: `string`
- Default: blank

Twitter user name. This is put in `og:twitter` tag.

### navLinks

- Type: `Array<NavLink>`
- Default: `[]`

Array of the links on the navbar. Each item can have `title`, `path` and
`items`.

Example:

```json
{
  "navLinks": [
    { "title": "Documentation", "path": "docs" },
    { "path": "acknowledgements" },
    {
      "title": "Links",
      "items": [
        {
          "path": "https://github.com/kawarimidoll/deno-diplodocus",
          "title": "GitHub"
        },
        { "path": "https://deno.land/x/diplodocus", "title": "deno.land/x" }
      ]
    }
  ]
}
```

#### title

- Type: `string`

Title of the list. If this left blank, capitalized `path` is used.

#### path

- Type: `string`

Path the link leads to. Both of internal and external links are allowed. If
`items` is present, this key is skipped.

#### items

- Type: `Array<PageLink>`

Nested list items. Each item can have `title` and `path` above, `path` is
required.

### listPages

- Type: `Array<PageLink>`
- Default: `[]`

Array of the list pages. Each item can have `title` and `path`.

Example:

```json
{
  "listPages": [
    { "path": "articles" },
    { "title": "My Products", "path": "products" }
  ]
}
```

#### title

- Type: `string`

Title of the list. If this left blank, capitalized `path` is used.

#### path

- Type: `string`

Path to directory that contains the files to list. This also used as path to
link the page.

### tocLevels

- Type: `Array<number>`
- Default: `[2, 3]`

The header levels to show in auto-generated TOC (Table Of Contents). Set this
`[]` to disable to generate TOC.

### removeDefaultStyles

- Type: `boolean`
- Default: `false`

Flag to remove all default styles.

### bottomHead

- Type: `string`
- Default: blank

String to put into bottom of `<head>` tag without sanitization. Use it to append
some tags.

### bottomBody

- Type: `string`
- Default: blank

String to put into bottom of `<head>` tag without sanitization. Use it to append
some tags.
