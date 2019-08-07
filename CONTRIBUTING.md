If you would like to contribute, please submit a PR. If you encounter an
problem, please file an Issue in this repo.

### Making updates

Actions need the compiled code checked in. This means your changes will only
take effect if you run the build to generate .js files from the .ts Typescript
files and check the .js files in as well.

### Adding new dependencies

Check in the Action with everything it needs to run. If you update dependencies
you will need to commit the changes to Node modules as well.

```bash
# Remove any non-production dependencies
npm prune --production

# Compile Typescript to ES6
npm run build

# Add the compiled Typescript output
git add lib/

# Add Node dependencies
git add -f node_modules/*
```
