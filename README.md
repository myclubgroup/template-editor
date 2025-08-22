## Instructions

Install nvm
```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

```sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
```

Install node 
```
nvm install node
```

Clone the repo
```
git clone https://github.com/myclubgroup/template-editor.git
cd template-editor
```

Install yarn
```
npm install -g corepack
```

Run `yarn`


##

### `yarn run dev`

Runs the app in development mode.\
Open [http://localhost:5173/template-editor/](http://localhost:5173/template-editor/) to view in your browser.

The page will reload when you make changes.

### `yarn run build`

Builds the app for production to the `dist` folder.\
Your app is ready to be deployed!

### `yarn run deploy`

Deploys the app to Github Pages.
