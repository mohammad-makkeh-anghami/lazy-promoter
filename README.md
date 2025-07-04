<img src="https://i.imgur.com/J4X2bIc.png" alt="logo" width="80" height="80" />

# 🚀 lazy `/promoter`

*Because typing `/promote` is way too much work*

This Chrome extension adds a "🚀 Promote" button to pull requests in the `anghami/web-streaming-monorepo` repository.

<img src="https://i.imgur.com/BHHQVcj.png" alt="example" style="border-radius: 6px; border: 1px solid #fff2"/>

## What it does

- Posts `/promote` comment via GitHub API
- Makes the rocket emoji launch off when you click it (because why not waste company time to please yourself?)

## Setup

### 1. Download the extension
```bash
git clone git@github.com:anghami/web-streaming-monorepo.git
# or just download the zip like a normal person
```

### 2. Load it into Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Turn on "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the folder you just downloaded
4. The extension should appear in your toolbar

### 3. Get a GitHub token
1. Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it `repo` scope (it needs to comment on PRs)

### 4. Configure the extension
1. Open the extension
2. Enter your token and save
3. <s>The token will be sent to my remote server to hack all of you</s>

## Security

- Your GitHub token is stored securely using Chrome's sync storage
- The token never leaves your browser except to talk to GitHub's API
- The extension only activates on our specific repository


> This is an experiment to see how we can improve DX and productivity using such tools. I may end up creating a full toolbar for anghami + osn stuff that is added to our GitHub pages if you guys suggest some stuff that could be useful