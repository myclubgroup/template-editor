# About

A small editor for building email templates using fenced editable regions (&lt;!-- editable:start ... --&gt; / &lt;!-- editable:end --&gt;).

The UI lets you reorder sections, edit paragraph blocks (Rich Text via ReactQuill), and export final HTML for email.

# Getting started

### Install nvm

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

```sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

### Install node (24 recommended)

```
nvm install node
```

### Clone the repo

```
git clone https://github.com/myclubgroup/template-editor.git
cd template-editor
```

### Install yarn 4.x

```
npm install -g corepack
corepack enable
```

### Install dependencies

```
yarn install
```

## Developer notes

- Base template HTML is in `src/template.html`.
- Editable blocks are marked with HTML comments: `<!-- editable:start ... --> ... <!-- editable:end -->`.
- Add or modify editable blocks using the fence comments and attributes: name, label, type, max, etc.
- Mail-merge tags are defined as JS constants.
- Brands are defined in `src/brands.json`.
- Use the `sectionHTML` helpers to control how paragraph / CTA blocks are rendered into the exported HTML.

## TypeScript migration (incremental)

This repository is primarily JavaScript. To start an incremental TypeScript migration the project includes a minimal `tsconfig.json` and a few type shims.

Steps to run a type-check locally (uses yarn):

1. Install TypeScript and types: `yarn add -D typescript @types/react @types/react-dom`
2. Run the type-check: `yarn tsc --noEmit`

When converting files, prefer adding `.ts`/`.tsx` files next to existing `.js` files and import the small types from `src/types.ts`.

# Running the app

### Runs the app in development mode.

```
yarn run dev
```

Open [http://localhost:5173/template-editor/](http://localhost:5173/template-editor/) to view in your browser.\
The page will reload when you make changes.

### Builds the app and places it in the `dist` folder.

```
yarn run build
```

### Deploy the app to Github Pages

```
yarn run deploy
```
