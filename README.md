# ANON KODE


https://github.com/user-attachments/assets/7a9253a7-8bb0-40d5-a3f3-5e6096d7c789


Terminal-based AI coding tool that can use any model that supports the OpenAI-style API.

- Fixes your spaghetti code
- Explains wtf that function does
- Runs tests, shell commands and stuff
- Whatever else claude-code can do, depending on the model you use

## HOW TO USE

```
npm install -g anon-kode
cd your-project
kode
```

You can use the onboarding to set up the model, or `/model`.
If you don't see the models you want on the list, you can manually set them in `/config`
As long as you have an openai-like endpoint, it should work.

## HOW TO DEV

```
pnpm i
pnpm run dev
pnpm run build
```

Get some more logs while debugging:
```
NODE_ENV=development pnpm run dev --verbose --debug
```

### Build with Type Error Suppression

Temporary build tools have been added to help build the project despite TypeScript errors:

```
# Build with type error suppression
node build-temp-test.js

# Standard build (will fail if type errors exist)
pnpm run build
```

See `.CLAUDE/tool-interface-changes.md` for details on recent interface updates.

## BUGS

You can submit a bug from within the app with `/bug`, it will open a browser to github issue create with stuff filed out.

## Warning

Use at own risk.


## YOUR DATA

- There's no telemetry or backend servers other than the AI providers you choose
