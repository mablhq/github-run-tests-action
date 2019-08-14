If you would like to contribute, please submit a PR. If you encounter an
problem, please file an Issue in this repo.

### Releasing

Releases are done of of release branches. Each major release version should get
its own branch, e.g. release_v1.  
Releases can then be done from that branch by running

```bash
# Compile release
npm run release

# Commit the built release files
git commit -m "<version, e.g. v1.4> release"

# Tag the release
git tag <version, e.g. v1.4>
```

Once the tag exists, you make a new release from it in the github UI.
